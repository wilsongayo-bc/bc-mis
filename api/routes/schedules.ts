import express, { IRouter, Response } from 'express';
import { Schedule, DayOfWeek } from '../entities/Schedule';
import { CourseSection } from '../entities/CourseSection';
import { Subject } from '../entities/Subject';
import { Employee } from '../entities/Employee';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { UserRole } from '../entities/User';
import { Brackets, In } from 'typeorm';

const router: IRouter = express.Router();
const scheduleRepository = AppDataSource.getRepository(Schedule);
const subjectRepository = AppDataSource.getRepository(Subject);
const employeeRepository = AppDataSource.getRepository(Employee);

/**
 * DEBUG: Test authentication and role permissions
 */
router.get('/debug-auth', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user as { role: string };
    const { hasRolePermission } = await import('../utils/roleHierarchy.js');
    
    res.json({
      success: true,
      debug: {
        user: user,
        hasTeacherPermission: hasRolePermission(user.role as UserRole, UserRole.TEACHER),
        userRole: user.role,
        requiredRole: UserRole.TEACHER
      }
    });
  } catch (error) {
    console.error('Debug auth error:', error);
    res.status(500).json({ success: false, message: 'Debug failed' });
  }
});

/**
 * GET /api/schedules
 * Get all schedules with filtering, pagination, and search
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      subjectId = '',
      teacherId = '',
      room = '',
      sectionName = '',
      dayOfWeek = '',
      semester = '',
      academicYear = '',
      isActive = '',
      courseId = '',
      yearLevel = ''
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    
    // Build query with joins
    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('schedule.courseSection', 'courseSection')
      .leftJoinAndSelect('courseSection.course', 'course');

    // Filter for Teachers: Only show their own schedules
    const effectiveRoles = Array.isArray(req.user?.roles) && req.user.roles.length > 0 ? req.user.roles : (req.user ? [req.user.role] : []);
    const hasPrivilegedRole = effectiveRoles.some(role => [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.REGISTRAR].includes(role));
    const isProgramHead = typeof req.user?.position === 'string' && req.user.position.toLowerCase().startsWith('program head');
    const shouldScopeTeacher = effectiveRoles.includes(UserRole.TEACHER) && !hasPrivilegedRole && !isProgramHead;

    if (shouldScopeTeacher) {
      const employee = await employeeRepository.findOne({ where: { userId: req.user.id } });
      
      if (employee) {
        queryBuilder.andWhere('schedule.teacherId = :teacherScopeId', { teacherScopeId: employee.id });
      } else {
        queryBuilder.andWhere('1 = 0');
      }
    }

    // Apply filters
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    if (normalizedSearch) {
      const searchParam = `%${normalizedSearch.toLowerCase()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(subject.name) LIKE :search', { search: searchParam })
            .orWhere('LOWER(subject.code) LIKE :search', { search: searchParam })
            .orWhere('LOWER(courseSection.sectionName) LIKE :search', { search: searchParam })
            .orWhere('LOWER(schedule.room) LIKE :search', { search: searchParam })
            .orWhere('LOWER(course.courseCode) LIKE :search', { search: searchParam })
            .orWhere('LOWER(course.name) LIKE :search', { search: searchParam })
            .orWhere('LOWER(user.firstName) LIKE :search', { search: searchParam })
            .orWhere('LOWER(user.lastName) LIKE :search', { search: searchParam })
            .orWhere("LOWER(CONCAT(user.firstName, ' ', user.lastName)) LIKE :search", { search: searchParam });
        })
      );
    }

    if (subjectId) {
      queryBuilder.andWhere('schedule.subjectId = :subjectId', { subjectId });
    }

    if (courseId) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('courseSection.courseId = :courseId', { courseId }).orWhere('subject.courseId = :courseId', { courseId });
        })
      );
    }

    if (yearLevel) {
      const yearLevelNumMap: Record<string, number> = {
        'First Year': 1,
        'Second Year': 2,
        'Third Year': 3,
        'Fourth Year': 4
      };
      const yearLevelNum = typeof yearLevel === 'string' ? yearLevelNumMap[yearLevel] : undefined;
      const legacyYearLevelNum = typeof yearLevelNum === 'number' ? yearLevelNum + 12 : undefined;

      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('courseSection.yearLevel = :yearLevel', { yearLevel });
          if (typeof yearLevelNum === 'number') {
            qb.orWhere('subject.yearLevel = :yearLevelNum', { yearLevelNum });
          }
          if (typeof legacyYearLevelNum === 'number') {
            qb.orWhere('subject.yearLevel = :legacyYearLevelNum', { legacyYearLevelNum });
          }
        })
      );
    }

    if (teacherId) {
      queryBuilder.andWhere('schedule.teacherId = :teacherId', { teacherId });
    }

    // Dweezil's Code - Fixed MySQL compatibility: Changed ILIKE to LIKE for case-insensitive search
    if (room) {
      queryBuilder.andWhere('schedule.room LIKE :room', { room: `%${room}%` });
    }

    if (sectionName) {
      queryBuilder.andWhere('courseSection.sectionName = :sectionName', { sectionName });
    }

    if (dayOfWeek) {
      queryBuilder.andWhere('schedule.dayOfWeek LIKE :dayOfWeek', { dayOfWeek: `%${dayOfWeek}%` });
    }

    if (semester) {
      const semesterText = String(semester).trim();
      const normalized = semesterText.toLowerCase();
      const semesterValues: string[] = [];
      if (normalized === 'first semester' || normalized === 'first' || normalized === '1') {
        semesterValues.push('FIRST', 'First Semester', '1');
      } else if (normalized === 'second semester' || normalized === 'second' || normalized === '2') {
        semesterValues.push('SECOND', 'Second Semester', '2');
      } else if (normalized === 'summer' || normalized === '3') {
        semesterValues.push('SUMMER', 'Summer', '3');
      } else {
        semesterValues.push(semesterText);
      }
      queryBuilder.andWhere('schedule.semester IN (:...semesterValues)', { semesterValues });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    if (isActive !== '') {
      queryBuilder.andWhere('schedule.isActive = :isActive', { isActive: isActive === 'true' });
    }

    // Get total count
    const totalItems = await queryBuilder.getCount();

    // Apply pagination and ordering
    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: schedules,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules'
    });
  }
});

/**
 * GET /api/schedules/sections
 * Get all unique sections (blocks) for dropdown selection
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/sections', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courseSectionRepository = AppDataSource.getRepository(CourseSection);

    const uniqueSections = await courseSectionRepository.createQueryBuilder('courseSection')
      .select('DISTINCT courseSection.sectionName', 'sectionName')
      .where('courseSection.isActive = :isActive', { isActive: true })
      .orderBy('courseSection.sectionName', 'ASC')
      .getRawMany();

    const sections = uniqueSections.map(item => ({
      id: item.sectionName,
      name: item.sectionName,
      value: item.sectionName
    }));

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections'
    });
  }
});

/**
 * GET /api/schedules/rooms
 * Get all unique rooms for dropdown selection
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/rooms', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uniqueRooms = await scheduleRepository.createQueryBuilder('schedule')
      .select('DISTINCT schedule.room', 'room')
      .where('schedule.isActive = :isActive', { isActive: true })
      .andWhere('schedule.room IS NOT NULL')
      .andWhere('schedule.room != :empty', { empty: '' })
      .orderBy('schedule.room', 'ASC')
      .getRawMany();

    const rooms = uniqueRooms.map(item => ({
      id: item.room,
      name: item.room,
      value: item.room
    }));

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms'
    });
  }
});

/**
 * GET /api/schedules/subject/:subjectId
 * Get all schedules for a specific subject
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/subject/:subjectId', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { page = 1, limit = 10, isActive = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('schedule.subjectId = :subjectId', { subjectId });

    if (isActive !== '') {
      queryBuilder.andWhere('schedule.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const totalItems = await queryBuilder.getCount();
    
    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: schedules,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subject schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subject schedules'
    });
  }
});

/**
 * GET /api/schedules/instructor/:instructorId
 * Get all schedules for a specific instructor
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/instructor/:instructorId', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { instructorId } = req.params;
    const { page = 1, limit = 10, isActive = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .where('schedule.teacherId = :instructorId', { instructorId });

    if (isActive !== '') {
      queryBuilder.andWhere('schedule.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const totalItems = await queryBuilder.getCount();
    
    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: schedules,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching instructor schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch instructor schedules'
    });
  }
});

/**
 * GET /api/schedules/classroom/:classroom
 * Get all schedules for a specific classroom
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/classroom/:classroom', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { classroom } = req.params;
    const { page = 1, limit = 10, isActive = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('schedule.room = :classroom', { classroom });

    if (isActive !== '') {
      queryBuilder.andWhere('schedule.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const totalItems = await queryBuilder.getCount();
    
    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: schedules,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching classroom schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classroom schedules'
    });
  }
});

/**
 * GET /api/schedules/timetable
 * Generate weekly timetable
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/timetable', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { semester = '', academicYear = '', teacherId = '', room = '' } = req.query;

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('schedule.isActive = :isActive', { isActive: true });

    if (semester) {
      queryBuilder.andWhere('schedule.semester = :semester', { semester });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    if (teacherId) {
      queryBuilder.andWhere('schedule.teacherId = :teacherId', { teacherId });
    }

    // Filter for Teachers: Only show their own timetable
    const timetableEffectiveRoles = Array.isArray(req.user?.roles) && req.user.roles.length > 0 ? req.user.roles : (req.user ? [req.user.role] : []);
    const timetableHasPrivilegedRole = timetableEffectiveRoles.some(role => [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.REGISTRAR].includes(role));
    const timetableIsProgramHead = typeof req.user?.position === 'string' && req.user.position.toLowerCase().startsWith('program head');
    const shouldScopeTeacherTimetable = timetableEffectiveRoles.includes(UserRole.TEACHER) && !timetableHasPrivilegedRole && !timetableIsProgramHead;

    if (shouldScopeTeacherTimetable) {
      const employee = await employeeRepository.findOne({ where: { userId: req.user.id } });
      
      if (employee) {
        queryBuilder.andWhere('schedule.teacherId = :teacherId', { teacherId: employee.id });
      } else {
        queryBuilder.andWhere('1 = 0');
      }
    }

    if (room) {
      queryBuilder.andWhere('schedule.room = :room', { room });
    }

    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .getMany();

    // Group schedules by day of week
    const timetable = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: []
    };

    schedules.forEach(schedule => {
      if (schedule.dayOfWeek) {
        schedule.dayOfWeek.split(',').forEach(day => {
          const cleanDay = day.trim();
          if (timetable[cleanDay as keyof typeof timetable]) {
            (timetable[cleanDay as keyof typeof timetable] as Schedule[]).push(schedule);
          }
        });
      }
    });

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error('Error generating timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate timetable'
    });
  }
});

/**
 * GET /api/schedules/conflicts
 * Detect scheduling conflicts
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/conflicts', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { semester = '', academicYear = '' } = req.query;

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('schedule.isActive = :isActive', { isActive: true });

    if (semester) {
      queryBuilder.andWhere('schedule.semester = :semester', { semester });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    const schedules = await queryBuilder.getMany();

    const conflicts = [];

    // Check for classroom conflicts
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const schedule1 = schedules[i];
        const schedule2 = schedules[j];

        const days1 = schedule1.dayOfWeek.split(',').map(d => d.trim());
        const days2 = schedule2.dayOfWeek.split(',').map(d => d.trim());
        const dayOverlap = days1.some(d => days2.includes(d));

        // Check date overlap
        let dateOverlap = true;
        if (schedule1.startDate && schedule1.endDate && schedule2.startDate && schedule2.endDate) {
          const s1Start = new Date(schedule1.startDate);
          const s1End = new Date(schedule1.endDate);
          const s2Start = new Date(schedule2.startDate);
          const s2End = new Date(schedule2.endDate);
          
          if (s1End < s2Start || s1Start > s2End) {
             dateOverlap = false;
          }
        }

        if (!dateOverlap) continue;

        // Same day and room
        if (dayOverlap && schedule1.room === schedule2.room) {
          // Check time overlap
          const start1 = schedule1.startTime;
          const end1 = schedule1.endTime;
          const start2 = schedule2.startTime;
          const end2 = schedule2.endTime;

          if ((start1 < end2 && end1 > start2)) {
            conflicts.push({
              type: 'classroom',
              message: `Classroom conflict: ${schedule1.room}`,
              schedules: [schedule1, schedule2],
              details: {
                room: schedule1.room,
                dayOfWeek: `${schedule1.dayOfWeek} / ${schedule2.dayOfWeek}`,
                timeSlot: `${start1} - ${end1} overlaps with ${start2} - ${end2}`
              }
            });
          }
        }

        // Same teacher conflict
        if (schedule1.teacherId === schedule2.teacherId && dayOverlap) {
          const start1 = schedule1.startTime;
          const end1 = schedule1.endTime;
          const start2 = schedule2.startTime;
          const end2 = schedule2.endTime;

          if ((start1 < end2 && end1 > start2)) {
            conflicts.push({
              type: 'instructor',
              message: `Instructor conflict: ${schedule1.teacher?.user?.firstName} ${schedule1.teacher?.user?.lastName}`,
              schedules: [schedule1, schedule2],
              details: {
                teacherId: schedule1.teacherId,
                dayOfWeek: `${schedule1.dayOfWeek} / ${schedule2.dayOfWeek}`,
                timeSlot: `${start1} - ${end1} overlaps with ${start2} - ${end2}`
              }
            });
          }
        }
      }
    }

    res.json({
      success: true,
      data: conflicts,
      summary: {
        totalConflicts: conflicts.length,
        classroomConflicts: conflicts.filter(c => c.type === 'classroom').length,
        instructorConflicts: conflicts.filter(c => c.type === 'instructor').length
      }
    });
  } catch (error) {
    console.error('Error detecting conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect conflicts'
    });
  }
});

/**
 * POST /api/schedules
 * Create a new schedule
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      subjectId,
      courseSectionId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      semester,
      year,
      startDate,
      endDate,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!subjectId || !teacherId || !dayOfWeek || !startTime || !endTime || !room || !semester || !year) {
      return res.status(400).json({
        success: false,
        message: 'All schedule fields are required'
      });
    }

    // Validate day of week
    const days = dayOfWeek.split(',').map((d: string) => d.trim());
    const validDays = Object.values(DayOfWeek);
    const invalidDays = days.filter((d: string) => !validDays.includes(d as DayOfWeek));

    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid days: ${invalidDays.join(', ')}`
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM format'
      });
    }

    // Validate time logic
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Check if subject exists
    const subject = await subjectRepository.findOne({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if teacher exists
    const teacher = await employeeRepository.findOne({ where: { id: teacherId } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check for classroom conflicts
    const classroomSchedules = await scheduleRepository.find({
      where: {
        room,
        semester,
        academicYear: year,
        isActive: true
      }
    });

    const requestedDays = dayOfWeek.split(',').map((d: string) => d.trim());

    for (const existingSchedule of classroomSchedules) {
      // Skip conflict if same subject (multi-section class)
      if (existingSchedule.subjectId === subjectId) continue;
      
      const existingDays = existingSchedule.dayOfWeek.split(',').map(d => d.trim());
      const hasDayOverlap = requestedDays.some(day => existingDays.includes(day));
      
      if (hasDayOverlap) {
        // Check time overlap
        const conflictStart = existingSchedule.startTime;
        const conflictEnd = existingSchedule.endTime;
        
        if ((startTime < conflictEnd && endTime > conflictStart)) {
          // Check date overlap if both have dates
          let dateOverlap = true;
          if (startDate && endDate && existingSchedule.startDate && existingSchedule.endDate) {
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            const existingStart = new Date(existingSchedule.startDate);
            const existingEnd = new Date(existingSchedule.endDate);
            
            if (newEnd < existingStart || newStart > existingEnd) {
              dateOverlap = false;
            }
          }

          if (dateOverlap) {
            return res.status(409).json({
              success: false,
              message: `Classroom ${room} is already booked for ${existingSchedule.dayOfWeek} from ${conflictStart} to ${conflictEnd}${existingSchedule.startDate ? ` (${existingSchedule.startDate} to ${existingSchedule.endDate})` : ''}`
            });
          }
        }
      }
    }

    // Check for instructor conflicts
    const instructorSchedules = await scheduleRepository.find({
      where: {
        teacherId,
        semester,
        academicYear: year,
        isActive: true
      }
    });

    for (const existingSchedule of instructorSchedules) {
      // Skip conflict if same subject (multi-section class)
      if (existingSchedule.subjectId === subjectId) continue;
      
      const existingDays = existingSchedule.dayOfWeek.split(',').map(d => d.trim());
      const hasDayOverlap = requestedDays.some(day => existingDays.includes(day));
      
      if (hasDayOverlap) {
        // Check time overlap
        const conflictStart = existingSchedule.startTime;
        const conflictEnd = existingSchedule.endTime;
        
        if ((startTime < conflictEnd && endTime > conflictStart)) {
          // Check date overlap if both have dates
          let dateOverlap = true;
          if (startDate && endDate && existingSchedule.startDate && existingSchedule.endDate) {
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            const existingStart = new Date(existingSchedule.startDate);
            const existingEnd = new Date(existingSchedule.endDate);
            
            if (newEnd < existingStart || newStart > existingEnd) {
              dateOverlap = false;
            }
          }

          if (dateOverlap) {
            return res.status(409).json({
              success: false,
              message: `Instructor is already scheduled for ${existingSchedule.dayOfWeek} from ${conflictStart} to ${conflictEnd}${existingSchedule.startDate ? ` (${existingSchedule.startDate} to ${existingSchedule.endDate})` : ''}`
            });
          }
        }
      }
    }

    // Create schedule
    const schedule = scheduleRepository.create({
      subjectId,
      courseSectionId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      semester,
      academicYear: year,
      startDate,
      endDate,
      isActive
    });

    const savedSchedule = await scheduleRepository.save(schedule);

    // Fetch complete schedule with relations
    const completeSchedule = await scheduleRepository.findOne({
      where: { id: savedSchedule.id },
      relations: ['subject', 'teacher', 'teacher.user']
    });

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: completeSchedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule'
    });
  }
});

/**
 * POST /api/schedules/bulk
 * Bulk create schedules for multiple sections
 * Accessible by: ADMIN, REGISTRAR
 */
