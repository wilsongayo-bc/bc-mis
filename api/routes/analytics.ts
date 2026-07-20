import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticateToken, AuthenticatedRequest, requireRole, requireRoles } from '../middleware/auth';
import { getEffectiveAcademicTerm } from '../utils/academicTerm';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import { Payment, PaymentStatus } from '../entities/Payment';
import { User, UserRole } from '../entities/User';
import { ActivityLog } from '../entities/ActivityLog';
import { StudentDocument, DocumentStatus } from '../entities/StudentDocument';
import { CourseSection } from '../entities/CourseSection';
import { Course } from '../entities/Course';
import { Schedule } from '../entities/Schedule';
import { Employee } from '../entities/Employee';
import { Student } from '../entities/Student';

type CacheEntry<T> = { expiresAt: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

const getCacheKey = (parts: Array<string | number | undefined | null>): string =>
  parts.map((p) => (p === undefined || p === null ? '' : String(p))).join('|');

const getCached = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
};

const setCached = <T>(key: string, value: T, ttlMs: number): void => {
  cache.set(key, { expiresAt: Date.now() + ttlMs, value });
};

const toDateOnlyString = (d: Date): string => d.toISOString().slice(0, 10);

const clampNonNegativeNumber = (n: unknown): number => {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
};

const router = Router();

router.get('/admin-dashboard', authenticateToken, requireRole(UserRole.ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { academicYear, semester } = await getEffectiveAcademicTerm(req.query);
    const cacheKey = getCacheKey(['admin', academicYear, semester]);
    const cached = getCached<unknown>(cacheKey);
    if (cached) return res.json(cached);

    const userRepo = AppDataSource.getRepository(User);
    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const activityRepo = AppDataSource.getRepository(ActivityLog);

    const now = new Date();
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 30);

    const [activeUsersByRoleRows, newUsers7d, newUsers30d] = await Promise.all([
      userRepo
        .createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('u.isActive = :isActive', { isActive: true })
        .groupBy('u.role')
        .getRawMany<{ role: UserRole; count: string }>(),
      userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :since', { since: d7 })
        .getCount(),
      userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :since', { since: d30 })
        .getCount()
    ]);

    const activeUsersByRole = Object.values(UserRole).reduce((acc, role) => {
      acc[role] = 0;
      return acc;
    }, {} as Record<UserRole, number>);

    for (const row of activeUsersByRoleRows) {
      if (row.role && row.role in activeUsersByRole) {
        activeUsersByRole[row.role] = clampNonNegativeNumber(row.count);
      }
    }

    const enrollmentCountsRows = await enrollmentRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('e.academicYear = :academicYear', { academicYear })
      .andWhere('e.semester = :semester', { semester })
      .groupBy('e.status')
      .getRawMany<{ status: EnrollmentStatus; count: string }>();

    const enrollmentCountsByStatus = Object.values(EnrollmentStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<EnrollmentStatus, number>);

    for (const row of enrollmentCountsRows) {
      if (row.status && row.status in enrollmentCountsByStatus) {
        enrollmentCountsByStatus[row.status] = clampNonNegativeNumber(row.count);
      }
    }

    const todayStr = toDateOnlyString(now);
    const d7Str = toDateOnlyString(d7);
    const d30Str = toDateOnlyString(d30);

    const [paymentsTodayRow, payments7dRow, payments30dRow] = await Promise.all([
      paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.PAID })
        .andWhere('p.paidDate = :today', { today: todayStr })
        .getRawOne<{ total: string }>(),
      paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.PAID })
        .andWhere('p.paidDate >= :since', { since: d7Str })
        .getRawOne<{ total: string }>(),
      paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.status = :status', { status: PaymentStatus.PAID })
        .andWhere('p.paidDate >= :since', { since: d30Str })
        .getRawOne<{ total: string }>()
    ]);

    const moduleExpr =
      "SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(a.endpoint, CHAR(63), 1), '/', 3), '/', -1)";

    const topModulesRows = await activityRepo
      .createQueryBuilder('a')
      .select(moduleExpr, 'module')
      .addSelect('COUNT(*)', 'count')
      .where('a.endpoint LIKE :prefix', { prefix: '/api/%' })
      .andWhere('a.createdAt >= :since', { since: d30 })
      .groupBy('module')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany<{ module: string; count: string }>();

    const response = {
      success: true,
      meta: {
        version: 1,
        generatedAt: new Date().toISOString(),
        academicYear,
        semester
      },
      data: {
        users: {
          activeByRole: activeUsersByRole,
          newUsers: {
            last7d: clampNonNegativeNumber(newUsers7d),
            last30d: clampNonNegativeNumber(newUsers30d)
          }
        },
        enrollments: {
          countsByStatus: enrollmentCountsByStatus
        },
        payments: {
          totals: {
            today: clampNonNegativeNumber(paymentsTodayRow?.total),
            last7d: clampNonNegativeNumber(payments7dRow?.total),
            last30d: clampNonNegativeNumber(payments30dRow?.total)
          }
        },
        activity: {
          topModules: topModulesRows.map((row) => ({
            module: row.module || 'unknown',
            count: clampNonNegativeNumber(row.count)
          }))
        }
      }
    };

    setCached(cacheKey, response, 30_000);
    return res.json(response);
  } catch (error) {
    console.error('Error fetching admin dashboard analytics:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin dashboard analytics' });
  }
});

