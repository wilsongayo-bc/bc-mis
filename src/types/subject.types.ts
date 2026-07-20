/**
 * Subject-related TypeScript interfaces and types
 * Provides comprehensive type safety for all subject operations
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Prerequisite category
 */
export enum PrerequisiteCategory {
  REQUIRED = 'required',
  COREQUISITE = 'corequisite'
}

/**
 * Subject sort options
 */
export enum SubjectSortBy {
  NAME = 'name',
  CODE = 'code',
  UNITS = 'units',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  IS_ACTIVE = 'isActive'
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Main Subject interface
 * Matches the API Subject entity structure
 */
export interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  units: number;
  lectureHours: number;
  labHours: number;
  departmentId?: string;
  courseId?: string;
  yearLevel?: number;
  semester?: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Related entities (populated when needed)
  department?: {
    id: string;
    name: string;
    code: string;
  };
  course?: {
    id: string;
    name: string;
    courseCode: string;
  };
  prerequisites?: SubjectPrerequisite[];
  schedules?: SubjectSchedule[];
  
  // Computed properties
  totalHours?: number;
  prerequisiteCount?: number;
}

/**
 * Simplified Subject interface for listings
 * Used in dropdowns, selects, and basic displays
 */
export interface SubjectBasic {
  id: string;
  code: string;
  name: string;
  units: number;
  isActive: boolean;
  departmentId?: string;
}

/**
 * Subject summary interface
 * Used for dashboard and overview displays
 */
export interface SubjectSummary {
  id: string;
  code: string;
  name: string;
  units: number;
  isActive: boolean;
  departmentName?: string;
  prerequisiteCount: number;
  totalHours: number;
}

// ============================================================================
// RELATED ENTITY INTERFACES
// ============================================================================

/**
 * Subject prerequisite information
 */
export interface SubjectPrerequisite {
  id: string;
  subjectId: string;
  prerequisiteId: string;
  category: PrerequisiteCategory;
  createdAt: string | Date;
  
  // Related entities
  subject?: SubjectBasic;
  prerequisiteSubject?: SubjectBasic;
}

/**
 * Subject schedule information
 */
export interface SubjectSchedule {
  id: string;
  subjectId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  building?: string;
  subject?: SubjectBasic;
}

// ============================================================================
// FORM INTERFACES
// ============================================================================

/**
 * Subject creation form data
 * Used for creating new subjects
 */
export interface SubjectCreateData {
  code: string;
  name: string;
  description?: string;
  units: number;
  lectureHours: number;
  labHours: number;
  departmentId?: string;
  courseId: string;
  yearLevel: number;
  semester: string;
  prerequisiteIds?: string[];
  coRequisiteIds?: string[];
  isActive?: boolean;
}

/**
 * Subject update form data
 * Used for updating existing subjects
 */
export interface SubjectUpdateData {
  code?: string;
  name?: string;
  description?: string;
  units?: number;
  lectureHours?: number;
  labHours?: number;
  departmentId?: string;
  courseId?: string;
  yearLevel?: number;
  semester?: string;
  prerequisiteIds?: string[];
  coRequisiteIds?: string[];
  isActive?: boolean;
}

/**
 * Subject form data interface
 * Used for both create and edit forms
 */
export interface SubjectFormData {
  code: string;
  name: string;
  description: string;
  units: number;
  lectureHours: number;
  labHours: number;
  departmentId: string;
  courseId: string;
  yearLevel: number;
  semester: string;
  prerequisiteIds: string[];
  coRequisiteIds: string[];
  isActive: boolean;
}

// ============================================================================
// FILTER AND SEARCH INTERFACES
// ============================================================================

/**
 * Subject filters interface
 * Used for filtering subject lists
 */
export interface SubjectFilters {
  search?: string;
  departmentId?: string;
  isActive?: boolean;
  hasPrerequisites?: boolean;
  units?: number;
  minUnits?: number;
  maxUnits?: number;
  page?: number;
  limit?: number;
  sortBy?: SubjectSortBy;
  sortOrder?: 'ASC' | 'DESC';
  courseId?: string;
  yearLevel?: number;
  semester?: string;
}

/**
 * Subject search parameters
 * Used for API search requests
 */
