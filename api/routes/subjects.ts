import express, { Request, Response } from 'express';
import { Subject } from '../entities/Subject';
import { SubjectPrerequisite, PrerequisiteCategory } from '../entities/SubjectPrerequisite';
import { Department } from '../entities/Department';
import { Course } from '../entities/Course';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { UserRole } from '../entities/User';
import { In } from 'typeorm';

const router = express.Router();

/**
 * GET /api/subjects
 * Get all subjects with filtering, pagination, and search
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      departmentId = '',
      isActive = '',
      units = '',
      hasPrerequisites = ''
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const subjectRepository = AppDataSource.getRepository(Subject);
    
    // Execute query with search and filters, including department relation
    const queryBuilder = subjectRepository.createQueryBuilder('subject')
      .leftJoinAndSelect('subject.department', 'department')
      .leftJoinAndSelect('subject.course', 'course')
      .leftJoinAndSelect('subject.prerequisites', 'prerequisites')
      .leftJoinAndSelect('prerequisites.prerequisiteSubject', 'prerequisiteSubject');
    
    // Add search conditions
    if (search) {
      queryBuilder.where(
        '(subject.name LIKE :search OR subject.code LIKE :search OR subject.description LIKE :search OR department.name LIKE :search OR course.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add other filters
    if (departmentId) {
      queryBuilder.andWhere('subject.departmentId = :departmentId', { departmentId });
    }

    if (req.query.courseId) {
      queryBuilder.andWhere('subject.courseId = :courseId', { courseId: req.query.courseId });
    }

    if (req.query.yearLevel) {
      queryBuilder.andWhere('subject.yearLevel = :yearLevel', { yearLevel: Number(req.query.yearLevel) });
    }

    if (req.query.semester) {
      queryBuilder.andWhere('subject.semester = :semester', { semester: String(req.query.semester) });
    }
    
    if (isActive !== '') {
      queryBuilder.andWhere('subject.isActive = :isActive', { isActive: isActive === 'true' });
    }

    if (units) {
      queryBuilder.andWhere('subject.units = :units', { units: Number(units) });
    }

    if (hasPrerequisites !== '') {
      const hasPrereqBool = hasPrerequisites === 'true';
      if (hasPrereqBool) {
        // Filter subjects that HAVE prerequisites
        // We can check if the count of prerequisites > 0 using a subquery to avoid messing up the main query
        queryBuilder.andWhere((qb) => {
          const subQuery = qb.subQuery()
            .select("1")
            .from(SubjectPrerequisite, "sp")
            .where("sp.subjectId = subject.id")
            .getQuery();
          return `EXISTS ${subQuery}`;
        });
      } else {
        // Filter subjects that DO NOT HAVE prerequisites
        queryBuilder.andWhere((qb) => {
          const subQuery = qb.subQuery()
            .select("1")
            .from(SubjectPrerequisite, "sp")
            .where("sp.subjectId = subject.id")
            .getQuery();
          return `NOT EXISTS ${subQuery}`;
        });
      }
    }

    // Get total count
    const totalItems = await queryBuilder.getCount();
    
    // Apply pagination and ordering
    const subjects = await queryBuilder
      .orderBy('subject.code', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: subjects,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error in GET /subjects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/subjects/:id
 * Get a specific subject by ID
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format'
      });
    }

    const subjectRepository = AppDataSource.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      where: { id: id },
      relations: [
        'department', 
        'course',
        'prerequisites', 
        'prerequisites.prerequisiteSubject',
        'requiredBy',
        'requiredBy.subject'
      ]
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    res.json({
      success: true,
      data: subject
    });
  } catch (error) {
    console.error('Error retrieving subject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/subjects/department/:departmentId
 * Get subjects by department ID
 */
