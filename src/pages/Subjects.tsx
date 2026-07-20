import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  Edit,
  Eye,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { AppDispatch } from '../store';
import {
  fetchSubjects,
  deleteSubject,
  activateSubject,
  deactivateSubject,
  setPage,
  setFilters,
  clearFilters,
  selectSubjects,
  selectSubjectsLoading,
  selectSubjectsError,
  selectSubjectsTotal,
  selectSubjectsPage,
  selectSubjectsLimit,
  selectSubjectsTotalPages,
  selectSubjectsFilters,
  setLimit,
} from '../store/slices/subjectSlice';
import {
  fetchDepartments,
  selectDepartments,
} from '../store/slices/departmentSlice';
import { fetchCourses, selectCourses } from '../store/slices/courseSlice';
import { SubjectFilters } from '../types/subject.types';
import PageSizeDropdown from '../components/PageSizeDropdown';

const Subjects: React.FC = () => {
  // console.log('🎯 SUBJECTS COMPONENT RENDERED - Component is mounting!');
  const dispatch = useDispatch<AppDispatch>();
  const _navigate = useNavigate();

  // Redux state
  const subjects = useSelector(selectSubjects);
  const departments = useSelector(selectDepartments);
  const courses = useSelector(selectCourses);
  const isLoading = useSelector(selectSubjectsLoading);
  const error = useSelector(selectSubjectsError);
  const total = useSelector(selectSubjectsTotal);
  const page = useSelector(selectSubjectsPage);
  const limit = useSelector(selectSubjectsLimit);
  const totalPages = useSelector(selectSubjectsTotalPages);
  const filters = useSelector(selectSubjectsFilters);

  // Local state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [localFilters, setLocalFilters] = useState<Partial<SubjectFilters>>({
    departmentId: filters.departmentId || '',
    courseId: filters.courseId || '',
    yearLevel: filters.yearLevel,
    semester: filters.semester || '',
    isActive: filters.isActive,
    hasPrerequisites: filters.hasPrerequisites,
  });

  // Fetch data on component mount
  useEffect(() => {
    console.debug('Subjects: Fetching subjects with filters:', { ...filters, page, limit });
    dispatch(fetchSubjects({ ...filters, page, limit }));
    dispatch(fetchDepartments({ page: 1, limit: 100 }));
    dispatch(fetchCourses({ page: 1, limit: 1000 }));
  }, [dispatch, filters, page, limit]);

  // Debug subjects data
  useEffect(() => {
    console.log('=== SUBJECTS DEBUG ===');
    console.log('Subjects component mounted');
    console.log('Current subjects state:', subjects);
    console.log('Subjects type:', typeof subjects);
    console.log('Is subjects array?', Array.isArray(subjects));
    console.log('Subjects length:', subjects?.length);
    console.log('Is loading:', isLoading);
    console.log('Error:', error);
    console.log('Total subjects:', total);
    console.log('Page:', page);
    console.log('Limit:', limit);
    
    // Log first subject if available
    if (subjects && Array.isArray(subjects) && subjects.length > 0) {
      console.log('First subject:', subjects[0]);
    }
    console.log('=== END DEBUG ===');
  }, [subjects, isLoading, error, total, page, limit]);

  // Handle search
  const handleSearch = useCallback((searchValue: string) => {
    setSearchTerm(searchValue);
    dispatch(setFilters({ search: searchValue }));
    dispatch(fetchSubjects({ ...filters, search: searchValue, page: 1, limit }));
  }, [dispatch, filters, limit]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<SubjectFilters>) => {
    setLocalFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    const combinedFilters = { ...filters, ...localFilters, search: searchTerm };
    dispatch(setFilters(combinedFilters));
    dispatch(fetchSubjects({ ...combinedFilters, page: 1, limit }));
    dispatch(setPage(1));
  }, [dispatch, filters, localFilters, searchTerm, limit]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setLocalFilters({
      departmentId: '',
      courseId: '',
      yearLevel: undefined,
      semester: '',
      isActive: undefined,
      hasPrerequisites: undefined,
    });
    dispatch(clearFilters());
    dispatch(fetchSubjects({ page: 1, limit }));
    dispatch(setPage(1));
  }, [dispatch, limit]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    dispatch(setPage(newPage));
    dispatch(fetchSubjects({ ...filters, page: newPage, limit }));
  }, [dispatch, filters, limit]);

  const handleLimitChange = useCallback((newLimit: number) => {
    dispatch(setLimit(newLimit));
    dispatch(setPage(1));
    dispatch(fetchSubjects({ ...filters, page: 1, limit: newLimit }));
  }, [dispatch, filters]);

  // Handle subject selection
  const handleSubjectSelect = useCallback((subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!subjects || !Array.isArray(subjects)) return;
    if (selectedSubjects.length === subjects.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(subjects.map(subject => subject.id));
    }
  }, [selectedSubjects, subjects]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedSubjects.length === 0) return;

    try {
      const promises = selectedSubjects.map(id => {
        switch (action) {
          case 'activate':
            return dispatch(activateSubject(id));
          case 'deactivate':
            return dispatch(deactivateSubject(id));
          case 'delete':
            return dispatch(deleteSubject(id));
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      setSelectedSubjects([]);
      dispatch(fetchSubjects({ ...filters, page, limit }));
    } catch (error) {
      console.error(`Failed to ${action} subjects:`, error);
    }
  }, [selectedSubjects, dispatch, filters, page, limit]);

  // Handle individual subject actions
  const handleSubjectAction = useCallback(async (subjectId: string, action: 'activate' | 'deactivate' | 'delete') => {
    try {
      switch (action) {
        case 'activate':
          await dispatch(activateSubject(subjectId));
          break;
        case 'deactivate':
          await dispatch(deactivateSubject(subjectId));
          break;
        case 'delete':
          await dispatch(deleteSubject(subjectId));
          break;
      }
      dispatch(fetchSubjects({ ...filters, page, limit }));
    } catch (error) {
      console.error(`Failed to ${action} subject:`, error);
    }
  }, [dispatch, filters, page, limit]);

  // Get status badge color
  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  // Get department name
  const getDepartmentName = (departmentId: string) => {
    const department = departments.find(dept => dept.id === departmentId);
    return department?.name || 'Unknown Department';
  };

  // Sort departments by code for better organization
  const sortedDepartments = [...(departments || [])]
    .filter(d => d.isActive) // Only show active departments in filters
    .sort((a, b) => 
      (a.code || '').localeCompare(b.code || '')
    );

  const sortedCourses = [...(courses || [])]
    .filter(c => c.isActive)
    .sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''));

  if (isLoading && (!subjects || subjects.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Subjects Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage academic subjects, prerequisites, and course offerings
          </p>
        </div>
        <Link
          to="/subjects/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subject
        </Link>
      </div>

      {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <div className="p-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search subjects by name, code, or description..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Department Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      value={localFilters.departmentId || ''}
                      onChange={(e) => handleFilterChange({ departmentId: e.target.value, courseId: '' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Departments</option>
                      {sortedDepartments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.code} - {department.name}
                        </option>
                      ))}
                    </select>

                  </div>

                  {/* Course Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Course
                    </label>
                    <select
                      value={localFilters.courseId || ''}
                      onChange={(e) => handleFilterChange({ courseId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Courses</option>
                      {sortedCourses
                        .filter(course => !localFilters.departmentId || course.departmentId === localFilters.departmentId)
                        .map(course => (
                          <option key={course.id} value={course.id}>
                            {course.courseCode} - {course.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Year Level Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Year Level
                    </label>
                    <select
                      value={localFilters.yearLevel ? String(localFilters.yearLevel) : ''}
                      onChange={(e) =>
                        handleFilterChange({ yearLevel: e.target.value ? parseInt(e.target.value) : undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Year Levels</option>
                      <option value="1">First Year</option>
                      <option value="2">Second Year</option>
                      <option value="3">Third Year</option>
                      <option value="4">Fourth Year</option>
                    </select>
                  </div>

                  {/* Semester Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Semester
                    </label>
                    <select
                      value={localFilters.semester || ''}
                      onChange={(e) => handleFilterChange({ semester: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Semesters</option>
                      <option value="First Semester">First Semester</option>
                      <option value="Second Semester">Second Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>

                  {/* Units Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Units
                    </label>
                    <select
                      value={localFilters.units || ''}
                      onChange={(e) => handleFilterChange({ units: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Units</option>
                      <option value="1">1 Unit</option>
                      <option value="2">2 Units</option>
                      <option value="3">3 Units</option>
                      <option value="4">4 Units</option>
                      <option value="5">5 Units</option>
                      <option value="6">6 Units</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={localFilters.isActive === undefined ? '' : localFilters.isActive.toString()}
                      onChange={(e) => handleFilterChange({ 
                        isActive: e.target.value === '' ? undefined : e.target.value === 'true' 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Status</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  {/* Prerequisites Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Prerequisites
                    </label>
                    <select
                      value={localFilters.hasPrerequisites === undefined ? '' : localFilters.hasPrerequisites.toString()}
                      onChange={(e) => handleFilterChange({ 
                        hasPrerequisites: e.target.value === '' ? undefined : e.target.value === 'true' 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Subjects</option>
                      <option value="true">With Prerequisites</option>
                      <option value="false">No Prerequisites</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={applyFilters}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedSubjects.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Subjects Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={subjects && Array.isArray(subjects) && subjects.length > 0 && selectedSubjects.length === subjects.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Semester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Prerequisites
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {subjects && Array.isArray(subjects) ? (
                  subjects.map((subject, _index) => (
                  <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => handleSubjectSelect(subject.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="ml-4 max-w-[200px]">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={subject.name}>
                            {subject.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {subject.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.course?.courseCode || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.yearLevel ? `Year ${subject.yearLevel}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.semester || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.units || 0} {(subject.units || 0) === 1 ? 'unit' : 'units'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{subject.lectureHours || 0}L / {subject.labHours || 0}Lab</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {subject.prerequisites && Array.isArray(subject.prerequisites) && subject.prerequisites.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {subject.prerequisites.length} prerequisite{subject.prerequisites.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getStatusBadgeColor(subject.isActive)
                      }`}>
                        {subject.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/subjects/${subject.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/subjects/${subject.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Edit Subject"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleSubjectAction(subject.id, subject.isActive ? 'deactivate' : 'activate')}
                          className={`${
                            subject.isActive
                              ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                          }`}
                          title={subject.isActive ? "Deactivate Subject" : "Activate Subject"}
                        >
                          {subject.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{((page || 1) - 1) * (limit || 10) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min((page || 1) * (limit || 10), total || 0)}</span> of{' '}
                    <span className="font-medium">{total || 0}</span> results
                  </p>
                  <PageSizeDropdown
                    value={limit || 25}
                    onChange={handleLimitChange}
                  />
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages || 0 }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && subjects && Array.isArray(subjects) && subjects.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No subjects found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new subject.
            </p>
            <div className="mt-6">
              <Link
                to="/subjects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Link>
            </div>
          </div>
        )}
    </div>
  );
};

export default Subjects;
