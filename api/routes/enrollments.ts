import express, { Response } from 'express';
import { Enrollment } from '../entities/Enrollment';
import { Student, RegistrationStatus } from '../entities/Student';
import { Course } from '../entities/Course';
import { CourseSection } from '../entities/CourseSection';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { UserRole } from '../entities/User';
import { EnrollmentStatus } from '../entities/Enrollment';
import { In, Not } from 'typeorm';

const router = express.Router();
const enrollmentRepository = AppDataSource.getRepository(Enrollment);
const studentRepository = AppDataSource.getRepository(Student);
const courseRepository = AppDataSource.getRepository(Course);
const courseSectionRepository = AppDataSource.getRepository(CourseSection);

const normalizeSemesterParam = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (upper === 'FIRST') return 'First Semester';
  if (upper === 'SECOND') return 'Second Semester';
  return trimmed;
};

// Dweezil's Code - Get enrollments for current student (must be before /:id route)
router.get('/my-enrollments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find student by userId
    const student = await studentRepository.findOne({ where: { userId } });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    // Registered students can start or review enrollment records.
    const shouldShowEnrollments = student.registrationStatus === RegistrationStatus.REGISTERED;

    console.log(`🔍 my-enrollments - Student: ${student.id}, Status: ${student.registrationStatus}, shouldShow: ${shouldShowEnrollments}`);

    let enrollments = [];
    if (shouldShowEnrollments) {
      // Dweezil's Code - First check all enrollments for this student to debug
      const allEnrollments = await enrollmentRepository.find({
        where: { studentId: student.id },
        relations: ['course', 'courseSection']
      });
      console.log(`🔍 my-enrollments - All enrollments for student: ${allEnrollments.length}`, allEnrollments.map(e => ({ id: e.id, status: e.status })));

      const statusFilter = [
        EnrollmentStatus.PENDING,
        EnrollmentStatus.VERIFIED,
        EnrollmentStatus.ENROLLED,
        EnrollmentStatus.COMPLETED,
        EnrollmentStatus.FAILED,
        EnrollmentStatus.DROPPED
      ];

      enrollments = await enrollmentRepository.find({
        where: { 
          studentId: student.id,
          status: In(statusFilter)
        },
        relations: ['course', 'courseSection'],
        order: { enrollmentDate: 'DESC' }
      });
      console.log(`📚 my-enrollments - Filtered enrollments: ${enrollments.length}`, enrollments.map(e => ({ id: e.id, status: e.status })));
    }

    console.log(`📚 Fetched ${enrollments.length} enrollments for student ${student.id} (status: ${student.registrationStatus}, shouldShow: ${shouldShowEnrollments})`);

    res.json({
      success: true,
      data: enrollments,
      student: {
        id: student.id,
        registrationStatus: student.registrationStatus
      }
    });
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments'
    });
  }
});