router.get(
  '/registrar-dashboard',
  authenticateToken,
  requireRole(UserRole.REGISTRAR),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { academicYear, semester } = await getEffectiveAcademicTerm(req.query);
      const cacheKey = getCacheKey(['registrar', academicYear, semester]);
      const cached = getCached<unknown>(cacheKey);
      if (cached) return res.json(cached);

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const docRepo = AppDataSource.getRepository(StudentDocument);
      const courseSectionRepo = AppDataSource.getRepository(CourseSection);
      const scheduleRepo = AppDataSource.getRepository(Schedule);

      const pipelineRows = await enrollmentRepo
        .createQueryBuilder('e')
        .select('e.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('e.academicYear = :academicYear', { academicYear })
        .andWhere('e.semester = :semester', { semester })
        .groupBy('e.status')
        .getRawMany<{ status: EnrollmentStatus; count: string }>();

      const pipelineCounts = Object.values(EnrollmentStatus).reduce((acc, status) => {
        acc[status] = 0;
        return acc;
      }, {} as Record<EnrollmentStatus, number>);

      for (const row of pipelineRows) {
        if (row.status && row.status in pipelineCounts) {
          pipelineCounts[row.status] = clampNonNegativeNumber(row.count);
        }
      }

      const docCountsRows = await docRepo
        .createQueryBuilder('d')
        .select('d.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('d.status IN (:...statuses)', { statuses: [DocumentStatus.PENDING, DocumentStatus.SUBMITTED] })
        .groupBy('d.status')
        .getRawMany<{ status: DocumentStatus; count: string }>();

      const pendingDocuments = {
        pending: 0,
        submitted: 0,
        total: 0
      };

      for (const row of docCountsRows) {
        if (row.status === DocumentStatus.PENDING) pendingDocuments.pending = clampNonNegativeNumber(row.count);
        if (row.status === DocumentStatus.SUBMITTED) pendingDocuments.submitted = clampNonNegativeNumber(row.count);
      }
      pendingDocuments.total = pendingDocuments.pending + pendingDocuments.submitted;

      const utilizationRows = await courseSectionRepo
        .createQueryBuilder('cs')
        .leftJoin(Enrollment, 'e', 'e.courseSectionId = cs.id AND e.status = :enrolledStatus AND e.academicYear = :academicYear AND e.semester = :semester', {
          enrolledStatus: EnrollmentStatus.ENROLLED,
          academicYear,
          semester
        })
        .leftJoin(Course, 'c', 'c.id = cs.courseId')
        .select('cs.id', 'courseSectionId')
        .addSelect('cs.sectionName', 'sectionName')
        .addSelect('cs.yearLevel', 'yearLevel')
        .addSelect('cs.maxStudents', 'maxStudents')
        .addSelect('c.name', 'courseName')
        .addSelect('COUNT(e.id)', 'enrolledCount')
        .where('cs.isActive = :isActive', { isActive: true })
        .andWhere('cs.academicYear = :academicYear', { academicYear })
        .andWhere('cs.semester = :semester', { semester })
        .groupBy('cs.id')
        .orderBy('enrolledCount', 'DESC')
        .limit(10)
        .getRawMany<{
          courseSectionId: string;
          sectionName: string;
          yearLevel: string;
          maxStudents: number | string;
          courseName: string;
          enrolledCount: string;
        }>();

      const totalSectionAgg = await courseSectionRepo
        .createQueryBuilder('cs')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(cs.maxStudents), 0)', 'capacity')
        .where('cs.isActive = :isActive', { isActive: true })
        .andWhere('cs.academicYear = :academicYear', { academicYear })
        .andWhere('cs.semester = :semester', { semester })
        .getRawOne<{ count: string; capacity: string }>();

      const totalEnrolledAgg = await enrollmentRepo
        .createQueryBuilder('e')
        .select('COUNT(*)', 'count')
        .where('e.status = :status', { status: EnrollmentStatus.ENROLLED })
        .andWhere('e.academicYear = :academicYear', { academicYear })
        .andWhere('e.semester = :semester', { semester })
        .getRawOne<{ count: string }>();

      const totalSections = clampNonNegativeNumber(totalSectionAgg?.count);
      const totalCapacity = clampNonNegativeNumber(totalSectionAgg?.capacity);
      const totalEnrolled = clampNonNegativeNumber(totalEnrolledAgg?.count);
      const utilizationRate = totalCapacity > 0 ? totalEnrolled / totalCapacity : 0;

      const readinessRows = await scheduleRepo.query(
        `
        SELECT
          cs.id AS courseSectionId,
          cs.sectionName AS sectionName,
          cs.yearLevel AS yearLevel,
          c.name AS courseName,
          COUNT(DISTINCT e.id) AS enrolledCount
        FROM course_sections cs
        INNER JOIN courses c ON c.id = cs.courseId
        INNER JOIN enrollments e
          ON e.courseSectionId = cs.id
          AND e.status = ?
          AND e.academicYear = ?
          AND e.semester = ?
        LEFT JOIN schedules s
          ON s.courseSectionId = cs.id
          AND s.isActive = 1
          AND s.academicYear = ?
          AND s.semester = ?
        WHERE cs.isActive = 1
          AND cs.academicYear = ?
          AND cs.semester = ?
        GROUP BY cs.id
        HAVING enrolledCount > 0 AND COUNT(s.id) = 0
        ORDER BY enrolledCount DESC
        LIMIT 20
        `,
        [EnrollmentStatus.ENROLLED, academicYear, semester, academicYear, semester, academicYear, semester]
      );

      const response = {
        success: true,
        meta: {
          version: 1,
          generatedAt: new Date().toISOString(),
          academicYear,
          semester
        },
        data: {
          enrollments: {
            pipelineCountsByStatus: pipelineCounts
          },
          documents: {
            pendingOrUnverified: pendingDocuments
          },
          sections: {
            utilizationSummary: {
              totalSections,
              totalEnrolled,
              totalCapacity,
              utilizationRate
            },
            topUtilized: utilizationRows.map((row) => ({
              courseSectionId: row.courseSectionId,
              sectionName: row.sectionName,
              yearLevel: row.yearLevel,
              courseName: row.courseName,
              enrolledCount: clampNonNegativeNumber(row.enrolledCount),
              maxStudents: clampNonNegativeNumber(row.maxStudents)
            }))
          },
          schedulingReadiness: {
            missingSchedules: (readinessRows as Array<Record<string, unknown>>).map((row) => ({
              courseSectionId: String(row.courseSectionId),
              sectionName: String(row.sectionName),
              yearLevel: String(row.yearLevel),
              courseName: String(row.courseName),
              enrolledCount: clampNonNegativeNumber(row.enrolledCount)
            }))
          }
        }
      };

      setCached(cacheKey, response, 30_000);
      return res.json(response);
    } catch (error) {
      console.error('Error fetching registrar dashboard analytics:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch registrar dashboard analytics' });
    }
  }
);

