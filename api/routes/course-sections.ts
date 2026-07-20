import { Router, Request, Response, IRouter } from 'express';
import { AppDataSource } from '../config/database';
import { CourseSection } from '../entities/CourseSection';
import { Course } from '../entities/Course';
import { EnrollmentStatus } from '../entities/Enrollment';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../entities/User';
// Removed unused imports: Like, FindOptionsWhere

const router: IRouter = Router();
const courseSectionRepository = AppDataSource.getRepository(CourseSection);
const courseRepository = AppDataSource.getRepository(Course);

/**
 * GET /api/course-sections
 * Get all course sections with filtering, pagination, and search
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      courseId,
      yearLevel,
      semester,
      academicYear,
      isActive
    } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    // Build query with relations
    const queryBuilder = courseSectionRepository.createQueryBuilder('courseSection')
      .leftJoinAndSelect('courseSection.course', 'course')
      .leftJoinAndSelect('course.department', 'department')
      .loadRelationCountAndMap(
        'courseSection.currentEnrollment',
        'courseSection.enrollments',
        'enrolledEnrollment',
        qb => qb.andWhere('enrolledEnrollment.status = :enrolledStatus', { enrolledStatus: EnrollmentStatus.ENROLLED })
      );
    
    // Dweezil's Code - Fixed MySQL compatibility: Changed ILIKE to LIKE for case-insensitive search
    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        '(courseSection.sectionName LIKE :search OR course.name LIKE :search OR course.courseCode LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filter by course
    if (courseId) {
      queryBuilder.andWhere('courseSection.courseId = :courseId', { courseId });
    }

    // Filter by year level
    if (yearLevel) {
      queryBuilder.andWhere('courseSection.yearLevel = :yearLevel', { yearLevel });
    }

    // Filter by semester
    if (semester) {
      queryBuilder.andWhere('courseSection.semester = :semester', { semester });
    }

    // Filter by academic year
    if (academicYear) {
      queryBuilder.andWhere('courseSection.academicYear = :academicYear', { academicYear });
    }

    // Filter by active status
    if (isActive !== undefined && isActive !== '') {
      queryBuilder.andWhere('courseSection.isActive = :isActive', { isActive: isActive === 'true' });
    }

    // Get total count
    const totalCount = await queryBuilder.getCount();

    // Apply pagination and ordering
    const courseSections = await queryBuilder
      .orderBy('course.courseCode', 'ASC')
      .addOrderBy('courseSection.yearLevel', 'ASC')
      .addOrderBy('courseSection.sectionName', 'ASC')
      .skip(offset)
      .take(limitNumber)
      .getMany();

    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.json({
      success: true,
      data: courseSections,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit: limitNumber
      }
    });
  } catch (error) {
    console.error('Error fetching course sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course sections'
    });
  }
});

/**
 * GET /api/course-sections/:id
 * Get a specific course section by ID
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const courseSection = await courseSectionRepository.createQueryBuilder('courseSection')
      .leftJoinAndSelect('courseSection.course', 'course')
      .leftJoinAndSelect('course.department', 'department')
      .leftJoinAndSelect(
        'courseSection.enrollments',
        'enrollment',
        'enrollment.status = :enrolledStatus',
        { enrolledStatus: EnrollmentStatus.ENROLLED }
      )
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('courseSection.schedules', 'schedules')
      .where('courseSection.id = :id', { id })
      .loadRelationCountAndMap(
        'courseSection.currentEnrollment',
        'courseSection.enrollments',
        'enrolledEnrollment',
        qb => qb.andWhere('enrolledEnrollment.status = :enrolledStatus', { enrolledStatus: EnrollmentStatus.ENROLLED })
      )
      .getOne();

    if (!courseSection) {
      return res.status(404).json({
        success: false,
        error: 'Course section not found'
      });
    }

    res.json({
      success: true,
      data: courseSection
    });
  } catch (error) {
    console.error('Error fetching course section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course section'
    });
  }
});

/**
 * POST /api/course-sections
 * Create a new course section
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const {
      courseId,
      yearLevel,
      sectionName,
      credits = 3,
      maxStudents = 30,
      semester = 'First Semester',
      academicYear = '2024-2025',
      isActive = true
    } = req.body;

    // Validation
    if (!courseId || !yearLevel || !sectionName) {
      return res.status(400).json({
        success: false,
        error: 'Course ID, year level, and section name are required'
      });
    }

    // Verify course exists
    const course = await courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      return res.status(400).json({
        success: false,
        error: 'Course not found'
      });
    }

    // Dweezil's Code - Enhanced duplicate section name validation
    // Check for duplicate section name within the same course
    const existingSection = await courseSectionRepository.findOne({
      where: {
        courseId,
        sectionName: sectionName.toUpperCase()
      }
    });

    if (existingSection) {
      return res.status(409).json({
        success: false,
        error: `Section name "${sectionName}" already exists for this course. Please use a different section name.`
      });
    }

    // Create new course section
    const courseSection = courseSectionRepository.create({
      courseId,
      yearLevel,
      sectionName: sectionName.toUpperCase(),
      credits,
      maxStudents,
      semester,
      academicYear,
      isActive
    });

    const savedCourseSection = await courseSectionRepository.save(courseSection);

    // Fetch the complete course section with relations
    const completeCourseSection = await courseSectionRepository.findOne({
      where: { id: savedCourseSection.id },
      relations: ['course', 'course.department']
    });

    res.status(201).json({
      success: true,
      data: completeCourseSection,
      message: 'Course section created successfully'
    });
  } catch (error) {
    console.error('Error creating course section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create course section'
    });
  }
});

/**
 * PUT /api/course-sections/:id
 * Update an existing course section
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      courseId,
      yearLevel,
      sectionName,
      credits,
      maxStudents,
      semester,
      academicYear,
      isActive
    } = req.body;

    // Find existing course section
    const courseSection = await courseSectionRepository.findOne({
      where: { id }
    });

    if (!courseSection) {
      return res.status(404).json({
        success: false,
        error: 'Course section not found'
      });
    }

    // Dweezil's Code - Enhanced duplicate section name validation for updates
    // Check for duplicate section name within the same course (if section name or course is being changed)
    if (courseId || sectionName) {
      const checkCourseId = courseId || courseSection.courseId;
      const checkSectionName = (sectionName || courseSection.sectionName).toUpperCase();

      const existingSection = await courseSectionRepository.findOne({
        where: {
          courseId: checkCourseId,
          sectionName: checkSectionName
        }
      });

      if (existingSection && existingSection.id !== id) {
        return res.status(409).json({
          success: false,
          error: `Section name "${checkSectionName}" already exists for this course. Please use a different section name.`
        });
      }
    }

    // Update course section fields
    if (courseId !== undefined) courseSection.courseId = courseId;
    if (yearLevel !== undefined) courseSection.yearLevel = yearLevel;
    if (sectionName !== undefined) courseSection.sectionName = sectionName.toUpperCase();
    if (credits !== undefined) courseSection.credits = credits;
    if (maxStudents !== undefined) courseSection.maxStudents = maxStudents;
    if (semester !== undefined) courseSection.semester = semester;
    if (academicYear !== undefined) courseSection.academicYear = academicYear;
    if (isActive !== undefined) courseSection.isActive = isActive;

    const updatedCourseSection = await courseSectionRepository.save(courseSection);

    // Fetch the complete course section with relations
    const completeCourseSection = await courseSectionRepository.findOne({
      where: { id: updatedCourseSection.id },
      relations: ['course', 'course.department']
    });

    res.json({
      success: true,
      data: completeCourseSection,
      message: 'Course section updated successfully'
    });
  } catch (error) {
    console.error('Error updating course section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update course section'
    });
  }
});

/**
 * DELETE /api/course-sections/:id
 * Delete a course section (Hard delete if no dependencies)
 * Accessible by: ADMIN
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find existing course section
    const courseSection = await courseSectionRepository.findOne({
      where: { id },
      relations: ['enrollments', 'schedules']
    });

    if (!courseSection) {
      return res.status(404).json({
        success: false,
        error: 'Course section not found'
      });
    }

    // Check for ANY dependencies (Enrollments or Schedules)
    const hasEnrollments = courseSection.enrollments && courseSection.enrollments.length > 0;
    const hasSchedules = courseSection.schedules && courseSection.schedules.length > 0;

    if (hasEnrollments || hasSchedules) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete course section because it has associated enrollments or schedules. Please deactivate it instead.'
      });
    }

    // Hard delete
    await courseSectionRepository.delete(id);

    res.json({
      success: true,
      message: 'Course section deleted permanently'
    });
  } catch (error) {
    console.error('Error deleting course section:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete course section'
    });
  }
});

/**
 * PATCH /api/course-sections/:id/status
 * Toggle course section active status
 * Accessible by: ADMIN, REGISTRAR
 */