router.post('/bulk', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      subjectId,
      courseSectionIds,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      semester,
      year,
      startDate,
      endDate,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!subjectId || !teacherId || !dayOfWeek || !startTime || !endTime || !room || !semester || !year || !courseSectionIds || !Array.isArray(courseSectionIds) || courseSectionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All schedule fields are required, including at least one course section'
      });
    }

    // Validate day of week
    const days = dayOfWeek.split(',').map((d: string) => d.trim());
    const validDays = Object.values(DayOfWeek);
    const invalidDays = days.filter((d: string) => !validDays.includes(d as DayOfWeek));

    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid days: ${invalidDays.join(', ')}`
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM format'
      });
    }

    // Validate time logic
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Check if subject exists
    const subject = await subjectRepository.findOne({ where: { id: subjectId } });
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if teacher exists
    const teacher = await employeeRepository.findOne({ where: { id: teacherId } });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const requestedDays = dayOfWeek.split(',').map((d: string) => d.trim());

    // Check for classroom conflicts (only for non-same subject)
    const classroomSchedules = await scheduleRepository.find({
      where: {
        room,
        semester,
        academicYear: year,
        isActive: true
      }
    });

    for (const existingSchedule of classroomSchedules) {
      // Skip conflict if same subject (multi-section class)
      if (existingSchedule.subjectId === subjectId) continue;

      const existingDays = existingSchedule.dayOfWeek.split(',').map(d => d.trim());
      const hasDayOverlap = requestedDays.some(day => existingDays.includes(day));
      
      if (hasDayOverlap) {
        // Check time overlap
        const conflictStart = existingSchedule.startTime;
        const conflictEnd = existingSchedule.endTime;
        
        if ((startTime < conflictEnd && endTime > conflictStart)) {
          // Check date overlap if both have dates
          let dateOverlap = true;
          if (startDate && endDate && existingSchedule.startDate && existingSchedule.endDate) {
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            const existingStart = new Date(existingSchedule.startDate);
            const existingEnd = new Date(existingSchedule.endDate);
            
            if (newEnd < existingStart || newStart > existingEnd) {
              dateOverlap = false;
            }
          }

          if (dateOverlap) {
            return res.status(409).json({
              success: false,
              message: `Classroom ${room} is already booked for ${existingSchedule.dayOfWeek} from ${conflictStart} to ${conflictEnd}${existingSchedule.startDate ? ` (${existingSchedule.startDate} to ${existingSchedule.endDate})` : ''}`
            });
          }
        }
      }
    }

    // Check for instructor conflicts (only for non-same subject)
    const instructorSchedules = await scheduleRepository.find({
      where: {
        teacherId,
        semester,
        academicYear: year,
        isActive: true
      }
    });

    for (const existingSchedule of instructorSchedules) {
      // Skip conflict if same subject (multi-section class)
      if (existingSchedule.subjectId === subjectId) continue;

      const existingDays = existingSchedule.dayOfWeek.split(',').map(d => d.trim());
      const hasDayOverlap = requestedDays.some(day => existingDays.includes(day));
      
      if (hasDayOverlap) {
        // Check time overlap
        const conflictStart = existingSchedule.startTime;
        const conflictEnd = existingSchedule.endTime;
        
        if ((startTime < conflictEnd && endTime > conflictStart)) {
          // Check date overlap if both have dates
          let dateOverlap = true;
          if (startDate && endDate && existingSchedule.startDate && existingSchedule.endDate) {
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            const existingStart = new Date(existingSchedule.startDate);
            const existingEnd = new Date(existingSchedule.endDate);
            
            if (newEnd < existingStart || newStart > existingEnd) {
              dateOverlap = false;
            }
          }

          if (dateOverlap) {
            return res.status(409).json({
              success: false,
              message: `Instructor is already scheduled for ${existingSchedule.dayOfWeek} from ${conflictStart} to ${conflictEnd}${existingSchedule.startDate ? ` (${existingSchedule.startDate} to ${existingSchedule.endDate})` : ''}`
            });
          }
        }
      }
    }

    // Create schedules for all sections
    const createdSchedules = [];
    for (const courseSectionId of courseSectionIds) {
      const schedule = scheduleRepository.create({
        subjectId,
        courseSectionId,
        teacherId,
        dayOfWeek,
        startTime,
        endTime,
        room,
        semester,
        academicYear: year,
        startDate,
        endDate,
        isActive
      });

      const savedSchedule = await scheduleRepository.save(schedule);
      
      // Fetch complete schedule with relations
      const completeSchedule = await scheduleRepository.findOne({
        where: { id: savedSchedule.id },
        relations: ['subject', 'teacher', 'teacher.user', 'courseSection']
      });
      
      if (completeSchedule) {
        createdSchedules.push(completeSchedule);
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdSchedules.length} schedules created successfully`,
      data: createdSchedules
    });
  } catch (error) {
    console.error('Error bulk creating schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk create schedules'
    });
  }
});

