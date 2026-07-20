import { Router, Response, IRouter, RequestHandler } from 'express';
import { AppDataSource } from '../config/database';
import { Student, StudentStatus, Gender, RegistrationStatus, DocumentRequirement } from '../entities/Student';
import { User, UserRole } from '../entities/User';
import { GradeLevel } from '../entities/GradeLevel';
import { StudentDocument, DocumentStatus } from '../entities/StudentDocument';
import { Employee } from '../entities/Employee';
// Dweezil's Code - Task 14: Import Enrollment, Course, and CourseSection entities
// Dweezil's Code - Import DocumentRequirement entity for document validation
import { DocumentRequirement as DocRequirement } from '../entities/DocumentRequirement';
import { Enrollment } from '../entities/Enrollment';
import { Course } from '../entities/Course';
import { authenticateToken, requireRole, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { generateTemporaryId } from '../utils/idGenerator';
import { fetchDocumentRequirementsForRegistration, getDefaultDocumentRequirements } from '../utils/documentRequirements';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { put, del } from '@vercel/blob';
// Dweezil's Code - Import email service for sending credentials (Issue #3 & #5)
import { emailService } from '../services/emailService';
import { StudentIdService } from '../services/StudentIdService';
import path from 'path';
import fs from 'fs/promises';

// Interface for student filter conditions
interface StudentFilterCondition {
  id?: string;
  studentId?: string;
  userId?: string;
  gradeLevelId?: string;
  status?: StudentStatus;
  registrationStatus?: RegistrationStatus;
  gender?: Gender;
  enrollmentDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const router: IRouter = Router();
const studentRepository = AppDataSource.getRepository(Student);
const userRepository = AppDataSource.getRepository(User);
const gradeLevelRepository = AppDataSource.getRepository(GradeLevel);
const studentDocumentRepository = AppDataSource.getRepository(StudentDocument);
const employeeRepository = AppDataSource.getRepository(Employee);
// Dweezil's Code - Task 14: Initialize enrollment and course repositories
const enrollmentRepository = AppDataSource.getRepository(Enrollment);
const courseRepository = AppDataSource.getRepository(Course);
// Dweezil's Code - Initialize document requirement repository for validation
const documentRequirementRepository = AppDataSource.getRepository(DocRequirement);

// Dweezil's Code
/**
 * Validates that at least one document is submitted for a student
 * before allowing progression from pre-registration to registered
 * @param studentId - The student's ID
 * @param gradeLevelId - The student's grade level ID (optional)
 * @param targetStatus - The target registration status to validate for
 * @returns Object with validation result and details
 */
async function validateStudentDocuments(
  studentId: string, 
  gradeLevelId?: string,
  targetStatus?: string
): Promise<{
  isValid: boolean;
  message?: string;
  missingDocuments?: string[];
  unverifiedDocuments?: string[];
}> {
  try {
    // Get all submitted documents for the student
    const submittedDocuments = await studentDocumentRepository.find({
      where: {
        studentId: studentId
      },
      relations: ['requirement']
    });

    // Dweezil's Code - Check if at least one document is uploaded
    // All statuses require at least one document to be uploaded
    if (submittedDocuments.length === 0) {
      return {
        isValid: false,
        message: 'At least one document must be uploaded before changing status',
        missingDocuments: ['At least one document required'],
        unverifiedDocuments: []
      };
    }

    console.log(`✅ Document validation passed: ${submittedDocuments.length} document(s) found`);
    return { isValid: true };
    
  } catch (error) {
    console.error('❌ Error validating student documents:', error);
    return {
      isValid: false,
      message: 'Error validating documents. Please try again.'
    };
  }
}

const preListingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

// Helper to convert an internal file system path into a web-accessible URL
// Assumes files are stored somewhere under a directory named "uploads"
const mapFilePathToUrl = (filePath?: string | null): string | undefined => {
  if (!filePath) return undefined;

  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('/uploads/')) return normalized;
  const idx = normalized.lastIndexOf('/uploads/');

  if (idx === -1) return undefined;

  const urlPath = normalized.substring(idx);
  return urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
};

router.post(
  '/:id/prelisting/upload',
  authenticateToken,
  requireRoles([UserRole.REGISTRAR, UserRole.ADMIN]),
  preListingUpload.single('document') as unknown as RequestHandler,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: studentId } = req.params;
      const { requirementId } = req.body as { requirementId?: string };
      const file = req.file;

      if (!requirementId) {
        return res.status(400).json({ success: false, message: 'requirementId is required' });
      }
      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const student = await studentRepository.findOne({ where: { id: studentId } });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const requirements = (student.documentsRequired || []) as DocumentRequirement[];
      const requirement = requirements.find(r => r.id === requirementId);
      if (!requirement) {
        return res.status(400).json({ success: false, message: 'Requirement not found for this student' });
      }

      const ext = path.extname(file.originalname);
      const fname = `${studentId}_${requirementId}_${Date.now()}${ext}`;
      const uploadsRoot =
        process.env.UPLOADS_DIR ||
        (process.env.NODE_ENV === 'production'
          ? '/app/uploads'
          : path.resolve(process.cwd(), 'public', 'uploads'));
      const uploadsDir = path.join(uploadsRoot, 'prelisting');
      await fs.mkdir(uploadsDir, { recursive: true });
      const fpath = path.join(uploadsDir, fname);
      const storedUrl = `/uploads/prelisting/${fname}`;

      const existingSubmitted = ((student.documentsSubmitted || []) as DocumentRequirement[]).find(d => d.id === requirementId);
      const existingUrl = existingSubmitted?.fileUrl;
      if (existingUrl && typeof existingUrl === 'string' && existingUrl.startsWith('/uploads/prelisting/')) {
        const oldName = path.basename(existingUrl);
        const oldPath = path.join(uploadsDir, oldName);
        try {
          await fs.unlink(oldPath);
        } catch (_e) {
          void _e;
        }
      }

      await fs.writeFile(fpath, file.buffer);

      const doc = await AppDataSource.transaction(async transactionalEntityManager => {
        const freshStudent = await transactionalEntityManager.findOne(Student, { where: { id: studentId } });

        if (!freshStudent) {
          throw new Error('Student not found during update');
        }

        const freshRequirements = (freshStudent.documentsRequired || []) as DocumentRequirement[];
        const freshRequirement = freshRequirements.find(r => r.id === requirementId);
        if (!freshRequirement) {
          throw new Error('Requirement not found for this student');
        }

        const freshSubmitted = (freshStudent.documentsSubmitted || []) as DocumentRequirement[];

        const newDoc: DocumentRequirement = {
          ...freshRequirement,
          submitted: true,
          fileName: file.originalname,
          fileSize: file.size,
          fileUrl: storedUrl,
          submittedDate: new Date()
        };

        freshStudent.documentsSubmitted = freshSubmitted.filter(d => d.id !== requirementId).concat(newDoc);
        freshStudent.documentsRequired = freshRequirements.map(r => (r.id === requirementId ? { ...r, submitted: true } : r));

        await transactionalEntityManager.save(freshStudent);
        return newDoc;
      });

      res.status(201).json({ success: true, message: 'Document uploaded', data: doc });
    } catch (error) {
      const err = error as { message?: string; code?: string };
      const message = err?.message || 'Failed to upload document';
      res.status(500).json({ success: false, message, error: err?.code || err?.message || 'Unknown error' });
    }
  }
);

/**
 * Merge document requirements with actual document submissions
 * @param documentsRequired - Array of required documents from Student entity
 * @param studentDocuments - Array of actual document submissions from StudentDocument entity
 * @param jsonSubmittedDocuments - Array of submitted documents from Student entity JSON column (for pre-registration)
 * @returns Merged array with updated submission status
 */