// Dweezil's Code - Create enrollment by student (pending processing)
router.post('/student/enroll', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📝 Student enroll endpoint hit');
    console.log('📦 Request body:', req.body);
    
    const { studentId, courseId, courseSectionId, selectedSubjects, academicYear, semester } = req.body;

    // Validate required fields (courseSectionId is now optional)
    if (!studentId || !courseId || !selectedSubjects) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Student ID, Course ID, and selected subjects are required'
      });
    }

    if (!Array.isArray(selectedSubjects) || selectedSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject must be selected'
      });
    }

    // Check if student exists and is eligible for enrollment
    const student = await studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      console.log('❌ Student not found:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('👤 Student found:', { id: student.id, status: student.registrationStatus });

    if (student.registrationStatus !== RegistrationStatus.REGISTERED) {
      console.log('❌ Invalid status:', student.registrationStatus);
      return res.status(400).json({
        success: false,
        message: `Student must have REGISTERED status before enrollment can start. Current status: ${student.registrationStatus}`
      });
    }

    // Students can submit enrollment intent without completing payment/confirmation first.
    console.log('ℹ️ Student enrollment submission will start in PENDING status');

    // Check if course exists
    const course = await courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      console.log('❌ Course not found:', courseId);
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Resolve academicYear and semester from courseSection if not provided directly
    let resolvedAcademicYear = academicYear || null;
    let resolvedSemester = semester || null;

    if (courseSectionId) {
      const courseSection = await courseSectionRepository.findOne({ where: { id: courseSectionId } });
      if (!courseSection) {
        console.log('❌ Course section not found:', courseSectionId);
        return res.status(404).json({
          success: false,
          message: 'Course section not found'
        });
      }
      // Use section's academicYear/semester as the source of truth
      resolvedAcademicYear = resolvedAcademicYear || courseSection.academicYear;
      resolvedSemester = resolvedSemester || courseSection.semester;
    } else {
      console.log('ℹ️ No course section provided, enrollment will be created without section');
    }

    // Duplicate enrollment check: block if student already has an active enrollment for this term
    let savedEnrollment;
    if (resolvedAcademicYear && resolvedSemester) {
      const duplicateCheck = await enrollmentRepository.findOne({
        where: {
          studentId,
          academicYear: resolvedAcademicYear,
          semester: resolvedSemester,
          status: In([
            EnrollmentStatus.PENDING,
            EnrollmentStatus.VERIFIED,
            EnrollmentStatus.ENROLLED,
            EnrollmentStatus.COMPLETED
          ])
        }
      });

      if (duplicateCheck) {
        // Allow resubmission only if PENDING (student can update their submission)
        if (duplicateCheck.status === EnrollmentStatus.PENDING) {
          console.log('📝 Updating existing PENDING enrollment for same term:', duplicateCheck.id);
          duplicateCheck.selectedSubjects = selectedSubjects;
          duplicateCheck.courseId = courseId;
          duplicateCheck.courseSectionId = courseSectionId || duplicateCheck.courseSectionId;
          duplicateCheck.enrollmentDate = new Date();
          duplicateCheck.submittedByStudent = true;
          duplicateCheck.studentSubmissionDate = new Date();
          savedEnrollment = await enrollmentRepository.save(duplicateCheck);
          console.log('✅ PENDING enrollment updated:', savedEnrollment.id);
        } else {
          console.log('❌ Duplicate enrollment blocked:', {
            studentId,
            academicYear: resolvedAcademicYear,
            semester: resolvedSemester,
            existingStatus: duplicateCheck.status
          });
          return res.status(409).json({
            success: false,
            message: `You already have a ${duplicateCheck.status} enrollment for ${resolvedSemester}, ${resolvedAcademicYear}. Please contact the registrar to update your enrollment.`
          });
        }
      } else {
        // Create new enrollment for this term
        const enrollment = enrollmentRepository.create({
          studentId,
          courseId,
          courseSectionId: courseSectionId || null,
          academicYear: resolvedAcademicYear,
          semester: resolvedSemester,
          enrollmentDate: new Date(),
          status: EnrollmentStatus.PENDING,
          selectedSubjects: selectedSubjects,
          submittedByStudent: true,
          studentSubmissionDate: new Date()
        });
        savedEnrollment = await enrollmentRepository.save(enrollment);
        console.log('✅ New enrollment created:', savedEnrollment.id);
      }
    } else {
      // Fallback: no term info — allow creation (backward compatibility)
      console.log('⚠️ No academicYear/semester provided, creating enrollment without term check');
      const enrollment = enrollmentRepository.create({
        studentId,
        courseId,
        courseSectionId: courseSectionId || null,
        enrollmentDate: new Date(),
        status: EnrollmentStatus.PENDING,
        selectedSubjects: selectedSubjects,
        submittedByStudent: true,
        studentSubmissionDate: new Date()
      });
      savedEnrollment = await enrollmentRepository.save(enrollment);
      console.log('✅ New enrollment created (no term):', savedEnrollment.id);
    }

    // Fetch complete enrollment with relations
    const completeEnrollment = await enrollmentRepository.findOne({
      where: { id: savedEnrollment.id },
      relations: ['student', 'course', 'courseSection', 'student.user']
    });

    console.log('✅ Enrollment complete, returning response');
    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully with PENDING status.',
      data: completeEnrollment
    });
  } catch (error) {
    console.error('❌ Error creating student enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create enrollment'
    });
  }
});