/**
 * PUT /api/schedules/:id
 * Update a schedule
 * Accessible by: ADMIN, REGISTRAR
 */
router.put('/:id', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      subjectId,
      courseSectionId,
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      room,
      semester,
      year,
      startDate,
      endDate,
      isActive
    } = req.body;

    const schedule = await scheduleRepository.findOne({ where: { id } });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Validate day of week if provided
    if (dayOfWeek) {
      const days = dayOfWeek.split(',').map((d: string) => d.trim());
      const validDays = Object.values(DayOfWeek);
      const invalidDays = days.filter((d: string) => !validDays.includes(d as DayOfWeek));

      if (invalidDays.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid days: ${invalidDays.join(', ')}`
        });
      }
    }

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time format. Use HH:MM format'
      });
    }

    if (endTime && !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time format. Use HH:MM format'
      });
    }

    // Validate time logic if both times are provided
    const newStartTime = startTime || schedule.startTime;
    const newEndTime = endTime || schedule.endTime;
    
    if (newStartTime >= newEndTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Check if subject exists if subjectId is provided
    if (subjectId) {
      const subject = await subjectRepository.findOne({ where: { id: subjectId } });
      if (!subject) {
        return res.status(404).json({
          success: false,
          message: 'Subject not found'
        });
      }
    }

    // Check if teacher exists if teacherId is provided
    if (teacherId) {
      const teacher = await employeeRepository.findOne({ where: { id: teacherId } });
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
    }

    // Update schedule fields
    if (subjectId) schedule.subjectId = subjectId;
    if (courseSectionId) schedule.courseSectionId = courseSectionId;
    if (teacherId) schedule.teacherId = teacherId;
    if (dayOfWeek) schedule.dayOfWeek = dayOfWeek;
    if (startTime) schedule.startTime = startTime;
    if (endTime) schedule.endTime = endTime;
    if (room) schedule.room = room;
    if (semester) schedule.semester = semester;
    if (year) schedule.academicYear = year;
    if (startDate !== undefined) schedule.startDate = startDate;
    if (endDate !== undefined) schedule.endDate = endDate;
    if (isActive !== undefined) schedule.isActive = isActive;

    const updatedSchedule = await scheduleRepository.save(schedule);

    // Fetch complete schedule with relations
    const completeSchedule = await scheduleRepository.findOne({
      where: { id: updatedSchedule.id },
      relations: ['subject', 'teacher', 'teacher.user']
    });

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: completeSchedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule'
    });
  }
});

/**
 * DELETE /api/schedules/:id
 * Permanently delete a schedule (only if inactive)
 * Accessible by: ADMIN, SUPERADMIN
 */
router.delete('/:id', authenticateToken, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const schedule = await scheduleRepository.findOne({ where: { id } });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (schedule.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active schedule. Deactivate it first.'
      });
    }

    await scheduleRepository.remove(schedule);

    res.json({
      success: true,
      message: 'Schedule permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule'
    });
  }
});

/**
 * PATCH /api/schedules/:id/status
 * Update schedule status (activate/deactivate)
 * Accessible by: ADMIN, REGISTRAR
 */
router.patch('/:id/status', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive status is required'
      });
    }

    const schedule = await scheduleRepository.findOne({ where: { id } });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    schedule.isActive = Boolean(isActive);
    const updatedSchedule = await scheduleRepository.save(schedule);

    res.json({
      success: true,
      message: `Schedule ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedSchedule
    });
  } catch (error) {
    console.error('Error updating schedule status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule status'
    });
  }
});

