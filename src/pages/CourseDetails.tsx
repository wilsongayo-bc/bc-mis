import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
// Dweezil's Code - Removed GraduationCap import as Year Level field was removed
import {
  BookOpen,
  Edit,
  UserX,
  UserCheck,
  ArrowLeft,
  Clock,
  CheckCircle,
  Archive,
  Settings,
  Building,
  FileText,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { AppDispatch } from '../store';
import {
  fetchCourseById,
  clearError,
  clearCurrentCourse,
  updateCourse,
  selectCurrentCourse,
  selectCourseLoading,
  selectCourseError,
} from '../store/slices/courseSlice';
// Removed unused import: deleteCourse
import {
  fetchDepartments,
  selectDepartments,
} from '../store/slices/departmentSlice';

import { toast } from 'sonner';

const CourseDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const course = useSelector(selectCurrentCourse);
  const isLoading = useSelector(selectCourseLoading);
  const error = useSelector(selectCourseError);
  const departments = useSelector(selectDepartments);

  const [isProcessing, setIsProcessing] = useState(false);

  // Load course data and departments
  useEffect(() => {
    if (id) {
      dispatch(fetchCourseById(id));
    }
    dispatch(fetchDepartments({}));
    return () => {
      dispatch(clearCurrentCourse());
      dispatch(clearError());
    };
  }, [dispatch, id]);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Handle toggle course status
  const handleToggleStatus = async () => {
    if (!id || !course) return;

    setIsProcessing(true);
    try {
      const newIsActive = !course.isActive;
      
      await dispatch(updateCourse({ id: course.id, courseData: { isActive: newIsActive } })).unwrap();
      
      toast.success(`Course ${newIsActive ? 'activated' : 'deactivated'} successfully`);
    } catch (_error) {
      console.error('Error updating course status:', error);
      toast.error('Failed to update course status');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'ACTIVE': {
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        text: 'Active'
      },
      'INACTIVE': {
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        text: 'Inactive'
      },
      'ARCHIVED': {
        color: 'bg-gray-100 dark:bg-gray-700 text-gray-800',
        icon: Archive,
        text: 'Archived'
      }
    };

    const config = statusConfig[status] || statusConfig['ACTIVE'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.text}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Course not found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The course you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/courses')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/courses')}
              className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                {course.name}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Course Code: <span className="font-medium">{course.courseCode}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/courses/${id}/sections`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title="Manage Course Sections"
            >
              <Settings className="h-4 w-4" />
              Manage Sections
            </button>
            <button
              onClick={() => navigate(`/courses/${id}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleToggleStatus}
              disabled={isProcessing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                course.isActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={course.isActive ? 'Deactivate Course' : 'Activate Course'}
            >
              {course.isActive ? (
                <UserX className="h-4 w-4" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              {course.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Course Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Course Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Course Name</label>
                  <p className="text-gray-900 dark:text-white font-medium">{course.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Course Code</label>
                  <p className="text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                    {course.courseCode}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">ID Code</label>
                  <p className="text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                    {course.idCode || '—'}
                  </p>
                </div>
              </div>
              {/* Dweezil's Code - Moved Status field below Department field */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    <Building className="h-4 w-4 inline mr-1" />
                    Department
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {departments.find(dept => dept.id === course.departmentId)?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                  {getStatusBadge(course.isActive ? 'ACTIVE' : 'INACTIVE')}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {course.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{course.description}</p>
            </div>
          )}

          {/* Prerequisites */}
          {course.prerequisites && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Prerequisites
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {course.prerequisites && course.prerequisites.length > 0
                  ? course.prerequisites.map(prereq => prereq.prerequisiteCourse?.name || prereq.prerequisiteCourse?.courseCode).join(', ')
                  : 'None'
                }
              </p>
            </div>
          )}

          {/* Syllabus */}
          {course.syllabus && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Syllabus
              </h2>
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{course.syllabus}</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dweezil's Code - Removed Credits from Quick Stats as per requirements */}
          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Enrolled Students
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(course.sections || []).reduce((total, section) => total + (section.currentEnrollment ?? 0), 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Department
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {departments.find(dept => dept.id === course.departmentId)?.name || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Course Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-gray-900 dark:text-white">
                  {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                <p className="text-gray-900 dark:text-white">
                  {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Course ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-sm">{course.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default CourseDetails;
