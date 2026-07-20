import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  User,
  Users,

  GraduationCap,
  Calendar,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useSettingsContext } from '../utils/settingsUtils';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import Avatar from '../components/Avatar';
import PageSizeDropdown from '../components/PageSizeDropdown';
import {
  fetchStudents,
  deleteStudent,
  updateStudentStatus,
  selectStudents,
  selectStudentLoading,
  selectStudentError,
  selectStudentPagination,
  clearError,
  type StudentFilters,
  type Student
} from '../store/slices/studentSlice';
import { setLimit as setStudentLimit } from '../store/slices/studentSlice';
import type { AppDispatch } from '../store';

/**
 * Students page component for managing student records
 * Features: list view, search, filtering, pagination, CRUD operations
 */
const Students: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();
  
  // Permission check for creating students
  // Only Admin, SuperAdmin, and Registrar can create students
  const canCreateStudent = user?.role && ['ADMIN', 'SUPERADMIN', 'REGISTRAR'].includes(user.role);
  const canEditStudent = user?.role && ['ADMIN', 'SUPERADMIN', 'REGISTRAR'].includes(user.role);
  const isProgramHead =
    user?.role === 'TEACHER' && typeof user?.position === 'string' && user.position.toLowerCase().startsWith('program head');

  const programHeadCourseCode = (() => {
    if (!isProgramHead) return undefined;
    const position = String(user?.position || '');
    const parts = position.split(',');
    const inferred = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
    return inferred || undefined;
  })();

  const students = useSelector(selectStudents);
  const isLoading = useSelector(selectStudentLoading);
  const error = useSelector(selectStudentError);
  const pagination = useSelector(selectStudentPagination);
  const { theme } = useSettingsContext();

  // Local state for filters and UI
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [hasTeachingProfile, setHasTeachingProfile] = useState(false);
  const [myTeachingStudentsOnly, setMyTeachingStudentsOnly] = useState(false);
  const isTeachingView = (user?.role === 'TEACHER' && !isProgramHead) || myTeachingStudentsOnly;

  // Checkbox and bulk action states
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | ''>('');
  const [_bulkActionLoading, setBulkActionLoading] = useState(false);

  const showSelection = Boolean(canEditStudent && !isTeachingView);
  const showEditAction = Boolean(canEditStudent && !isTeachingView);


  // Dweezil's Code - Year levels for filter dropdown (College levels only)
  const yearLevels = [
    'First Year',
    'Second Year',
    'Third Year',
    'Fourth Year'
  ];



  const statusFilterOptions = [
    { value: 'ENROLLED', label: 'Enrolled' },
    { value: 'NOT_ENROLLED', label: 'Not Enrolled' },
    { value: 'REGISTRATION:PRE_REGISTERED', label: 'Pre-Registered' },
    { value: 'REGISTRATION:REGISTERED', label: 'Registered' },
    { value: 'REGISTRATION:WITHDRAWN', label: 'Withdrawn' }
  ];

  // Registration status options
  const registrationStatusOptions = [
    { value: 'PRE_REGISTERED', label: 'Pre-Registered', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    { value: 'REGISTERED', label: 'Registered', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { value: 'WITHDRAWN', label: 'Withdrawn', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
  ];

  // Dweezil's Code - Reset page to 1 when search term or filters change
  useEffect(() => {
    const filters: StudentFilters = {
      search: searchTerm || undefined,
      gradeLevel: gradeFilter || undefined,
      teachingScope: isTeachingView ? 'mine' : undefined,
      courseCode: isTeachingView ? undefined : programHeadCourseCode,
      sortBy,
      sortOrder,
      page: 1, // Always reset to page 1 when filters change
      limit: pagination.limit
    };

    if (statusFilter) {
      if (statusFilter === 'NOT_ENROLLED') {
        filters.status = 'PRE_REGISTERED';
      } else if (statusFilter.startsWith('REGISTRATION:')) {
        filters.registrationStatus = statusFilter.slice('REGISTRATION:'.length);
      } else {
        filters.status = statusFilter;
      }
    }

    const timer = setTimeout(() => {
      console.log('🔍 Students page - Fetching students with params:', filters);
      dispatch(fetchStudents(filters));
    }, searchTerm ? 500 : 0); // Debounce only when there's a search term

    return () => clearTimeout(timer);
  }, [dispatch, searchTerm, statusFilter, gradeFilter, isTeachingView, myTeachingStudentsOnly, programHeadCourseCode, sortBy, sortOrder, pagination.limit]);

  // Dweezil's Code - Separate effect for pagination changes (without resetting to page 1)
  useEffect(() => {
    // Only fetch if page changes and we're not on page 1 (page 1 is handled by the filter effect above)
    if (pagination.page !== 1) {
      const filters: StudentFilters = {
        search: searchTerm || undefined,
        gradeLevel: gradeFilter || undefined,
        teachingScope: isTeachingView ? 'mine' : undefined,
        courseCode: isTeachingView ? undefined : programHeadCourseCode,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit
      };

      if (statusFilter) {
        if (statusFilter === 'NOT_ENROLLED') {
          filters.status = 'PRE_REGISTERED';
        } else if (statusFilter.startsWith('REGISTRATION:')) {
          filters.registrationStatus = statusFilter.slice('REGISTRATION:'.length);
        } else {
          filters.status = statusFilter;
        }
      }

      console.log('🔍 Students page - Fetching students for page change:', filters);
      dispatch(fetchStudents(filters));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, myTeachingStudentsOnly, isTeachingView, programHeadCourseCode]);

  useEffect(() => {
    const resolveTeachingProfile = async () => {
      if (user?.role !== 'REGISTRAR') {
        setHasTeachingProfile(user?.role === 'TEACHER');
        return;
      }

      try {
        const response = await api.get('/teachers/profile');
        setHasTeachingProfile(Boolean(response.data?.data?.id));
      } catch {
        setHasTeachingProfile(false);
        setMyTeachingStudentsOnly(false);
      }
    };

    resolveTeachingProfile();
  }, [user?.role]);





  // Checkbox handlers
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(studentId)) {
        newSelected.delete(studentId);
      } else {
        newSelected.add(studentId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(student => student.id)));
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedStudents.size === 0) {
      console.error('Please select students first');
      return;
    }

    setBulkAction(action);
    setShowBulkActions(true);
  };

  const _executeBulkAction = async () => {
    if (!bulkAction || selectedStudents.size === 0) return;

    setBulkActionLoading(true);
    try {
      const studentIds = Array.from(selectedStudents);

      if (bulkAction === 'delete') {
        for (const studentId of studentIds) {
          await dispatch(deleteStudent(studentId)).unwrap();
        }
        console.log(`${selectedStudents.size} student(s) deleted successfully`);
      } else {
        const newStatus = bulkAction === 'activate' ? 'ENROLLED' : 'PRE_REGISTERED';
        for (const studentId of studentIds) {
          await dispatch(updateStudentStatus({ studentId, status: newStatus })).unwrap();
        }
        console.log(`${selectedStudents.size} student(s) ${newStatus.toLowerCase()} successfully`);
      }

      setSelectedStudents(new Set());
      setShowBulkActions(false);
      setBulkAction('');
    } catch (_error: unknown) {
      console.error('Error executing bulk action:', _error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Update showBulkActions when selectedStudents changes
  useEffect(() => {
    setShowBulkActions(selectedStudents.size > 0);
  }, [selectedStudents.size]);



  // Handle page change
  const handlePageChange = (newPage: number) => {
    const filters: StudentFilters = {
      search: searchTerm || undefined,
      gradeLevel: gradeFilter || undefined,
      teachingScope: myTeachingStudentsOnly ? 'mine' : undefined,
      sortBy,
      sortOrder,
      page: newPage,
      limit: pagination.limit
    };
    if (statusFilter) {
      if (statusFilter === 'NOT_ENROLLED') {
        filters.status = 'PRE_REGISTERED';
      } else if (statusFilter.startsWith('REGISTRATION:')) {
        filters.registrationStatus = statusFilter.slice('REGISTRATION:'.length);
      } else {
        filters.status = statusFilter;
      }
    }
    dispatch(fetchStudents(filters));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setStudentLimit(newLimit));
    const filters: StudentFilters = {
      search: searchTerm || undefined,
      gradeLevel: gradeFilter || undefined,
      teachingScope: myTeachingStudentsOnly ? 'mine' : undefined,
      sortBy,
      sortOrder,
      page: 1,
      limit: newLimit
    };
    if (statusFilter) {
      if (statusFilter === 'NOT_ENROLLED') {
        filters.status = 'PRE_REGISTERED';
      } else if (statusFilter.startsWith('REGISTRATION:')) {
        filters.registrationStatus = statusFilter.slice('REGISTRATION:'.length);
      } else {
        filters.status = statusFilter;
      }
    }
    dispatch(fetchStudents(filters));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setGradeFilter('');
    setMyTeachingStudentsOnly(false);
    setSortBy('createdAt');
    setSortOrder('DESC');
  };

  const getDisplayedEnrollmentStatus = (student: Student): string => {
    // Get the latest enrollment by enrollment date
    const latestEnrollment = student.enrollments?.length 
      ? [...student.enrollments].sort((a, b) => 
          new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime()
        )[0]
      : null;

    // If we have a latest enrollment, return its actual status
    if (latestEnrollment) {
      return latestEnrollment.status;
    }

    // Fall back to legacy status
    return student.status;
  };

  // Update status options to include all enrollment statuses
  const statusOptions = [
    { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'VERIFIED', label: 'Verified', color: 'bg-blue-100 text-blue-800' },
    { value: 'ENROLLED', label: 'Enrolled', color: 'bg-green-100 text-green-800' },
    { value: 'COMPLETED', label: 'Completed', color: 'bg-purple-100 text-purple-800' },
    { value: 'DROPPED', label: 'Dropped', color: 'bg-red-100 text-red-800' },
    { value: 'FAILED', label: 'Failed', color: 'bg-red-100 text-red-800' },
    { value: 'PRE_REGISTERED', label: 'Not Enrolled', color: 'bg-orange-100 text-orange-800' }
  ];

  // Get status badge component
  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    if (!statusConfig) return null;

    const icons = {
      ENROLLED: CheckCircle,
      PRE_REGISTERED: Clock
    };

    const Icon = icons[status as keyof typeof icons] || AlertCircle;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </span>
    );
  };

  // Dweezil's Code - Get registration status badge component with all status types
  const getRegistrationStatusBadge = (registrationStatus: string) => {
    const statusConfig = registrationStatusOptions.find(opt => opt.value === registrationStatus);
    if (!statusConfig) return null;

    const icons = {
      PRE_REGISTERED: Clock,
      REGISTERED: CheckCircle,
      WITHDRAWN: AlertCircle
    };

    const Icon = icons[registrationStatus as keyof typeof icons] || AlertCircle;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    // Check if date is the default "Jan 1, 1970" or similar invalid dates
    if (date.getFullYear() <= 1970) return 'Not set';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Debug logging
  const fullStudentState = useSelector((state: { student: { isLoading: boolean; students: Student[]; error: string | null; pagination: { page: number; limit: number; total: number; totalPages: number } } }) => state.student);
  console.log('🎯 Students component render - Debug info:', {
    studentsLength: students?.length || 0,
    students: students,
    isLoading,
    error,
    pagination,
    fullStudentState,
    isLoadingFromSelector: fullStudentState.isLoading
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Student Records
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage student information, enrollment status, and academic records
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateStudent && (
            <Link
              to="/students/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Link>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search students by name, email, or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {(statusFilter || gradeFilter || myTeachingStudentsOnly) && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full">
                  {(statusFilter ? 1 : 0) + (gradeFilter ? 1 : 0) + (myTeachingStudentsOnly ? 1 : 0)}
                </span>
              )}
            </button>
            {hasTeachingProfile && (isProgramHead || user?.role === 'REGISTRAR') && (
              <button
                onClick={() => setMyTeachingStudentsOnly(prev => !prev)}
                className={`flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  myTeachingStudentsOnly
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <GraduationCap className="w-4 h-4 mr-2" />
                My Teaching Students
              </button>
            )}
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                {statusFilterOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year Level
              </label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Year Levels</option>
                {yearLevels.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="createdAt">Date Added</option>
                  <option value="user.lastName">Last Name</option>
                  <option value="gradeLevelId">Year Level</option>
                  <option value="enrollmentDate">Enrollment Date</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
                  className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="DESC">DESC</option>
                  <option value="ASC">ASC</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {showSelection && showBulkActions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedStudents.size} student(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
          <button
            onClick={() => setSelectedStudents(new Set())}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => dispatch(clearError())} className="ml-auto">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Student List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {showSelection && (
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={students && students.length > 0 && selectedStudents.size === students.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                  </th>
                )}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Student Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Course Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Grade & Status
                </th>
                {isTeachingView ? (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned Subjects
                  </th>
                ) : (
                  <>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Registration
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Enrollment Date
                    </th>
                  </>
                )}
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={isTeachingView ? 6 : showSelection ? 8 : 7} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-500 dark:text-gray-400">Loading students...</span>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={isTeachingView ? 6 : showSelection ? 8 : 7} className="px-6 py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No students found</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Try adjusting your search or filters, or add a new student.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const displayedEnrollmentStatus = getDisplayedEnrollmentStatus(student);
                  const isSelected = selectedStudents.has(student.id);
                  return (
                    <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                      {showSelection && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectStudent(student.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <Avatar
                              user={{
                                ...student.user,
                                username: student.user?.email || '',
                                position: '',
                                role: 'STUDENT',
                                isActive: displayedEnrollmentStatus === 'ENROLLED',
                                isEmailVerified: (student.user as any)?.isEmailVerified || false,
                                status: displayedEnrollmentStatus === 'ENROLLED' ? 'active' : 'inactive',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                avatarUrl: (student.user as { avatarUrl?: string })?.avatarUrl
                              }}
                              size="md"
                              showUpload={false}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {student.user?.firstName} {student.user?.lastName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              ID: {student.registrationStatus === 'PRE_REGISTERED' ? (student.temporaryId || 'N/A') : (student.studentId || 'N/A')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                          {student.course?.courseCode || student.idCode || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white font-medium">{student.gradeLevel?.name || 'N/A'}</div>
                        <div className="mt-1">{getStatusBadge(displayedEnrollmentStatus)}</div>
                      </td>
                      {isTeachingView ? (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {student.teachingSubjects && student.teachingSubjects.length > 0
                              ? student.teachingSubjects.join(', ')
                              : 'No assigned subjects'}
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRegistrationStatusBadge(student.registrationStatus || 'PRE_REGISTERED')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <Mail className="flex-shrink-0 mr-1.5 h-3.5 w-3.5" />
                                {student.user?.email}
                              </div>
                              {student.user?.phone && (
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <Phone className="flex-shrink-0 mr-1.5 h-3.5 w-3.5" />
                                  {student.user.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="h-3.5 w-3.5 mr-1.5" />
                              {formatDate(student.enrollmentDate)}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/students/${student.id}`}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {showEditAction && (
                            <Link
                              to={`/students/${student.id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
              </p>
              <PageSizeDropdown
                value={pagination.limit}
                onChange={handleLimitChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`p-2 rounded-md border ${
                  pagination.page === 1
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`p-2 rounded-md border ${
                  pagination.page === pagination.totalPages
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Students;
