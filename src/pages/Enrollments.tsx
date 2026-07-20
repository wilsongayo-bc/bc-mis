import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { logout, selectUser } from '../store/slices/authSlice';
import { useSchoolSettings } from '../hooks/useSchoolSettings';
import { useCurrentAcademicYear } from '../hooks/useAcademicYear';
import { useSettingsContext } from '../utils/settingsUtils';
import PageSizeDropdown from '../components/PageSizeDropdown';
import api from '../lib/api';
import {
  fetchEnrollments,
  selectEnrollments,
  selectEnrollmentLoading,
  selectEnrollmentError,
  selectEnrollmentPagination,
  setLimit,
  setPage
} from '../store/slices/enrollmentSlice';
import type { Enrollment as _Enrollment, EnrollmentFilters } from '../store/slices/enrollmentSlice';
// Dweezil's Code - Import student view
import StudentEnrollmentsView from './StudentEnrollmentsView';

// Fixed pagination null safety checks - comprehensive fix v2

// Bulletproof pagination component that cannot fail
const BulletproofPagination: React.FC<{
  pagination: Record<string, unknown> | null;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  theme: string;
}> = ({ pagination, onPageChange, onLimitChange, theme }) => {
  // Multiple layers of safety checks
  const safePagination = React.useMemo(() => {
    try {
      const rawPagination = pagination || {};
      const page = Math.max(1, parseInt(String(rawPagination.page || 1), 10) || 1);
      const limit = Math.max(1, parseInt(String(rawPagination.limit || 10), 10) || 10);
      const total = Math.max(0, parseInt(String(rawPagination.total || 0), 10) || 0);
      const totalPages = Math.max(0, parseInt(String(rawPagination.totalPages || 0), 10) || 0);

      return { page, limit, total, totalPages };
    } catch (error) {
      console.error('Pagination parsing error:', error);
      return { page: 1, limit: 10, total: 0, totalPages: 0 };
    }
  }, [pagination]);

  // Bulletproof page number generator
  const generatePageNumbers = React.useCallback(() => {
    try {
      const { totalPages } = safePagination;

      if (!totalPages || totalPages <= 0) {
        return [];
      }

      const maxPages = Math.min(totalPages, 10);
      const pages: number[] = [];

      for (let i = 1; i <= maxPages; i++) {
        pages.push(i);
      }

      return pages;
    } catch (error) {
      console.error('Page generation error:', error);
      return [];
    }
  }, [safePagination]);

  const pageNumbers = generatePageNumbers();

  // Don't render if no pages
  if (safePagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className={`px-4 py-3 flex items-center justify-between border-t sm:px-6 ${theme === 'dark'
      ? 'bg-gray-800 border-gray-700'
      : 'bg-white border-gray-200'
      }`}>
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(safePagination.page - 1)}
          disabled={safePagination.page <= 1}
          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
            ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(safePagination.page + 1)}
          disabled={safePagination.page >= safePagination.totalPages}
          className={`ml-3 relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
            ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
            Showing{' '}
            <span className="font-medium">
              {(safePagination.page - 1) * safePagination.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(safePagination.page * safePagination.limit, safePagination.total)}
            </span>{' '}
            of{' '}
            <span className="font-medium">{safePagination.total}</span>{' '}
            results
          </p>
          <PageSizeDropdown
            value={safePagination.limit}
            onChange={onLimitChange}
          />
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => onPageChange(safePagination.page - 1)}
              disabled={safePagination.page <= 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
                ? 'border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700'
                : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {pageNumbers.map((page) => (
              <button
                key={`bulletproof-page-${page}`}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === safePagination.page
                  ? theme === 'dark'
                    ? 'z-10 bg-blue-900/50 border-blue-500 text-blue-400'
                    : 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                  : theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => onPageChange(safePagination.page + 1)}
              disabled={safePagination.page >= safePagination.totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
                ? 'border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700'
                : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

type CourseOption = {
  id: string;
  name: string;
  courseCode?: string;
};

type GradeLevelOption = {
  id: string;
  name: string;
};

type AcademicYearOption = {
  id: number;
  year: string;
  isActive: boolean;
};

type CourseSectionOption = {
  id: string;
  label: string;
  courseId: string;
  yearLevel: string;
  sectionName: string;
  semester: string;
  academicYear: string;
};

const Enrollments: React.FC = () => {
  const { theme } = useSettingsContext();
  const dispatch = useAppDispatch();
  const _user = useAppSelector(selectUser);
  const { schoolName: _schoolName, loading: _settingsLoading } = useSchoolSettings();
  const { academicYear: currentAcademicYear } = useCurrentAcademicYear();
  const enrollments = useAppSelector(selectEnrollments);
  const loading = useAppSelector(selectEnrollmentLoading);
  const error = useAppSelector(selectEnrollmentError);
  const pagination = useAppSelector(selectEnrollmentPagination);

  // Local state for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [semesterFilter, setSemesterFilter] = useState<string>('');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('');
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('');
  const [courseSectionFilter, setCourseSectionFilter] = useState<string>('');
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [gradeLevelOptions, setGradeLevelOptions] = useState<GradeLevelOption[]>([]);
  const [academicYearOptions, setAcademicYearOptions] = useState<AcademicYearOption[]>([]);
  const [courseSectionOptions, setCourseSectionOptions] = useState<CourseSectionOption[]>([]);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Helper function to fetch enrollments
  const doFetchEnrollments = (page: number = 1, limit?: number) => {
    const filters: EnrollmentFilters = {
      page,
      limit: limit || pagination.limit || 25,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter as 'ENROLLED' | 'COMPLETED' | 'DROPPED' | 'PENDING' : undefined,
      courseId: courseFilter || undefined,
      courseSectionId: courseSectionFilter || undefined,
      semester: semesterFilter || undefined,
      academicYear: academicYearFilter || undefined,
      gradeLevelId: gradeLevelFilter || undefined,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    };
    dispatch(fetchEnrollments(filters));
  };

  useEffect(() => {
    // Skip fetching if user is STUDENT (handled by StudentEnrollmentsView)
    if (_user?.role === 'STUDENT') return;

    // Fetch enrollments on component mount or when status filter or limit changes only
    doFetchEnrollments(1);
  }, [dispatch, statusFilter, pagination.limit, courseFilter, courseSectionFilter, semesterFilter, academicYearFilter, gradeLevelFilter, _user?.role]); // Removed searchTerm from dependencies so it doesn't fire on every keystroke

  // Debounced search
  useEffect(() => {
    if (_user?.role === 'STUDENT') return;

    const timer = setTimeout(() => {
      doFetchEnrollments(1);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, _user?.role]); // Only re-run when searchTerm changes

  useEffect(() => {
    if (_user?.role === 'STUDENT') return;

    const loadFilterOptions = async () => {
      try {
        const [coursesRes, gradeLevelsRes, academicYearsRes] = await Promise.all([
          api.get('/courses', { params: { page: 1, limit: 1000, sortBy: 'name', sortOrder: 'ASC', isActive: true } }),
          api.get('/grade-levels', { params: { isActive: 'true' } }),
          api.get('/academic-years')
        ]);

        const rawCourses = coursesRes.data?.data ?? coursesRes.data?.courses ?? coursesRes.data ?? [];
        const normalizedCourses: CourseOption[] = Array.isArray(rawCourses)
          ? rawCourses
              .filter((c) => c && typeof c === 'object' && 'id' in c && 'name' in c)
              .map((c: { id: string; name: string; courseCode?: string }) => ({
                id: c.id,
                name: c.name,
                courseCode: c.courseCode
              }))
          : [];
        setCourseOptions(normalizedCourses);

        const rawGradeLevels = gradeLevelsRes.data?.data ?? gradeLevelsRes.data ?? [];
        const normalizedGradeLevels: GradeLevelOption[] = Array.isArray(rawGradeLevels)
          ? rawGradeLevels
              .filter((g) => g && typeof g === 'object' && 'id' in g && 'name' in g)
              .map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }))
          : [];
        setGradeLevelOptions(normalizedGradeLevels);

        const rawAcademicYears = academicYearsRes.data ?? [];
        const normalizedAcademicYears: AcademicYearOption[] = Array.isArray(rawAcademicYears)
          ? rawAcademicYears
              .filter((y) => y && typeof y === 'object' && 'id' in y && 'year' in y)
              .map((y: { id: number; year: string; isActive?: boolean }) => ({
                id: y.id,
                year: y.year,
                isActive: Boolean(y.isActive)
              }))
          : [];
        setAcademicYearOptions(normalizedAcademicYears);

        if (!academicYearFilter) {
          const activeFromList = normalizedAcademicYears.find((y) => y.isActive)?.year;
          setAcademicYearFilter(activeFromList || currentAcademicYear || '');
        }
      } catch (_e) {
        void _e;
      }
    };

    loadFilterOptions();
  }, [_user?.role, currentAcademicYear]);

  useEffect(() => {
    if (_user?.role === 'STUDENT') return;

    const loadCourseSections = async () => {
      try {
        const params: Record<string, string | number | undefined> = {
          page: 1,
          limit: 500,
          isActive: 'true',
          courseId: courseFilter || undefined,
          semester: semesterFilter || undefined,
          academicYear: academicYearFilter || undefined
        };

        const res = await api.get('/course-sections', { params });
        const raw = res.data?.data ?? res.data ?? [];
        const normalized: CourseSectionOption[] = Array.isArray(raw)
          ? raw
              .filter((s) => s && typeof s === 'object' && 'id' in s && 'courseId' in s && 'sectionName' in s)
              .map((s: {
                id: string;
                courseId: string;
                yearLevel: string;
                sectionName: string;
                semester: string;
                academicYear: string;
                course?: { courseCode?: string; name?: string };
              }) => {
                const courseCode = s.course?.courseCode || '';
                const courseName = s.course?.name || '';
                const coursePart = courseCode && courseName ? `${courseCode} - ${courseName}` : courseName || courseCode || s.courseId;
                return {
                  id: s.id,
                  courseId: s.courseId,
                  yearLevel: s.yearLevel,
                  sectionName: s.sectionName,
                  semester: s.semester,
                  academicYear: s.academicYear,
                  label: `${coursePart} (${s.yearLevel} - ${s.sectionName})`
                };
              })
          : [];

        setCourseSectionOptions(normalized);

        if (courseSectionFilter) {
          const stillExists = normalized.some((s) => s.id === courseSectionFilter);
          if (!stillExists) setCourseSectionFilter('');
        }
      } catch (_e) {
        void _e;
        setCourseSectionOptions([]);
        if (courseSectionFilter) setCourseSectionFilter('');
      }
    };

    loadCourseSections();
  }, [_user?.role, courseFilter, semesterFilter, academicYearFilter, courseSectionFilter]);

  // Dweezil's Code - Render student view for STUDENT role
  if (_user?.role === 'STUDENT') {
    return <StudentEnrollmentsView />;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doFetchEnrollments(1);
  };

  const handlePageChange = (page: number) => {
    doFetchEnrollments(page);
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setLimit(newLimit));
    dispatch(setPage(1));
    doFetchEnrollments(1, newLimit);
  };

  const handleSelectEnrollment = (enrollmentId: string) => {
    const newSelected = selectedEnrollments.includes(enrollmentId)
      ? selectedEnrollments.filter(id => id !== enrollmentId)
      : [...selectedEnrollments, enrollmentId];

    setSelectedEnrollments(newSelected);
    setShowBulkActions(newSelected.length > 0);
  };

  const handleSelectAll = () => {
    const safeEnrollments = enrollments || [];
    if (selectedEnrollments.length === safeEnrollments.length && safeEnrollments.length > 0) {
      setSelectedEnrollments([]);
      setShowBulkActions(false);
    } else {
      const allEnrollmentIds = safeEnrollments.map(enrollment => enrollment.id);
      setSelectedEnrollments(allEnrollmentIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = async (action: string) => {
    setBulkAction(action);
    setBulkActionLoading(true);

    try {
      const enrollmentIds = selectedEnrollments;

      switch (action) {
        case 'enroll':
          for (const enrollmentId of enrollmentIds) {
            console.log(`Re-enrolling enrollment ${enrollmentId}`);
          }
          break;
        case 'drop':
          for (const enrollmentId of enrollmentIds) {
            console.log(`Dropping enrollment ${enrollmentId}`);
          }
          break;
        case 'delete':
          for (const enrollmentId of enrollmentIds) {
            console.log(`Deleting enrollment ${enrollmentId}`);
          }
          break;
      }

      doFetchEnrollments(pagination?.page || 1);
      setSelectedEnrollments([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setBulkActionLoading(false);
      setBulkAction('');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      VERIFIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      ENROLLED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      COMPLETED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      DROPPED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header Area */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Enrollment Management
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Manage student course enrollments, track progress, and process admissions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className={`inline-flex items-center px-4 py-2 border text-sm font-semibold rounded-lg transition-all shadow-sm ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
              <Link
                to="/enrollments/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Enrollment
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search and Filters Bar */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm overflow-hidden`}>
          <div className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by student name, course, or enrollment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="ENROLLED">Enrolled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DROPPED">Dropped</option>
                </select>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium border rounded-lg transition-all ${
                    showFilters 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                      : theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </button>
              </div>
            </div>

            {showFilters && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Course
                  </label>
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Courses</option>
                    {courseOptions.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.courseCode ? `${course.courseCode} - ${course.name}` : course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Semester
                  </label>
                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Semesters</option>
                    <option value="First Semester">First Semester</option>
                    <option value="Second Semester">Second Semester</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Academic Year
                  </label>
                  <select
                    value={academicYearFilter}
                    onChange={(e) => setAcademicYearFilter(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Years</option>
                    {academicYearOptions.map((y) => (
                      <option key={y.id} value={y.year}>
                        {y.isActive ? `${y.year} (Current)` : y.year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Section
                  </label>
                  <select
                    value={courseSectionFilter}
                    onChange={(e) => setCourseSectionFilter(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Sections</option>
                    {courseSectionOptions.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-blue-600 rounded-xl shadow-lg p-3 text-white flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold ml-2">
                {selectedEnrollments.length} selected
              </span>
              <div className="h-6 w-px bg-blue-500" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('enroll')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  Enroll
                </button>
                <button
                  onClick={() => handleBulkAction('drop')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  Drop
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedEnrollments([]);
                setShowBulkActions(false);
              }}
              className="text-sm hover:underline font-medium px-4"
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Data Table */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEnrollments.length === (enrollments || []).length && (enrollments || []).length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Student
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Course Info
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Enrollment Date
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {!enrollments?.length ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <GraduationCap className={`h-12 w-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          No enrollments found matching your criteria
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enrollment) => (
                    <tr 
                      key={enrollment.id} 
                      className={`group transition-colors ${
                        selectedEnrollments.includes(enrollment.id)
                          ? theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50/50'
                          : theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedEnrollments.includes(enrollment.id)}
                          onChange={() => handleSelectEnrollment(enrollment.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs border-2 border-white dark:border-gray-800 shadow-sm">
                            {enrollment.student?.user?.firstName?.charAt(0)}
                            {enrollment.student?.user?.lastName?.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {enrollment.student?.user?.firstName} {enrollment.student?.user?.lastName}
                            </div>
                            <div className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              ID: {enrollment.student?.studentId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                          {enrollment.course?.courseCode}
                        </div>
                        <div className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {typeof enrollment.student?.gradeLevel === 'string' ? enrollment.student.gradeLevel : enrollment.student?.gradeLevel?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5">
                          {getStatusBadge(enrollment.status)}
                          {enrollment.student?.registrationStatus && (
                            <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 w-fit ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {enrollment.student.registrationStatus.replace(/_/g, ' ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(enrollment.enrollmentDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/enrollments/${enrollment.id}`}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/enrollments/${enrollment.id}/edit`}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/30'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Showing <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                  <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>{pagination.total}</span> enrollments
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="px-4 py-1.5 text-sm font-bold border-x border-gray-200 dark:border-gray-600">
                      {pagination.page} / {pagination.totalPages}
                    </div>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <PageSizeDropdown
                    value={pagination.limit}
                    onChange={handleLimitChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Enrollments;