function mergeDocumentRequirementsWithSubmissions(
  documentsRequired: DocumentRequirement[],
  studentDocuments: StudentDocument[],
  jsonSubmittedDocuments: DocumentRequirement[] = []
): DocumentRequirement[] {
  return documentsRequired.map(requirement => {
    // Find matching submission by document name or type in SQL table
    const submission = studentDocuments.find(doc => {
      if (!doc.requirement) return false;
      
      // Try exact name match first
      if (doc.requirement.name === requirement.name) {
        return true;
      }
      
      // Try normalized name matching (remove spaces, convert to lowercase)
      const normalizedReqName = requirement.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedDocName = doc.requirement.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (normalizedReqName === normalizedDocName) {
        return true;
      }
      
      // Try matching by type if available
      if (requirement.type) {
        const normalizedReqType = requirement.type.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedDocName.includes(normalizedReqType) || normalizedReqType.includes(normalizedDocName)) {
          return true;
        }
      }
      
      return false;
    });

    if (submission) {
      // Document has been submitted (found in SQL table)
      return {
        ...requirement,
        submitted: true,
        submittedDate: submission.submittedAt,
        fileUrl: mapFilePathToUrl(submission.filePath),
        fileName: submission.fileName,
        fileSize: submission.fileSize,
        notes: submission.metadata?.verificationNotes || '',
        status: submission.status
      };
    } 
    
    // If not in SQL table, check JSON column (for pre-registration uploads)
    const jsonSubmission = jsonSubmittedDocuments.find(doc => doc.id === requirement.id);
    
    if (jsonSubmission && jsonSubmission.fileUrl) {
      return {
        ...requirement,
        submitted: true,
        submittedDate: jsonSubmission.submittedDate,
        fileUrl: jsonSubmission.fileUrl,
        fileName: jsonSubmission.fileName,
        fileSize: jsonSubmission.fileSize,
        notes: 'Pre-registration upload',
        status: 'submitted' // Treat as submitted
      };
    }

    // Document not submitted yet
    return {
      ...requirement,
      submitted: false,
      submittedDate: undefined,
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined,
      notes: '',
      status: 'pending'
    };
  });
}

/**
 * @swagger
 * /api/students:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get all students
 *     description: Retrieve a paginated list of students with filtering and search capabilities
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of students per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for student name, email, or student ID
 *       - in: query
 *         name: gradeLevel
 *         schema:
 *           type: string
 *         description: Filter by grade level
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, GRADUATED, DROPPED]
 *         description: Filter by student status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Students retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Student'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.TEACHER, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      gradeLevel,
      status,
      registrationStatus,
      checkEnrollmentStatus: checkEnrollmentStatusParam,
      enrollmentAcademicYear,
      enrollmentSemester,
      teachingScope,
      courseCode,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where conditions
    const whereConditions: StudentFilterCondition = {};
    
    // Dweezil's Code - Handle year level filtering (renamed from gradeLevel)
    if (gradeLevel) {
      try {
        const glParam = String(gradeLevel);
        let targetGradeId: string | undefined;
        
        // Check if it's already a UUID
        if (glParam.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          targetGradeId = glParam;
        } else {
          // Find by name (e.g., "First Year", "Second Year", etc.)
          const found = await gradeLevelRepository.createQueryBuilder('g')
            .where('g.name = :gl', { gl: glParam })
            .getOne();
          if (found) targetGradeId = found.id;
        }
        
        if (targetGradeId) whereConditions.gradeLevelId = targetGradeId;
      } catch (_e) { void _e; }
    }
    
    // Dweezil's Code - Handle status filter based on actual enrollment records
    // A student is "ENROLLED" if they have active enrollment records (not DROPPED, FAILED, or COMPLETED)
    // A student is "PRE_REGISTERED" (Not Enrolled) if they have no active enrollment records
    let checkEnrollmentStatus: 'enrolled' | 'not-enrolled' | undefined;
    if (checkEnrollmentStatusParam === 'enrolled' || checkEnrollmentStatusParam === 'not-enrolled') {
      checkEnrollmentStatus = checkEnrollmentStatusParam;
    }
    if (status) {
      if (status === 'ENROLLED') {
        checkEnrollmentStatus = 'enrolled';
      } else if (status === 'PRE_REGISTERED') {
        checkEnrollmentStatus = 'not-enrolled';
      } else {
        whereConditions.status = status as StudentStatus;
      }
    }

    if (registrationStatus) {
      const reg = String(registrationStatus);
      if (Object.values(RegistrationStatus).includes(reg as RegistrationStatus)) {
        whereConditions.registrationStatus = reg as RegistrationStatus;
      }
    }
    
    // Note: section filtering removed as Student entity doesn't have section property

    // Build query
    let queryBuilder = studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.gradeLevel', 'gradeLevel')
      .leftJoinAndSelect('student.course', 'course')
      .leftJoinAndSelect('student.enrollments', 'enrollment')
      .leftJoinAndSelect('enrollment.course', 'enrollmentCourse')
      .where(whereConditions);

    const enrollmentTermAcademicYear = enrollmentAcademicYear ? String(enrollmentAcademicYear) : undefined;
    const enrollmentTermSemester = enrollmentSemester ? String(enrollmentSemester) : undefined;
    const hasAcademicYearFilter = Boolean(enrollmentTermAcademicYear);
    const hasSemesterFilter = Boolean(enrollmentTermSemester);

    // Dweezil's Code - Filter by enrollment status based on actual enrollment records
    if (checkEnrollmentStatus === 'enrolled') {
      // Show only students who have active enrollments
      // Use a subquery to find students with active enrollments
      queryBuilder = queryBuilder
        .andWhere(`student.id IN (
          SELECT DISTINCT e.studentId 
          FROM enrollments e 
          WHERE e.status IN ('PENDING', 'VERIFIED', 'ENROLLED')
          ${hasAcademicYearFilter ? 'AND e.academicYear = :enrollmentTermAcademicYear' : ''}
          ${hasSemesterFilter ? 'AND e.semester = :enrollmentTermSemester' : ''}
        )`, {
          ...(hasAcademicYearFilter ? { enrollmentTermAcademicYear } : {}),
          ...(hasSemesterFilter ? { enrollmentTermSemester } : {})
        });
    } else if (checkEnrollmentStatus === 'not-enrolled') {
      // Show only students who have NO active enrollments
      // Use a subquery to check for absence of active enrollments
      queryBuilder = queryBuilder
        .andWhere(`student.id NOT IN (
          SELECT DISTINCT e.studentId 
          FROM enrollments e 
          WHERE e.status IN ('PENDING', 'VERIFIED', 'ENROLLED')
          ${hasAcademicYearFilter ? 'AND e.academicYear = :enrollmentTermAcademicYear' : ''}
          ${hasSemesterFilter ? 'AND e.semester = :enrollmentTermSemester' : ''}
        )`, {
          ...(hasAcademicYearFilter ? { enrollmentTermAcademicYear } : {}),
          ...(hasSemesterFilter ? { enrollmentTermSemester } : {})
        });
    }

    // Teaching scope for teachers and registrar users who also have teaching assignments.
    const effectiveRoles = Array.isArray(req.user?.roles) && req.user?.roles.length > 0 ? req.user.roles : (req.user ? [req.user.role] : []);
    const hasTeacherRole = effectiveRoles.includes(UserRole.TEACHER);
    const hasRegistrarRole = effectiveRoles.includes(UserRole.REGISTRAR);

    const isProgramHead =
      hasTeacherRole && typeof req.user?.position === 'string' && req.user.position.toLowerCase().startsWith('program head');

    const programHeadCourseCode = (() => {
      if (!isProgramHead) return undefined;
      const position = String(req.user?.position || '');
      const parts = position.split(',');
      const inferred = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
      return inferred || undefined;
    })();

    const normalizedTeachingScope = typeof teachingScope === 'string' ? teachingScope.trim() : '';
    const wantsTeachingScope = normalizedTeachingScope === 'mine';

    const shouldApplyTeachingScope =
      (hasTeacherRole && !isProgramHead) ||
      (hasTeacherRole && isProgramHead && wantsTeachingScope) ||
      (hasRegistrarRole && wantsTeachingScope);

    if (shouldApplyTeachingScope) {
      const employee = await employeeRepository.findOne({ where: { userId: req.user.id } });
      
      if (employee) {
        queryBuilder
          .distinct(true)
          .innerJoin('student.enrollments', 'teachingEnrollment')
          .innerJoin('teachingEnrollment.courseSection', 'teachingCourseSection')
          .innerJoin('teachingCourseSection.schedules', 'teachingSchedule')
          .andWhere('teachingSchedule.teacherId = :teacherId', { teacherId: employee.id })
          .andWhere('teachingSchedule.isActive = :teachingScheduleActive', { teachingScheduleActive: true })
          .andWhere('teachingEnrollment.status = :teachingEnrollmentStatus', { teachingEnrollmentStatus: 'ENROLLED' });
      } else {
        queryBuilder.andWhere('1 = 0');
      }
    }

    const requestedCourseCode = typeof courseCode === 'string' ? courseCode.trim() : '';
    if (requestedCourseCode) {
      queryBuilder.andWhere('course.courseCode = :courseCode', { courseCode: requestedCourseCode });
    }

    if (programHeadCourseCode && !shouldApplyTeachingScope) {
      queryBuilder.andWhere('course.courseCode = :programHeadCourseCode', { programHeadCourseCode });
    }

    // Add search functionality
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR student.studentId LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Dweezil's Code - Add sorting with support for user and gradeLevel fields
    const validSortFields = ['createdAt', 'updatedAt', 'enrollmentDate', 'gradeLevelId', 'studentId', 'user.lastName', 'user.firstName'];
    const sortByField = sortBy as string;
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    // Handle sorting by user fields (from joined table)
    if (sortByField === 'user.lastName') {
      queryBuilder = queryBuilder
        .orderBy('user.lastName', order)
        .addOrderBy('user.firstName', order);
    } else if (sortByField === 'user.firstName') {
      queryBuilder = queryBuilder
        .orderBy('user.firstName', order)
        .addOrderBy('user.lastName', order);
    } else if (sortByField === 'gradeLevelId') {
      // Dweezil's Code - Sort by grade level order (level_order field) instead of UUID
      // Use addSelect to ensure level_order is available for ordering in the subquery
      queryBuilder = queryBuilder
        .addSelect('gradeLevel.level_order')
        .orderBy('gradeLevel.level_order', order)
        .addOrderBy('user.lastName', 'ASC');
    } else {
      // Default to student table fields
      const sortField = validSortFields.includes(sortByField) ? sortByField : 'createdAt';
      queryBuilder = queryBuilder.orderBy(`student.${sortField}`, order);
    }

    // Get total count for pagination
    let totalCount = 0;
    let students: Student[] = [];
    try {
      totalCount = await queryBuilder.getCount();
      students = await queryBuilder
        .skip(offset)
        .take(limitNumber)
        .getMany();
    } catch {
      const fallback = await studentRepository.find({
        relations: ['user', 'gradeLevel'],
        order: { createdAt: order as 'ASC' | 'DESC' },
        skip: offset,
        take: limitNumber
      });
      students = fallback;
      totalCount = await studentRepository.count();
    }

    if (shouldApplyTeachingScope && req.user?.id && students.length > 0) {
      const employee = await employeeRepository.findOne({ where: { userId: req.user.id } });

      if (employee) {
        const studentIds = students.map(student => student.id);

        const subjectRows: Array<{ studentId: string; subjectCodes: string | null }> = await enrollmentRepository
          .createQueryBuilder('enrollment')
          .innerJoin('enrollment.courseSection', 'courseSection')
          .innerJoin(
            'courseSection.schedules',
            'schedule',
            'schedule.teacherId = :teacherId AND schedule.isActive = :scheduleActive',
            { teacherId: employee.id, scheduleActive: true }
          )
          .innerJoin('schedule.subject', 'subject')
          .select('enrollment.studentId', 'studentId')
          .addSelect(`GROUP_CONCAT(DISTINCT subject.code ORDER BY subject.code SEPARATOR ', ')`, 'subjectCodes')
          .where('enrollment.studentId IN (:...studentIds)', { studentIds })
          .andWhere('enrollment.status = :enrollmentStatus', { enrollmentStatus: 'ENROLLED' })
          .groupBy('enrollment.studentId')
          .getRawMany();

        const subjectMap = new Map<string, string>();
        subjectRows.forEach(row => {
          if (row.studentId) {
            subjectMap.set(row.studentId, row.subjectCodes || '');
          }
        });

        students = students.map(student => {
          const subjectCodes = subjectMap.get(student.id) || '';
          const teachingSubjects =
            subjectCodes.trim().length > 0
              ? subjectCodes.split(',').map(code => code.trim()).filter(Boolean)
              : [];

          return Object.assign(student, { teachingSubjects });
        });
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    res.json({
      success: true,
      data: students,
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
    console.error('❌ Error fetching students:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Check if it's a database connection error
    if (error instanceof Error && error.message.includes('Connection')) {
      console.error('❌ Database connection issue detected');
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Dweezil's Code - Get current student's own record (Issue #7)
// IMPORTANT: This route MUST be before /:id route to avoid Express matching "me" as an ID parameter
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Dweezil's Code - Load student with user, gradeLevel, and course relations
    const student = await studentRepository.findOne({
      where: { userId },
      relations: ['user', 'gradeLevel', 'course', 'course.department']
    });

    console.log('🔍 Student found:', {
      id: student?.id,
      courseId: student?.courseId,
      hasCourse: !!student?.course,
      courseName: student?.course?.name
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error: unknown) {
    console.error('Error fetching student record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student record'
    });
  }
});

/**
 * GET /api/students/profile
 * Get current student's profile (for logged in student)
 * Accessible by: STUDENT
 */