/**
 * POST /api/enrollments/start-intent
 * Create or update an enrollment intent (PENDING) for the student wizard flow.
 * Accepts academicYear + semester to enforce term-level uniqueness.
 * Accessible by: STUDENT (authenticated)
 */
router.post('/start-intent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, courseId, courseSectionId, academicYear, semester } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Course ID are required'
      });
    }

    // Verify student exists and is eligible
    const student = await studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (student.registrationStatus !== RegistrationStatus.REGISTERED) {
      return res.status(400).json({
        success: false,
        message: `Student must have REGISTERED status. Current: ${student.registrationStatus}`
      });
    }

    // Resolve academicYear/semester from courseSection if not provided
    let resolvedAcademicYear = academicYear || null;
    let resolvedSemester = semester || null;

    if (courseSectionId) {
      const courseSection = await courseSectionRepository.findOne({ where: { id: courseSectionId } });
      if (!courseSection) {
        return res.status(404).json({ success: false, message: 'Course section not found' });
      }
      resolvedAcademicYear = resolvedAcademicYear || courseSection.academicYear;
      resolvedSemester = resolvedSemester || courseSection.semester;
    }

    // Term-level duplicate check
    if (resolvedAcademicYear && resolvedSemester) {
      const existing = await enrollmentRepository.findOne({
        where: {
          studentId,
          academicYear: resolvedAcademicYear,
          semester: resolvedSemester,
          status: In([
            EnrollmentStatus.PENDING,
            EnrollmentStatus.VERIFIED,
            EnrollmentStatus.ENROLLED,
            EnrollmentStatus.COMPLETED
          ])
        }
      });

      if (existing && existing.status !== EnrollmentStatus.PENDING) {
        return res.status(409).json({
          success: false,
          message: `You already have a ${existing.status} enrollment for ${resolvedSemester}, ${resolvedAcademicYear}.`
        });
      }

      if (existing) {
        // Update existing PENDING enrollment
        existing.courseId = courseId;
        existing.courseSectionId = courseSectionId || existing.courseSectionId;
        existing.academicYear = resolvedAcademicYear;
        existing.semester = resolvedSemester;
        existing.enrollmentDate = new Date();
        existing.submittedByStudent = true;
        existing.studentSubmissionDate = new Date();
        const saved = await enrollmentRepository.save(existing);
        const complete = await enrollmentRepository.findOne({
          where: { id: saved.id },
          relations: ['student', 'course', 'courseSection', 'student.user']
        });
        return res.status(200).json({ success: true, message: 'Enrollment intent updated', data: complete });
      }
    }

    // Create new PENDING enrollment
    const enrollment = enrollmentRepository.create({
      studentId,
      courseId,
      courseSectionId: courseSectionId || null,
      academicYear: resolvedAcademicYear,
      semester: resolvedSemester,
      enrollmentDate: new Date(),
      status: EnrollmentStatus.PENDING,
      selectedSubjects: [],
      submittedByStudent: true,
      studentSubmissionDate: new Date()
    });

    const saved = await enrollmentRepository.save(enrollment);
    const complete = await enrollmentRepository.findOne({
      where: { id: saved.id },
      relations: ['student', 'course', 'courseSection', 'student.user']
    });

    res.status(201).json({ success: true, message: 'Enrollment intent created', data: complete });
  } catch (error) {
    console.error('Error creating enrollment intent:', error);
    res.status(500).json({ success: false, message: 'Failed to create enrollment intent' });
  }
});

