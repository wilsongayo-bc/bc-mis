import express, { Request, Response } from 'express';
import { Course } from '../entities/Course';
import { Department } from '../entities/Department';
import { EnrollmentStatus } from '../entities/Enrollment';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { UserRole } from '../entities/User';


const router = express.Router();

/**
 * GET /api/courses
 * Get all courses with filtering, pagination, and search
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      departmentId = '',
      isActive = ''
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const courseRepository = AppDataSource.getRepository(Course);
    
    // Execute query with search and filters, including department relation
    const queryBuilder = courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.department', 'department')
      .leftJoinAndSelect('course.sections', 'sections', 'sections.isActive = :activeSection', { activeSection: true })
      .loadRelationCountAndMap(
        'sections.currentEnrollment',
        'sections.enrollments',
        'enrolledEnrollment',
        qb => qb.andWhere('enrolledEnrollment.status = :enrolledStatus', { enrolledStatus: EnrollmentStatus.ENROLLED })
      );
    
    // Dweezil's Code - Fixed MySQL compatibility: Changed ILIKE to LIKE for case-insensitive search
    // Add search conditions
    if (search) {
      queryBuilder.where(
        '(course.name LIKE :search OR course.courseCode LIKE :search OR course.description LIKE :search OR department.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add other filters
    if (departmentId) {
      queryBuilder.andWhere('course.departmentId = :departmentId', { departmentId });
    }
    
    if (isActive !== '') {
      queryBuilder.andWhere('course.isActive = :isActive', { isActive: isActive === 'true' });
    }
    
    // Get total count
    const totalItems = await queryBuilder.getCount();
    
    // Apply pagination and ordering
    const courses = await queryBuilder
      .orderBy('course.courseCode', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: courses,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /courses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/courses/:id
 * Get a specific course by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format'
      });
    }

    const courseRepository = AppDataSource.getRepository(Course);
    
    const course = await courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.department', 'department')
      .leftJoinAndSelect('course.sections', 'sections', 'sections.isActive = :active', { active: true })
      .loadRelationCountAndMap(
        'sections.currentEnrollment',
        'sections.enrollments',
        'enrolledEnrollment',
        qb => qb.andWhere('enrolledEnrollment.status = :enrolledStatus', { enrolledStatus: EnrollmentStatus.ENROLLED })
      )
      .where('course.id = :id', { id })
      .getOne();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error retrieving course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/courses/department/:departmentId
 * Get courses by department ID
 */