/**
 * GET /api/schedules/teachers/:teacherId/timetable
 * Get weekly timetable for a specific teacher
 * Accepts either Employee UUID or employeeId (e.g., 'T001')
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/teachers/:teacherId/timetable', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId } = req.params;
    const { semester = '', academicYear = '' } = req.query;

    console.log('Fetching timetable for teacher:', teacherId);

    // First, try to find the employee by employeeId or UUID
    let employee;
    
    if (teacherId === 'me') {
      if (!req.user) {
         return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      employee = await employeeRepository.findOne({ where: { userId: req.user.id } });
    } else if (/^(\d{4}-E-\d{5}|\d{4}-00-\d{5})$/.test(teacherId) || teacherId.startsWith('EMP-') || (teacherId.startsWith('T') && teacherId.length <= 10)) {
      employee = await employeeRepository.findOne({ where: { employeeId: teacherId } });
    } else {
      // This looks like a UUID
      employee = await employeeRepository.findOne({ where: { id: teacherId } });
    }

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Security check for TEACHER role: can only view their own timetable
    const specificTimetableEffectiveRoles = Array.isArray(req.user?.roles) && req.user.roles.length > 0 ? req.user.roles : (req.user ? [req.user.role] : []);
    const specificTimetableHasPrivilegedRole = specificTimetableEffectiveRoles.some(role => [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.REGISTRAR].includes(role));
    const specificTimetableIsProgramHead = typeof req.user?.position === 'string' && req.user.position.toLowerCase().startsWith('program head');
    const shouldScopeSpecificTeacher = specificTimetableEffectiveRoles.includes(UserRole.TEACHER) && !specificTimetableHasPrivilegedRole && !specificTimetableIsProgramHead;

    if (shouldScopeSpecificTeacher) {
      const currentEmployee = await employeeRepository.findOne({ where: { userId: req.user.id } });
      if (currentEmployee && currentEmployee.id !== employee.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own timetable'
        });
      }
    }

    console.log('Found employee:', employee.id, employee.employeeId);

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('schedule.teacherId = :teacherId', { teacherId: employee.id })
      .andWhere('schedule.isActive = :isActive', { isActive: true });

    if (semester) {
      queryBuilder.andWhere('schedule.semester = :semester', { semester });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .getMany();

    // Group schedules by day of week
    const timetable = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: []
    };

    schedules.forEach(schedule => {
      if (schedule.dayOfWeek) {
        schedule.dayOfWeek.split(',').forEach(day => {
          const cleanDay = day.trim();
          if (timetable[cleanDay as keyof typeof timetable]) {
            (timetable[cleanDay as keyof typeof timetable] as Schedule[]).push(schedule);
          }
        });
      }
    });

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher timetable'
    });
  }
});

/**
 * GET /api/schedules/grade-levels/:gradeLevelId/timetable
 * Get weekly timetable for a specific course section (class)
 * Accessible by: ADMIN, REGISTRAR, TEACHER, STUDENT
 */