router.get('/profile', authenticateToken, requireRole(UserRole.STUDENT), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Find student associated with the logged-in user
    const student = await studentRepository.findOne({
      where: { userId: req.user?.id },
      relations: ['user', 'gradeLevel', 'enrollments']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student profile'
    });
  }
});

// Dweezil's Code - Get current student's own record
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const student = await studentRepository.findOne({
      where: { userId },
      relations: ['user', 'gradeLevel']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const latestEnrollment = await enrollmentRepository.findOne({
      where: { studentId: student.id },
      relations: ['course', 'course.department', 'courseSection'],
      order: { enrollmentDate: 'DESC' }
    });

    const responseData = {
      ...student,
      course: latestEnrollment?.course || null,
      courseSection: latestEnrollment?.courseSection || null
    };

    res.json({
      success: true,
      data: responseData
    });
  } catch (error: unknown) {
    console.error('Error fetching student record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student record'
    });
  }
});

/**
 * GET /api/students/:id
 * Get a specific student by ID
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/:id', authenticateToken, requireRoles([UserRole.ADMIN, UserRole.TEACHER, UserRole.REGISTRAR, UserRole.FINANCE]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // First try to find the student without relations
    const student = await studentRepository.findOne({
      where: { id }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Then fetch related data separately
    const user = await userRepository.findOne({ where: { id: student.userId } });
    const gradeLevel = await gradeLevelRepository.findOne({ where: { id: student.gradeLevelId } });
    // Dweezil's Code - Fetch course relation for displaying program in student details
    const course = student.courseId ? await courseRepository.findOne({ where: { id: student.courseId }, relations: ['department'] }) : null;

    // Fetch actual document submissions for this student
    const studentDocuments = await studentDocumentRepository.find({
      where: { studentId: id },
      relations: ['requirement', 'requirement.category'],
      order: { submittedAt: 'DESC' }
    });

    // Merge document requirements with actual submissions
    let mergedDocumentsRequired = student.documentsRequired || [];

    if (mergedDocumentsRequired.length > 0) {
      mergedDocumentsRequired = mergeDocumentRequirementsWithSubmissions(
        mergedDocumentsRequired,
        studentDocuments,
        student.documentsSubmitted || []
      );
    }

    // Combine the data
    const studentWithRelations = {
      ...student,
      user,
      gradeLevel,
      course, // Dweezil's Code - Include course relation
      documentsRequired: mergedDocumentsRequired
    };

    // Dweezil's Code - Issue #4: Debug log to check registrationNotes
    console.log('🔍 GET /api/students/:id - Student data being returned:', {
      id: studentWithRelations.id,
      registrationNotes: studentWithRelations.registrationNotes,
      notes: studentWithRelations.notes
    });

    res.json({
      success: true,
      data: studentWithRelations
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student'
    });
  }
});

/**
 * GET /api/students/grade/:gradeLevel
 * Get students by grade level
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/grade/:gradeLevel', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gradeLevel } = req.params;
    const { status = StudentStatus.ENROLLED } = req.query;

    const whereConditions: StudentFilterCondition = {
      gradeLevelId: `grade-${gradeLevel}`,
      status: status as StudentStatus
    };

    // Note: section filtering removed as Student entity doesn't have section property

    const students = await studentRepository.find({
      where: whereConditions,
      relations: ['user', 'gradeLevel'],
      order: {
        user: {
          lastName: 'ASC',
          firstName: 'ASC'
        }
      }
    });

    res.json({
      success: true,
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching students by grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students by grade level'
    });
  }
});

/**
 * POST /api/students/pre-register
 * Create a pre-registration record for a new student
 * Accessible by: REGISTRAR
 */