/**
 * POST /api/enrollments/:id/assess
 * Save assessment details (fees, totals) to an existing enrollment.
 * Accessible by: STUDENT (authenticated)
 */
router.post('/:id/assess', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { totalAssessed, downpaymentRequired, assessmentDetails, selectedSubjects } = req.body;

    const enrollment = await enrollmentRepository.findOne({ where: { id } });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (totalAssessed !== undefined) enrollment.totalAssessed = Number(totalAssessed);
    if (downpaymentRequired !== undefined) enrollment.downpaymentRequired = Number(downpaymentRequired);
    if (assessmentDetails !== undefined) enrollment.assessmentDetails = assessmentDetails;
    if (selectedSubjects !== undefined) enrollment.selectedSubjects = selectedSubjects;

    // Compute balance = totalAssessed - totalPaid
    enrollment.balance = Number(enrollment.totalAssessed) - Number(enrollment.totalPaid);

    const saved = await enrollmentRepository.save(enrollment);
    const complete = await enrollmentRepository.findOne({
      where: { id: saved.id },
      relations: ['student', 'course', 'courseSection', 'student.user']
    });

    res.json({ success: true, message: 'Assessment saved', data: complete });
  } catch (error) {
    console.error('Error saving assessment:', error);
    res.status(500).json({ success: false, message: 'Failed to save assessment' });
  }
});