export interface SubjectSearchParams {
  q?: string;
  department?: string;
  status?: 'active' | 'inactive';
  units?: string;
  semester?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

/**
 * Subject list API response
 */
export interface SubjectListResponse {
  data: Subject[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * Subject details API response
 */
export interface SubjectDetailsResponse {
  data: Subject;
}

/**
 * Subject creation API response
 */
export interface SubjectCreateResponse {
  data: Subject;
  message: string;
}

/**
 * Subject update API response
 */
export interface SubjectUpdateResponse {
  data: Subject;
  message: string;
}

/**
 * Subject deletion API response
 */
export interface SubjectDeleteResponse {
  id: string;
  message: string;
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

/**
 * Subject validation errors
 */
export interface SubjectValidationErrors {
  code?: string[];
  name?: string[];
  units?: string[];
  lectureHours?: string[];
  labHours?: string[];
  departmentId?: string[];
  prerequisiteIds?: string[];
  general?: string[];
}

/**
 * Subject validation result
 */
export interface SubjectValidationResult {
  isValid: boolean;
  errors: SubjectValidationErrors;
}

// ============================================================================
// STATE MANAGEMENT INTERFACES
// ============================================================================

/**
 * Redux subject state
 */
export interface SubjectState {
  subjects: Subject[];
  currentSubject: Subject | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: SubjectFilters;
  statistics: SubjectStatistics | null;
  searchResults: SubjectSearchResults | null;
}

/**
 * Subject statistics
 */
export interface SubjectStatistics {
  totalSubjects: number;
  activeSubjects: number;
  inactiveSubjects: number;
  subjectsByDepartment: Array<{
    department: string;
    count: number;
    percentage: number;
  }>;
  subjectsByUnits: Array<{
    units: number;
    count: number;
    percentage: number;
  }>;
  averageUnits: number;
  averageLectureHours: number;
  averageLabHours: number;
  totalPrerequisites: number;
  subjectsWithPrerequisites: number;
  subjectsWithoutPrerequisites: number;
}

/**
 * Subject search results
 */
export interface SubjectSearchResults {
  subjects: Subject[];
  total: number;
  hasMore: boolean;
}

/**
 * Subject action payloads
 */
export interface SubjectActionPayloads {
  setSubjects: Subject[];
  setCurrentSubject: Subject | null;
  addSubject: Subject;
  updateSubject: Subject;
  removeSubject: string; // subject ID
  setLoading: boolean;
  setError: string | null;
  setFilters: Partial<SubjectFilters>;
  setPage: number;
  setStatistics: SubjectStatistics;
  setSearchResults: SubjectSearchResults;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Subject table column keys
 * Used for dynamic table rendering
 */
export type SubjectTableColumn = keyof Pick<Subject, 'code' | 'name' | 'units' | 'lectureHours' | 'labHours' | 'isActive'>;

/**
 * Subject status type
 */
export type SubjectStatus = 'active' | 'inactive';

/**
 * Subject operation types
 */
export type SubjectOperation = 'create' | 'update' | 'delete' | 'view';

/**
 * Subject bulk action types
 */
export type SubjectBulkAction = 'activate' | 'deactivate' | 'delete';

/**
 * Subject operation result
 */
export interface SubjectOperationResult {
  success: boolean;
  data?: Subject;
  error?: string;
  message?: string;
}

/**
 * Bulk subject operation result
 */
export interface BulkSubjectOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors: Array<{
    subjectId: string;
    error: string;
  }>;
  message?: string;
}

// ============================================================================
// ADDITIONAL API RESPONSE INTERFACES
// ============================================================================

/**
 * Subject activation API response
 */
export interface SubjectActivateResponse {
  data: Subject;
  message: string;
}

/**
 * Subject deactivation API response
 */
export interface SubjectDeactivateResponse {
  data: Subject;
  message: string;
}

/**
 * Subject bulk delete API response
 */
export interface SubjectBulkDeleteResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    subjectId: string;
    error: string;
  }>;
  message: string;
}

/**
 * Subject bulk activate API response
 */
export interface SubjectBulkActivateResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    subjectId: string;
    error: string;
  }>;
  message: string;
}

/**
 * Subject bulk deactivate API response
 */
export interface SubjectBulkDeactivateResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    subjectId: string;
    error: string;
  }>;
  message: string;
}

/**
 * Subject search API response
 */
export interface SubjectSearchResponse {
  data: Subject[];
  total: number;
  hasMore: boolean;
}

/**
 * Subject statistics API response
 */
export interface SubjectStatisticsResponse {
  data: SubjectStatistics;
}