router.post('/pre-register', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🚨 PRE-REGISTRATION ROUTE CALLED! 🚨');
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      userId,
      firstName,
      lastName,
      middleInitial,
      email,
      username: requestedUsername,
      password: requestedPassword,
      dateOfBirth,
      gender,
      address,
      phoneNumber,
      guardianName,
      guardianPhone,
      guardianEmail,
      emergencyContact,
      emergencyPhone,
      medicalInfo,
      notes,
      registrationNotes
    } = req.body;

    const selectedUserId = typeof userId === 'string' ? userId.trim() : '';
    const normalizedFirstName = typeof firstName === 'string' ? firstName.trim().toUpperCase() : '';
    const normalizedLastName = typeof lastName === 'string' ? lastName.trim().toUpperCase() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedMiddleInitial =
      typeof middleInitial === 'string' && middleInitial.trim()
        ? middleInitial.trim().toUpperCase()
        : null;
    const normalizedRequestedUsername = typeof requestedUsername === 'string' ? requestedUsername.trim() : '';
    const normalizedRequestedPassword = typeof requestedPassword === 'string' ? requestedPassword : '';
    
    console.log('🔍 Extracted phoneNumber:', phoneNumber);

    console.log('Pre-registration request received:', {
      userId: selectedUserId || undefined,
      firstName: normalizedFirstName || undefined,
      lastName: normalizedLastName || undefined,
      email: normalizedEmail || undefined,
      dateOfBirth,
      gender
    });

    // Validate required fields
    if (!dateOfBirth || !gender || !address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: dateOfBirth, gender, address'
      });
    }

    if (!selectedUserId) {
      if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: firstName, lastName, email'
        });
      }

      // Check if user with email already exists
      const existingUser = await userRepository.findOne({ where: { email: normalizedEmail } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    // Generate temporary ID
    console.log('🔍 DEBUG: Starting temporary ID generation...');
    let temporaryId = generateTemporaryId();
    console.log('🔍 DEBUG: Generated temporary ID:', temporaryId);
    
    // Ensure temporary ID is unique
    let existingTempId = await studentRepository.findOne({ where: { temporaryId } });
    console.log('🔍 DEBUG: Checking if temporary ID exists:', existingTempId ? 'YES' : 'NO');
    while (existingTempId) {
      temporaryId = generateTemporaryId();
      console.log('🔍 DEBUG: Regenerated temporary ID:', temporaryId);
      existingTempId = await studentRepository.findOne({ where: { temporaryId } });
    }
    console.log('🔍 DEBUG: Final unique temporary ID:', temporaryId);

    // Use database transaction to ensure atomicity
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('🔍 DEBUG: Starting database transaction...');
      let savedUser: User;

      if (selectedUserId) {
        const existing = await queryRunner.manager.findOne(User, {
          where: { id: selectedUserId },
          relations: ['student']
        });

        if (!existing) {
          await queryRunner.rollbackTransaction();
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (existing.role !== UserRole.STUDENT) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({ success: false, message: 'User must have STUDENT role' });
        }

        const existingStudent = await queryRunner.manager.findOne(Student, { where: { userId: existing.id } });
        if (existingStudent) {
          await queryRunner.rollbackTransaction();
          const studentWithUser = await studentRepository.findOne({
            where: { id: existingStudent.id },
            relations: ['user']
          });
          return res.status(200).json({
            success: true,
            message: 'User already has a student record',
            data: studentWithUser
          });
        }

        savedUser = existing;
        console.log('🔍 DEBUG: Using existing user for pre-registration:', savedUser.id);
      } else {
        const baseUsername = normalizedRequestedUsername || normalizedEmail.split('@')[0];
        let username = baseUsername;
        let counter = 1;

        while (await queryRunner.manager.findOne(User, { where: { username } })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        const rawPassword = normalizedRequestedPassword || 'Asdf.1234';
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);

        const newUser = queryRunner.manager.create(User, {
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          middleInitial: normalizedMiddleInitial,
          email: normalizedEmail,
          username,
          password: hashedPassword,
          position: 'Student',
          role: UserRole.STUDENT,
          isActive: false
        });

        savedUser = await queryRunner.manager.save(newUser);
        console.log('🔍 DEBUG: User created successfully in transaction:', savedUser.id);
      }

      // Fetch document requirements dynamically
      console.log('🔍 DEBUG: Fetching document requirements for registration...');
      let documentsRequired = req.body.documentsRequired;

      if (!documentsRequired || !Array.isArray(documentsRequired) || documentsRequired.length === 0) {
        try {
          documentsRequired = await fetchDocumentRequirementsForRegistration();
          console.log('🔍 DEBUG: Fetched', documentsRequired.length, 'document requirements from database');
          
          // If no requirements found, use defaults as fallback
          if (documentsRequired.length === 0) {
            console.log('🔍 DEBUG: No document requirements found, using defaults');
            documentsRequired = getDefaultDocumentRequirements();
          }
        } catch (error) {
          console.error('🚨 ERROR: Failed to fetch document requirements, using defaults:', error);
          documentsRequired = getDefaultDocumentRequirements();
        }
      } else {
        console.log('🔍 DEBUG: Using provided document requirements:', documentsRequired.length);
      }

      // Create student pre-registration record within transaction
      console.log('🔍 DEBUG: Creating student record with temporaryId:', temporaryId);
      const newStudent = queryRunner.manager.create(Student, {
        temporaryId,
        // studentId should be null for pre-registered students - only set when fully registered
        userId: savedUser.id,
        dateOfBirth: new Date(dateOfBirth),
        gender: gender as Gender,
        address,
        phoneNumber,
        guardianName,
        guardianPhone,
        guardianEmail,
        emergencyContact,
        emergencyPhone,
        medicalInfo,
        notes,
        registrationNotes,
        status: StudentStatus.PRE_REGISTERED,
        registrationStatus: RegistrationStatus.PRE_REGISTERED,
        documentsRequired: documentsRequired,
        documentsSubmitted: [],
        balance: 0
        // gradeLevelId and enrollmentDate should also be null for pre-registered students
      });

      console.log('🔍 DEBUG: Student object before save:', {
        temporaryId: newStudent.temporaryId,
        studentId: newStudent.studentId,
        userId: newStudent.userId
      });

      const savedStudent = await queryRunner.manager.save(newStudent);
      console.log('🔍 DEBUG: Student created successfully in transaction:', savedStudent.id);
      
      console.log('🔍 DEBUG: Student object after save:', {
        id: savedStudent.id,
        temporaryId: savedStudent.temporaryId,
        studentId: savedStudent.studentId,
        userId: savedStudent.userId
      });

      // Commit the transaction
      await queryRunner.commitTransaction();
      console.log('🔍 DEBUG: Transaction committed successfully');

      // Return the created pre-registration record
      const studentWithUser = await studentRepository.findOne({
        where: { id: savedStudent.id },
        relations: ['user']
      });

      res.status(201).json({
        success: true,
        message: 'Pre-registration created successfully',
        data: studentWithUser
      });

    } catch (transactionError) {
      // Rollback the transaction on error
      console.error('🚨 DEBUG: Transaction error, rolling back:', transactionError);
      await queryRunner.rollbackTransaction();
      
      // Re-throw the error to be caught by the outer catch block
      throw transactionError;
    } finally {
      // Release the query runner
      await queryRunner.release();
      console.log('🔍 DEBUG: Query runner released');
    }



  } catch (error) {
    console.error('🚨 ERROR: Pre-registration failed:', error);
    console.error('🚨 ERROR Type:', typeof error);
    console.error('🚨 ERROR Constructor:', error?.constructor?.name);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to create pre-registration';
    let statusCode = 500;
    
    if (error instanceof Error) {
      console.error('🚨 ERROR is instance of Error');
      console.error('🚨 ERROR Message:', error.message);
      console.error('🚨 ERROR Name:', error.name);
      console.error('🚨 ERROR Stack:', error.stack);
      
      // Check for specific database constraint violations
      if (error.message.includes('Duplicate entry') && error.message.includes('email')) {
        errorMessage = 'A user with this email already exists';
        statusCode = 400;
      } else if (error.message.includes('Duplicate entry') && error.message.includes('temporaryId')) {
        errorMessage = 'Temporary ID generation failed. Please try again.';
        statusCode = 500;
      } else if (error.message.includes('Data too long')) {
        errorMessage = 'One or more fields exceed the maximum allowed length';
        statusCode = 400;
      } else if (error.message.includes('cannot be null')) {
        errorMessage = 'Required field is missing or invalid';
        statusCode = 400;
      } else if (error.message.includes('Unknown column')) {
        errorMessage = 'Database schema error - please contact administrator';
        statusCode = 500;
      } else if (error.message.includes('Connection')) {
        errorMessage = 'Database connection error - please try again';
        statusCode = 500;
      }
      
      console.error('🚨 ERROR Details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      console.error('🚨 ERROR is NOT instance of Error, raw error:', error);
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});

/**
 * GET /api/students/pre-registered
 * Get all pre-registered students
 * Accessible by: REGISTRAR
 */
router.get('/pre-registered', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const offset = (pageNumber - 1) * limitNumber;

    let queryBuilder = studentRepository.createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .where('student.registrationStatus = :status', { status: RegistrationStatus.PRE_REGISTERED });

    // Add search functionality
    if (search) {
      queryBuilder = queryBuilder.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search OR student.temporaryId LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const validSortFields = ['createdAt', 'updatedAt', 'temporaryId'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    queryBuilder = queryBuilder.orderBy(`student.${sortField}`, order);

    // Get total count
    const totalCount = await queryBuilder.getCount();

    // Apply pagination
    const students = await queryBuilder
      .skip(offset)
      .take(limitNumber)
      .getMany();

    const totalPages = Math.ceil(totalCount / limitNumber);

    console.log(`Retrieved ${students.length} pre-registered students`);

    res.json({
      success: true,
      data: students,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalCount,
        limit: limitNumber
      }
    });

  } catch (error) {
    console.error('Error fetching pre-registered students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pre-registered students',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/students
 * Create a new student
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/generate-id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  const { courseId, year } = req.body as { courseId?: string; year?: number };

  if (!courseId) {
    return res.status(400).json({
      success: false,
      message: 'courseId is required'
    });
  }

  const parsedYear = year === undefined || year === null ? undefined : Number(year);
  if (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100)) {
    return res.status(400).json({
      success: false,
      message: 'year must be a valid 4-digit year'
    });
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const studentId = await StudentIdService.previewStudentId({ queryRunner, courseId, year: parsedYear });
    return res.json({
      success: true,
      data: { studentId }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate student ID';
    return res.status(400).json({
      success: false,
      message
    });
  } finally {
    await queryRunner.release();
  }
});

router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      userId,
      studentId,
      dateOfBirth,
      gender,
      address,
      phone, // Dweezil's Code - Accept 'phone' from frontend
      phoneNumber, // Also accept phoneNumber for backward compatibility
      guardianName,
      guardianPhone,
      guardianEmail,
      emergencyContact,
      emergencyPhone,
      gradeLevelId,
      medicalInfo,
      notes, // Dweezil's Code - Add notes field
      enrollmentDate,
      courseId,
      status = StudentStatus.PRE_REGISTERED,
      registrationStatus = RegistrationStatus.PRE_REGISTERED,
      password // Dweezil's Code - Accept password from frontend for email
    } = req.body;

    // Dweezil's Code - Map 'phone' to 'phoneNumber' if phone is provided
    const finalPhoneNumber = phone || phoneNumber;

    // DEBUG: Log all received data
    console.log('🔍 POST /api/students - Full request body:', JSON.stringify(req.body, null, 2));
    console.log('📞 POST /api/students - phone received:', phone);
    console.log('📞 POST /api/students - phoneNumber received:', phoneNumber);
    console.log('📞 POST /api/students - finalPhoneNumber:', finalPhoneNumber);
    console.log('🔑 POST /api/students - password received:', password ? '***' : 'undefined');
    console.log('📝 POST /api/students - notes received:', notes);
    console.log('📋 POST /api/students - registrationStatus received:', registrationStatus);
    console.log('📊 POST /api/students - status received:', status);

    // Validate required fields based on registration status
    const isPreRegistration = registrationStatus === RegistrationStatus.PRE_REGISTERED;
    
    if (isPreRegistration) {
      // For pre-registration, only personal information is required
      if (!userId || !dateOfBirth || !gender || !address) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for pre-registration: userId, dateOfBirth, gender, address'
        });
      }
    } else {
      // For full registration, all fields are required
      if (!userId || !dateOfBirth || !gender || !address || !courseId ||
          !guardianName || !guardianPhone || !emergencyContact || !emergencyPhone || !gradeLevelId || !enrollmentDate) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, dateOfBirth, gender, address, courseId, guardianName, guardianPhone, emergencyContact, emergencyPhone, gradeLevelId, enrollmentDate'
        });
      }
    }

    // Validate gender enum
    if (!Object.values(Gender).includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender. Must be MALE, FEMALE, or OTHER'
      });
    }

    // Validate status enum
    if (status && !Object.values(StudentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ENROLLED or PRE_REGISTERED'
      });
    }

    // Validate registration status enum
    if (registrationStatus && !Object.values(RegistrationStatus).includes(registrationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration status. Must be PRE_REGISTERED, REGISTERED, or WITHDRAWN'
      });
    }

    // Check if user exists and has STUDENT role
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== UserRole.STUDENT) {
      return res.status(400).json({
        success: false,
        message: 'User must have STUDENT role'
      });
    }

    // Check if student ID already exists (only if studentId is provided)
    if (studentId) {
      const existingStudent = await studentRepository.findOne({ where: { studentId } });
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    // Check if user already has a student record
    const existingUserStudent = await studentRepository.findOne({ where: { userId } });
    if (existingUserStudent) {
      return res.status(200).json({
        success: true,
        message: 'User already has a student record',
        data: existingUserStudent
      });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let finalStudentId = studentId;
    let finalIdCode = undefined;
    try {
      if (!isPreRegistration) {
        if (!courseId) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({
            success: false,
            message: 'courseId is required to auto-generate Student ID'
          });
        }

        const course = await queryRunner.manager.findOne(Course, { where: { id: courseId } });
        if (course) {
          finalIdCode = course.idCode;
        }

        finalStudentId = await StudentIdService.allocateStudentId({ queryRunner, courseId });
      }

      // Create new student with conditional fields
      const studentData: Partial<Student> = {
        userId,
        studentId: finalStudentId,
        idCode: finalIdCode,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        address,
        registrationStatus,
        status
      };

      // Add optional fields only if provided
      if (finalPhoneNumber) studentData.phoneNumber = finalPhoneNumber; // Dweezil's Code - Use finalPhoneNumber
      if (guardianName) studentData.guardianName = guardianName;
      if (guardianPhone) studentData.guardianPhone = guardianPhone;
      if (guardianEmail) studentData.guardianEmail = guardianEmail;
      if (emergencyContact) studentData.emergencyContact = emergencyContact;
      if (emergencyPhone) studentData.emergencyPhone = emergencyPhone;
      if (gradeLevelId) studentData.gradeLevelId = gradeLevelId;
      if (medicalInfo) studentData.medicalInfo = medicalInfo;
      if (notes) studentData.notes = notes; // Dweezil's Code - Add notes field
      if (enrollmentDate) studentData.enrollmentDate = new Date(enrollmentDate);
      if (courseId) studentData.courseId = courseId;

      // DEBUG: Log final studentData before saving
      console.log('💾 POST /api/students - Final studentData:', JSON.stringify(studentData, null, 2));
      console.log('📞 POST /api/students - phoneNumber in studentData:', studentData.phoneNumber);
      console.log('📝 POST /api/students - notes in studentData:', studentData.notes);
      console.log('📋 POST /api/students - registrationStatus in studentData:', studentData.registrationStatus);
      console.log('📊 POST /api/students - status in studentData:', studentData.status);

      const newStudent = queryRunner.manager.create(Student, studentData);

      const savedStudent = await queryRunner.manager.save(newStudent) as unknown as Student;

      await queryRunner.commitTransaction();

      // Fetch the complete student record with user data
      const completeStudent = await studentRepository.findOne({
        where: { id: savedStudent.id },
        relations: ['user']
      });

      // Activate user account and send credentials email when creating student with REGISTERED status
      if (registrationStatus === RegistrationStatus.REGISTERED && completeStudent?.user) {
        // Activate user account
        completeStudent.user.isActive = true;
        await userRepository.save(completeStudent.user);
        console.log('✅ User account activated for new student:', completeStudent.id);
        
        // Send credentials email
        try {
          // Use the password from request body, fallback to TempPass123! if not provided
          const actualPassword = password || 'TempPass123!';
          
          const emailSent = await emailService.sendStudentCredentials({
            firstName: completeStudent.user.firstName,
            lastName: completeStudent.user.lastName,
            email: completeStudent.user.email,
            username: completeStudent.user.username,
            password: actualPassword, // Use the actual password from form
            studentId: completeStudent.studentId
          });
          
          if (emailSent) {
            console.log('✅ Credentials email sent to:', completeStudent.user.email);
          } else {
            console.warn('⚠️ Failed to send credentials email to:', completeStudent.user.email);
          }
        } catch (emailError) {
          console.error('❌ Error sending credentials email:', emailError);
          // Don't fail the creation if email fails
        }
      }

      const message = isPreRegistration ? 
        'Student pre-registered successfully. Complete registration later to enroll.' : 
        'Student created successfully';

      res.status(201).json({
        success: true,
        message,
        data: completeStudent
      });
    } catch (transactionError) {
      await queryRunner.rollbackTransaction();
      throw transactionError;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/students/:id
 * Partially update a student (for quick status updates, etc.)
 * Accessible by: ADMIN, REGISTRAR
 * Dweezil's Code - Added PATCH endpoint for partial updates
 */
router.patch('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🔄 PATCH /api/students/:id - Student ID:', id);
    console.log('📝 PATCH /api/students/:id - Request body:', JSON.stringify(req.body, null, 2));
    
    const student = await studentRepository.findOne({ where: { id }, relations: ['user', 'gradeLevel'] });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update only the fields that are provided
    const {
      registrationStatus,
      status,
      gradeLevelId,
      courseId,
      notes,
      registrationNotes
    } = req.body;

    // Validate and update registration status if provided
    if (registrationStatus) {
      if (!Object.values(RegistrationStatus).includes(registrationStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registration status'
        });
      }
      
      student.registrationStatus = registrationStatus;
      console.log(`✅ Updated registrationStatus to: ${registrationStatus}`);
    }

    // Validate and update student status if provided
    if (status) {
      if (!Object.values(StudentStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student status'
        });
      }
      student.status = status;
      console.log(`✅ Updated status to: ${status}`);
    }

    // Update grade level if provided
    if (gradeLevelId) {
      student.gradeLevelId = gradeLevelId;
      console.log(`✅ Updated gradeLevelId to: ${gradeLevelId}`);
    }

    // Update course if provided
    if (courseId) {
      student.courseId = courseId;
      const course = await courseRepository.findOne({ where: { id: courseId } });
      if (course) {
        student.idCode = course.idCode;
      }
      console.log(`✅ Updated courseId to: ${courseId}`);
    }

    // Update notes if provided
    if (notes !== undefined) {
      student.notes = notes;
    }

    // Update registration notes if provided
    if (registrationNotes !== undefined) {
      student.registrationNotes = registrationNotes;
    }

    await studentRepository.save(student);
    console.log('✅ Student updated successfully');

    // Fetch complete student with relations
    const completeStudent = await studentRepository.findOne({
      where: { id },
      relations: ['user', 'gradeLevel', 'course']
    });

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: completeStudent
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student'
    });
  }
});