router.get('/grade-levels/:gradeLevelId/timetable', authenticateToken, requireRole(UserRole.STUDENT), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gradeLevelId } = req.params; // This is actually a course section ID
    const { semester = '', academicYear = '' } = req.query;
    const enrollmentRepository = AppDataSource.getRepository('Enrollment');
    const studentRepository = AppDataSource.getRepository('Student');

    const requestingUser = req.user;
    if (!requestingUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const student = await studentRepository.findOne({ where: { userId: requestingUser.id } });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const enrollment = await enrollmentRepository.findOne({
      where: {
        studentId: student.id,
        status: 'ENROLLED',
        courseSectionId: gradeLevelId,
        ...(semester ? { semester: String(semester) } : {}),
        ...(academicYear ? { academicYear: String(academicYear) } : {})
      }
    });

    const selectedSubjectIds = Array.isArray(enrollment?.selectedSubjects)
      ? enrollment!.selectedSubjects.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('schedule.courseSection', 'courseSection')
      .where('schedule.courseSectionId = :courseSectionId', { courseSectionId: gradeLevelId })
      .andWhere('schedule.isActive = :isActive', { isActive: true });

    if (semester) {
      queryBuilder.andWhere('schedule.semester = :semester', { semester });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    if (selectedSubjectIds.length > 0) {
      queryBuilder.andWhere('schedule.subjectId IN (:...selectedSubjectIds)', { selectedSubjectIds });
    }

    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .getMany();

    // Group schedules by day of week
    const timetable = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: []
    };

    schedules.forEach(schedule => {
      if (schedule.dayOfWeek) {
        schedule.dayOfWeek.split(',').forEach(day => {
          const cleanDay = day.trim();
          if (timetable[cleanDay as keyof typeof timetable]) {
            (timetable[cleanDay as keyof typeof timetable] as Schedule[]).push(schedule);
          }
        });
      }
    });

    res.json({
      success: true,
      data: timetable
    });
  } catch (error) {
    console.error('Error fetching grade level timetable:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grade level timetable'
    });
  }
});