/**
 * GET /api/enrollments
 * Get all enrollments with filtering, pagination, and search
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      studentId = '',
      courseId = '',
      courseSectionId = '',
      status = '',
      semester = '',
      academicYear = '',
      gradeLevel = '',
      gradeLevelId = '',
      department = '',
      search = ''
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    // Build query with joins
    const queryBuilder = enrollmentRepository.createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.gradeLevel', 'gradeLevel'); // Dweezil's Code - Load grade level for display

    // Apply filters
    if (studentId) {
      queryBuilder.andWhere('enrollment.studentId = :studentId', { studentId });
    }

    if (courseId) {
      queryBuilder.andWhere('enrollment.courseId = :courseId', { courseId });
    }

    if (courseSectionId) {
      queryBuilder.andWhere('enrollment.courseSectionId = :courseSectionId', { courseSectionId: String(courseSectionId) });
    }

    if (status) {
      queryBuilder.andWhere('enrollment.status = :status', { status });
    }

    const effectiveGradeLevelId = String(gradeLevelId || gradeLevel || '').trim();
    if (effectiveGradeLevelId) {
      queryBuilder.andWhere('student.gradeLevelId = :gradeLevelId', { gradeLevelId: effectiveGradeLevelId });
    }

    if (academicYear) {
      queryBuilder.andWhere('enrollment.academicYear = :academicYear', { academicYear: String(academicYear) });
    }

    if (department) {
      queryBuilder.andWhere('course.departmentId = :departmentId', { departmentId: String(department) });
    }

    const semesterParam = typeof semester === 'string' ? semester : '';
    const normalizedSemester = normalizeSemesterParam(semesterParam);
    if (normalizedSemester && ['First Semester', 'Second Semester', 'Summer'].includes(normalizedSemester)) {
      queryBuilder.andWhere('enrollment.semester = :semester', { semester: normalizedSemester });
    } else if (semesterParam && /^\d{4}-[12]$/.test(semesterParam)) {
      const [year, term] = semesterParam.split('-');
      const startDate = new Date(`${year}-${term === '1' ? '01' : '07'}-01`);
      const endDate = new Date(`${year}-${term === '1' ? '06' : '12'}-31`);
      queryBuilder.andWhere('enrollment.enrollmentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    }

    // Search filtering
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      queryBuilder.andWhere(
        '(LOWER(user.firstName) LIKE :searchTerm OR LOWER(user.lastName) LIKE :searchTerm OR LOWER(student.studentId) LIKE :searchTerm OR LOWER(course.courseCode) LIKE :searchTerm OR LOWER(course.name) LIKE :searchTerm)',
        { searchTerm }
      );
    }

    // Get total count
    const totalItems = await queryBuilder.getCount();

    // Dweezil's Code - Support dynamic sorting (default to createdAt DESC for latest first)
    const sortByField = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';
    
    // Map sortBy to the correct column
    const sortColumn = sortByField === 'createdAt' ? 'enrollment.createdAt' :
                       sortByField === 'enrollmentDate' ? 'enrollment.enrollmentDate' :
                       sortByField === 'status' ? 'enrollment.status' :
                       'enrollment.createdAt'; // default

    // Apply pagination and ordering
    const enrollments = await queryBuilder
      .orderBy(sortColumn, sortOrder)
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollments'
    });
  }
});

/**
 * GET /api/enrollments/:id
 * Get a specific enrollment by ID
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'course', 'courseSection', 'student.user', 'student.gradeLevel']
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrollment'
    });
  }
});

/**
 * GET /api/enrollments/student/:studentId
 * Get all enrollments for a specific student
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/student/:studentId', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const queryBuilder = enrollmentRepository.createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .where('enrollment.studentId = :studentId', { studentId });

    if (status) {
      queryBuilder.andWhere('enrollment.status = :status', { status });
    }

    const totalItems = await queryBuilder.getCount();
    
    const enrollments = await queryBuilder
      .orderBy('enrollment.enrollmentDate', 'DESC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student enrollments'
    });
  }
});

/**
 * GET /api/enrollments/course/:courseId
 * Get all enrollments for a specific course
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/course/:courseId', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const queryBuilder = enrollmentRepository.createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .where('enrollment.courseId = :courseId', { courseId });

    if (status) {
      queryBuilder.andWhere('enrollment.status = :status', { status });
    }

    const totalItems = await queryBuilder.getCount();
    
    const enrollments = await queryBuilder
      .orderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course enrollments'
    });
  }
});

/**
 * GET /api/enrollments/semester/:semester
 * Get all enrollments for a specific semester
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/semester/:semester', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { semester } = req.params;
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Parse semester (e.g., "2024-1" for first semester of 2024)
    const [year, term] = semester.split('-');
    
    if (!year || !term) {
      return res.status(400).json({
        success: false,
        message: 'Invalid semester format. Use YYYY-T (e.g., 2024-1)'
      });
    }

    const startDate = new Date(`${year}-${term === '1' ? '01' : '07'}-01`);
    const endDate = new Date(`${year}-${term === '1' ? '06' : '12'}-31`);

    const queryBuilder = enrollmentRepository.createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('student.user', 'user')
      .where('enrollment.enrollmentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });

    if (status) {
      queryBuilder.andWhere('enrollment.status = :status', { status });
    }

    const totalItems = await queryBuilder.getCount();
    
    const enrollments = await queryBuilder
      .orderBy('enrollment.enrollmentDate', 'DESC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching semester enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch semester enrollments'
    });
  }
});

// Dweezil's Code
/**
 * POST /api/enrollments
 * Create a new enrollment or update existing one
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId, courseId, courseSectionId, enrollmentDate, status, selectedSubjects, registrarRemarks } = req.body;

    // Validate required fields
    if (!studentId || !courseId || !courseSectionId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, Course ID, and Course Section ID are required'
      });
    }

    // Validate enrollment status
    if (status !== undefined && !Object.values(EnrollmentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment status'
      });
    }

    // Check if student exists
    const student = await studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.registrationStatus !== RegistrationStatus.REGISTERED) {
      return res.status(400).json({
        success: false,
        message: `Student must have REGISTERED status before enrollment can be created. Current status: ${student.registrationStatus}`
      });
    }

    // Check if course exists
    const course = await courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is active
    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll in inactive course'
      });
    }

    // Check if course section exists
    const courseSection = await courseSectionRepository.findOne({ where: { id: courseSectionId } });
    if (!courseSection) {
      return res.status(404).json({
        success: false,
        message: 'Course section not found'
      });
    }

    // Check if course section is active
    if (!courseSection.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll in inactive course section'
      });
    }

    // Use course section's academicYear/semester for term-level duplicate check
    const termAcademicYear = courseSection.academicYear;
    const termSemester = courseSection.semester;

    // Term-level duplicate check: block if student already has an active enrollment for this term
    const existingEnrollment = await enrollmentRepository.findOne({
      where: {
        studentId,
        academicYear: termAcademicYear,
        semester: termSemester,
        status: In([
          EnrollmentStatus.PENDING, 
          EnrollmentStatus.VERIFIED, 
          EnrollmentStatus.ENROLLED, 
          EnrollmentStatus.COMPLETED
        ])
      }
    });

    let savedEnrollment;
    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: `Student already has an enrollment for ${termSemester}, ${termAcademicYear}. Please open the existing record to update it.`,
        data: { enrollmentId: existingEnrollment.id }
      });
    } else {
      const newStatus = status ?? EnrollmentStatus.PENDING;

      if (newStatus === EnrollmentStatus.ENROLLED && (!Array.isArray(selectedSubjects) || selectedSubjects.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'At least one subject must be selected to enroll'
        });
      }

      // Check course section capacity only for new enrollments
      if (courseSection.maxStudents) {
        const currentEnrollments = await enrollmentRepository.count({
          where: {
            courseSectionId,
            status: EnrollmentStatus.ENROLLED
          }
        });

        if (currentEnrollments >= courseSection.maxStudents) {
          return res.status(400).json({
            success: false,
            message: 'Course section has reached maximum capacity'
          });
        }
      }

      // Create new enrollment
      console.log(`📝 Creating new enrollment for student ${studentId}`);
      const enrollment = enrollmentRepository.create({
        studentId,
        courseId,
        courseSectionId,
        academicYear: termAcademicYear,
        semester: termSemester,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
        status: newStatus,
        selectedSubjects: selectedSubjects || [],
        registrarRemarks: registrarRemarks ? String(registrarRemarks) : null
      });

      savedEnrollment = await enrollmentRepository.save(enrollment);
      console.log(`✅ Enrollment created successfully`);
    }

    // Fetch complete enrollment with relations
    const completeEnrollment = await enrollmentRepository.findOne({
      where: { id: savedEnrollment.id },
      relations: ['student', 'course', 'courseSection', 'student.user']
    });

    res.status(201).json({
      success: true,
      message: 'Enrollment created successfully',
      data: completeEnrollment
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create enrollment'
    });
  }
});

/**
 * PUT /api/enrollments/:id
 * Update an enrollment
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, grade, finalScore, enrollmentDate } = req.body;

    const enrollment = await enrollmentRepository.findOne({ where: { id } });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Validate status if provided
    if (status && !Object.values(EnrollmentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment status'
      });
    }

    // Validate grade if provided
    if (grade !== undefined && (grade < 0 || grade > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be between 0 and 100'
      });
    }

    // Validate final score if provided
    if (finalScore !== undefined && (finalScore < 0 || finalScore > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Final score must be between 0 and 100'
      });
    }

    // Update enrollment fields
    if (status) enrollment.status = status;
    if (grade !== undefined) enrollment.grade = grade;
    if (finalScore !== undefined) enrollment.finalScore = finalScore;
    if (enrollmentDate) enrollment.enrollmentDate = new Date(enrollmentDate);

    const updatedEnrollment = await enrollmentRepository.save(enrollment);

    // Fetch complete enrollment with relations
    const completeEnrollment = await enrollmentRepository.findOne({
      where: { id: updatedEnrollment.id },
      relations: ['student', 'course', 'student.user']
    });

    res.json({
      success: true,
      message: 'Enrollment updated successfully',
      data: completeEnrollment
    });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment'
    });
  }
});

/**
 * DELETE /api/enrollments/:id
 * Delete an enrollment (soft delete by setting status to DROPPED)
 * Accessible by: ADMIN, REGISTRAR
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const enrollment = await enrollmentRepository.findOne({ where: { id } });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (permanent === 'true') {
      // Hard delete (only for ADMIN)
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can permanently delete enrollments'
        });
      }
      
      await enrollmentRepository.remove(enrollment);
      
      res.json({
        success: true,
        message: 'Enrollment permanently deleted'
      });
    } else {
      // Soft delete (set status to DROPPED)
      enrollment.status = EnrollmentStatus.DROPPED;
      await enrollmentRepository.save(enrollment);
      
      res.json({
        success: true,
        message: 'Enrollment dropped successfully',
        data: enrollment
      });
    }
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete enrollment'
    });
  }
});

/**
 * PATCH /api/enrollments/:id/status
 * Update enrollment status
 * Accessible by: ADMIN, REGISTRAR, TEACHER (for grade updates)
 */
