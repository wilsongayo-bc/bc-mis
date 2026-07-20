import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { useSettingsContext } from '../utils/settingsUtils';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  UserX,
  UserCheck,
  BookOpen,
  GraduationCap,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Calendar as _Calendar,
} from 'lucide-react';
import { AppDispatch } from '../store';
import {
  fetchCourses,
  updateCourse,
  clearError,
  selectCourses,
  selectCourseLoading,
  selectCourseError,
  selectCoursePagination,
  setLimit as setCourseLimit,
} from '../store/slices/courseSlice';
import {
  fetchDepartments,
  selectDepartments,
} from '../store/slices/departmentSlice';
import { CourseFilters } from '../types/course.types';
import { YEAR_LEVELS } from '../types/courseSection.types';
import { toast } from 'sonner';
import PageSizeDropdown from '../components/PageSizeDropdown';
// Dweezil's Code - Import student view and auth
import { selectUser } from '../store/slices/authSlice';
import StudentCoursesView from './StudentCoursesView';

const Courses: React.FC = () => {
  const { theme } = useSettingsContext();
  // Dweezil's Code - Get current user
  const user = useSelector(selectUser);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const courses = useSelector(selectCourses);
  const isLoading = useSelector(selectCourseLoading);
  const error = useSelector(selectCourseError);
  const pagination = useSelector(selectCoursePagination);
  const departments = useSelector(selectDepartments);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  // Bulk action states
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);


  // Load departments on component mount
  useEffect(() => {
    dispatch(fetchDepartments({}));
  }, [dispatch]);

  // Fetch courses when filters change
  useEffect(() => {
    const filters: CourseFilters = {
      search: searchTerm || undefined,
      departmentId: departmentFilter || undefined,
      yearLevel: gradeFilter || undefined,
      isActive: statusFilter ? statusFilter === 'active' : undefined,
      page: pagination.page,
      limit: pagination.limit,
      sortBy: 'name',
      sortOrder: 'ASC',
    };

    dispatch(fetchCourses(filters));
  }, [dispatch, searchTerm, departmentFilter, gradeFilter, statusFilter, pagination.page, pagination.limit]);

  // No additional frontend filtering needed for now since backend handles most filters
  // but keeping this variable name to minimize code changes in the render part
  const filteredCourses = courses;

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  const toggleCourseExpansion = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  // Handle toggle course status
  const handleToggleStatus = async (courseId: string, currentIsActive: boolean) => {
    try {
      const newIsActive = !currentIsActive;
      await dispatch(updateCourse({ id: courseId, courseData: { isActive: newIsActive } })).unwrap();
      toast.success(`Course ${newIsActive ? 'activated' : 'deactivated'} successfully`);
    } catch (_error) {
      toast.error('Failed to update course status');
    }
  };

  // Bulk selection handlers
  const handleSelectCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourses(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedCourses.size === filteredCourses.length) {
      setSelectedCourses(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(filteredCourses.map(course => course.id));
      setSelectedCourses(allIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = async (action: string) => {
    setBulkAction(action);
    setBulkActionLoading(true);

    try {
      const courseIds = Array.from(selectedCourses);

      switch (action) {
        case 'activate':
          await Promise.all(courseIds.map(id =>
            dispatch(updateCourse({ id, courseData: { isActive: true } })).unwrap()
          ));
          toast.success(`${courseIds.length} course(s) activated successfully`);
          break;
        case 'deactivate':
          await Promise.all(courseIds.map(id =>
            dispatch(updateCourse({ id, courseData: { isActive: false } })).unwrap()
          ));
          toast.success(`${courseIds.length} course(s) deactivated successfully`);
          break;
        default:
          break;
      }

      // Clear selection after action
      setSelectedCourses(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(`Failed to ${action} courses`);
    } finally {
      setBulkActionLoading(false);
      setBulkAction('');
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    dispatch({ type: 'course/setPage', payload: newPage });
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setCourseLimit(newLimit));
    dispatch({ type: 'course/setPage', payload: 1 });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setGradeFilter('');
    setStatusFilter('');
  };

  // Get status badge color
  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  };

  // Dweezil's Code - Render student view for STUDENT role
  if (user?.role === 'STUDENT') {
    return <StudentCoursesView />;
  }

  if (isLoading && filteredCourses.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header Area */}
      <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Course Management
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Manage academic programs, departments, and course curricula
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/courses/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Course
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
                  placeholder="Search by course name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
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
                {(searchTerm || departmentFilter || gradeFilter || statusFilter) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Department
                  </label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Year Level
                  </label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Year Levels</option>
                    {YEAR_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
                {selectedCourses.size} courses selected
              </span>
              <div className="h-6 w-px bg-blue-500" />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {bulkActionLoading && bulkAction === 'activate' ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  ) : <UserCheck className="h-4 w-4" />}
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionLoading}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {bulkActionLoading && bulkAction === 'deactivate' ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  ) : <UserX className="h-4 w-4" />}
                  Deactivate
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCourses(new Set());
                setShowBulkActions(false);
              }}
              className="text-sm hover:underline font-medium px-4"
            >
              Clear
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
                      checked={selectedCourses.size === filteredCourses.length && filteredCourses.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Course Info
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Department
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sections
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className={`h-12 w-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          No courses found matching your criteria
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <React.Fragment key={course.id}>
                      <tr className={`group transition-colors ${
                        selectedCourses.has(course.id)
                          ? theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50/50'
                          : theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'
                      }`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedCourses.has(course.id)}
                            onChange={() => handleSelectCourse(course.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleCourseExpansion(course.id)}
                              className={`p-1 rounded-md transition-colors ${
                                theme === 'dark' ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                              }`}
                            >
                              {expandedCourses.has(course.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            <div>
                              <div className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {course.name}
                              </div>
                              <div className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {course.courseCode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                              {departments.find(d => d.id === course.departmentId)?.name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {course.sections?.length || 0} Sections
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            course.isActive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${course.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {course.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/courses/${course.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/courses/${course.id}/edit`)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit Course"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(course.id, course.isActive)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                course.isActive 
                                  ? 'text-red-600 hover:bg-red-50' 
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={course.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {course.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedCourses.has(course.id) && course.sections && course.sections.length > 0 && (
                        <tr>
                          <td colSpan={6} className={`px-6 py-4 ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {course.sections.map((section) => (
                                <div 
                                  key={section.id} 
                                  className={`p-3 rounded-xl border shadow-sm ${
                                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {section.sectionName}
                                      </h4>
                                      <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Grade {section.yearLevel}
                                      </p>
                                    </div>
                                    <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                      {section.credits} Units
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Capacity</span>
                                      <span className={`font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                        {section.currentEnrollment ?? section.enrollments?.length ?? 0} / {section.maxStudents}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                      <div 
                                        className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${Math.min(100, ((section.currentEnrollment ?? section.enrollments?.length ?? 0) / section.maxStudents) * 100)}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                      <span className={`text-[10px] font-bold uppercase ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {section.semester}
                                      </span>
                                      <span className={`text-[10px] font-bold uppercase ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {section.academicYear}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/30'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Showing <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                  <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}>{pagination.total}</span> courses
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="p-2 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="px-4 py-1.5 text-sm font-bold border-x border-gray-200 dark:border-gray-600">
                      {pagination.page} / {pagination.totalPages}
                    </div>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
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

export default Courses;