router.get('/department/:departmentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const subjectRepository = AppDataSource.getRepository(Subject);

    // Validate department ID
    if (!departmentId || departmentId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Department ID parameter is required'
      });
    }

    // Get subjects by department with pagination
    const [subjects, totalCount] = await subjectRepository.findAndCount({
      where: {
        departmentId: departmentId,
        isActive: true
      },
      relations: ['department', 'prerequisites', 'prerequisites.prerequisiteSubject'],
      order: {
        code: 'ASC'
      },
      skip: offset,
      take: limit
    });

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: subjects,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Error retrieving subjects by department:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/subjects
 * Create a new subject
 * Requires ADMIN or REGISTRAR role
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      code, 
      departmentId,
      courseId,
      yearLevel,
      semester,
      description, 
      units, 
      lectureHours = 0, 
      labHours = 0,
      prerequisiteIds = [],
      coRequisiteIds = []
    } = req.body;
    
    const subjectRepository = AppDataSource.getRepository(Subject);
    const departmentRepository = AppDataSource.getRepository(Department);
    const courseRepository = AppDataSource.getRepository(Course);
    const prerequisiteRepository = AppDataSource.getRepository(SubjectPrerequisite);

    // Validation
    if (!name || !code || !courseId || !yearLevel || !semester || !units) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, course, year level, semester, and units are required'
      });
    }

    const allowedSemesters = ['First Semester', 'Second Semester', 'Summer'];
    if (!allowedSemesters.includes(String(semester))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid semester value'
      });
    }

    const course = await courseRepository.findOne({
      where: { id: courseId, isActive: true }
    });

    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'Course not found or inactive'
      });
    }

    let resolvedDepartmentId: string | null = departmentId || course.departmentId || null;
    if (resolvedDepartmentId) {
      const department = await departmentRepository.findOne({
        where: { id: resolvedDepartmentId }
      });

      if (!department) {
        resolvedDepartmentId = null;
      }
    }

    // Check if subject code already exists
    const existingSubject = await subjectRepository.findOne({
      where: { code: code.trim().toUpperCase() }
    });

    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message: 'Subject code already exists'
      });
    }

    // Dweezil's Code - Fixed duplicate co-requisite validation and added courseId support
    // Validate prerequisite subjects exist
    if (prerequisiteIds.length > 0) {
      const prerequisites = await subjectRepository.findBy({ id: In(prerequisiteIds) });
      if (prerequisites.length !== prerequisiteIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisite subjects not found'
        });
      }
    }

    // Validate co-requisite subjects exist
    if (coRequisiteIds.length > 0) {
      const coRequisites = await subjectRepository.findBy({ id: In(coRequisiteIds) });
      if (coRequisites.length !== coRequisiteIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more co-requisite subjects not found'
        });
      }
    }

    // Create new subject
    const subject = subjectRepository.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      departmentId: resolvedDepartmentId || null,
      courseId: courseId,
      yearLevel: Number(yearLevel),
      semester: String(semester),
      description: description?.trim() || null,
      units: Number(units),
      lectureHours: Number(lectureHours),
      labHours: Number(labHours),
      isActive: true
    });

    const savedSubject = await subjectRepository.save(subject);

    // Create prerequisite relationships
    const prerequisiteEntities: SubjectPrerequisite[] = [];
    
    if (prerequisiteIds.length > 0) {
      prerequisiteIds.forEach((prerequisiteId: string) => {
        prerequisiteEntities.push(prerequisiteRepository.create({
          subjectId: savedSubject.id,
          prerequisiteId: prerequisiteId,
          category: PrerequisiteCategory.REQUIRED
        }));
      });
    }

    if (coRequisiteIds.length > 0) {
      coRequisiteIds.forEach((coRequisiteId: string) => {
        prerequisiteEntities.push(prerequisiteRepository.create({
          subjectId: savedSubject.id,
          prerequisiteId: coRequisiteId,
          category: PrerequisiteCategory.COREQUISITE
        }));
      });
    }

    if (prerequisiteEntities.length > 0) {
      await prerequisiteRepository.save(prerequisiteEntities);
    }

    // Fetch the complete subject with relations
    const completeSubject = await subjectRepository.findOne({
      where: { id: savedSubject.id },
      relations: ['department', 'prerequisites', 'prerequisites.prerequisiteSubject']
    });

    res.status(201).json({
      success: true,
      data: completeSubject,
      message: 'Subject created successfully'
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/subjects/:id
 * Update an existing subject
 * Requires ADMIN or REGISTRAR role
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      code, 
      departmentId, 
      courseId,
      yearLevel,
      semester,
      description, 
      units, 
      lectureHours, 
      labHours,
      prerequisiteIds = [],
      coRequisiteIds = []
    } = req.body;

    const subjectRepository = AppDataSource.getRepository(Subject);
    const departmentRepository = AppDataSource.getRepository(Department);
    const courseRepository = AppDataSource.getRepository(Course);
    const prerequisiteRepository = AppDataSource.getRepository(SubjectPrerequisite);

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format'
      });
    }

    // Find existing subject
    const existingSubject = await subjectRepository.findOne({
      where: { id: id },
      relations: ['prerequisites']
    });

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Validation
    if (!name || !code || !courseId || !yearLevel || !semester || !units) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, course, year level, semester, and units are required'
      });
    }

    const allowedSemesters = ['First Semester', 'Second Semester', 'Summer'];
    if (!allowedSemesters.includes(String(semester))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid semester value'
      });
    }

    const course = await courseRepository.findOne({
      where: { id: courseId, isActive: true }
    });

    if (!course) {
      return res.status(400).json({
        success: false,
        message: 'Course not found or inactive'
      });
    }

    let resolvedDepartmentId: string | null = departmentId || course.departmentId || null;
    if (resolvedDepartmentId && resolvedDepartmentId !== existingSubject.departmentId) {
      const department = await departmentRepository.findOne({
        where: { id: resolvedDepartmentId }
      });

      if (!department) {
        resolvedDepartmentId = null;
      }
    }

    // Check if subject code already exists (excluding current subject)
    // console.log(`[Subject Update] Checking code: "${code}", Existing: "${existingSubject.code}"`);
    
    if (code.trim().toUpperCase() !== existingSubject.code) {
      const duplicateSubject = await subjectRepository.findOne({
        where: { code: code.trim().toUpperCase() }
      });
      
      // console.log(`[Subject Update] Duplicate check result:`, duplicateSubject ? `Found (ID: ${duplicateSubject.id})` : 'None');

      if (duplicateSubject && duplicateSubject.id !== id) {
        // console.log(`[Subject Update] CONFLICT DETECTED: Duplicate ID ${duplicateSubject.id} !== Current ID ${id}`);
        return res.status(409).json({
          success: false,
          message: 'Subject code already exists'
        });
      }
    }

    // Validate prerequisite subjects exist
    if (prerequisiteIds.length > 0) {
      const prerequisites = await subjectRepository.findBy({ id: In(prerequisiteIds) });
      if (prerequisites.length !== prerequisiteIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more prerequisite subjects not found'
        });
      }
    }

    // Update subject
    await subjectRepository.update(id, {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      departmentId: resolvedDepartmentId || null,
      courseId: courseId,
      yearLevel: Number(yearLevel),
      semester: String(semester),
      description: description?.trim() || null,
      units: Number(units),
      lectureHours: Number(lectureHours) || 0,
      labHours: Number(labHours) || 0
    });

    // Update prerequisites
    // Remove existing prerequisites
    await prerequisiteRepository.delete({ subjectId: id });

    // Add new prerequisites and co-requisites
    const prerequisiteEntities: SubjectPrerequisite[] = [];

    if (prerequisiteIds.length > 0) {
      prerequisiteIds.forEach((prerequisiteId: string) => {
        prerequisiteEntities.push(prerequisiteRepository.create({
          subjectId: id,
          prerequisiteId: prerequisiteId,
          category: PrerequisiteCategory.REQUIRED
        }));
      });
    }

    if (coRequisiteIds.length > 0) {
      coRequisiteIds.forEach((coRequisiteId: string) => {
        prerequisiteEntities.push(prerequisiteRepository.create({
          subjectId: id,
          prerequisiteId: coRequisiteId,
          category: PrerequisiteCategory.COREQUISITE
        }));
      });
    }

    if (prerequisiteEntities.length > 0) {
      await prerequisiteRepository.save(prerequisiteEntities);
    }

    // Fetch updated subject with relations
    const updatedSubject = await subjectRepository.findOne({
      where: { id: id },
      relations: ['department', 'course', 'prerequisites', 'prerequisites.prerequisiteSubject']
    });

    res.json({
      success: true,
      data: updatedSubject,
      message: 'Subject updated successfully'
    });
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/subjects/:id/activate
 * Activate a subject
 * Requires ADMIN or REGISTRAR role
 */
