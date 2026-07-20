import api from '../lib/api';

export interface AnalyticsMeta {
  version: number;
  generatedAt: string;
  academicYear: string;
  semester: string;
}

export interface AnalyticsResponse<T> {
  success: boolean;
  meta: AnalyticsMeta;
  data: T;
  message?: string;
}

export type EnrollmentStatus = 'PENDING' | 'VERIFIED' | 'ENROLLED' | 'COMPLETED' | 'DROPPED' | 'FAILED';

export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'TEACHER'
  | 'STAFF'
  | 'STUDENT'
  | 'REGISTRAR'
  | 'FINANCE'
  | 'LIBRARIAN';

export interface AdminDashboardAnalytics {
  users: {
    activeByRole: Record<UserRole, number>;
    newUsers: { last7d: number; last30d: number };
  };
  enrollments: { countsByStatus: Record<EnrollmentStatus, number> };
  payments: { totals: { today: number; last7d: number; last30d: number } };
  activity: { topModules: Array<{ module: string; count: number }> };
}

export interface RegistrarDashboardAnalytics {
  enrollments: { pipelineCountsByStatus: Record<EnrollmentStatus, number> };
  documents: { pendingOrUnverified: { pending: number; submitted: number; total: number } };
  sections: {
    utilizationSummary: { totalSections: number; totalEnrolled: number; totalCapacity: number; utilizationRate: number };
    topUtilized: Array<{
      courseSectionId: string;
      sectionName: string;
      yearLevel: string;
      courseName: string;
      enrolledCount: number;
      maxStudents: number;
    }>;
  };
  schedulingReadiness: {
    missingSchedules: Array<{
      courseSectionId: string;
      sectionName: string;
      yearLevel: string;
      courseName: string;
      enrolledCount: number;
    }>;
  };
}

export interface TeacherDashboardAnalytics {
  schedules: {
    next3Today: Array<{
      id: string;
      startTime: string;
      endTime: string;
      dayOfWeek: string;
      room: string;
      subject: { id: string; code: string; name: string };
      courseSection?: {
        id: string;
        sectionName: string;
        yearLevel: string;
        course?: { id: string; name: string; code: string };
      };
      classListHref: string;
    }>;
  };
  students: { totalDistinctAcrossClasses: number };
  quickLinks: { classLists: Array<{ scheduleId: string; href: string }> };
}

export interface StudentDashboardAnalytics {
  enrollment: {
    status: EnrollmentStatus | null;
    enrollmentId: string | null;
    term: { academicYear: string; semester: string };
    downpaymentRequired: number;
    totalAssessed: number;
    totalPaid: number;
    balance: number;
    downpaymentMet: boolean;
  };
  schedule: {
    todayClassCount: number;
    nextClass:
      | null
      | {
          id: string;
          startTime: string;
          endTime: string;
          dayOfWeek: string;
          room: string;
          subject: { id: string; code: string; name: string };
          teacher: null | { firstName: string; lastName: string };
        };
  };
  alerts: { mustChangePassword: boolean; emailNotVerified: boolean };
}

const buildTermParams = (params?: { academicYear?: string; semester?: string }): string => {
  if (!params?.academicYear && !params?.semester) return '';
  const usp = new URLSearchParams();
  if (params.academicYear) usp.set('academicYear', params.academicYear);
  if (params.semester) usp.set('semester', params.semester);
  return `?${usp.toString()}`;
};

export const analyticsDashboardService = {
  getAdminDashboard: async (params?: { academicYear?: string; semester?: string }): Promise<AnalyticsResponse<AdminDashboardAnalytics>> => {
    const response = await api.get<AnalyticsResponse<AdminDashboardAnalytics>>(`/analytics/admin-dashboard${buildTermParams(params)}`);
    return response.data;
  },
  getRegistrarDashboard: async (
    params?: { academicYear?: string; semester?: string }
  ): Promise<AnalyticsResponse<RegistrarDashboardAnalytics>> => {
    const response = await api.get<AnalyticsResponse<RegistrarDashboardAnalytics>>(
      `/analytics/registrar-dashboard${buildTermParams(params)}`
    );
    return response.data;
  },
  getTeacherDashboard: async (params?: { academicYear?: string; semester?: string }): Promise<AnalyticsResponse<TeacherDashboardAnalytics>> => {
    const response = await api.get<AnalyticsResponse<TeacherDashboardAnalytics>>(`/analytics/teacher-dashboard${buildTermParams(params)}`);
    return response.data;
  },
  getStudentDashboard: async (params?: { academicYear?: string; semester?: string }): Promise<AnalyticsResponse<StudentDashboardAnalytics>> => {
    const response = await api.get<AnalyticsResponse<StudentDashboardAnalytics>>(`/analytics/student-dashboard${buildTermParams(params)}`);
    return response.data;
  }
};