/**
 * Subject by department API response
 */
export interface SubjectByDepartmentResponse {
  data: Subject[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * Subject prerequisite API response
 */
export interface SubjectPrerequisiteResponse {
  data: SubjectPrerequisite;
  message: string;
}

// ============================================================================
// SUBJECT PREREQUISITE INTERFACES
// ============================================================================

/**
 * Subject prerequisite creation data
 */
export interface SubjectPrerequisiteCreateData {
  subjectId: string;
  prerequisiteSubjectId: string;
}

/**
 * Subject prerequisite update data
 */
export interface SubjectPrerequisiteUpdateData {
  prerequisiteSubjectId?: string;
}

/**
 * Subject prerequisite deletion response
 */
export interface SubjectPrerequisiteDeleteResponse {
  id: string;
  message: string;
}

/**
 * Subject prerequisite list response
 */
export interface SubjectPrerequisiteListResponse {
  data: SubjectPrerequisite[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * Subject prerequisite bulk create data
 */
export interface SubjectPrerequisiteBulkCreateData {
  subjectId: string;
  prerequisiteSubjectIds: string[];
}

/**
 * Subject prerequisite bulk delete data
 */
export interface SubjectPrerequisiteBulkDeleteData {
  prerequisiteIds: string[];
}

/**
 * Subject prerequisite bulk create response
 */
export interface SubjectPrerequisiteBulkCreateResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    prerequisiteSubjectId: string;
    error: string;
  }>;
  message: string;
}

/**
 * Subject prerequisite bulk delete response
 */
export interface SubjectPrerequisiteBulkDeleteResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    prerequisiteId: string;
    error: string;
  }>;
  message: string;
}

/**
 * Subject prerequisite statistics response
 */
export interface SubjectPrerequisiteStatisticsResponse {
  data: SubjectPrerequisiteStatistics;
}

/**
 * Subject prerequisite search response
 */
export interface SubjectPrerequisiteSearchResponse {
  data: SubjectPrerequisite[];
  total: number;
  hasMore: boolean;
}

/**
 * Subject prerequisite search parameters
 */
export interface SubjectPrerequisiteSearchParams {
  q?: string;
  subjectId?: string;
  prerequisiteSubjectId?: string;
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Subject prerequisite search results
 */
export interface SubjectPrerequisiteSearchResults {
  prerequisites: SubjectPrerequisite[];
  total: number;
  hasMore: boolean;
}

/**
 * Subject prerequisite statistics
 */
export interface SubjectPrerequisiteStatistics {
  totalPrerequisites: number;
  subjectsWithPrerequisites: number;
  subjectsWithoutPrerequisites: number;
  averagePrerequisitesPerSubject: number;
  mostCommonPrerequisites: Array<{
    subject: SubjectBasic;
    count: number;
  }>;
  prerequisitesByDepartment: Array<{
    department: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Subject prerequisite filters
 */
export interface SubjectPrerequisiteFilters {
  search?: string;
  subjectId?: string;
  prerequisiteSubjectId?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'subjectName' | 'prerequisiteName';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Subject prerequisite state
 */
export interface SubjectPrerequisiteState {
  prerequisites: SubjectPrerequisite[];
  currentPrerequisite: SubjectPrerequisite | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: SubjectPrerequisiteFilters;
  statistics: SubjectPrerequisiteStatistics | null;
  searchResults: SubjectPrerequisiteSearchResults | null;
}

/**
 * Subject prerequisite creation response
 */
export interface SubjectPrerequisiteCreateResponse {
  data: SubjectPrerequisite;
  message: string;
}

/**
 * Subject prerequisite update response
 */
export interface SubjectPrerequisiteUpdateResponse {
  data: SubjectPrerequisite;
  message: string;
}

/**
 * Subject prerequisite details response
 */
export interface SubjectPrerequisiteDetailsResponse {
  data: SubjectPrerequisite;
}

// ============================================================================
// EXPORT TYPES FOR CONVENIENCE
// ============================================================================

// Re-export commonly used types
export type { Subject as ISubject };
export type { SubjectBasic as ISubjectBasic };
export type { SubjectSummary as ISubjectSummary };
export type { SubjectCreateData as ISubjectCreateData };
export type { SubjectUpdateData as ISubjectUpdateData };
export type { SubjectFilters as ISubjectFilters };
export type { SubjectStatistics as ISubjectStatistics };
export type { SubjectState as ISubjectState };