router.patch('/:id/activate', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subjectRepository = AppDataSource.getRepository(Subject);

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format'
      });
    }

    // Find existing subject
    const existingSubject = await subjectRepository.findOne({
      where: { id: id }
    });

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Update subject status
    await subjectRepository.update(id, { isActive: true });

    // Fetch updated subject
    const updatedSubject = await subjectRepository.findOne({
      where: { id: id },
      relations: ['department']
    });

    res.json({
      success: true,
      data: updatedSubject,
      message: 'Subject activated successfully'
    });
  } catch (error) {
    console.error('Error activating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/subjects/:id/deactivate
 * Deactivate a subject
 * Requires ADMIN or REGISTRAR role
 */
router.patch('/:id/deactivate', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subjectRepository = AppDataSource.getRepository(Subject);

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format'
      });
    }

    // Find existing subject
    const existingSubject = await subjectRepository.findOne({
      where: { id: id }
    });

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Update subject status
    await subjectRepository.update(id, { isActive: false });

    // Fetch updated subject
    const updatedSubject = await subjectRepository.findOne({
      where: { id: id },
      relations: ['department']
    });

    res.json({
      success: true,
      data: updatedSubject,
      message: 'Subject deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating subject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/subjects/:id
 * Soft delete a subject (set isActive to false)
 * Requires ADMIN role
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subjectRepository = AppDataSource.getRepository(Subject);

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format'
      });
    }

    // Find existing subject
    const existingSubject = await subjectRepository.findOne({
      where: { id: id }
    });

    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if subject is used in any active schedules
    // Note: This would require checking the Schedule entity
    // For now, we'll proceed with soft delete

    // Soft delete the subject
    await subjectRepository.update(id, { isActive: false });

    res.json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/subjects/:id/prerequisites
 * Get prerequisites for a specific subject
 */