router.get('/department/:departmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const courseRepository = AppDataSource.getRepository(Course);

    // Validate department ID
    if (!departmentId || departmentId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Department ID parameter is required'
      });
    }

    // Get courses by department with pagination
    const queryBuilder = courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.department', 'department')
      .leftJoinAndSelect('course.sections', 'sections', 'sections.isActive = :active', { active: true })
      .where('course.departmentId = :departmentId', { departmentId })
      .andWhere('course.isActive = :active', { active: true });

    const [courses, totalCount] = await queryBuilder
      .orderBy('course.courseCode', 'ASC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: courses,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error retrieving courses by department:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



/**
 * POST /api/courses
 * Create a new course
 * Requires ADMIN or REGISTRAR role
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const {
      name,
      courseCode,
      idCode,
      departmentId,
      description,
      tuitionPerUnit,
      miscellaneousFee,
      downpaymentRate
    } = req.body;
    const courseRepository = AppDataSource.getRepository(Course);
    const departmentRepository = AppDataSource.getRepository(Department);

    // Validation
    if (!name || !courseCode || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Name, course code, and department ID are required'
      });
    }

    // Verify department exists
    const department = await departmentRepository.findOne({
      where: { id: departmentId, isActive: true }
    });

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department not found or inactive'
      });
    }

    // Check if course code already exists
    const existingCourse = await courseRepository.findOne({
      where: { courseCode: courseCode.trim().toUpperCase() }
    });

    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    const normalizedCourseCode = courseCode.trim().toUpperCase();
    const normalizedIdCodeRaw = idCode === undefined || idCode === null || idCode === '' ? null : String(idCode).trim();
    let normalizedIdCode: string | null = normalizedIdCodeRaw;

    if (!normalizedIdCode) {
      if (normalizedCourseCode === 'BTVTED') normalizedIdCode = '01';
      if (normalizedCourseCode === 'BSIS') normalizedIdCode = '02';
    }

    if (normalizedIdCode !== null) {
      if (!/^\d{2}$/.test(normalizedIdCode)) {
        return res.status(400).json({
          success: false,
          message: 'ID Code must be a 2-digit number'
        });
      }

      const existingIdCode = await courseRepository.findOne({ where: { idCode: normalizedIdCode } });
      if (existingIdCode) {
        return res.status(409).json({
          success: false,
          message: 'ID Code already exists'
        });
      }
    }

    const parsedTuitionPerUnit =
      tuitionPerUnit === undefined || tuitionPerUnit === null || tuitionPerUnit === ''
        ? null
        : Number(tuitionPerUnit);
    const parsedMiscellaneousFee =
      miscellaneousFee === undefined || miscellaneousFee === null || miscellaneousFee === ''
        ? null
        : Number(miscellaneousFee);
    const parsedDownpaymentRateRaw =
      downpaymentRate === undefined || downpaymentRate === null || downpaymentRate === ''
        ? null
        : Number(downpaymentRate);

    if (parsedTuitionPerUnit !== null && (Number.isNaN(parsedTuitionPerUnit) || parsedTuitionPerUnit < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Tuition per unit must be a non-negative number'
      });
    }

    if (parsedMiscellaneousFee !== null && (Number.isNaN(parsedMiscellaneousFee) || parsedMiscellaneousFee < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Miscellaneous fee must be a non-negative number'
      });
    }

    let parsedDownpaymentRate: number | null = null;
    if (parsedDownpaymentRateRaw !== null) {
      if (Number.isNaN(parsedDownpaymentRateRaw) || parsedDownpaymentRateRaw < 0 || parsedDownpaymentRateRaw > 100) {
        return res.status(400).json({
          success: false,
          message: 'Downpayment rate must be between 0 and 100 (percentage)'
        });
      }
      parsedDownpaymentRate = parsedDownpaymentRateRaw > 1 ? parsedDownpaymentRateRaw / 100 : parsedDownpaymentRateRaw;
    }

    // Create new course
    const course = courseRepository.create({
      name: name.trim(),
      courseCode: normalizedCourseCode,
      idCode: normalizedIdCode,
      departmentId: departmentId,
      description: description?.trim() || null,
      tuitionPerUnit: parsedTuitionPerUnit,
      miscellaneousFee: parsedMiscellaneousFee,
      downpaymentRate: parsedDownpaymentRate,
      isActive: true
    });

    const savedCourse = await courseRepository.save(course);

    // Fetch the complete course with department relation
    const completeCourse = await courseRepository.findOne({
      where: { id: savedCourse.id },
      relations: ['department']
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: completeCourse
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/courses/:id
 * Update a course
 * Requires ADMIN or REGISTRAR role
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      courseCode,
      idCode,
      departmentId,
      description,
      isActive,
      tuitionPerUnit,
      miscellaneousFee,
      downpaymentRate
    } = req.body;
    const courseRepository = AppDataSource.getRepository(Course);
    const departmentRepository = AppDataSource.getRepository(Department);

    // Validate ID
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if course exists
    const existingCourse = await courseRepository.findOne({
      where: { id: id }
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Verify department exists (if being changed)
    if (departmentId && departmentId !== existingCourse.departmentId) {
      const department = await departmentRepository.findOne({
        where: { id: departmentId, isActive: true }
      });

      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department not found or inactive'
        });
      }
    }

    // Check if course code is being changed and if it already exists
    if (courseCode && courseCode.trim().toUpperCase() !== existingCourse.courseCode) {
      const duplicateCourse = await courseRepository.findOne({
        where: { courseCode: courseCode.trim().toUpperCase() }
      });

      if (duplicateCourse && duplicateCourse.id !== id) {
        return res.status(409).json({
          success: false,
          message: 'Course code already exists'
        });
      }
    }

    const normalizedIdCodeRaw =
      idCode === undefined || idCode === null ? undefined : (String(idCode).trim() === '' ? null : String(idCode).trim());
    if (normalizedIdCodeRaw !== undefined) {
      if (normalizedIdCodeRaw !== null && !/^\d{2}$/.test(normalizedIdCodeRaw)) {
        return res.status(400).json({
          success: false,
          message: 'ID Code must be a 2-digit number'
        });
      }

      if (normalizedIdCodeRaw) {
        const existingIdCode = await courseRepository.findOne({ where: { idCode: normalizedIdCodeRaw } });
        if (existingIdCode && existingIdCode.id !== id) {
          return res.status(409).json({
            success: false,
            message: 'ID Code already exists'
          });
        }
      }
    }

    const parsedTuitionPerUnit =
      tuitionPerUnit === undefined || tuitionPerUnit === null || tuitionPerUnit === ''
        ? undefined
        : Number(tuitionPerUnit);

    if (parsedTuitionPerUnit !== undefined && (Number.isNaN(parsedTuitionPerUnit) || parsedTuitionPerUnit < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Tuition per unit must be a non-negative number'
      });
    }

    const parsedMiscellaneousFee =
      miscellaneousFee === undefined || miscellaneousFee === null || miscellaneousFee === ''
        ? undefined
        : Number(miscellaneousFee);

    if (parsedMiscellaneousFee !== undefined && (Number.isNaN(parsedMiscellaneousFee) || parsedMiscellaneousFee < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Miscellaneous fee must be a non-negative number'
      });
    }

    const parsedDownpaymentRateRaw =
      downpaymentRate === undefined || downpaymentRate === null || downpaymentRate === ''
        ? undefined
        : Number(downpaymentRate);

    if (
      parsedDownpaymentRateRaw !== undefined &&
      (Number.isNaN(parsedDownpaymentRateRaw) || parsedDownpaymentRateRaw < 0 || parsedDownpaymentRateRaw > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Downpayment rate must be between 0 and 100 (percentage)'
      });
    }

    let parsedDownpaymentRate: number | undefined = undefined;
    if (parsedDownpaymentRateRaw !== undefined) {
      parsedDownpaymentRate =
        parsedDownpaymentRateRaw > 1 ? parsedDownpaymentRateRaw / 100 : parsedDownpaymentRateRaw;
    }

    // Update the course
    const updateData: Partial<Course> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (courseCode !== undefined) updateData.courseCode = courseCode.trim().toUpperCase();
    if (normalizedIdCodeRaw !== undefined) updateData.idCode = normalizedIdCodeRaw || null;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (parsedTuitionPerUnit !== undefined) {
      updateData.tuitionPerUnit = parsedTuitionPerUnit;
    }
    if (parsedMiscellaneousFee !== undefined) {
      updateData.miscellaneousFee = parsedMiscellaneousFee;
    }
    if (parsedDownpaymentRate !== undefined) {
      updateData.downpaymentRate = parsedDownpaymentRate;
    }

    await courseRepository.update(id, updateData);

    // Dweezil's Code - Fixed relations: removed non-existent 'sections.teacher' relation
    // Fetch updated course with relations
    const updatedCourse = await courseRepository.findOne({
      where: { id: id },
      relations: ['department', 'sections']
    });

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: updatedCourse
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/courses/:id
 * Delete a course (soft delete by setting isActive to false)
 * Requires ADMIN role
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courseRepository = AppDataSource.getRepository(Course);

    // Validate ID
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID'
      });
    }

    // Check if course exists
    const existingCourse = await courseRepository.findOne({
      where: { id: id },
      relations: ['sections']
    });

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course has active sections
    const activeSections = existingCourse.sections?.filter(section => section.isActive);
    if (activeSections && activeSections.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with active sections. Please deactivate all sections first.'
      });
    }

    // Soft delete the course
    await courseRepository.update(id, { isActive: false });

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