router.get('/teacher-dashboard', authenticateToken, requireRole(UserRole.TEACHER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { academicYear, semester } = await getEffectiveAcademicTerm(req.query);
    const cacheKey = getCacheKey(['teacher', userId, academicYear, semester]);
    const cached = getCached<unknown>(cacheKey);
    if (cached) return res.json(cached);

    const employeeRepo = AppDataSource.getRepository(Employee);
    const scheduleRepo = AppDataSource.getRepository(Schedule);

    const employee = await employeeRepo.findOne({ where: { userId } });
    if (!employee) return res.status(404).json({ success: false, message: 'Teacher record not found' });

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const now = new Date();
    const nowTime = now.toTimeString().slice(0, 8);

    const nextClasses = await scheduleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.subject', 'subject')
      .leftJoinAndSelect('s.courseSection', 'courseSection')
      .leftJoinAndSelect('courseSection.course', 'course')
      .where('s.teacherId = :teacherId', { teacherId: employee.id })
      .andWhere('s.isActive = :isActive', { isActive: true })
      .andWhere('s.academicYear = :academicYear', { academicYear })
      .andWhere('s.semester = :semester', { semester })
      .andWhere('s.dayOfWeek LIKE :day', { day: `%${today}%` })
      .andWhere('s.startTime >= :nowTime', { nowTime })
      .orderBy('s.startTime', 'ASC')
      .limit(3)
      .getMany();

    const dedupedStudentsRow = await AppDataSource.query(
      `
      SELECT COUNT(DISTINCT e.studentId) AS studentCount
      FROM enrollments e
      INNER JOIN schedules s
        ON s.courseSectionId = e.courseSectionId
        AND s.teacherId = ?
        AND s.isActive = 1
        AND s.academicYear = ?
        AND s.semester = ?
      WHERE e.status = ?
        AND e.academicYear = ?
        AND e.semester = ?
      `,
      [employee.id, academicYear, semester, EnrollmentStatus.ENROLLED, academicYear, semester]
    );

    const totalStudents = clampNonNegativeNumber(dedupedStudentsRow?.[0]?.studentCount);

    const response = {
      success: true,
      meta: {
        version: 1,
        generatedAt: new Date().toISOString(),
        academicYear,
        semester
      },
      data: {
        schedules: {
          next3Today: nextClasses.map((s) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            dayOfWeek: s.dayOfWeek,
            room: s.room,
            subject: s.subject
              ? { id: s.subject.id, code: s.subject.code, name: s.subject.name }
              : { id: s.subjectId, code: '', name: '' },
            courseSection: s.courseSection
              ? {
                  id: s.courseSection.id,
                  sectionName: s.courseSection.sectionName,
                  yearLevel: s.courseSection.yearLevel,
                  course: s.courseSection.course ? { id: s.courseSection.course.id, name: s.courseSection.course.name, code: s.courseSection.course.courseCode } : undefined
                }
              : undefined,
            classListHref: `/schedules/${s.id}/class-list`
          }))
        },
        students: {
          totalDistinctAcrossClasses: totalStudents
        },
        quickLinks: {
          classLists: nextClasses.map((s) => ({ scheduleId: s.id, href: `/schedules/${s.id}/class-list` }))
        }
      }
    };

    setCached(cacheKey, response, 15_000);
    return res.json(response);
  } catch (error) {
    console.error('Error fetching teacher dashboard analytics:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch teacher dashboard analytics' });
  }
});

