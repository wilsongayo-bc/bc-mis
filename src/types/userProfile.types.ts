import { UserRole } from '../utils/roleHierarchy';

/**
 * Core user profile interface
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  username: string;
  position: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Student-specific profile information
 */
export interface StudentProfile {
  id: string;
  studentId: string;
  enrollmentDate: Date;
  graduationDate?: Date;
  status: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  phoneNumber?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  gradeLevelId?: string;
  medicalInfo?: string;
  balance?: number;
  registrationStatus?: string;
  // Dweezil's Code - Extended enrollments type to include course and section details
  enrollments?: Array<{
    status: string;
    course?: {
      courseCode: string;
      name: string;
    };
    courseSection?: {
      sectionName: string;
      yearLevel: string;
    };
    selectedSubjects?: string[];
  }>;
}

/**
 * Employee status enum
 */
export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED'
}

/**
 * Employee-specific profile information
 */
export interface EmployeeProfile {
  id: string;
  employeeId: string;
  department: string;
  hireDate: Date;
  status: EmployeeStatus;
  salary?: number;
}

/**
 * Complete user profile response from API
 */
export interface UserProfileResponse {
  user: UserProfile;
  student?: StudentProfile;
  employee?: EmployeeProfile;
}

/**
 * Backend user profile response (flat structure)
 */
export interface BackendUserProfile {
  id: string;
  email: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: Date | string | null;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  username: string;
  fullName: string;
  role: string;
  position: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl?: string;
  student?: StudentProfile;
  employee?: EmployeeProfile;
}

/**
 * Props for UserProfile component
 */
export interface ProfileViewProps {
  userId: string;
  onEdit?: (user: UserProfile) => void;
  onBack?: () => void;
}

/**
 * Props for ProfileModal component
 */
export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onEdit?: (user: UserProfile) => void;
  onViewFull?: (userId: string) => void;
}

/**
 * User profile permissions interface
 */
export interface ProfilePermissions {
  canView: boolean;
  canEdit: boolean;
  canViewSensitive: boolean; // For salary, personal details
  canManage: boolean; // For admin actions
}

/**
 * Profile activity summary
 */
export interface ProfileActivity {
  lastLogin?: Date;
  loginCount?: number;
  accountStatus: 'active' | 'inactive' | 'suspended';
  recentActivities?: ActivityItem[];
}

/**
 * Individual activity item
 */
export interface ActivityItem {
  id: string;
  type: 'login' | 'profile_update' | 'password_change' | 'role_change';
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Profile card data for quick view
 */
export interface ProfileCardData {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  position: string;
  isActive: boolean;
  lastLogin?: Date;
  avatar?: string;
}

/**
 * Profile edit form data
 */
export interface ProfileEditForm {
  firstName: string;
  lastName: string;
  middleInitial?: string;
  email: string;
  username: string;
  position: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * Profile view mode enum
 */
export enum ProfileViewMode {
  FULL = 'full',
  MODAL = 'modal',
  CARD = 'card'
}

/**
 * Profile navigation context
 */
export interface ProfileNavigationContext {
  from?: 'user-management' | 'dashboard' | 'direct';
  returnUrl?: string;
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}
