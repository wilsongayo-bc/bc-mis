import { Course } from './course.types';

// Base CourseSection interface
export interface CourseSection {
  id: string;
  courseId: string;
  yearLevel: 'First Year' | 'Second Year' | 'Third Year' | 'Fourth Year';
  section: string;
  sectionName: string;
  credits: number;
  maxStudents: number;
  currentEnrollment: number;
  schedule?: string;
  room?: string;
  semester: string;
  academicYear: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  course?: Course;
  enrollments?: {
    id: string;
    studentId: string;
    status: string;
  }[];
}

// Course section with populated relations
export interface CourseSectionWithRelations extends CourseSection {
  course: Course;
}

// Create course section data
export interface CreateCourseSectionData {
  courseId: string;
  yearLevel: YearLevel;
  sectionName: string;
  maxStudents: number;
  credits: number;
  semester?: string;
  academicYear?: string;
  isActive?: boolean;
}

// Update course section data
export interface UpdateCourseSectionData {
  courseId?: string;
  yearLevel?: 'First Year' | 'Second Year' | 'Third Year' | 'Fourth Year';
  sectionName?: string;
  credits?: number;
  maxStudents?: number;
  schedule?: string;
  room?: string;
   semester?: string;
   academicYear?: string;
  isActive?: boolean;
}

// Course section filters
export interface CourseSectionFilters {
  search?: string;
  courseId?: string;
  yearLevel?: 'First Year' | 'Second Year' | 'Third Year' | 'Fourth Year';
  departmentId?: string;
  isActive?: boolean;
  sortBy?: 'course' | 'yearLevel' | 'section' | 'credits' | 'maxStudents' | 'currentEnrollment' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// API response types
export interface CourseSectionsApiResponse {
  success: boolean;
  data: CourseSection[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

export interface CourseSectionApiResponse {
  success: boolean;
  data: CourseSection;
}

// Redux state
export interface CourseSectionState {
  courseSections: CourseSection[];
  currentCourseSection: CourseSection | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: CourseSectionFilters;
}

// Course section option for dropdowns
export interface CourseSectionOption {
  id: string;
  label: string; // e.g., "BSIT 101 - Section A (First Year)"
  courseId: string;
  courseName: string;
  section: string;
  yearLevel: string;
  teacherName: string;
  credits: number;
  maxStudents: number;
  currentEnrollment: number;
}

// Course section statistics
export interface CourseSectionStatistics {
  totalSections: number;
  activeSections: number;
  totalEnrollment: number;
  averageEnrollmentRate: number;
  sectionsByYearLevel: {
    yearLevel: string;
    count: number;
    enrollment: number;
  }[];
  sectionsByDepartment: {
    departmentId: string;
    departmentName: string;
    count: number;
    enrollment: number;
  }[];
}

// Year level options
export const YEAR_LEVELS = [
  'First Year',
  'Second Year', 
  'Third Year',
  'Fourth Year'
] as const;

export type YearLevel = typeof YEAR_LEVELS[number];
