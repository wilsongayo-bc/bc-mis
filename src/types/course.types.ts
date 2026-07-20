/**
 * Course-related TypeScript interfaces and types
 * Provides comprehensive type safety for all course operations
 */

import { CourseSection } from './courseSection.types';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Course status enumeration
 * Simplified to match API boolean isActive field
 */


/**
 * Course type enumeration
 * Matches backend CourseType enum
 */
export enum CourseType {
  CORE = 'core',
  ELECTIVE = 'elective',
  EXTRACURRICULAR = 'extracurricular',
  REMEDIAL = 'remedial'
}

/**
 * Prerequisite type enumeration
 */
export enum PrerequisiteType {
  REQUIRED = 'required',
  RECOMMENDED = 'recommended',
  COREQUISITE = 'corequisite',
  EQUIVALENT = 'equivalent'
}

/**
 * Course sort options
 */
export enum CourseSortBy {
  NAME = 'name',
  CODE = 'courseCode',
  CREDITS = 'credits',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  IS_ACTIVE = 'isActive',
  ENROLLMENT_COUNT = 'enrollmentCount'
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Main Course interface
 * Matches the API Course entity structure
 */
export interface Course {
  id: string;
  courseCode: string;
  idCode?: string | null;
  name: string;
  courseName?: string; // Alias for name for backward compatibility
  description?: string;
  credits: number;
  yearLevel: string;
  departmentId: string;
  maxStudents: number;
  isActive: boolean;
  tuitionPerUnit?: number | null;
  miscellaneousFee?: number | null;
  downpaymentRate?: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Related entities (populated when needed)
  instructor?: CourseInstructor;
  gradeLevel?: CourseGradeLevel;
  enrollments?: CourseEnrollment[];
  schedules?: CourseSchedule[];
  prerequisites?: CoursePrerequisite[];
  sections?: CourseSection[];
  