/**
 * PUT /api/students/:id
 * Update a student
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log('🔄 PUT /api/students/:id - Student ID:', id);
    console.log('📝 PUT /api/students/:id - Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      studentId,
      dateOfBirth,
      gender,
      address,
      phoneNumber,
      emergencyContact,
      emergencyPhone,
      enrollmentDate,
      status,
      registrationStatus,
      gradeLevelId,
      guardianName,
      guardianPhone,
      guardianEmail,
      medicalInfo,
      notes,
      // Dweezil's Code - Issue #4: Add registrationNotes field support
      registrationNotes,
      // Dweezil's Code - Add courseId for enrollment creation
      courseId
    } = req.body;

    // DEBUG: Log phoneNumber specifically for PUT
    console.log('📞 PUT /api/students/:id - phoneNumber received:', phoneNumber);
    console.log('📞 PUT /api/students/:id - phoneNumber type:', typeof phoneNumber);

    const student = await studentRepository.findOne({ where: { id }, relations: ['user'] });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Dweezil's Code - Issue #3 & #4: Track previous status for email notification
    const previousStatus = student.registrationStatus;

    // Validate gender enum if provided
    if (gender && !Object.values(Gender).includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gender. Must be MALE, FEMALE, or OTHER'
      });
    }

    // Validate status enum if provided
    if (status && !Object.values(StudentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ENROLLED or PRE_REGISTERED'
      });
    }

    // Validate registration status enum if provided
    if (registrationStatus && !Object.values(RegistrationStatus).includes(registrationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration status. Must be PRE_REGISTERED, REGISTERED, or WITHDRAWN'
      });
    }

    // Completing registration requires at least one uploaded document.
    if (registrationStatus && 
        registrationStatus === RegistrationStatus.REGISTERED) {
      
      // Only validate if transitioning to REGISTERED (not if already there)
      const isTransitioning = previousStatus !== registrationStatus;
      
      if (isTransitioning) {
        console.log('📋 Validating documents before status progression to:', registrationStatus);
        const documentValidation = await validateStudentDocuments(
          student.id, 
          gradeLevelId || student.gradeLevelId,
          registrationStatus
        );
        
        if (!documentValidation.isValid) {
          console.log('❌ Document validation failed:', documentValidation.message);
          return res.status(400).json({
            success: false,
            message: documentValidation.message || 'At least one document must be uploaded',
            missingDocuments: documentValidation.missingDocuments,
            unverifiedDocuments: documentValidation.unverifiedDocuments,
            requiresDocuments: true
          });
        }
        
        console.log('✅ Document validation passed');
      }
    }

    // Validate gradeLevelId if provided
    if (gradeLevelId) {
      console.log('🔍 Validating gradeLevelId:', gradeLevelId);
      const gradeLevel = await gradeLevelRepository.findOne({ where: { id: gradeLevelId } });
      console.log('📊 Found grade level:', gradeLevel ? gradeLevel.name : 'NOT FOUND');
      if (!gradeLevel) {
        console.log('❌ Grade level validation failed');
        return res.status(400).json({
          success: false,
          message: 'Invalid grade level ID. Grade level not found'
        });
      }
      console.log('✅ Grade level validation passed');
    }

    // Check if new student ID already exists (if being changed)
    if (studentId && studentId !== student.studentId) {
      const existingStudent = await studentRepository.findOne({ where: { studentId } });
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    // Update student fields
    if (studentId) student.studentId = studentId;
    if (dateOfBirth) student.dateOfBirth = new Date(dateOfBirth);
    if (gender) student.gender = gender;
    if (address) student.address = address;
    if (phoneNumber !== undefined) student.phoneNumber = phoneNumber;
    if (emergencyContact) student.emergencyContact = emergencyContact;
    if (emergencyPhone) student.emergencyPhone = emergencyPhone;
    if (gradeLevelId) student.gradeLevelId = gradeLevelId;
    if (enrollmentDate) student.enrollmentDate = new Date(enrollmentDate);
    if (status) student.status = status;
    if (registrationStatus) student.registrationStatus = registrationStatus;
    if (guardianName !== undefined) student.guardianName = guardianName;
    if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
    if (guardianEmail !== undefined) student.guardianEmail = guardianEmail;
    if (medicalInfo !== undefined) student.medicalInfo = medicalInfo;
    if (notes !== undefined) student.notes = notes;
    // Dweezil's Code - Issue #4: Save registrationNotes (Remarks field)
    if (registrationNotes !== undefined) student.registrationNotes = registrationNotes;
    // Dweezil's Code - Save courseId for temporary storage
    if (courseId !== undefined) {
      student.courseId = courseId;
      if (courseId) {
        const course = await courseRepository.findOne({ where: { id: courseId } });
        if (course) {
          student.idCode = course.idCode;
        }
      }
    }
    
    // Dweezil's Code - Don't update documentsRequired/documentsSubmitted JSON fields
    // These are legacy fields that are now managed via the student_documents table
    // Keeping them in the entity for backward compatibility but not updating them
    console.log('📋 Skipping documentsRequired/documentsSubmitted update - managed via student_documents table');

    // DEBUG: Log student object before saving
    console.log('💾 PUT /api/students/:id - Student before save:', JSON.stringify({
      id: student.id,
      phoneNumber: student.phoneNumber,
      address: student.address,
      studentId: student.studentId,
      registrationStatus: student.registrationStatus
    }, null, 2));

    console.log('💾 Saving student updates...');
    
    // Dweezil's Code - Wrap save in try-catch for better error handling
    let updatedStudent;
    try {
      updatedStudent = await studentRepository.save(student);
      console.log('✅ Student saved successfully');
    } catch (saveError) {
      console.error('❌ Error saving student:', saveError);
      console.error('📋 Student data that failed to save:', {
        id: student.id,
        registrationStatus: student.registrationStatus,
        gradeLevelId: student.gradeLevelId,
        courseId: student.courseId
      });
      throw saveError; // Re-throw to be caught by outer catch
    }

    // Fetch the complete student record with user data and grade level
    console.log('🔍 Fetching complete student record...');
    const completeStudent = await studentRepository.findOne({
      where: { id: updatedStudent.id },
      relations: ['user', 'gradeLevel']
    });
    console.log('📊 Complete student record:', completeStudent ? 'Found' : 'NOT FOUND');

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: completeStudent
    });
  } catch (error) {
    console.error('❌ Error updating student:', error);
    console.error('📋 Error details:', error.message);
    console.error('🔍 Error stack:', error.stack);
    const errorAny = error as { code?: string; errno?: number; sqlMessage?: string; message?: string };
    if (errorAny?.code === 'ER_DUP_ENTRY') {
      const sqlMessage = String(errorAny.sqlMessage || errorAny.message || '');
      if (sqlMessage.toLowerCase().includes('users') && sqlMessage.toLowerCase().includes('username')) {
        return res.status(409).json({
          success: false,
          message: 'Username already exists'
        });
      }
      if (sqlMessage.toLowerCase().includes('users') && sqlMessage.toLowerCase().includes('email')) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update student'
    });
  }
});

/**
 * DELETE /api/students/:id
 * Delete a student (soft delete by setting status to INACTIVE)
 * Accessible by: ADMIN, REGISTRAR
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const student = await studentRepository.findOne({ where: { id } });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (permanent === 'true') {
      // Hard delete (only for ADMIN)
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can permanently delete students'
        });
      }
      
      await studentRepository.remove(student);
      
      res.json({
        success: true,
        message: 'Student permanently deleted'
      });
    } else {
      // Soft delete (set status to PRE_REGISTERED)
      student.status = StudentStatus.PRE_REGISTERED;
      await studentRepository.save(student);
      
      res.json({
        success: true,
        message: 'Student deactivated successfully',
        data: student
      });
    }
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student'
    });
  }
});

/**
 * PATCH /api/students/:id/status
 * Update student status
 * Accessible by: ADMIN, REGISTRAR
 */
