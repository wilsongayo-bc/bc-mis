/**
 * Department-related TypeScript interfaces and types
 * Provides comprehensive type safety for all department operations
 */

/**
 * Core Department interface
 * Represents a department entity from the API
 */
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Related entities (populated when needed)
  courses?: DepartmentCourse[];
  
  // Computed properties
  courseCount?: number;
  activeCourseCount?: number;
}

/**
 * Simplified course interface for department relations
 */
export interface DepartmentCourse {
  id: string;
  name: string;
  courseCode: string;
  description?: string;
  isActive: boolean;
}

/**
 * Department state interface for Redux store
 */
export interface DepartmentState {
  departments: Department[];
  currentDepartment: Department | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: DepartmentFilters;
}

/**
 * Department filtering options
 */
export interface DepartmentFilters {
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'code' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

/**
 * Department creation form data
 */
export interface CreateDepartmentData {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
}

/**
 * Department update form data
 * Used for updating existing departments (all fields optional)
 */
export interface UpdateDepartmentData {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

/**
 * API response for departments list
 */
export interface DepartmentsApiResponse {
  success: boolean;
  data: Department[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
}

/**
 * API response for single department
 */
export interface DepartmentApiResponse {
  success: boolean;
  data: Department;
  message?: string;
}

/**
 * Department dropdown option
 * Used for select components
 */
export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

/**
 * Department statistics
 */
export interface DepartmentStatistics {
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  totalCourses: number;
  averageCoursesPerDepartment: number;
}