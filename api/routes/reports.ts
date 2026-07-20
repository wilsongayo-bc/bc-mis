import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Student } from '../entities/Student';
import { StudentDocument } from '../entities/StudentDocument';
import { DocumentRequirement } from '../entities/DocumentRequirement';
import { Payment, PaymentStatus } from '../entities/Payment';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import { ReportTemplate } from '../entities/ReportTemplate';
import { ScheduledReport } from '../entities/ScheduledReport';
import { ReportCache } from '../entities/ReportCache';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { MoreThan, Between, FindOperator, In } from 'typeorm';
import { Schedule } from '../entities/Schedule';
import { Employee } from '../entities/Employee';

const router = Router();

// Type interfaces for custom report configurations
interface CustomReportFilters {
  gradeLevel?: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface CustomReportConfig {
  includeDocuments?: boolean;
  includeStudent?: boolean;
  includeGradeLevel?: boolean;
  includeCourse?: boolean;
  filters?: CustomReportFilters;
}

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Helper function to generate cache key
const generateCacheKey = (reportType: string, filters: Record<string, unknown>): string => {
  return `${reportType}_${JSON.stringify(filters)}_${new Date().toISOString().split('T')[0]}`;
};

// Helper function to check cache
const checkCache = async (cacheKey: string) => {
  const cached = await AppDataSource.getRepository(ReportCache).findOne({
    where: { 
      cacheKey,
      expiresAt: MoreThan(new Date())
    }
  });
  return cached?.data || null;
};

// Helper function to save to cache
const saveToCache = async (cacheKey: string, reportType: string, filters: Record<string, unknown>, data: Record<string, unknown>, expirationHours = 1) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expirationHours);
  
  const cacheRepo = AppDataSource.getRepository(ReportCache);
  
  // Remove existing cache entry
  await cacheRepo.delete({ cacheKey });
  
  // Save new cache entry
  const cacheEntry = cacheRepo.create({
    cacheKey,
    reportType,
    filters,
    data,
    expiresAt
  });
  
  await cacheRepo.save(cacheEntry);
};

