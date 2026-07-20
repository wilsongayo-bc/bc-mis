import api from '../lib/api';

/**
 * User roles enum
 */
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  REGISTRAR = 'REGISTRAR',
  FINANCE = 'FINANCE',
  LIBRARIAN = 'LIBRARIAN',
  STAFF = 'STAFF'
}

/**
 * Base dashboard statistics interface
 */
export interface BaseDashboardStats {
  [key: string]: string | number | boolean | null | undefined | Array<unknown>;
}

/**
 * Role-specific dashboard statistics interfaces
 */
export interface SuperAdminStats extends BaseDashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  totalBooks: number;
  activeUsers: number;
  enrolledStudents: number;
  activeCourses: number;
  systemHealth: string;
}

export interface AdminStats extends BaseDashboardStats {
  totalStudents: number;
  activeCourses: number;
  totalTeachers: number;
  totalRevenue: number;
  enrolledStudents: number;
  pendingPayments: number;
}

export interface TeacherStats extends BaseDashboardStats {
  totalClasses: number;
  totalStudents: number;
  upcomingClasses: number;
  pendingGrades: number;
  sectionStats?: Array<{
    sectionId: string;
    sectionName: string;
    subjectName: string;
    studentCount: number;
    averageScore: number;
  }>;
}

export interface StudentStats extends BaseDashboardStats {
  enrolledCourses: number;
  currentGPA: number;
  pendingPayments: number;
  borrowedBooks: number;
}

export interface RegistrarStats extends BaseDashboardStats {
  preRegistered: number;
  registered: number;
  enrolled: number;
  totalStudents: number;
  // Dweezil's Code - Explicitly typed properties for React rendering
  activeEnrollments: number;
  newRegistrations: number;
  pendingApplications: number;
}

export interface FinanceStats extends BaseDashboardStats {
  paidPayments: number;
  pendingPayments: number;
  overduePayments: number;
  totalRevenue: number;
  pendingAmount: number;
  enrollmentTotalAssessed: number;
  enrollmentTotalPaid: number;
  enrollmentTotalBalance: number;
  downpaymentMetCount: number;
  downpaymentNotMetCount: number;
}

export interface LibrarianStats extends BaseDashboardStats {
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  overdueBooks: number;
  activeMembers: number;
}

export interface StaffStats extends BaseDashboardStats {
  totalStudents: number;
  activeCourses: number;
  totalStaff: number;
  announcements: number;
}

/**
 * Union type for all dashboard statistics
 */
export type DashboardStats = 
  | SuperAdminStats 
  | AdminStats 
  | TeacherStats 
  | StudentStats 
  | RegistrarStats 
  | FinanceStats 
  | LibrarianStats 
  | StaffStats;

/**
 * Recent activity interface
 */
export interface RecentActivity {
  id: string;
  date: string;
  type: string;
  description: string;
  studentName?: string;
  courseName?: string;
  amount?: number;
}

/**
 * Quick action interface
 */
export interface QuickAction {
  name: string;
  href: string;
  icon: string;
  description?: string;
  color?: string;
}

/**
 * API response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Dashboard service class for handling dashboard-related API calls
 */