router.get('/student-dashboard', authenticateToken, requireRoles([UserRole.STUDENT]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { academicYear, semester } = await getEffectiveAcademicTerm(req.query);
    const cacheKey = getCacheKey(['student', userId, academicYear, semester]);
    const cached = getCached<unknown>(cacheKey);
    if (cached) return res.json(cached);

    const userRepo = AppDataSource.getRepository(User);
    const studentRepo = AppDataSource.getRepository(Student);
    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    const scheduleRepo = AppDataSource.getRepository(Schedule);

    const [user, student] = await Promise.all([
      userRepo.findOne({ where: { id: userId } }),
      studentRepo.findOne({ where: { userId } })
    ]);

    if (!student) return res.status(404).json({ success: false, message: 'Student record not found' });

    const currentEnrollment = await enrollmentRepo.findOne({
      where: {
        studentId: student.id,
        academicYear,
        semester
      },
      order: { updatedAt: 'DESC' as const }
    });

    const enrolledCourseSectionIdsRows = await enrollmentRepo
      .createQueryBuilder('e')
      .select('DISTINCT e.courseSectionId', 'courseSectionId')
      .where('e.studentId = :studentId', { studentId: student.id })
      .andWhere('e.status = :status', { status: EnrollmentStatus.ENROLLED })
      .andWhere('e.courseSectionId IS NOT NULL')
      .andWhere('e.academicYear = :academicYear', { academicYear })
      .andWhere('e.semester = :semester', { semester })
      .getRawMany<{ courseSectionId: string }>();

    const courseSectionIds = enrolledCourseSectionIdsRows.map((r) => r.courseSectionId).filter(Boolean);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const now = new Date();
    const nowTime = now.toTimeString().slice(0, 8);

    const todaySchedulesCount =
      courseSectionIds.length === 0
        ? 0
        : await scheduleRepo
            .createQueryBuilder('s')
            .where('s.courseSectionId IN (:...courseSectionIds)', { courseSectionIds: courseSectionIds })
            .andWhere('s.isActive = :isActive', { isActive: true })
            .andWhere('s.academicYear = :academicYear', { academicYear })
            .andWhere('s.semester = :semester', { semester })
            .andWhere('s.dayOfWeek LIKE :day', { day: `%${today}%` })
            .getCount();

    const nextSchedule =
      courseSectionIds.length === 0
        ? null
        : await scheduleRepo
            .createQueryBuilder('s')
            .leftJoinAndSelect('s.subject', 'subject')
            .leftJoinAndSelect('s.teacher', 'teacher')
            .leftJoinAndSelect('teacher.user', 'teacherUser')
            .leftJoinAndSelect('s.courseSection', 'courseSection')
            .where('s.courseSectionId IN (:...courseSectionIds)', { courseSectionIds: courseSectionIds })
            .andWhere('s.isActive = :isActive', { isActive: true })
            .andWhere('s.academicYear = :academicYear', { academicYear })
            .andWhere('s.semester = :semester', { semester })
            .andWhere('s.dayOfWeek LIKE :day', { day: `%${today}%` })
            .andWhere('s.startTime >= :nowTime', { nowTime })
            .orderBy('s.startTime', 'ASC')
            .getOne();

    const totalAssessed = clampNonNegativeNumber(currentEnrollment?.totalAssessed);
    const totalPaid = clampNonNegativeNumber(currentEnrollment?.totalPaid);
    const balance = clampNonNegativeNumber(currentEnrollment?.balance);
    const downpaymentRequired = clampNonNegativeNumber(currentEnrollment?.downpaymentRequired);
    const downpaymentMet = downpaymentRequired > 0 ? totalPaid >= downpaymentRequired : totalPaid > 0;

    const response = {
      success: true,
      meta: {
        version: 1,
        generatedAt: new Date().toISOString(),
        academicYear,
        semester
      },
      data: {
        enrollment: {
          status: currentEnrollment?.status ?? null,
          enrollmentId: currentEnrollment?.id ?? null,
          term: { academicYear, semester },
          downpaymentRequired,
          totalAssessed,
          totalPaid,
          balance,
          downpaymentMet
        },
        schedule: {
          todayClassCount: todaySchedulesCount,
          nextClass:
            nextSchedule === null
              ? null
              : {
                  id: nextSchedule.id,
                  startTime: nextSchedule.startTime,
                  endTime: nextSchedule.endTime,
                  dayOfWeek: nextSchedule.dayOfWeek,
                  room: nextSchedule.room,
                  subject: nextSchedule.subject
                    ? { id: nextSchedule.subject.id, code: nextSchedule.subject.code, name: nextSchedule.subject.name }
                    : { id: nextSchedule.subjectId, code: '', name: '' },
                  teacher:
                    nextSchedule.teacher?.user
                      ? { firstName: nextSchedule.teacher.user.firstName, lastName: nextSchedule.teacher.user.lastName }
                      : null
                }
        },
        alerts: {
          mustChangePassword: Boolean(user?.mustChangePassword),
          emailNotVerified: user ? !user.isEmailVerified : false
        }
      }
    };

    setCached(cacheKey, response, 15_000);
    return res.json(response);
  } catch (error) {
    console.error('Error fetching student dashboard analytics:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student dashboard analytics' });
  }
});

export default router;