router.patch('/:id/status', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!Object.values(StudentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be ENROLLED or PRE_REGISTERED'
      });
    }

    const student = await studentRepository.findOne({ where: { id } });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    student.status = status;
    
    // Synchronize registrationStatus with status
    if (status === StudentStatus.ENROLLED) {
      student.registrationStatus = RegistrationStatus.REGISTERED;
    } else if (status === StudentStatus.PRE_REGISTERED) {
      student.registrationStatus = RegistrationStatus.PRE_REGISTERED;
    }
    
    const updatedStudent = await studentRepository.save(student);

    res.json({
      success: true,
      message: 'Student status updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Error updating student status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student status'
    });
  }
});

/**
 * POST /api/students/sync
 * Synchronize existing STUDENT users with students table
 * Creates Student records for users with STUDENT role who don't have corresponding student records
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/sync', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Find all users with STUDENT role
    const studentUsers = await userRepository.find({
      where: { role: UserRole.STUDENT, isActive: true }
    });

    if (studentUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No STUDENT users found to synchronize',
        data: { created: 0, existing: 0 }
      });
    }

    // Find existing student records
    const existingStudents = await studentRepository.find({
      select: ['userId']
    });
    const existingUserIds = new Set(existingStudents.map(s => s.userId));

    // Filter users who don't have student records
    const usersNeedingStudentRecords = studentUsers.filter(user => !existingUserIds.has(user.id));

    if (usersNeedingStudentRecords.length === 0) {
      return res.json({
        success: true,
        message: 'All STUDENT users already have corresponding student records',
        data: { created: 0, existing: studentUsers.length }
      });
    }

    // Create student records with default values
    const createdStudents = [];
    
    for (const user of usersNeedingStudentRecords) {
      const newStudent = studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'), // Default date - should be updated later
        gender: Gender.OTHER, // Default gender - should be updated later
        address: 'Address not provided', // Default address
        phoneNumber: null,
        emergencyContact: 'Emergency contact not provided', // Default emergency contact
        emergencyPhone: '000-000-0000', // Default emergency phone
        gradeLevelId: null, // Default grade level - should be updated later
        enrollmentDate: new Date(), // Current date as enrollment date
        status: StudentStatus.PRE_REGISTERED,
        registrationStatus: RegistrationStatus.PRE_REGISTERED
      });

      const savedStudent = await studentRepository.save(newStudent);
      createdStudents.push(savedStudent);
    }

    res.json({
      success: true,
      message: `Successfully synchronized ${createdStudents.length} STUDENT users`,
      data: {
        created: createdStudents.length,
        existing: studentUsers.length - createdStudents.length,
        createdStudents: createdStudents.map((s) => ({
          id: s.id,
          studentId: s.studentId,
          userId: s.userId,
          status: s.status
        }))
      }
    });
  } catch (error) {
    console.error('Error synchronizing students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to synchronize students'
    });
  }
});

/**
 * PATCH /api/students/:id/upgrade
 * Upgrade a pre-registered student to full registration
 * Accessible by: ADMIN, REGISTRAR
 */