export class DashboardService {
  /**
   * Fetch role-specific dashboard statistics
   * @param role - User role to fetch statistics for
   * @returns Promise with dashboard statistics
   */
  static async getDashboardStats(role: UserRole): Promise<DashboardStats> {
    try {
      const response = await api.get<ApiResponse<DashboardStats>>(`/dashboard/stats/${role}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch dashboard statistics');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Fetch role-specific recent activities
   * @param role - User role to fetch activities for
   * @param limit - Number of activities to fetch (default: 10)
   * @returns Promise with recent activities
   */
  static async getRecentActivities(role: UserRole, limit: number = 10): Promise<RecentActivity[]> {
    try {
      const response = await api.get<ApiResponse<RecentActivity[]>>(
        `/dashboard/activities/${role}?limit=${limit}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch recent activities');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  }

  /**
   * Fetch role-specific quick actions
   * @param role - User role to fetch quick actions for
   * @returns Promise with quick actions
   */
  static async getQuickActions(role: UserRole): Promise<QuickAction[]> {
    try {
      const response = await api.get<ApiResponse<QuickAction[]>>(
        `/dashboard/quick-actions/${role}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch quick actions');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error fetching quick actions:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for SUPERADMIN role
   */
  static async getSuperAdminStats(): Promise<SuperAdminStats> {
    return this.getDashboardStats(UserRole.SUPERADMIN) as Promise<SuperAdminStats>;
  }

  /**
   * Get dashboard statistics for ADMIN role
   */
  static async getAdminStats(): Promise<AdminStats> {
    return this.getDashboardStats(UserRole.ADMIN) as Promise<AdminStats>;
  }

  /**
   * Get dashboard statistics for TEACHER role
   */
  static async getTeacherStats(): Promise<TeacherStats> {
    return this.getDashboardStats(UserRole.TEACHER) as Promise<TeacherStats>;
  }

  /**
   * Get dashboard statistics for STUDENT role
   */
  static async getStudentStats(): Promise<StudentStats> {
    return this.getDashboardStats(UserRole.STUDENT) as Promise<StudentStats>;
  }

  /**
   * Get dashboard statistics for REGISTRAR role
   */
  static async getRegistrarStats(): Promise<RegistrarStats> {
    return this.getDashboardStats(UserRole.REGISTRAR) as Promise<RegistrarStats>;
  }

  /**
   * Get dashboard statistics for FINANCE role
   */
  static async getFinanceStats(): Promise<FinanceStats> {
    return this.getDashboardStats(UserRole.FINANCE) as Promise<FinanceStats>;
  }

  /**
   * Get dashboard statistics for LIBRARIAN role
   */
  static async getLibrarianStats(): Promise<LibrarianStats> {
    return this.getDashboardStats(UserRole.LIBRARIAN) as Promise<LibrarianStats>;
  }

  /**
   * Get dashboard statistics for STAFF role
   */
  static async getStaffStats(): Promise<StaffStats> {
    return this.getDashboardStats(UserRole.STAFF) as Promise<StaffStats>;
  }
}

/**
 * Hook for role-based dashboard statistics
 */
export const useDashboardStats = () => {
  return {
    getDashboardStats: DashboardService.getDashboardStats,
    getRecentActivities: DashboardService.getRecentActivities,
    getQuickActions: DashboardService.getQuickActions,
    getSuperAdminStats: DashboardService.getSuperAdminStats,
    getAdminStats: DashboardService.getAdminStats,
    getTeacherStats: DashboardService.getTeacherStats,
    getStudentStats: DashboardService.getStudentStats,
    getRegistrarStats: DashboardService.getRegistrarStats,
    getFinanceStats: DashboardService.getFinanceStats,
    getLibrarianStats: DashboardService.getLibrarianStats,
    getStaffStats: DashboardService.getStaffStats,
  };
};

/**
 * Utility function to get dashboard title based on role
 */
export const getDashboardTitle = (role: UserRole): string => {
  const titles: Record<UserRole, string> = {
    [UserRole.SUPERADMIN]: 'System Overview',
    [UserRole.ADMIN]: 'Administrative Dashboard',
    [UserRole.TEACHER]: 'Teacher Dashboard',
    [UserRole.STUDENT]: 'Student Dashboard',
    [UserRole.REGISTRAR]: 'Registration Management',
    [UserRole.FINANCE]: 'Financial Overview',
    [UserRole.LIBRARIAN]: 'Library Management',
    [UserRole.STAFF]: 'Staff Dashboard'
  };
  
  return titles[role] || 'Dashboard';
};

/**
 * Utility function to get dashboard description based on role
 */
export const getDashboardDescription = (role: UserRole): string => {
  const descriptions: Record<UserRole, string> = {
    [UserRole.SUPERADMIN]: 'Complete system overview and management tools',
    [UserRole.ADMIN]: 'School administration and management overview',
    [UserRole.TEACHER]: 'Manage your classes, students, and academic activities',
    [UserRole.STUDENT]: 'View your academic progress and school information',
    [UserRole.REGISTRAR]: 'Student registration and enrollment management',
    [UserRole.FINANCE]: 'Financial tracking and payment management',
    [UserRole.LIBRARIAN]: 'Library resources and book management',
    [UserRole.STAFF]: 'General staff information and announcements'
  };
  
  return descriptions[role] || 'Welcome to your dashboard';
};

export default DashboardService;