/**
 * GET /api/schedules/rooms/:room/schedule
 * Get schedule for a specific room
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/rooms/:room/schedule', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { room } = req.params;
    const { semester = '', academicYear = '' } = req.query;

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .where('schedule.room = :room', { room: decodeURIComponent(room) })
      .andWhere('schedule.isActive = :isActive', { isActive: true });

    if (semester) {
      queryBuilder.andWhere('schedule.semester = :semester', { semester });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .getMany();

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching room schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room schedule'
    });
  }
});

/**
 * GET /api/schedules/grade-levels/:gradeLevelId
 * Get all schedules for a specific grade level
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 */
router.get('/grade-levels/:gradeLevelId', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gradeLevelId } = req.params;
    const { page = 1, limit = 10, isActive = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('schedule.courseSection', 'courseSection')
      .where('courseSection.gradeLevel = :gradeLevelId', { gradeLevelId });

    if (isActive !== '') {
      queryBuilder.andWhere('schedule.isActive = :isActive', { isActive: isActive === 'true' });
    }

    const totalItems = await queryBuilder.getCount();
    
    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .skip(offset)
      .take(Number(limit))
      .getMany();

    const totalPages = Math.ceil(totalItems / Number(limit));

    res.json({
      success: true,
      data: schedules,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems,
        itemsPerPage: Number(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching grade level schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch grade level schedules'
    });
  }
});