// Teacher Subject Load Report
router.get('/teacher-load', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId, academicYear, semester, courseId } = req.query;
    
    const scheduleRepo = AppDataSource.getRepository(Schedule);
    const employeeRepo = AppDataSource.getRepository(Employee);
    const enrollmentRepo = AppDataSource.getRepository(Enrollment);

    let teacherIds: string[] = [];

    // Determine which teachers to fetch
    if (teacherId && teacherId !== 'all') {
      teacherIds = [teacherId as string];
    } else {
      // Get all teachers who have schedules matching the criteria
      const queryBuilder = scheduleRepo.createQueryBuilder('schedule')
        .select('DISTINCT schedule.teacherId', 'teacherId')
        .where('schedule.teacherId IS NOT NULL');
      
      if (academicYear) {
        queryBuilder.andWhere('schedule.academicYear = :academicYear', { academicYear });
      }
      if (semester) {
        queryBuilder.andWhere('schedule.semester = :semester', { semester });
      }
      if (courseId) {
        queryBuilder.innerJoin('schedule.courseSection', 'section')
          .innerJoin('section.course', 'course')
          .andWhere('course.id = :courseId', { courseId });
      }
      
      const result = await queryBuilder.getRawMany();
      teacherIds = result.map(r => r.teacherId);
    }

    if (teacherIds.length === 0) {
      return res.json({ data: [] });
    }

    // Fetch teachers details with user info
    const teachers = await employeeRepo.find({
      where: { id: In(teacherIds) },
      relations: ['user']
    });

    const reportData = [];

    // Helper to abbreviate days
    const abbreviateDay = (day: string) => {
      const map: Record<string, string> = {
        'MONDAY': 'M',
        'TUESDAY': 'T',
        'WEDNESDAY': 'W',
        'THURSDAY': 'TH',
        'FRIDAY': 'F',
        'SATURDAY': 'S',
        'SUNDAY': 'SU'
      };
      return map[day.toUpperCase()] || day;
    };


    
    const to12Hour = (timeStr: string) => {
       if (!timeStr) return '';
       const [h, m] = timeStr.split(':');
       let hours = parseInt(h);
       // const ampm = hours >= 12 ? 'PM' : 'AM';
       hours = hours % 12;
       hours = hours ? hours : 12; 
       return `${hours}:${m}`;
    };

    for (const teacher of teachers) {
      // Find schedules for this teacher
      const whereCondition: Record<string, unknown> = {
        teacherId: teacher.id
      };

      if (academicYear) whereCondition.academicYear = academicYear;
      if (semester) whereCondition.semester = semester;
      if (courseId) {
        whereCondition.courseSection = {
          course: {
            id: courseId
          }
        };
      }

      const schedules = await scheduleRepo.find({
        where: whereCondition,
        relations: ['subject', 'courseSection', 'courseSection.course'],
        order: { startTime: 'ASC' }
      });

      if (schedules.length === 0) continue;

      // Group schedules by subject+section+time+room
      const groupedSchedules: Record<string, {
        subjectCode: string;
        subjectDescription: string;
        startTime: string;
        endTime: string;
        days: string[];
        courseAndYear: string;
        block: string;
        units: number;
        room: string;
        noOfStudents: number;
      }> = {};
      
      for (const schedule of schedules) {
        const key = `${schedule.subjectId}-${schedule.courseSectionId}-${schedule.startTime}-${schedule.endTime}-${schedule.room}`;
        
        if (!groupedSchedules[key]) {
          // Count students for this section
          const studentCount = await enrollmentRepo.count({
            where: {
              courseSectionId: schedule.courseSectionId,
              status: EnrollmentStatus.ENROLLED
            }
          });

          groupedSchedules[key] = {
            subjectCode: schedule.subject?.code || 'N/A',
            subjectDescription: schedule.subject?.name || 'N/A',
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            days: [schedule.dayOfWeek],
            courseAndYear: `${schedule.courseSection?.course?.courseCode || ''} ${schedule.courseSection?.yearLevel || ''}`.trim(),
            block: schedule.courseSection?.sectionName || 'N/A',
            units: schedule.subject?.units || 0,
            room: schedule.room || 'N/A',
            noOfStudents: studentCount
          };
        } else {
          // Add day if not exists
          if (!groupedSchedules[key].days.includes(schedule.dayOfWeek)) {
            groupedSchedules[key].days.push(schedule.dayOfWeek);
          }
        }
      }

      // Format the grouped schedules
      const formattedSchedules = Object.values(groupedSchedules).map(s => {
        // Sort days? M, T, W, TH, F, S, SU
        const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        s.days.sort((a: string, b: string) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
        
        const dayStr = s.days.map((d: string) => abbreviateDay(d)).join('');
        const timeStr = `${to12Hour(s.startTime)}-${to12Hour(s.endTime)}`;
        
        return {
          subjectCode: s.subjectCode,
          subjectDescription: s.subjectDescription,
          time: timeStr,
          days: dayStr,
          courseAndYear: s.courseAndYear,
          block: s.block,
          units: s.units,
          room: s.room,
          noOfStudents: s.noOfStudents
        };
      });

      const totalUnits = formattedSchedules.reduce((sum, s) => sum + s.units, 0);

      reportData.push({
        teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`.toUpperCase(),
        designation: teacher.position || 'N/A',
        schedules: formattedSchedules,
        totalUnits,
        academicYear: schedules[0].academicYear,
        semester: schedules[0].semester
      });
    }

    res.json({ data: reportData });

  } catch (error) {
    console.error('Teacher load report error:', error);
    res.status(500).json({ error: 'Failed to generate teacher load report' });
  }
});

// Dashboard Overview Report
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cacheKey = generateCacheKey('dashboard', {});
    const cached = await checkCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const studentRepo = AppDataSource.getRepository(Student);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    const documentRepo = AppDataSource.getRepository(StudentDocument);

    // Get basic counts
    const totalStudents = await studentRepo.count();
    const totalEnrollments = await enrollmentRepo.count();
    
    // Get payment statistics
    const totalRevenue = await paymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.PAID })
      .getRawOne();

    const pendingPayments = await paymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.PENDING })
      .getRawOne();

    // Get document compliance rate
    const totalRequiredDocs = await AppDataSource.getRepository(DocumentRequirement).count();
    const totalSubmittedDocs = await documentRepo.count();
    const complianceRate = totalRequiredDocs > 0 ? (totalSubmittedDocs / (totalStudents * totalRequiredDocs)) * 100 : 0;

    // Get recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEnrollments = await enrollmentRepo.count({
      where: { createdAt: MoreThan(thirtyDaysAgo) }
    });

    // Get students by grade level
    const studentsByGrade = await studentRepo
      .createQueryBuilder('student')
      .leftJoin('student.gradeLevel', 'gradeLevel')
      .select('gradeLevel.name', 'gradeName')
      .addSelect('COUNT(student.id)', 'count')
      .groupBy('gradeLevel.id')
      .getRawMany();

    // Get monthly revenue trend (last 6 months)
    const monthlyRevenue = await paymentRepo
      .createQueryBuilder('payment')
      .select('DATE_FORMAT(payment.createdAt, "%Y-%m")', 'month')
      .addSelect('SUM(payment.amount)', 'revenue')
      .where('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere('payment.createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)')
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    const dashboardData = {
      overview: {
        totalStudents,
        totalEnrollments,
        totalRevenue: parseFloat(totalRevenue?.total || '0'),
        pendingPayments: parseFloat(pendingPayments?.total || '0'),
        complianceRate: Math.round(complianceRate * 100) / 100,
        recentEnrollments
      },
      charts: {
        studentsByGrade: studentsByGrade.map(item => ({
          name: item.gradeName || 'Unknown',
          value: parseInt(item.count)
        })),
        monthlyRevenue: monthlyRevenue.map(item => ({
          month: item.month,
          revenue: parseFloat(item.revenue)
        }))
      }
    };

    await saveToCache(cacheKey, 'dashboard', {}, dashboardData, 1);
    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard report' });
  }
});

// Student Document Compliance Report
router.get('/student-compliance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gradeLevel, status, page = 1, limit = 50 } = req.query;
    const filters = { gradeLevel, status, page, limit };
    const cacheKey = generateCacheKey('student-compliance', filters);
    const cached = await checkCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const studentRepo = AppDataSource.getRepository(Student);
    const requirementRepo = AppDataSource.getRepository(DocumentRequirement);

    // Get all document requirements
    const totalRequirements = await requirementRepo.count();

    // Build query for students
    let studentQuery = studentRepo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.gradeLevel', 'gradeLevel')
      .leftJoinAndSelect('student.documents', 'documents')
      .leftJoinAndSelect('documents.requirement', 'requirement');

    if (gradeLevel) {
      studentQuery = studentQuery.where('gradeLevel.id = :gradeLevel', { gradeLevel });
    }

    const students = await studentQuery.getMany();

    // Calculate compliance for each student
    const complianceData = await Promise.all(students.map(async (student) => {
      // Get submitted documents count for this student
      const submittedDocs = await AppDataSource.getRepository(StudentDocument)
        .count({ where: { studentId: student.id } });
      const complianceRate = totalRequirements > 0 ? (submittedDocs / totalRequirements) * 100 : 0;
      const missingDocs = Math.max(0, totalRequirements - submittedDocs);
      
      let complianceStatus = 'compliant';
      if (complianceRate < 50) complianceStatus = 'critical';
      else if (complianceRate < 80) complianceStatus = 'warning';

      return {
        id: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        gradeLevel: student.gradeLevel?.name || 'Unknown',
        submittedDocuments: submittedDocs,
        totalRequirements,
        complianceRate: Math.round(complianceRate * 100) / 100,
        missingDocuments: missingDocs,
        status: complianceStatus,
        lastUpdated: student.updatedAt
      };
    }));

    // Filter by status if provided
    let filteredData = complianceData;
    if (status && status !== 'all') {
      filteredData = complianceData.filter(item => item.status === status);
    }

    // Pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const paginatedData = filteredData.slice(offset, offset + parseInt(limit as string));

    // Summary statistics
    const summary = {
      totalStudents: complianceData.length,
      compliantStudents: complianceData.filter(s => s.status === 'compliant').length,
      warningStudents: complianceData.filter(s => s.status === 'warning').length,
      criticalStudents: complianceData.filter(s => s.status === 'critical').length,
      averageComplianceRate: complianceData.reduce((sum, s) => sum + s.complianceRate, 0) / complianceData.length || 0
    };

    const result = {
      summary,
      data: paginatedData,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / parseInt(limit as string))
      }
    };

    await saveToCache(cacheKey, 'student-compliance', filters, result, 2);
    res.json(result);
  } catch (error) {
    console.error('Student compliance report error:', error);
    res.status(500).json({ error: 'Failed to generate student compliance report' });
  }
});

// Document Expiration Report
router.get('/document-expiration', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { daysAhead = 30, gradeLevel, page = 1, limit = 50 } = req.query;
    const filters = { daysAhead, gradeLevel, page, limit };
    const cacheKey = generateCacheKey('document-expiration', filters);
    const cached = await checkCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const documentRepo = AppDataSource.getRepository(StudentDocument);
    
    // Calculate expiration date threshold
    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + parseInt(daysAhead as string));

    // Build query for documents with metadata containing expiration dates
    let query = documentRepo
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.gradeLevel', 'gradeLevel')
      .leftJoinAndSelect('document.requirement', 'requirement')
      .where('document.metadata IS NOT NULL')
      .andWhere("JSON_EXTRACT(document.metadata, '$.expirationDate') IS NOT NULL");

    if (gradeLevel) {
      query = query.andWhere('gradeLevel.id = :gradeLevel', { gradeLevel });
    }

    const allDocuments = await query.getMany();

    // Filter and process documents with expiration dates
    const expirationData = allDocuments
      .filter(doc => {
        if (!doc.metadata?.expirationDate) return false;
        const expirationDate = new Date(doc.metadata.expirationDate);
        const today = new Date();
        return expirationDate >= today && expirationDate <= expirationThreshold;
      })
      .map(doc => {
        const expirationDate = new Date(doc.metadata!.expirationDate!);
        const daysUntilExpiration = Math.ceil(
          (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        let urgencyLevel = 'low';
        if (daysUntilExpiration <= 7) urgencyLevel = 'critical';
        else if (daysUntilExpiration <= 14) urgencyLevel = 'high';
        else if (daysUntilExpiration <= 21) urgencyLevel = 'medium';

        return {
          id: doc.id,
          studentName: `${doc.student.user.firstName} ${doc.student.user.lastName}`,
          gradeLevel: doc.student.gradeLevel?.name || 'Unknown',
          documentType: doc.requirement?.name || 'Unknown',
          expirationDate: expirationDate,
          daysUntilExpiration,
          urgencyLevel,
          filePath: doc.filePath
        };
      })
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

    // Pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const paginatedData = expirationData.slice(offset, offset + parseInt(limit as string));

    // Summary statistics
    const summary = {
      totalExpiringDocuments: expirationData.length,
      criticalDocuments: expirationData.filter(d => d.urgencyLevel === 'critical').length,
      highUrgencyDocuments: expirationData.filter(d => d.urgencyLevel === 'high').length,
      mediumUrgencyDocuments: expirationData.filter(d => d.urgencyLevel === 'medium').length,
      lowUrgencyDocuments: expirationData.filter(d => d.urgencyLevel === 'low').length
    };

    const result = {
      summary,
      data: paginatedData,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: expirationData.length,
        totalPages: Math.ceil(expirationData.length / parseInt(limit as string))
      }
    };

    await saveToCache(cacheKey, 'document-expiration', filters, result, 4);
    res.json(result);
  } catch (error) {
    console.error('Document expiration report error:', error);
    res.status(500).json({ error: 'Failed to generate document expiration report' });
  }
});

// Academic Performance Report
router.get('/academic-performance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gradeLevel, course, period, page = 1, limit = 50 } = req.query;
    const filters = { gradeLevel, course, period, page, limit };
    const cacheKey = generateCacheKey('academic-performance', filters);
    const cached = await checkCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    
    // Build query for enrollments with academic data
    let query = enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('student.gradeLevel', 'gradeLevel')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.subject', 'subject');

    if (gradeLevel) {
      query = query.where('gradeLevel.id = :gradeLevel', { gradeLevel });
    }

    if (course) {
      query = query.andWhere('course.id = :course', { course });
    }

    const enrollments = await query.getMany();

    // Process academic performance data
    const performanceData = enrollments.map(enrollment => {
      // Mock grade calculation (in real implementation, this would come from grades table)
      const mockGrade = Math.floor(Math.random() * 40) + 60; // 60-100 range
      const mockAttendance = Math.floor(Math.random() * 30) + 70; // 70-100 range
      
      let performanceLevel = 'excellent';
      if (mockGrade < 70) performanceLevel = 'needs_improvement';
      else if (mockGrade < 80) performanceLevel = 'satisfactory';
      else if (mockGrade < 90) performanceLevel = 'good';

      return {
        id: enrollment.id,
        studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
        gradeLevel: enrollment.student.gradeLevel?.name || 'Unknown',
        courseName: enrollment.course?.name || 'Unknown',
        subjectName: enrollment.course?.department?.name || 'Unknown',
        currentGrade: mockGrade,
        attendanceRate: mockAttendance,
        performanceLevel,
        enrollmentDate: enrollment.createdAt
      };
    });

    // Pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const paginatedData = performanceData.slice(offset, offset + parseInt(limit as string));

    // Summary statistics
    const summary = {
      totalEnrollments: performanceData.length,
      averageGrade: performanceData.reduce((sum, p) => sum + p.currentGrade, 0) / performanceData.length || 0,
      averageAttendance: performanceData.reduce((sum, p) => sum + p.attendanceRate, 0) / performanceData.length || 0,
      excellentPerformers: performanceData.filter(p => p.performanceLevel === 'excellent').length,
      goodPerformers: performanceData.filter(p => p.performanceLevel === 'good').length,
      satisfactoryPerformers: performanceData.filter(p => p.performanceLevel === 'satisfactory').length,
      needsImprovement: performanceData.filter(p => p.performanceLevel === 'needs_improvement').length
    };

    const result = {
      summary,
      data: paginatedData,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: performanceData.length,
        totalPages: Math.ceil(performanceData.length / parseInt(limit as string))
      }
    };

    await saveToCache(cacheKey, 'academic-performance', filters, result, 2);
    res.json(result);
  } catch (error) {
    console.error('Academic performance report error:', error);
    res.status(500).json({ error: 'Failed to generate academic performance report' });
  }
});

// Financial Report
router.get('/financial', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period = 'monthly', startDate, endDate, gradeLevel, page = 1, limit = 50 } = req.query;
    const filters = { period, startDate, endDate, gradeLevel, page, limit };
    const cacheKey = generateCacheKey('financial', filters);
    const cached = await checkCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const paymentRepo = AppDataSource.getRepository(Payment);
    
    // Build date range
    let dateRange: FindOperator<Date>;
    if (startDate && endDate) {
      dateRange = Between(new Date(startDate as string), new Date(endDate as string));
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateRange = Between(startOfMonth, endOfMonth);
    }

    // Build query for payments
    let query = paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.student', 'student')
      .leftJoinAndSelect('student.gradeLevel', 'gradeLevel')
      .where('payment.createdAt = :dateRange', { dateRange });

    if (gradeLevel) {
      query = query.andWhere('gradeLevel.id = :gradeLevel', { gradeLevel });
    }

    const payments = await query.getMany();

    // Process financial data
    const financialData = payments.map(payment => ({
      id: payment.id,
      studentName: `${payment.student.user.firstName} ${payment.student.user.lastName}`,
        gradeLevel: payment.student.gradeLevel?.name || 'Unknown',
        amount: payment.amount,
        paymentType: payment.type,
        status: payment.status,
        paymentDate: payment.createdAt,
        description: payment.description || 'Payment'
    }));

    // Pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const paginatedData = financialData.slice(offset, offset + parseInt(limit as string));

    // Summary statistics
    const totalRevenue = payments
      .filter(p => p.status === PaymentStatus.PAID)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingAmount = payments
      .filter(p => p.status === PaymentStatus.PENDING)
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentsByType = payments.reduce((acc, payment) => {
      acc[payment.type] = (acc[payment.type] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

    const summary = {
      totalPayments: payments.length,
      totalRevenue,
      pendingAmount,
      completedPayments: payments.filter(p => p.status === PaymentStatus.PAID).length,
      pendingPayments: payments.filter(p => p.status === PaymentStatus.PENDING).length,
      paymentsByType
    };

    const result = {
      summary,
      data: paginatedData,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: financialData.length,
        totalPages: Math.ceil(financialData.length / parseInt(limit as string))
      }
    };

    await saveToCache(cacheKey, 'financial', filters, result, 1);
    res.json(result);
  } catch (error) {
    console.error('Financial report error:', error);
    res.status(500).json({ error: 'Failed to generate financial report' });
  }
});

// Dweezil's Code - Enrollment Report
router.get('/enrollments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      status, 
      courseId, 
      semester, 
      academicYear,
      gradeLevelId,
      search,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const filters = { status, courseId, semester, academicYear, gradeLevelId, search, page, limit };
    const cacheKey = generateCacheKey('enrollments', filters);
    const cached = await checkCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    
    // Build query for enrollments with all related data
    let query = enrollmentRepo
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.gradeLevel', 'gradeLevel')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('enrollment.courseSection', 'courseSection');

    // Apply filters
    if (status && status !== 'all') {
      query = query.andWhere('enrollment.status = :status', { status });
    }

    if (courseId) {
      query = query.andWhere('enrollment.courseId = :courseId', { courseId });
    }

    if (semester) {
      query = query.andWhere('enrollment.semester = :semester', { semester });
    }

    if (academicYear) {
      query = query.andWhere('enrollment.academicYear = :academicYear', { academicYear });
    }

    if (gradeLevelId) {
      query = query.andWhere('student.gradeLevelId = :gradeLevelId', { gradeLevelId });
    }

    if (search) {
      query = query.andWhere(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR student.studentId LIKE :search OR course.name LIKE :search OR course.courseCode LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Get total count before pagination
    const totalItems = await query.getCount();

    // Apply pagination and ordering
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const enrollments = await query
      .orderBy('enrollment.createdAt', 'DESC')
      .skip(offset)
      .take(parseInt(limit as string))
      .getMany();

    // Process enrollment data for report
    const enrollmentData = enrollments.map(enrollment => ({
      id: enrollment.id,
      studentId: enrollment.student.studentId,
      studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
      gradeLevel: enrollment.student.gradeLevel?.name || 'N/A',
      courseName: enrollment.course?.name || 'N/A',
      courseCode: enrollment.course?.courseCode || 'N/A',
      section: enrollment.courseSection?.sectionName || 'N/A',
      semester: enrollment.semester || 'N/A',
      academicYear: enrollment.academicYear || 'N/A',
      status: enrollment.status,
      enrollmentDate: enrollment.enrollmentDate,
      totalAssessed: parseFloat(enrollment.totalAssessed?.toString() || '0'),
      totalPaid: parseFloat(enrollment.totalPaid?.toString() || '0'),
      balance: parseFloat(enrollment.balance?.toString() || '0'),
      downpaymentRequired: parseFloat(enrollment.downpaymentRequired?.toString() || '0'),
      createdAt: enrollment.createdAt
    }));

    // Calculate summary statistics
    const summary = {
      totalEnrollments: totalItems,
      enrolledCount: enrollments.filter(e => e.status === EnrollmentStatus.ENROLLED).length,
      pendingCount: enrollments.filter(e => e.status === EnrollmentStatus.PENDING).length,
      verifiedCount: enrollments.filter(e => e.status === EnrollmentStatus.VERIFIED).length,
      completedCount: enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length,
      droppedCount: enrollments.filter(e => e.status === EnrollmentStatus.DROPPED).length,
      totalAssessed: enrollments.reduce((sum, e) => sum + parseFloat(e.totalAssessed?.toString() || '0'), 0),
      totalPaid: enrollments.reduce((sum, e) => sum + parseFloat(e.totalPaid?.toString() || '0'), 0),
      totalBalance: enrollments.reduce((sum, e) => sum + parseFloat(e.balance?.toString() || '0'), 0)
    };

    const result = {
      summary,
      data: enrollmentData,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalItems,
        totalPages: Math.ceil(totalItems / parseInt(limit as string))
      }
    };

    await saveToCache(cacheKey, 'enrollments', filters, result, 1);
    res.json(result);
  } catch (error) {
    console.error('Enrollment report error:', error);
    res.status(500).json({ error: 'Failed to generate enrollment report' });
  }
});

// Custom Report Builder
router.post('/custom', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportConfig, saveAsTemplate, templateName } = req.body;
    const userId = (req as { user: { id: string } }).user.id;

    // Validate report configuration
    if (!reportConfig || !reportConfig.type) {
      return res.status(400).json({ error: 'Invalid report configuration' });
    }

    // Generate custom report based on configuration
    let reportData;
    switch (reportConfig.type) {
      case 'student':
        reportData = await generateCustomStudentReport(reportConfig);
        break;
      case 'financial':
        reportData = await generateCustomFinancialReport(reportConfig);
        break;
      case 'academic':
        reportData = await generateCustomAcademicReport(reportConfig);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported report type' });
    }

    // Save as template if requested
    if (saveAsTemplate && templateName) {
      const templateRepo = AppDataSource.getRepository(ReportTemplate);
      const template = templateRepo.create({
        createdBy: userId,
        name: templateName,
        description: `Custom ${reportConfig.type} report`,
        configuration: reportConfig,
        isPublic: false
      });
      await templateRepo.save(template);
    }

    res.json(reportData);
  } catch (error) {
    console.error('Custom report error:', error);
    res.status(500).json({ error: 'Failed to generate custom report' });
  }
});

// Helper functions for custom reports
async function generateCustomStudentReport(config: CustomReportConfig) {
  const studentRepo = AppDataSource.getRepository(Student);
  let query = studentRepo.createQueryBuilder('student');
  
  if (config.includeGradeLevel) {
    query = query.leftJoinAndSelect('student.gradeLevel', 'gradeLevel');
  }
  
  if (config.includeDocuments) {
    query = query.leftJoinAndSelect('student.documents', 'documents');
  }
  
  if (config.filters) {
    if (config.filters.gradeLevel) {
      query = query.where('gradeLevel.id = :gradeLevel', { gradeLevel: config.filters.gradeLevel });
    }
  }
  
  const students = await query.getMany();
  return { data: students, type: 'student' };
}

async function generateCustomFinancialReport(config: CustomReportConfig) {
  const paymentRepo = AppDataSource.getRepository(Payment);
  let query = paymentRepo.createQueryBuilder('payment');
  
  if (config.includeStudent) {
    query = query.leftJoinAndSelect('payment.student', 'student');
  }
  
  if (config.filters) {
    if (config.filters.status) {
      query = query.where('payment.status = :status', { status: config.filters.status });
    }
    if (config.filters.dateRange) {
      query = query.andWhere('payment.createdAt BETWEEN :start AND :end', {
        start: config.filters.dateRange.start,
        end: config.filters.dateRange.end
      });
    }
  }
  
  const payments = await query.getMany();
  return { data: payments, type: 'financial' };
}

async function generateCustomAcademicReport(config: CustomReportConfig) {
  const enrollmentRepo = AppDataSource.getRepository(Enrollment);
  let query = enrollmentRepo.createQueryBuilder('enrollment');
  
  if (config.includeStudent) {
    query = query.leftJoinAndSelect('enrollment.student', 'student');
  }
  
  if (config.includeCourse) {
    query = query.leftJoinAndSelect('enrollment.course', 'course');
  }
  
  const enrollments = await query.getMany();
  return { data: enrollments, type: 'academic' };
}

// Export functionality
router.post('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportType, format, _filters, data } = req.body;
    
    if (!reportType || !format || !data) {
      return res.status(400).json({ error: 'Missing required export parameters' });
    }

    // Set appropriate headers based on format
    let filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}`;
    let contentType = '';
    
    switch (format.toLowerCase()) {
      case 'csv':
        filename += '.csv';
        contentType = 'text/csv';
        break;
      case 'excel':
        filename += '.xlsx';
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'pdf':
        filename += '.pdf';
        contentType = 'application/pdf';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported export format' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // For now, return the data as JSON (actual export implementation would be done on frontend)
    res.json({
      success: true,
      message: 'Export prepared successfully',
      filename,
      data
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// Report Templates
router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const templateRepo = AppDataSource.getRepository(ReportTemplate);
    
    const templates = await templateRepo.find({
      where: [
        { isPublic: true },
        { createdBy: userId }
      ],
      relations: ['createdByUser'],
      order: { createdAt: 'DESC' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({ error: 'Failed to fetch report templates' });
  }
});

// Scheduled Reports
router.get('/scheduled', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const scheduledRepo = AppDataSource.getRepository(ScheduledReport);
    
    const scheduledReports = await scheduledRepo.find({
      where: { userId },
      relations: ['template'],
      order: { createdAt: 'DESC' }
    });

    res.json(scheduledReports);
  } catch (error) {
    console.error('Scheduled reports error:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled reports' });
  }
});

export default router;