router.patch('/:id/status', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!Object.values(EnrollmentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment status'
      });
    }

    const enrollment = await enrollmentRepository.findOne({ where: { id } });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Teachers can only update to COMPLETED or FAILED
    if (req.user?.role === UserRole.TEACHER && 
        ![EnrollmentStatus.COMPLETED, EnrollmentStatus.FAILED].includes(status)) {
      return res.status(403).json({
        success: false,
        message: 'Teachers can only mark enrollments as COMPLETED or FAILED'
      });
    }

    enrollment.status = status;
    const updatedEnrollment = await enrollmentRepository.save(enrollment);

    res.json({
      success: true,
      message: 'Enrollment status updated successfully',
      data: updatedEnrollment
    });
  } catch (error) {
    console.error('Error updating enrollment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment status'
    });
  }
});

/**
 * PATCH /api/enrollments/:id/grade
 * Update enrollment grade and final score
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.patch('/:id/grade', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { grade, finalScore } = req.body;

    if (grade === undefined && finalScore === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Grade or final score is required'
      });
    }

    // Validate grade if provided
    if (grade !== undefined && (grade < 0 || grade > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Grade must be between 0 and 100'
      });
    }

    // Validate final score if provided
    if (finalScore !== undefined && (finalScore < 0 || finalScore > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Final score must be between 0 and 100'
      });
    }

    const enrollment = await enrollmentRepository.findOne({ where: { id } });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Update grade and/or final score
    if (grade !== undefined) enrollment.grade = grade;
    if (finalScore !== undefined) enrollment.finalScore = finalScore;

    const updatedEnrollment = await enrollmentRepository.save(enrollment);

    res.json({
      success: true,
      message: 'Enrollment grade updated successfully',
      data: updatedEnrollment
    });
  } catch (error) {
    console.error('Error updating enrollment grade:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment grade'
    });
  }
});

// Dweezil's Code - PATCH /:id endpoint for updating enrollment details
router.patch('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId, courseId, courseSectionId, enrollmentDate, selectedSubjects, status, registrarRemarks } = req.body;

    const enrollment = await enrollmentRepository.findOne({ 
      where: { id },
      relations: ['student', 'student.user']
    });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const nextSelectedSubjects = selectedSubjects ?? enrollment.selectedSubjects;
    if (status === EnrollmentStatus.ENROLLED && (!Array.isArray(nextSelectedSubjects) || nextSelectedSubjects.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject must be selected to enroll'
      });
    }

    if (status === EnrollmentStatus.PENDING && enrollment.status !== EnrollmentStatus.PENDING) {
      const normalizedRemarks = typeof registrarRemarks === 'string' ? registrarRemarks.trim() : '';
      if (!normalizedRemarks) {
        return res.status(400).json({
          success: false,
          message: 'Remarks are required when setting status to PENDING (RE SUBMIT).'
        });
      }
    }

    // Update enrollment fields
    const effectiveStudentId = studentId || enrollment.studentId;
    if (studentId) enrollment.studentId = studentId;
    if (courseId) enrollment.courseId = courseId;
    if (courseSectionId) {
      const section = await courseSectionRepository.findOne({ where: { id: courseSectionId } });
      if (!section) {
        return res.status(404).json({
          success: false,
          message: 'Course section not found'
        });
      }

      const duplicate = await enrollmentRepository.findOne({
        where: {
          id: Not(enrollment.id),
          studentId: effectiveStudentId,
          academicYear: section.academicYear,
          semester: section.semester,
          status: In([
            EnrollmentStatus.PENDING,
            EnrollmentStatus.VERIFIED,
            EnrollmentStatus.ENROLLED,
            EnrollmentStatus.COMPLETED
          ])
        }
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Student already has an enrollment for ${section.semester}, ${section.academicYear}. Please open the existing record to update it.`,
          data: { enrollmentId: duplicate.id }
        });
      }

      enrollment.courseSectionId = courseSectionId;
      enrollment.academicYear = section.academicYear;
      enrollment.semester = section.semester;

      if (!courseId) {
        enrollment.courseId = section.courseId;
      }
    }
    if (enrollmentDate) enrollment.enrollmentDate = new Date(enrollmentDate);
    if (selectedSubjects) enrollment.selectedSubjects = selectedSubjects;
    if (registrarRemarks !== undefined) {
      enrollment.registrarRemarks = registrarRemarks ? String(registrarRemarks) : null;
    }
    // Dweezil's Code - Allow updating enrollment status
    if (status && Object.values(EnrollmentStatus).includes(status)) {
      enrollment.status = status;
      console.log(`✅ Enrollment status updated to: ${status}`);
    }

    await enrollmentRepository.save(enrollment);
    console.log('✅ Enrollment updated:', enrollment.id);

    // Fetch updated enrollment with relations
    const updatedEnrollment = await enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'course', 'courseSection', 'student.user', 'student.gradeLevel']
    });

    res.json({
      success: true,
      message: 'Enrollment updated successfully',
      data: updatedEnrollment
    });
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enrollment'
    });
  }
});

// Dweezil's Code - Mark enrollment as ENROLLED for scheduling
router.patch('/:id/enroll', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await enrollmentRepository.findOne({ 
      where: { id },
      relations: ['student', 'student.user', 'courseSection']
    });
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.status !== EnrollmentStatus.PENDING && enrollment.status !== EnrollmentStatus.VERIFIED) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or verified enrollments can be enrolled.'
      });
    }

    if (!Array.isArray(enrollment.selectedSubjects) || enrollment.selectedSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'NO_SUBJECTS_SELECTED',
        message: 'At least one subject must be selected before enrollment can be completed.'
      });
    }

    if (enrollment.courseSectionId) {
      const courseSection = enrollment.courseSection ?? await courseSectionRepository.findOne({
        where: { id: enrollment.courseSectionId }
      });

      if (!courseSection) {
        return res.status(404).json({
          success: false,
          message: 'Course section not found'
        });
      }

      if (courseSection.maxStudents) {
        const currentEnrollments = await enrollmentRepository.count({
          where: {
            courseSectionId: enrollment.courseSectionId,
            status: EnrollmentStatus.ENROLLED
          }
        });

        if (currentEnrollments >= courseSection.maxStudents) {
          return res.status(400).json({
            success: false,
            message: 'Course section has reached maximum capacity'
          });
        }
      }
    }

    enrollment.status = EnrollmentStatus.ENROLLED;
    await enrollmentRepository.save(enrollment);

    console.log('✅ Enrollment enrolled:', enrollment.id);

    // Fetch updated enrollment with relations
    const updatedEnrollment = await enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'course', 'courseSection', 'student.user']
    });

    res.json({
      success: true,
      message: 'Enrollment marked as ENROLLED successfully.',
      data: updatedEnrollment
    });
  } catch (error) {
    console.error('Error enrolling:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll'
    });
  }
});

export default router;