/**
 * GET /api/schedules/statistics
 * Get scheduling statistics
 * Accessible by: ADMIN, REGISTRAR
 */
router.get('/statistics', authenticateToken, requireRole(UserRole.REGISTRAR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { semester = '', academicYear = '' } = req.query;

    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher');

    if (semester) {
      queryBuilder.andWhere('schedule.semester = :semester', { semester });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    const totalSchedules = await queryBuilder.getCount();
    const activeSchedules = await queryBuilder.clone().andWhere('schedule.isActive = :isActive', { isActive: true }).getCount();
    const inactiveSchedules = totalSchedules - activeSchedules;

    // Get unique teachers count
    const uniqueTeachers = await queryBuilder.clone()
      .select('DISTINCT schedule.teacherId')
      .getRawMany();

    // Get unique subjects count
    const uniqueSubjects = await queryBuilder.clone()
      .select('DISTINCT schedule.subjectId')
      .getRawMany();

    // Get unique rooms count
    const uniqueRooms = await queryBuilder.clone()
      .select('DISTINCT schedule.room')
      .getRawMany();

    res.json({
      success: true,
      data: {
        totalSchedules,
        activeSchedules,
        inactiveSchedules,
        uniqueTeachers: uniqueTeachers.length,
        uniqueSubjects: uniqueSubjects.length,
        uniqueRooms: uniqueRooms.length
      }
    });
  } catch (error) {
    console.error('Error fetching scheduling statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduling statistics'
    });
  }
});