router.patch('/:id/upgrade', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      studentId,
      emergencyContact,
      emergencyPhone,
      gradeLevel,
      enrollmentDate,
      courseId
    } = req.body;

    // Validate required fields for upgrade
    if (!emergencyContact || !emergencyPhone || !gradeLevel || !enrollmentDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for upgrade: emergencyContact, emergencyPhone, gradeLevel, enrollmentDate'
      });
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      const student = await queryRunner.manager.findOne(Student, { where: { id } });
      
      if (!student) {
        await queryRunner.rollbackTransaction();
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Check if student is in pre-registered status
      if (student.registrationStatus !== RegistrationStatus.PRE_REGISTERED) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({
          success: false,
          message: 'Student is not in pre-registered status and cannot be upgraded'
        });
      }

      const effectiveCourseId = courseId || student.courseId;
      let finalStudentId = studentId;

      if (effectiveCourseId) {
        const course = await queryRunner.manager.findOne(Course, { where: { id: effectiveCourseId } });
        if (course) {
          student.idCode = course.idCode;
        }
      }

      if (!finalStudentId) {
        if (!effectiveCourseId) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({
            success: false,
            message: 'courseId is required to auto-generate Student ID'
          });
        }
        finalStudentId = await StudentIdService.allocateStudentId({ queryRunner, courseId: effectiveCourseId });
      } else if (finalStudentId !== student.studentId) {
        const existingStudent = await queryRunner.manager.findOne(Student, { where: { studentId: finalStudentId } });
        if (existingStudent) {
          await queryRunner.rollbackTransaction();
          return res.status(409).json({
            success: false,
            message: 'Student ID already exists'
          });
        }
      }

      // Update student to full registration
      student.studentId = finalStudentId;
      student.emergencyContact = emergencyContact;
      student.emergencyPhone = emergencyPhone;
      student.gradeLevelId = gradeLevel;
      student.enrollmentDate = new Date(enrollmentDate);
      student.registrationStatus = RegistrationStatus.REGISTERED;
      student.status = StudentStatus.ENROLLED;
      if (courseId) student.courseId = courseId;

      const updatedStudent = await queryRunner.manager.save(student);
      await queryRunner.commitTransaction();

      // Fetch the complete student record with user data
      const completeStudent = await studentRepository.findOne({
        where: { id: updatedStudent.id },
        relations: ['user']
      });

      res.json({
        success: true,
        message: 'Student upgraded to full registration successfully',
        data: completeStudent
      });
    } catch (transactionError) {
      await queryRunner.rollbackTransaction();
      throw transactionError;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('Error upgrading student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade student'
    });
  }
});

