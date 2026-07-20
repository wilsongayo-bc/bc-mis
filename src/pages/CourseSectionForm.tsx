import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppDispatch, RootState } from '../store';
import {
  createCourseSection,
  updateCourseSection,
  fetchCourseSectionById,
  clearError,
  clearCurrentCourseSection
} from '../store/slices/courseSectionSlice';
import { fetchCourses, fetchCourseById } from '../store/slices/courseSlice';
import { useAcademicYear } from '../hooks/useAcademicYear';
import { CreateCourseSectionData, UpdateCourseSectionData, YEAR_LEVELS } from '../types/courseSection.types';
// Using custom HTML elements with Tailwind CSS styling
import { ChevronLeft, Save, X, BookOpen, Settings } from 'lucide-react';
import { toast } from 'sonner';

// Define semester and academic year options based on the entity
const SEMESTER_OPTIONS = ['First Semester', 'Second Semester', 'Summer'] as const;

const CourseSectionForm: React.FC = () => {
  const params = useParams<{ id?: string; sectionId?: string; courseId?: string }>();
  const [searchParams] = useSearchParams();
  
  // Handle different route patterns:
  // /courses/:id/sections/new -> params.id is courseId, no sectionId (new mode)
  // /courses/:courseId/sections/:sectionId/edit -> params.courseId and params.sectionId (edit mode)
  const sectionId = params.sectionId; // Only exists in edit mode
  const courseId = params.id || params.courseId || searchParams.get('courseId');
  
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Only consider it edit mode if we have a valid sectionId from the edit route
  const isEditMode = !!sectionId && !!params.sectionId;
  const currentCourseSection = useSelector((state: RootState) => state.courseSection.currentCourseSection);
  const currentCourse = useSelector((state: RootState) => state.course.currentCourse);
  const courses = useSelector((state: RootState) => state.course.courses);
  const isLoading = useSelector((state: RootState) => state.courseSection.isLoading);
  const error = useSelector((state: RootState) => state.courseSection.error);
  
  const { academicYear: currentAcademicYear } = useAcademicYear();

  // Form state
  const [formData, setFormData] = useState({
    courseId: courseId || '',
    sectionName: '',
    yearLevel: '' as string,
    maxStudents: '50',
    credits: '3',
    semester: 'First Semester' as string,
    academicYear: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load courses on component mount
  useEffect(() => {
    if (courseId) {
      dispatch(fetchCourseById(courseId));
    } else {
      // If no courseId in params, fetch all courses for the dropdown
      dispatch(fetchCourses({ limit: 100 }));
    }
    return () => {
      dispatch(clearError());
      dispatch(clearCurrentCourseSection());
    };
  }, [dispatch, courseId]);

  // Set academic year from settings
  useEffect(() => {
    if (currentAcademicYear && !isEditMode) {
      setFormData(prev => ({ ...prev, academicYear: currentAcademicYear }));
    }
  }, [currentAcademicYear, isEditMode]);

  // Load course section data for editing
  useEffect(() => {
    if (isEditMode && sectionId) {
      dispatch(fetchCourseSectionById(sectionId));
    }
  }, [isEditMode, sectionId, dispatch]);

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && currentCourseSection) {
      setFormData({
        courseId: currentCourseSection.courseId,
        sectionName: currentCourseSection.sectionName,
        yearLevel: currentCourseSection.yearLevel,
        maxStudents: currentCourseSection.maxStudents.toString(),
        credits: currentCourseSection.credits.toString(),
        semester: currentCourseSection.semester,
        academicYear: currentCourseSection.academicYear
      });
    }
  }, [isEditMode, currentCourseSection]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.courseId.trim()) {
      errors.courseId = 'Course ID is required';
    }

    if (!formData.sectionName.trim()) {
      errors.sectionName = 'Section name is required';
    }

    if (!formData.yearLevel) {
      errors.yearLevel = 'Year level is required';
    }

    if (!formData.maxStudents || parseInt(formData.maxStudents) <= 0) {
      errors.maxStudents = 'Maximum students must be a positive number';
    }

    if (!formData.credits || parseFloat(formData.credits) <= 0) {
      errors.credits = 'Credits must be a positive number';
    }

    if (!formData.semester) {
      errors.semester = 'Semester is required';
    }

    if (!formData.academicYear.trim()) {
      errors.academicYear = 'Academic year is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting.');
      return;
    }

    try {
      if (isEditMode && sectionId) {
        const updateData: UpdateCourseSectionData = {
          courseId: formData.courseId,
          yearLevel: formData.yearLevel as typeof YEAR_LEVELS[number],
          sectionName: formData.sectionName,
          maxStudents: parseInt(formData.maxStudents),
          credits: parseFloat(formData.credits),
          semester: formData.semester,
          academicYear: formData.academicYear
        };

        await dispatch(updateCourseSection({ id: sectionId, sectionData: updateData })).unwrap();
        toast.success('Course section updated successfully!');
        
        // Refresh course data to reflect the updated section
        dispatch(fetchCourses({}));
      } else {
        const createData: CreateCourseSectionData = {
          courseId: formData.courseId,
          yearLevel: formData.yearLevel as typeof YEAR_LEVELS[number],
          sectionName: formData.sectionName,
          maxStudents: parseInt(formData.maxStudents),
          credits: parseFloat(formData.credits),
          semester: formData.semester,
          academicYear: formData.academicYear
        };

        await dispatch(createCourseSection(createData)).unwrap();
        toast.success('Course section created successfully!');
        
        // Refresh course data to include the new section
        dispatch(fetchCourses({}));
      }

      // Navigate back to course details or sections management
      if (courseId) {
        navigate(`/courses/${courseId}/sections`);
      } else {
        navigate('/settings/sections');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save course section.');
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (courseId) {
      navigate(`/courses/${courseId}/sections`);
    } else {
      navigate('/settings/sections');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Edit Course Section' : 'New Course Section'}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <X className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Section Details</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Section Name */}
              <div className="space-y-2">
                <label htmlFor="sectionName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section Name *</label>
                <input
                  id="sectionName"
                  type="text"
                  value={formData.sectionName}
                  onChange={(e) => handleInputChange('sectionName', e.target.value)}
                  placeholder="Enter Section Name (e.g., A, B, Morning)"
                  className={`block w-full px-4 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white sm:text-sm ${formErrors.sectionName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {formErrors.sectionName && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.sectionName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Year Level */}
                <div className="space-y-2">
                  <label htmlFor="yearLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year Level *</label>
                  <select
                    id="yearLevel"
                    value={formData.yearLevel}
                    onChange={(e) => handleInputChange('yearLevel', e.target.value)}
                    className={`block w-full px-4 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white sm:text-sm ${formErrors.yearLevel ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">Select Year Level</option>
                    {YEAR_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                  {formErrors.yearLevel && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.yearLevel}</p>
                  )}
                </div>

                {/* Maximum Students */}
                <div className="space-y-2">
                  <label htmlFor="maxStudents" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maximum Students *</label>
                  <input
                    id="maxStudents"
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) => handleInputChange('maxStudents', e.target.value)}
                    placeholder="e.g., 30"
                    min="1"
                    className={`block w-full px-4 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white sm:text-sm ${formErrors.maxStudents ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.maxStudents && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.maxStudents}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Semester */}
                <div className="space-y-2">
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Semester *</label>
                  <select
                    id="semester"
                    value={formData.semester}
                    onChange={(e) => handleInputChange('semester', e.target.value)}
                    className={`block w-full px-4 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white sm:text-sm ${formErrors.semester ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">Select semester</option>
                    {SEMESTER_OPTIONS.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                  {formErrors.semester && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.semester}</p>
                  )}
                </div>

                {/* Credits */}
                <div className="space-y-2">
                  <label htmlFor="credits" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Credits *</label>
                  <input
                    id="credits"
                    type="number"
                    value={formData.credits}
                    onChange={(e) => handleInputChange('credits', e.target.value)}
                    placeholder="e.g., 3"
                    min="0"
                    step="0.5"
                    className={`block w-full px-4 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white sm:text-sm ${formErrors.credits ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {formErrors.credits && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.credits}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">Configuration</h3>
            </div>
            <div className="p-6">
              {/* Course Selection */}
              <div className="space-y-2">
                <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-tighter text-xs">Target Course *</label>
                {courseId ? (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white">
                    {currentCourse ? `${currentCourse.courseCode} - ${currentCourse.name}` : 'Loading...'}
                  </div>
                ) : (
                  <select
                    id="courseId"
                    value={formData.courseId}
                    onChange={(e) => handleInputChange('courseId', e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white sm:text-sm ${formErrors.courseId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                  >
                    <option value="">Select a Course</option>
                    {courses && courses.length > 0 ? (
                      courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.courseCode} - {course.name}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No courses available</option>
                    )}
                  </select>
                )}
              </div>

              {/* Academic Year */}
              <div className="space-y-2">
                <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-tighter text-xs">Academic Year *</label>
                <input
                  id="academicYear"
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                  placeholder={currentAcademicYear || 'e.g., 2024-2025'}
                  className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white sm:text-sm ${formErrors.academicYear ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase mb-2">Pro-Tip</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Section names should be unique within the same course, year level, and semester to avoid confusion during enrollment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="lg:col-span-3 flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Section' : 'Create Section'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseSectionForm;