  // Computed properties
  currentEnrollmentCount?: number;
  remainingCapacity?: number;
  capacityUtilization?: number;
  isCurrentlyRunning?: boolean;
  enrolledStudents?: number; // For backward compatibility
  syllabus?: string;
}

/**
 * Simplified Course interface for listings
 * Used in dropdowns, selects, and basic displays
 */
export interface CourseBasic {
  id: string;
  courseCode: string;
  idCode?: string | null;
  name: string;
  credits: number;
  isActive: boolean;
  yearLevel: string;
  currentEnrollmentCount?: number;
  maxStudents?: number;
}

/**
 * Course summary interface
 * Used for dashboard and overview displays
 */
export interface CourseSummary {
  id: string;
  courseCode: string;
  idCode?: string | null;
  name: string;
  isActive: boolean;
  enrollmentCount: number;
  maxStudents: number;
  instructorName?: string;
  gradeLevel?: string;
}

// ============================================================================
// RELATED ENTITY INTERFACES
// ============================================================================

/**
 * Course instructor information
 */
export interface CourseInstructor {
  id: string;
  position: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Course grade level information
 */
export interface CourseGradeLevel {
  id: string;
  name: string;
  level: number;
}

/**
 * Course enrollment information
 */
export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string | Date;
  status: string;
  student?: {
    id: string;
    studentId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

/**
 * Course schedule information
 */
export interface CourseSchedule {
  id: string;
  courseId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  building?: string;
}

/**
 * Course prerequisite information
 */
export interface CoursePrerequisite {
  id: string;
  courseId: string;
  prerequisiteCourseId: string;
  prerequisiteType: PrerequisiteType;
  isRequired: boolean;
  prerequisiteCourse?: CourseBasic;
}

// ============================================================================
// FORM INTERFACES
// ============================================================================

/**
 * Course creation form data
 * Used for creating new courses
 */
export interface CreateCourseData {
  name: string;
  courseCode: string;
  idCode?: string;
  description?: string;
  credits: number;
  yearLevel: string;
  departmentId: string;
  maxStudents: number;
  isActive?: boolean;
  tuitionPerUnit?: number;
  miscellaneousFee?: number;
  downpaymentRate?: number;
}

/**
 * Course update form data
 * Used for updating existing courses (all fields optional)
 */
export interface UpdateCourseData {
  name?: string;
  courseCode?: string;
  idCode?: string;
  description?: string;
  credits?: number;
  yearLevel?: string;
  departmentId?: string;
  maxStudents?: number;
  isActive?: boolean;
   tuitionPerUnit?: number;
   miscellaneousFee?: number;
   downpaymentRate?: number;
}

/**
 * Course form errors interface
 * Used for form validation
 */
export interface CourseFormErrors {
  name?: string;
  courseCode?: string;
  description?: string;
  departmentId?: string;
  yearLevel?: string;
  credits?: string;
  maxStudents?: string;
  isActive?: string;
}

/**
 * Course form data interface for frontend forms
 */
export interface CourseFormData {
  name: string;
  courseCode: string;
  description: string;
  departmentId: string;
  yearLevel: string;
  credits: number;
  maxStudents: number;
  isActive: boolean;
}

/**
 * Course form state for complex forms
 */
export interface CourseFormState {
  data: CreateCourseData | UpdateCourseData;
  errors: CourseFormErrors;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  touchedFields: Set<keyof (CreateCourseData | UpdateCourseData)>;
}

// ============================================================================
// API INTERFACES
// ============================================================================

/**
 * Course API response wrapper
 */
export interface CourseApiResponse {
  success: boolean;
  data: Course;
  message?: string;
  error?: string;
}

/**
 * Courses list API response
 */
export interface CoursesApiResponse {
  success: boolean;
  data: Course[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  message?: string;
  error?: string;
}

/**
 * Course statistics API response
 */
export interface CourseStatisticsApiResponse {
  success: boolean;
  data: CourseStatistics;
  message?: string;
  error?: string;
}

// ============================================================================
// FILTER AND SEARCH INTERFACES
// ============================================================================

/**
 * Course filtering options
 */
export interface CourseFilters {
  departmentId?: string;
  yearLevel?: string;
  isActive?: boolean;
  courseType?: CourseType;
  instructorId?: string;
  academicYear?: string;
  semester?: string;
  search?: string;
  sortBy?: CourseSortBy | string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

/**
 * Course search parameters
 */
export interface CourseSearchParams {
  query: string;
  filters?: Partial<CourseFilters>;
  limit?: number;
}

/**
 * Course search results
 */
export interface CourseSearchResults {
  courses: Course[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// STATISTICS INTERFACES
// ============================================================================

/**
 * Course statistics
 */
export interface CourseStatistics {
  totalCourses: number;
  activeCourses: number;
  inactiveCourses: number;
  archivedCourses: number;
  completedCourses: number;
  cancelledCourses: number;
  coursesByDepartment: Array<{
    department: string;
    count: number;
    percentage: number;
  }>;
  coursesByGrade: Array<{
    gradeLevel: string;
    gradeLevelId: string;
    count: number;
    percentage: number;
  }>;
  coursesByType: Array<{
    type: CourseType;
    count: number;
    percentage: number;
  }>;
  coursesByStatus: Array<{
    isActive: boolean;
    count: number;
    percentage: number;
  }>;
  averageCredits: number;
  averageEnrollment: number;
  totalEnrollments: number;
  capacityUtilization: number;
  mostPopularCourses: Array<{
    id: string;
    name: string;
    courseCode: string;
    enrollmentCount: number;
  }>;
  leastPopularCourses: Array<{
    id: string;
    name: string;
    courseCode: string;
    enrollmentCount: number;
  }>;
}

// ============================================================================
// STATE MANAGEMENT INTERFACES
// ============================================================================

/**
 * Redux course state
 */
export interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: CourseFilters;
  statistics: CourseStatistics | null;
  searchResults: CourseSearchResults | null;
}

/**
 * Course action payloads
 */
export interface CourseActionPayloads {
  setCourses: Course[];
  setCurrentCourse: Course | null;
  addCourse: Course;
  updateCourse: Course;
  removeCourse: string; // course ID
  setLoading: boolean;
  setError: string | null;
  setFilters: Partial<CourseFilters>;
  setPage: number;
  setStatistics: CourseStatistics;
  setSearchResults: CourseSearchResults;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Course status options for UI
 */
export type CourseStatusOption = {
  value: boolean;
  label: string;
  color: string;
  description: string;
};

/**
 * Course type options for UI
 */
export type CourseTypeOption = {
  value: CourseType;
  label: string;
  description: string;
};

/**
 * Course validation rules
 */
export interface CourseValidationRules {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  courseCode: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  credits: {
    required: boolean;
    min: number;
    max: number;
  };
  capacity: {
    required: boolean;
    min: number;
    max: number;
  };
}

/**
 * Course operation result
 */
export interface CourseOperationResult {
  success: boolean;
  data?: Course;
  error?: string;
  message?: string;
}

/**
 * Bulk course operation result
 */
export interface BulkCourseOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: Array<{
    courseId: string;
    error: string;
  }>;
  message?: string;
}

// ============================================================================
// EXPORT TYPES FOR CONVENIENCE
// ============================================================================

// Re-export commonly used types
export type { Course as ICourse };
export type { CourseBasic as ICourseBasic };
export type { CourseSummary as ICourseSummary };
export type { CreateCourseData as ICreateCourseData };
export type { UpdateCourseData as IUpdateCourseData };
export type { CourseFilters as ICourseFilters };
export type { CourseStatistics as ICourseStatistics };
export type { CourseState as ICourseState };