/**
 * GET /api/schedules/:id
 * Get a specific schedule by ID
 * Accessible by: ADMIN, REGISTRAR, TEACHER
 * Note: This route must come AFTER all specific routes to avoid conflicts
 */
router.get('/:id', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Dweezil's Code - Added courseSection and course relations to populate course and grade level data
    const schedule = await scheduleRepository.findOne({
      where: { id },
      relations: ['subject', 'teacher', 'teacher.user', 'courseSection', 'courseSection.course']
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule'
    });
  }
});

// Dweezil's Code - Get schedules for a specific student
/**
 * GET /api/schedules/student/:studentId
 * Get all schedules for a specific student based on their enrollments
 * Accessible by: ADMIN, REGISTRAR, TEACHER, STUDENT (own schedules only)
 */
router.get('/student/:studentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { semester = '', academicYear = '' } = req.query;
    const studentRepository = AppDataSource.getRepository('Student');
    const enrollmentRepository = AppDataSource.getRepository('Enrollment');

    // Check if user is authorized to view this student's schedules
    const requestingUser = req.user;
    if (requestingUser?.role === UserRole.STUDENT) {
      // Students can only view their own schedules
      const student = await studentRepository.findOne({ where: { userId: requestingUser.id } });
      if (!student || student.id !== studentId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own schedules'
        });
      }
    }

    // Dweezil's Code - Get student to check registration status
    const student = await studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Student schedules unlock only after enrollment reaches ENROLLED.
    const shouldShowSchedules = true;

    if (!shouldShowSchedules) {
      return res.json({
        success: true,
        data: [],
        message: 'Schedules not available yet. Complete enrollment first.'
      });
    }

    // Student schedules only come from ENROLLED enrollments.
    const enrollments = await enrollmentRepository.find({
      where: { 
        studentId,
        status: 'ENROLLED'
      },
      relations: ['courseSection']
    });

    if (enrollments.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No enrollments found for this student'
      });
    }

    // Downpayment validation - Check if any enrollment has unmet downpayment requirement
    // Only enforce for students (admins/registrars can view schedules regardless)
    if (requestingUser?.role === UserRole.STUDENT) {
      const enrollmentsWithUnmetDownpayment = enrollments.filter(enrollment => {
        if (enrollment.downpaymentRequired && enrollment.downpaymentRequired > 0) {
          const totalPaid = enrollment.totalPaid || 0;
          return totalPaid < enrollment.downpaymentRequired;
        }
        return false;
      });

      if (enrollmentsWithUnmetDownpayment.length > 0) {
        const firstUnmet = enrollmentsWithUnmetDownpayment[0];
        const shortfall = firstUnmet.downpaymentRequired - (firstUnmet.totalPaid || 0);
        
        console.log(`❌ Schedule access blocked - downpayment not met for student ${studentId}`);
        
        return res.status(403).json({
          success: false,
          error: 'DOWNPAYMENT_NOT_MET',
          message: `Schedule access requires minimum downpayment. Please complete payment of ₱${shortfall.toLocaleString()} to view your schedule.`,
          details: {
            downpaymentRequired: firstUnmet.downpaymentRequired,
            totalPaid: firstUnmet.totalPaid || 0,
            shortfall: shortfall
          }
        });
      }
    }

    // Get course section IDs from enrollments
    const courseSectionIds = enrollments
      .map(e => e.courseSectionId)
      .filter(id => id !== null && id !== undefined);

    const selectedSubjectIds = Array.from(
      new Set(
        enrollments
          .flatMap(enrollment => (Array.isArray(enrollment.selectedSubjects) ? enrollment.selectedSubjects : []))
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      )
    );

    if (courseSectionIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No course sections found for student enrollments'
      });
    }

    // Get schedules for these course sections
    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('schedule.courseSection', 'courseSection')
      .where('schedule.courseSectionId IN (:...courseSectionIds)', { courseSectionIds })
      .andWhere('schedule.isActive = :isActive', { isActive: true });

    if (semester) {
      queryBuilder.andWhere('schedule.semester = :semester', { semester });
    }

    if (academicYear) {
      queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
    }

    if (selectedSubjectIds.length > 0) {
      queryBuilder.andWhere('schedule.subjectId IN (:...selectedSubjectIds)', { selectedSubjectIds });
    }

    const schedules = await queryBuilder
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.startTime', 'ASC')
      .getMany();

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching student schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student schedules'
    });
  }
});

export default router;
