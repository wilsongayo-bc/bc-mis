import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { AppDispatch } from '../store';
import {
  fetchCourseSectionsByCourse,
  deleteCourseSection,
  clearError
} from '../store/slices/courseSectionSlice';
import { fetchCourses } from '../store/slices/courseSlice';
import { CourseSection } from '../types/courseSection.types';
import { useSettingsContext } from '../utils/settingsUtils';
// Using custom HTML elements with Tailwind CSS styling
import {
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';

const CourseSectionManagement: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSettingsContext();
  const isDarkMode = theme === 'dark';

  // Local state for sections data
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<CourseSection | null>(null);

  // Function to load course sections
  const loadCourseSections = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await dispatch(fetchCourseSectionsByCourse(courseId)).unwrap();
      setCourseSections(result || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course sections');
      setCourseSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, dispatch]);

  // Load course sections on component mount
  useEffect(() => {
    if (courseId) {
      loadCourseSections();
    }
    return () => {
      dispatch(clearError());
    };
  }, [courseId, dispatch, loadCourseSections]);

  // Refresh sections when returning to the page (e.g., from form)
  useEffect(() => {
    const handleFocus = () => {
      if (courseId) {
        loadCourseSections();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [courseId, loadCourseSections]);

  // Handle delete confirmation
  const handleDeleteClick = (section: CourseSection) => {
    setSectionToDelete(section);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!sectionToDelete) return;

    try {
      await dispatch(deleteCourseSection(sectionToDelete.id)).unwrap();
      toast.success('Course section deleted successfully!');
      setDeleteDialogOpen(false);
      setSectionToDelete(null);
      // Refresh the sections list
      await loadCourseSections();
      // Refresh course data to update section count on main courses page
      dispatch(fetchCourses({}));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete course section.');
    }
  };

  // Handle edit section
  const handleEditSection = (sectionId: string) => {
    navigate(`/courses/${courseId}/sections/${sectionId}/edit`);
  };

  // Removed unused functions: handleAddSection, handleBackToCourse

  // Get semester badge color
  const getSemesterBadgeColor = (semester: string) => {
    switch (semester) {
      case 'First Semester':
        return 'bg-blue-100 text-blue-800';
      case 'Second Semester':
        return 'bg-green-100 text-green-800';
      case 'Summer':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800';
    }
  };

  // Get year level badge color
  const getYearLevelBadgeColor = (yearLevel: string) => {
    switch (yearLevel) {
      case 'First Year':
        return 'bg-purple-100 text-purple-800';
      case 'Second Year':
        return 'bg-indigo-100 text-indigo-800';
      case 'Third Year':
        return 'bg-pink-100 text-pink-800';
      case 'Fourth Year':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading course sections...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back to Course"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Manage Course Sections
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Configure sections, schedules, and enrollment limits</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/courses/${courseId}/sections/new`)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Section
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`${isDarkMode ? 'bg-red-900 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700'} border px-4 py-3 rounded mb-4`}>
          {error}
        </div>
      )}

      {/* Sections Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Course Sections</h3>
        </div>
        
        {courseSections.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No sections found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first course section.
            </p>
            <button
              onClick={() => navigate(`/courses/${courseId}/sections/new`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4" />
              Add First Section
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Section Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {courseSections.map((section) => (
                  <tr key={section.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {section.sectionName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getYearLevelBadgeColor(section.yearLevel)}`}>
                        <GraduationCap className="h-3 w-3 mr-1" />
                        {section.yearLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-gray-900 dark:text-white font-medium">
                          {section.currentEnrollment ?? 0}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          / {section.maxStudents}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {section.credits} credits
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSemesterBadgeColor(section.semester)}`}>
                        <Calendar className="h-3 w-3 mr-1" />
                        {section.semester}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {section.academicYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditSection(section.id)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(section)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white dark:bg-gray-800 border-gray-300'}`}>
            <div className="mt-3">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Delete Course Section</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} mb-4`}>
                Are you sure you want to delete the section "{sectionToDelete?.sectionName}"?
                This action cannot be undone and will remove all associated data.
              </p>
              <div className="flex justify-end gap-3">
                <button
                   onClick={() => {
                     setSectionToDelete(null);
                     setDeleteDialogOpen(false);
                   }}
                   className={`px-4 py-2 ${isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-white text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'} border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                 >
                   Cancel
                 </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseSectionManagement;