// Configure multer for document uploads
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    // Allow document file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, DOC, and DOCX files are allowed.'));
    }
  },
});

/**
 * POST /api/students/:id/documents
 * Upload a document for a student
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/:id/documents', authenticateToken, requireRole(UserRole.REGISTRAR), documentUpload.single('file') as unknown as RequestHandler, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file provided'
      });
    }

    // Check if documentType is provided
    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required'
      });
    }

    // Check Vercel Blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return res.status(500).json({
        success: false,
        message: 'File storage not configured'
      });
    }

    // Find the student
    const student = await studentRepository.findOne({
      where: { id },
      relations: ['user']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Parse existing documents
    let documentsRequired = student.documentsRequired || getDefaultDocumentRequirements();
    if (typeof documentsRequired === 'string') {
      try {
        documentsRequired = JSON.parse(documentsRequired);
      } catch (_error: unknown) {
        documentsRequired = getDefaultDocumentRequirements();
      }
    }

    // Find the document to update
    const documentIndex = documentsRequired.findIndex((doc: DocumentRequirement) => doc.type === documentType);
    if (documentIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    // Delete old document file if it exists
    const existingDoc = documentsRequired[documentIndex];
    if (existingDoc.fileUrl) {
      try {
        await del(existingDoc.fileUrl);
        console.log(`Deleted old document: ${existingDoc.fileUrl}`);
      } catch (error) {
        console.warn('Failed to delete old document:', error);
        // Continue with upload even if old file deletion fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = req.file.originalname.split('.').pop() || 'pdf';
    const filename = `documents/student-${id}-${documentType}-${timestamp}.${fileExtension}`;

    // Upload to Vercel Blob
    const blob = await put(filename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    // Update the document in the array
    documentsRequired[documentIndex] = {
      ...existingDoc,
      submitted: true,
      submittedDate: new Date(),
      notes: `File: ${req.file.originalname}`,
      fileUrl: blob.url,
      fileName: req.file.originalname,
      fileSize: req.file.size
    };

    // Update student record
    await studentRepository.update(id, {
      documentsRequired: documentsRequired
    });

    console.log(`Document uploaded for student ${id}: ${blob.url}`);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        fileUrl: blob.url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        documentType: documentType
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 10MB.'
        });
      }
    }

    // Handle file type errors
    if (error instanceof Error && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload document'
    });
  }
});

/**
 * DELETE /api/students/:id/documents/:documentType
 * Delete a document for a student
 * Accessible by: ADMIN, REGISTRAR
 */
router.delete('/:id/documents/:documentType', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, documentType } = req.params;

    // Check Vercel Blob token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return res.status(500).json({
        success: false,
        message: 'File storage not configured'
      });
    }

    // Find the student
    const student = await studentRepository.findOne({
      where: { id },
      relations: ['user']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Parse existing documents
    let documentsRequired = student.documentsRequired || getDefaultDocumentRequirements();
    if (typeof documentsRequired === 'string') {
      try {
        documentsRequired = JSON.parse(documentsRequired);
      } catch (_error: unknown) {
        documentsRequired = getDefaultDocumentRequirements();
      }
    }

    // Find the document to delete
    const documentIndex = documentsRequired.findIndex((doc: DocumentRequirement) => doc.type === documentType);
    if (documentIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type'
      });
    }

    const documentToDelete = documentsRequired[documentIndex];
    
    // Delete file from Vercel Blob if it exists
    if (documentToDelete.fileUrl) {
      try {
        await del(documentToDelete.fileUrl);
        console.log(`Deleted document: ${documentToDelete.fileUrl}`);
      } catch (error) {
        console.warn('Failed to delete document from blob storage:', error);
        // Continue with database update even if blob deletion fails
      }
    }

    // Update the document in the array
    documentsRequired[documentIndex] = {
      ...documentToDelete,
      submitted: false,
      submittedDate: undefined,
      notes: undefined,
      fileUrl: undefined,
      fileName: undefined,
      fileSize: undefined
    };

    // Update student record
    await studentRepository.update(id, {
      documentsRequired: documentsRequired
    });

    console.log(`Document deleted for student ${id}, type: ${documentType}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

/**
 * GET /api/students/:id/documents
 * Get all documents for a student
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/:id/documents', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Find the student
    const student = await studentRepository.findOne({
      where: { id },
      relations: ['user']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Parse existing documents
    let documentsRequired = student.documentsRequired || getDefaultDocumentRequirements();
    if (typeof documentsRequired === 'string') {
      try {
        documentsRequired = JSON.parse(documentsRequired);
      } catch (_error: unknown) {
        documentsRequired = getDefaultDocumentRequirements();
      }
    }

    res.json({
      success: true,
      data: documentsRequired
    });
  } catch (_error: unknown) {
    console.error('Error fetching student documents:', _error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student documents'
    });
  }
});

/**
 * POST /api/students/send-credentials
 * Send student account credentials via email
 * Accessible by: ADMIN, REGISTRAR
 * Dweezil's Code - Issue #3 & #5
 */
router.post('/send-credentials', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, email, username, password, studentId } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, email, username, password'
      });
    }

    // Send credentials email
    const emailSent = await emailService.sendStudentCredentials({
      firstName,
      lastName,
      email,
      username,
      password,
      studentId
    });

    if (emailSent) {
      res.json({
        success: true,
        message: 'Credentials email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send credentials email'
      });
    }
  } catch (error: unknown) {
    console.error('Error sending credentials email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send credentials email'
    });
  }
});

export default router;