router.patch('/:id/status', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean'
      });
    }

    const courseSection = await courseSectionRepository.findOne({
      where: { id },
      relations: ['enrollments', 'schedules']
    });

    if (!courseSection) {
      return res.status(404).json({
        success: false,
        error: 'Course section not found'
      });
    }

    // If deactivating, check for active dependencies
    if (!isActive) {
      // Actually, if it's used in ANY enrollment or schedule, we might want to prevent deactivation or at least warn.
      // The user said: "check first if is not used on other transactrions"
      
      const hasEnrollments = courseSection.enrollments && courseSection.enrollments.length > 0;
      const hasSchedules = courseSection.schedules && courseSection.schedules.length > 0;

      if (hasEnrollments || hasSchedules) {
        return res.status(400).json({
          success: false,
          error: 'Cannot deactivate course section because it is used in enrollments or schedules.'
        });
      }
    }

    courseSection.isActive = isActive;
    await courseSectionRepository.save(courseSection);

    res.json({
      success: true,
      data: courseSection,
      message: `Course section ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating course section status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update course section status'
    });
  }
});

/**
 * GET /api/course-sections/course/:courseId
 * Get all sections for a specific course (alias for by-course)
 * Accessible by: All authenticated users
 */
router.get('/course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { academicYear, semester, isActive = 'true' } = req.query;

    const queryBuilder = courseSectionRepository.createQueryBuilder('courseSection')
      .where('courseSection.courseId = :courseId', { courseId })
      .loadRelationCountAndMap(
        'courseSection.currentEnrollment',
        'courseSection.enrollments',
        'enrolledEnrollment',
        qb => qb.andWhere('enrolledEnrollment.status = :enrolledStatus', { enrolledStatus: EnrollmentStatus.ENROLLED })
      );

    if (academicYear) {
      queryBuilder.andWhere('courseSection.academicYear = :academicYear', { academicYear });
    }

    if (semester) {
      queryBuilder.andWhere('courseSection.semester = :semester', { semester });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('courseSection.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const courseSections = await queryBuilder
      .orderBy('courseSection.yearLevel', 'ASC')
      .addOrderBy('courseSection.sectionName', 'ASC')
      .getMany();

    res.json({
      success: true,
      data: courseSections
    });
  } catch (error) {
    console.error('Error fetching course sections by course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course sections'
    });
  }
});

/**
 * GET /api/course-sections/by-course/:courseId
 * Get all sections for a specific course
 * Accessible by: All authenticated users
 */
router.get('/by-course/:courseId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { academicYear, semester, isActive = 'true' } = req.query;

    const queryBuilder = courseSectionRepository.createQueryBuilder('courseSection')
      .where('courseSection.courseId = :courseId', { courseId })
      .loadRelationCountAndMap(
        'courseSection.currentEnrollment',
        'courseSection.enrollments',
        'enrolledEnrollment',
        qb => qb.andWhere('enrolledEnrollment.status = :enrolledStatus', { enrolledStatus: EnrollmentStatus.ENROLLED })
      );

    if (academicYear) {
      queryBuilder.andWhere('courseSection.academicYear = :academicYear', { academicYear });
    }

    if (semester) {
      queryBuilder.andWhere('courseSection.semester = :semester', { semester });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('courseSection.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const courseSections = await queryBuilder
      .orderBy('courseSection.yearLevel', 'ASC')
      .addOrderBy('courseSection.sectionName', 'ASC')
      .getMany();

    res.json({
      success: true,
      data: courseSections
    });
  } catch (error) {
    console.error('Error fetching course sections by course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course sections'
    });
  }
});

/**
 * GET /api/course-sections/active/list
 * Get all active course sections for dropdown lists
 * Accessible by: All authenticated users
 */
router.get('/active/list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const courseSections = await courseSectionRepository.find({
      where: { isActive: true },
      relations: ['course', 'course.department'],
      order: {
        course: { courseCode: 'ASC' },
        yearLevel: 'ASC',
        sectionName: 'ASC'
      }
    });

    // Transform to option format for dropdowns
    const options = courseSections.map(section => ({
      id: section.id,
      label: `${section.course.courseCode} - ${section.course.name} (${section.yearLevel} - ${section.sectionName})`,
      value: section.id,
      courseId: section.courseId,
      courseName: section.course.name,
      courseCode: section.course.courseCode,
      yearLevel: section.yearLevel,
      sectionName: section.sectionName
    }));

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error fetching active course sections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active course sections'
    });
  }
});

export default router;