router.get('/:id/prerequisites', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prerequisiteRepository = AppDataSource.getRepository(SubjectPrerequisite);

    // Validate ID format
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Invalid subject ID format'
      });
    }

    const prerequisites = await prerequisiteRepository.find({
      where: { subjectId: id },
      relations: ['prerequisiteSubject', 'prerequisiteSubject.department']
    });

    res.json({
      success: true,
      data: prerequisites.map(p => p.prerequisiteSubject)
    });
  } catch (error) {
    console.error('Error retrieving prerequisites:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Dweezil's Code - Get subjects available for a student based on their year level and semester
router.get('/student/:studentId/available', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { yearLevel, semester, courseId } = req.query;
    const subjectRepository = AppDataSource.getRepository(Subject);
    const studentRepository = AppDataSource.getRepository('Student');

    // Get student with grade level
    const student = await studentRepository.findOne({
      where: { id: studentId },
      relations: ['gradeLevel']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const whereConditions: any = { isActive: true };

    if (courseId) {
      whereConditions.courseId = String(courseId);
    }

    if (yearLevel) {
      const yearLevelText = String(yearLevel).trim();
      const numericYearLevel = Number(yearLevelText);
      if (!Number.isNaN(numericYearLevel) && numericYearLevel > 0) {
        whereConditions.yearLevel = numericYearLevel;
      } else {
        const yearLevelMap: Record<string, number> = {
          'First Year': 1,
          'Second Year': 2,
          'Third Year': 3,
          'Fourth Year': 4
        };
        const mapped = yearLevelMap[yearLevelText];
        if (mapped) {
          whereConditions.yearLevel = mapped;
        }
      }
    }

    if (semester) {
      whereConditions.semester = String(semester);
    }

    const subjects = await subjectRepository.find({
      where: whereConditions,
      relations: ['department', 'prerequisites', 'prerequisites.prerequisiteSubject'],
      order: { code: 'ASC' }
    });

    res.json({
      success: true,
      data: subjects,
      student: {
        id: student.id,
        gradeLevel: student.gradeLevel?.name,
        registrationStatus: student.registrationStatus
      },
      filters: {
        yearLevel: yearLevel || 'all',
        semester: semester || 'all',
        courseId: courseId || 'all'
      }
    });
  } catch (error) {
    console.error('Error retrieving available subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
