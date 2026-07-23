import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../hooks/redux';
import { Link } from 'react-router-dom';
import { useSettingsContext } from '../utils/settingsUtils';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Eye,
  Building,
  FileText,
} from 'lucide-react';
import { AppDispatch } from '../store';
import {
  fetchSchedules,
  deleteSchedule,
  clearError,
  setPage,
  setLimit,
  ScheduleFilters,
  Schedule,
} from '../store/slices/schedulingSlice';
import { selectIsAuthenticated } from '../store/slices/authSlice';
import api from '../lib/api';
import { toast } from 'sonner';
import PageSizeDropdown from '../components/PageSizeDropdown';
// Dweezil's Code - Import student view
import StudentSchedulesView from './StudentSchedulesView';
import PrintReportModal from '../components/schedules/PrintReportModal';



/**
 * Schedules component - Main interface for schedule management
 * Features: listing, search, filtering, pagination, and CRUD operations
 */
const Schedules: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSettingsContext();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  const {
    schedules = [],
    isLoading = false,
    error = null,
    total = 0,
    page = 1,
    limit = 10,
    totalPages = 0
  } = useAppSelector((state) => state.scheduling);

  // Local state for filters and UI
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ScheduleFilters>({
    page: 1,
    limit: 20,
    sortBy: 'dayOfWeek',
    sortOrder: 'ASC',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [_deleteModalOpen, _setDeleteModalOpen] = useState(false);
  const [_scheduleToDelete, _setScheduleToDelete] = useState<Schedule | null>(null);
  const [_isDeleting, _setIsDeleting] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Bulk selection state
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set());
  const [_showBulkActions, _setShowBulkActions] = useState(false);
  const [_bulkAction, _setBulkAction] = useState<string>('');
  const [_bulkActionLoading, _setBulkActionLoading] = useState(false);

  // Filter options state
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  // Dweezil's Code - Add courses state for filter
  const [courses, setCourses] = useState<{ id: string; name: string; courseCode: string }[]>([]);

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // Dweezil's Code - Fetch courses along with rooms and sections
        const [roomsRes, sectionsRes, coursesRes] = await Promise.all([
          api.get('/schedules/rooms'),
          api.get('/schedules/sections'),
          api.get('/courses?page=1&limit=100&isActive=true')
        ]);
        if (roomsRes.data.success) setRooms(roomsRes.data.data);
        if (sectionsRes.data.success) setSections(sectionsRes.data.data);
        // Dweezil's Code - Set courses from response
        if (coursesRes.data.success) setCourses(coursesRes.data.data);
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };
    if (isAuthenticated && user?.role !== 'STUDENT') fetchOptions();
  }, [isAuthenticated, user?.role]);

  // Load schedules on component mount and when filters change
  useEffect(() => {
    // Skip if user is STUDENT (handled by StudentSchedulesView)
    if (user?.role === 'STUDENT') return;

    const searchFilters = {
      ...filters,
      search: searchTerm || undefined,
    };

    console.log('🔍 Schedules useEffect triggered:', {
      isAuthenticated,
      hasUser: !!user,
      userRole: user?.role,
      filters: searchFilters,
      timestamp: new Date().toISOString()
    });

    // Only fetch schedules if user is authenticated and has user data
    if (isAuthenticated && user) {
      console.log('✅ Fetching schedules - user authenticated with role:', user.role);
      dispatch(fetchSchedules(searchFilters));
    } else {
      console.log('⏳ Waiting for authentication or user data:', { isAuthenticated, hasUser: !!user });
    }
  }, [dispatch, filters, searchTerm, isAuthenticated, user]);

  // Debug logging for schedules state
  useEffect(() => {
    if (user?.role === 'STUDENT') return;
    console.log('📊 Schedules state updated:', {
      schedulesLength: schedules?.length || 0,
      schedules: schedules,
      isLoading,
      error,
      total,
      page,
      limit,
      totalPages
    });
  }, [schedules, isLoading, error, total, page, limit, totalPages, user?.role]);

  // Additional debug effect to track Redux state changes
  useEffect(() => {
    if (user?.role === 'STUDENT') return;
    console.log('🔍 Raw Redux scheduling state:', {
      schedulingState: { schedules, isLoading, error, total, page, limit, totalPages },
      schedulesType: typeof schedules,
      schedulesIsArray: Array.isArray(schedules),
      schedulesActualValue: schedules
    });
  }, [schedules, isLoading, error, total, page, limit, totalPages, user?.role]);

  // Debug render state
  if (user?.role !== 'STUDENT') {
    console.log('🎨 Schedules component render:', {
      isAuthenticated,
      hasUser: !!user,
      userRole: user?.role,
      schedulesLength: schedules?.length || 0,
      isLoading,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // Clear error when component unmounts
  useEffect(() => {
    if (user?.role === 'STUDENT') return;
    return () => {
      dispatch(clearError());
    };
  }, [dispatch, user?.role]);

  // Dweezil's Code - Render student view for STUDENT role
  if (user?.role === 'STUDENT') {
    return <StudentSchedulesView />;
  }

  // Handle search input change with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof ScheduleFilters, value: string | number | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle items per page change
  const handleLimitChange = (newLimit: number) => {
    dispatch(setLimit(newLimit));
    setFilters(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  // Handle individual schedule selection
  const handleSelectSchedule = (scheduleId: string) => {
    const newSelected = new Set(selectedSchedules);
    if (newSelected.has(scheduleId)) {
      newSelected.delete(scheduleId);
    } else {
      newSelected.add(scheduleId);
    }
    setSelectedSchedules(newSelected);
    _setShowBulkActions(newSelected.size > 0);
  };

  // Handle select all schedules
  const handleSelectAll = () => {
    if (selectedSchedules.size === schedules.length) {
      setSelectedSchedules(new Set());
      _setShowBulkActions(false);
    } else {
      const allIds = new Set(schedules.map(schedule => schedule.id));
      setSelectedSchedules(allIds);
      _setShowBulkActions(true);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedSchedules.size === 0) return;

    _setBulkAction(action);
    _setBulkActionLoading(true);

    try {
      const scheduleIds = Array.from(selectedSchedules);

      switch (action) {
        case 'activate':
          // TODO: Implement bulk activate API call
          toast.success(`${scheduleIds.length} schedule(s) activated successfully`);
          break;
        case 'deactivate':
          // TODO: Implement bulk deactivate API call
          toast.success(`${scheduleIds.length} schedule(s) deactivated successfully`);
          break;
        case 'delete':
          // TODO: Implement bulk delete API call
          toast.success(`${scheduleIds.length} schedule(s) deleted successfully`);
          break;
        default:
          toast.error('Unknown action');
          return;
      }

      // Refresh the schedule list
      const searchFilters = {
        ...filters,
        search: searchTerm || undefined,
      };
      dispatch(fetchSchedules(searchFilters));

      // Clear selection
      setSelectedSchedules(new Set());
      _setShowBulkActions(false);
    } catch (_error) {
      toast.error(`Failed to ${action} schedules`);
    } finally {
      _setBulkActionLoading(false);
      _setBulkAction('');
    }
  };

  // Handle schedule deletion
  const handleDeleteClick = (schedule: Schedule) => {
    _setScheduleToDelete(schedule);
    _setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!_scheduleToDelete) return;

    _setIsDeleting(true);
    try {
      await dispatch(deleteSchedule(_scheduleToDelete.id)).unwrap();
      toast.success('Schedule deleted successfully');
      _setDeleteModalOpen(false);
      _setScheduleToDelete(null);
    } catch (_error) {
      toast.error('Failed to delete schedule');
    } finally {
      _setIsDeleting(false);
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format day of week
  const formatDayOfWeek = (day: string) => {
    if (!day) return '';
    return day
      .split(',')
      .map((d) => d.trim().charAt(0) + d.trim().slice(1).toLowerCase())
      .join(', ');
  };

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Check if user can perform actions
  const isProgramHead =
    user?.role === 'TEACHER' && typeof user?.position === 'string' && user.position.toLowerCase().startsWith('program head');
  const canEdit = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'REGISTRAR';
  const canPrint = canEdit || isProgramHead;
  const canDelete = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const showTeacherColumn = user?.role !== 'TEACHER' || isProgramHead;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Schedule Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage course schedules, timetables, and room assignments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canPrint && (
            <>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Print Report
              </button>
              {canEdit && (
                <Link
                  to="/schedules/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search and Filters */}
        <div className={`rounded-lg shadow-sm border p-6 mb-6 ${theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
          }`}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search schedules..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                  ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Day of Week Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Day of Week
                  </label>
                  <select
                    value={filters.dayOfWeek || ''}
                    onChange={(e) => handleFilterChange('dayOfWeek', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="">All Days</option>
                    <option value="MONDAY">Monday</option>
                    <option value="TUESDAY">Tuesday</option>
                    <option value="WEDNESDAY">Wednesday</option>
                    <option value="THURSDAY">Thursday</option>
                    <option value="FRIDAY">Friday</option>
                    <option value="SATURDAY">Saturday</option>
                    <option value="SUNDAY">Sunday</option>
                  </select>
                </div>

                {/* Semester Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Semester
                  </label>
                  <select
                    value={filters.semester || ''}
                    onChange={(e) => handleFilterChange('semester', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="">All Semesters</option>
                    <option value="FIRST">First Semester</option>
                    <option value="SECOND">Second Semester</option>
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Year
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 2024"
                    value={filters.year || ''}
                  onChange={(e) => handleFilterChange('year', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>

                {/* Dweezil's Code - Course Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Course
                  </label>
                  <select
                    value={filters.courseId || ''}
                    onChange={(e) => handleFilterChange('courseId', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="">All Courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.courseCode} - {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Year Level
                  </label>
                  <select
                    value={filters.yearLevel || ''}
                    onChange={(e) => handleFilterChange('yearLevel', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="">All Year Levels</option>
                    <option value="First Year">First Year</option>
                    <option value="Second Year">Second Year</option>
                    <option value="Third Year">Third Year</option>
                    <option value="Fourth Year">Fourth Year</option>
                  </select>
                </div>

                {/* Room Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Room
                  </label>
                  <select
                    value={filters.room || ''}
                    onChange={(e) => handleFilterChange('room', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="">All Rooms</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.name}>{room.name}</option>
                    ))}
                  </select>
                </div>

                {/* Block (Section) Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Block
                  </label>
                  <select
                    value={filters.sectionName || ''}
                    onChange={(e) => handleFilterChange('sectionName', e.target.value || undefined)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="">All Blocks</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.name}>{section.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sort Options */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy || 'dayOfWeek'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="dayOfWeek">Day of Week</option>
                    <option value="startTime">Start Time</option>
                    <option value="room">Room</option>
                    <option value="createdAt">Created Date</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Order
                  </label>
                  <select
                    value={filters.sortOrder || 'ASC'}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'ASC' | 'DESC')}
                    className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900'
                      }`}
                  >
                    <option value="ASC">Ascending</option>
                    <option value="DESC">Descending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className={`border rounded-lg p-4 mb-6 ${theme === 'dark'
              ? 'bg-red-900/20 border-red-800'
              : 'bg-red-50 border-red-200'
            }`}>
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className={theme === 'dark' ? 'text-red-300' : 'text-red-800'}>{error}</span>
            </div>
          </div>
        )}

        {/* Schedules List */}
        <div className={`rounded-lg shadow-sm border ${theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
          }`}>
          {/* Table Header */}
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Schedules</h2>
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {total} total schedule{total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {_showBulkActions && (
            <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-blue-900/20' : 'border-gray-200 bg-blue-50'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                    {selectedSchedules.size} schedule{selectedSchedules.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkAction('activate')}
                      disabled={_bulkActionLoading}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${_bulkAction === 'activate' && _bulkActionLoading
                          ? 'bg-green-600 text-white'
                          : theme === 'dark'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                    >
                      {_bulkAction === 'activate' && _bulkActionLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Activating...
                        </div>
                      ) : (
                        'Activate'
                      )}
                    </button>
                    <button
                      onClick={() => handleBulkAction('deactivate')}
                      disabled={_bulkActionLoading}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${_bulkAction === 'deactivate' && _bulkActionLoading
                          ? 'bg-yellow-600 text-white'
                          : theme === 'dark'
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        }`}
                    >
                      {_bulkAction === 'deactivate' && _bulkActionLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Deactivating...
                        </div>
                      ) : (
                        'Deactivate'
                      )}
                    </button>
                    {/* <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkActionLoading}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                      bulkAction === 'delete' && bulkActionLoading
                        ? 'bg-red-600 text-white'
                        : theme === 'dark'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {bulkAction === 'delete' && bulkActionLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Deleting...
                      </div>
                    ) : (
                      'Delete'
                    )}
                  </button> */}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedSchedules(new Set());
                    _setShowBulkActions(false);
                  }}
                  className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Loading schedules...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && schedules && schedules.length === 0 && (
            <div className="p-8 text-center">
              <Calendar className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`} />
              <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>No schedules found</h3>
              <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {searchTerm || Object.keys(filters).some(key => filters[key as keyof ScheduleFilters])
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first schedule'}
              </p>
              {canEdit && (
                <Link
                  to="/schedules/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Link>
              )}
            </div>
          )}

          {/* Desktop Table */}
          {!isLoading && schedules && schedules.length > 0 && (
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                  }`}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      <input
                        type="checkbox"
                        checked={selectedSchedules.size === schedules.length && schedules.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      Subject & Time
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      Date Range
                    </th>
                    {showTeacherColumn && (
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                        }`}>
                        Teacher
                      </th>
                    )}
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      Room & Grade
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      Semester
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark'
                    ? 'bg-gray-800 divide-gray-700'
                    : 'bg-white divide-gray-200'
                  }`}>
                  {schedules && schedules.map((schedule) => (
                    <tr key={schedule.id} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedSchedules.has(schedule.id)}
                          onChange={() => handleSelectSchedule(schedule.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center">
                            <BookOpen className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                              {schedule.subject?.name || 'Unknown Subject'}
                            </span>
                          </div>
                          <div className={`flex items-center mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDayOfWeek(schedule.dayOfWeek)}
                            <Clock className="w-4 h-4 ml-3 mr-1" />
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </div>
                          {schedule.courseSection?.course && (
                            <div className={`flex items-center mt-1 text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                              <GraduationCap className="w-4 h-4 mr-1" />
                              <span className="font-medium">
                                {schedule.courseSection.course.courseCode}
                                {schedule.courseSection.sectionName ? ` - ${schedule.courseSection.sectionName}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          {schedule.startDate ? (
                            <div>
                              <span className="block">Start: {formatDate(schedule.startDate)}</span>
                              <span className="block">End: {formatDate(schedule.endDate)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No specific dates</span>
                          )}
                        </div>
                      </td>
                      {showTeacherColumn && (
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <User className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                              {schedule.teacher
                                ? `${schedule.teacher.user.firstName} ${schedule.teacher.user.lastName}`
                                : 'Unassigned'}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <MapPin className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                            }`} />
                          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>{schedule.room}</span>
                        </div>
                        {schedule.gradeLevel && (
                          <div className={`flex items-center mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            <GraduationCap className="w-4 h-4 mr-1" />
                            {schedule.gradeLevel.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          {schedule.semester === 'FIRST' ? 'First' : 'Second'} Semester
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>{schedule.year}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(schedule.isActive)
                            }`}
                        >
                          {schedule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/schedules/${schedule.id}`}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/20'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {canEdit && (
                            <Link
                              to={`/schedules/${schedule.id}/edit`}
                              className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                  ? 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'
                                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                                }`}
                              title="Edit Schedule"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                          {canDelete && !schedule.isActive && (
                            <button
                              onClick={() => handleDeleteClick(schedule)}
                              className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                                  : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                                }`}
                              title="Delete Schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Cards */}
          {!isLoading && schedules && schedules.length > 0 && (
            <div className="lg:hidden">
              {schedules && schedules.map((schedule) => (
                <div key={schedule.id} className={`p-6 border-b last:border-b-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <BookOpen className={`w-4 h-4 mr-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                          }`} />
                        <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                          {schedule.subject?.name || 'Unknown Subject'}
                        </h3>
                      </div>
                      <div className={`flex items-center mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDayOfWeek(schedule.dayOfWeek)}
                        <Clock className="w-4 h-4 ml-3 mr-1" />
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </div>
                      {schedule.startDate && (
                        <div className={`flex items-center mt-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          <Calendar className="w-4 h-4 mr-1" />
                          <span>{formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}</span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(schedule.isActive)
                        }`}
                    >
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {showTeacherColumn && (
                      <div className={`flex items-center text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                        <User className="w-4 h-4 mr-2" />
                        <span>
                          {schedule.teacher
                            ? `${schedule.teacher.user.firstName} ${schedule.teacher.user.lastName}`
                            : 'Unassigned'}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-center text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{schedule.room}</span>
                      {schedule.gradeLevel && (
                        <>
                          <GraduationCap className="w-4 h-4 ml-3 mr-1" />
                          <span>{schedule.gradeLevel.name}</span>
                        </>
                      )}
                    </div>
                    <div className={`flex items-center text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                      <Building className="w-4 h-4 mr-2" />
                      <span>
                        {schedule.semester === 'FIRST' ? 'First' : 'Second'} Semester {schedule.year}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2">
                    <Link
                      to={`/schedules/${schedule.id}`}
                      className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                          ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/20'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {canEdit && (
                      <Link
                        to={`/schedules/${schedule.id}/edit`}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                            ? 'text-gray-400 hover:text-green-400 hover:bg-green-900/20'
                            : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                          }`}
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    )}
                    {canDelete && !schedule.isActive && (
                      <button
                        onClick={() => handleDeleteClick(schedule)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                            ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                            : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                          }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && schedules && schedules.length > 0 && totalPages > 1 && (
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className={`text-sm transition-colors duration-200 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Showing {((page - 1) * limit) + 1} to{' '}
                  {Math.min(page * limit, total)} of{' '}
                  {total} results
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${theme === 'dark'
                        ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </button>
                  <span className={`text-sm transition-colors duration-200 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${theme === 'dark'
                        ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                  <PageSizeDropdown value={limit} onChange={handleLimitChange} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {_deleteModalOpen && _scheduleToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg max-w-md w-full p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Delete Schedule</h3>
              </div>
              <p className={`mb-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                Are you sure you want to delete the schedule for{' '}
                <span className="font-medium">{_scheduleToDelete.subject?.name}</span> on{' '}
                <span className="font-medium">{formatDayOfWeek(_scheduleToDelete.dayOfWeek)}</span>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    _setDeleteModalOpen(false);
                    _setScheduleToDelete(null);
                  }}
                  disabled={_isDeleting}
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${theme === 'dark'
                      ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={_isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {_isDeleting && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Print Report Modal */}
        <PrintReportModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          theme={theme}
        />
    </div>
  );
};

export default Schedules;
