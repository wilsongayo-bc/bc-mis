import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Save,
  X,
  AlertCircle,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { AppDispatch } from '../store';
import { useSettingsContext } from '../utils/settingsUtils';
import {
  createCourse,
  updateCourse,
  fetchCourseById,
  clearError,
  clearCurrentCourse,
  selectCurrentCourse,
  selectCourseLoading,
  selectCourseError,
} from '../store/slices/courseSlice';
import {
  fetchDepartments,
  selectDepartments,
  selectDepartmentLoading,
} from '../store/slices/departmentSlice';
import {
  CreateCourseData,
  UpdateCourseData,
} from '../types/course.types';
import { toast } from 'sonner';

// Simplified form data interface
interface SimplifiedCourseFormData {
  name: string;
  courseCode: string;
  idCode: string;
  description: string;
  departmentId: string;
  isActive: boolean;
  tuitionPerUnit?: string;
  miscellaneousFee?: string;
  downpaymentRate?: string;
}

// Simplified form errors interface
interface SimplifiedCourseFormErrors {
  name?: string;
  courseCode?: string;
  idCode?: string;
  description?: string;
  departmentId?: string;
  isActive?: string;
  tuitionPerUnit?: string;
  miscellaneousFee?: string;
  downpaymentRate?: string;
}

const CourseForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { theme } = useSettingsContext();

  const currentCourse = useSelector(selectCurrentCourse);
  const isLoading = useSelector(selectCourseLoading);
  const error = useSelector(selectCourseError);
  const departments = useSelector(selectDepartments);
  const departmentLoading = useSelector(selectDepartmentLoading);

  const [formData, setFormData] = useState<SimplifiedCourseFormData>({
    name: '',
    courseCode: '',
    idCode: '',
    description: '',
    departmentId: '',
    isActive: true,
    tuitionPerUnit: '',
    miscellaneousFee: '',
    downpaymentRate: ''
  });

  const [errors, setErrors] = useState<SimplifiedCourseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load departments and course data
  useEffect(() => {
    dispatch(fetchDepartments({}));
    if (isEditing && id) {
      dispatch(fetchCourseById(id));
    }
    return () => {
      dispatch(clearCurrentCourse());
      dispatch(clearError());
    };
  }, [dispatch, id, isEditing]);

  // Populate form when course data is loaded
  useEffect(() => {
    if (currentCourse && isEditing) {
      setFormData({
        name: currentCourse.name || '',
        courseCode: currentCourse.courseCode || '',
        idCode: currentCourse.idCode || '',
        description: currentCourse.description || '',
        departmentId: currentCourse.departmentId || '',
        isActive: currentCourse.isActive !== undefined ? currentCourse.isActive : true,
        tuitionPerUnit: currentCourse.tuitionPerUnit != null ? String(currentCourse.tuitionPerUnit) : '',
        miscellaneousFee: currentCourse.miscellaneousFee != null ? String(currentCourse.miscellaneousFee) : '',
        downpaymentRate: currentCourse.downpaymentRate != null ? String(currentCourse.downpaymentRate * 100) : '',
      });
    }
  }, [currentCourse, isEditing]);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Simplified form validation
  const validateForm = (): boolean => {
    const newErrors: SimplifiedCourseFormErrors = {};

    // Course name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Course name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Course name must be at least 2 characters long';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Course name must not exceed 100 characters';
    } else if (!/^[a-zA-Z0-9\s\-&().,]+$/.test(formData.name.trim())) {
      newErrors.name = 'Course name contains invalid characters';
    }

    // Course code validation (simplified - no format restrictions)
    if (!formData.courseCode.trim()) {
      newErrors.courseCode = 'Course code is required';
    } else if (formData.courseCode.trim().length < 2 || formData.courseCode.trim().length > 20) {
      newErrors.courseCode = 'Course code must be between 2 and 20 characters';
    }

    if (!formData.idCode.trim()) {
      newErrors.idCode = 'ID Code is required';
    } else if (!/^\d{2}$/.test(formData.idCode.trim())) {
      newErrors.idCode = 'ID Code must be a 2-digit number';
    }

    // Description validation (optional)
    if (formData.description && formData.description.trim().length > 1000) {
      newErrors.description = 'Description must not exceed 1000 characters';
    }

    // Department validation
    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required';
    }

    if (formData.tuitionPerUnit) {
      const value = Number(formData.tuitionPerUnit);
      if (Number.isNaN(value) || value < 0) {
        newErrors.tuitionPerUnit = 'Tuition per unit must be a non-negative number';
      }
    }

    if (formData.miscellaneousFee) {
      const value = Number(formData.miscellaneousFee);
      if (Number.isNaN(value) || value < 0) {
        newErrors.miscellaneousFee = 'Miscellaneous fee must be a non-negative number';
      }
    }

    if (formData.downpaymentRate) {
      const value = Number(formData.downpaymentRate);
      if (Number.isNaN(value) || value < 0 || value > 100) {
        newErrors.downpaymentRate = 'Downpayment rate must be between 0 and 100 (percentage)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let processedValue: string | boolean = value;
    
    if (type === 'checkbox') {
      processedValue = checked;
    }
    
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: processedValue,
      } as SimplifiedCourseFormData;

      if (name === 'courseCode') {
        const normalized = String(processedValue).trim().toUpperCase();
        if (normalized === 'BTVTED') next.idCode = '01';
        if (normalized === 'BSIS') next.idCode = '02';
      }

      return next;
    });

    // Clear error when user starts typing
    if (errors[name as keyof SimplifiedCourseFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && id) {
        const normalizedDownpaymentRate =
          formData.downpaymentRate && formData.downpaymentRate !== ''
            ? Number(formData.downpaymentRate) / 100
            : undefined;

        const updateData: UpdateCourseData = {
          name: formData.name.trim(),
          courseCode: formData.courseCode.trim().toUpperCase(),
          idCode: formData.idCode.trim(),
          description: formData.description.trim(),
          departmentId: formData.departmentId,
          isActive: formData.isActive,
          tuitionPerUnit: formData.tuitionPerUnit ? Number(formData.tuitionPerUnit) : undefined,
          miscellaneousFee: formData.miscellaneousFee ? Number(formData.miscellaneousFee) : undefined,
          downpaymentRate: normalizedDownpaymentRate,
        };
        await dispatch(updateCourse({ id, courseData: updateData })).unwrap();
        toast.success('Course updated successfully');
      } else {
        const normalizedDownpaymentRate =
          formData.downpaymentRate && formData.downpaymentRate !== ''
            ? Number(formData.downpaymentRate) / 100
            : undefined;

        const createData: CreateCourseData = {
          name: formData.name.trim(),
          courseCode: formData.courseCode.trim().toUpperCase(),
          idCode: formData.idCode.trim(),
          description: formData.description.trim(),
          departmentId: formData.departmentId,
          // Set default values for required fields that are now handled in sections
          yearLevel: 'All Years', // Default value since this will be handled in sections
          credits: 3, // Default value since this will be handled in sections
          maxStudents: 30, // Default value since this will be handled in sections
          isActive: formData.isActive,
          tuitionPerUnit: formData.tuitionPerUnit ? Number(formData.tuitionPerUnit) : undefined,
          miscellaneousFee: formData.miscellaneousFee ? Number(formData.miscellaneousFee) : undefined,
          downpaymentRate: normalizedDownpaymentRate,
        };
        await dispatch(createCourse(createData)).unwrap();
        toast.success('Course created successfully');
      }
      navigate('/courses');
    } catch (_error) {
      toast.error(isEditing ? 'Failed to update course' : 'Failed to create course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/courses');
  };

  if (isLoading && isEditing) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/courses')}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 text-gray-700'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <BookOpen className="h-8 w-8 text-blue-600" />
              {isEditing ? 'Edit Course' : 'Add New Course'}
            </h1>
            <p className={`mt-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {isEditing ? 'Update course information' : 'Create a new course for the academic program'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content Area (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <div className={`rounded-xl shadow-sm border overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Basic Information
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Course Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name 
                        ? 'border-red-300' 
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    placeholder="Enter course name"
                  />
                  {errors.name && (
                    <p className={`mt-1 text-sm flex items-center gap-1 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`}>
                      <AlertCircle className="h-4 w-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="courseCode" className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Course Code *
                  </label>
                  <input
                    type="text"
                    id="courseCode"
                    name="courseCode"
                    value={formData.courseCode}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.courseCode 
                        ? 'border-red-300' 
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    placeholder="Enter course code"
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.courseCode && (
                    <p className={`mt-1 text-sm flex items-center gap-1 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`}>
                      <AlertCircle className="h-4 w-4" />
                      {errors.courseCode}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="idCode" className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    ID Code *
                  </label>
                  <select
                    id="idCode"
                    name="idCode"
                    value={formData.idCode}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.idCode
                        ? 'border-red-300'
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Select ID Code</option>
                    <option value="01">01 (BTVTED)</option>
                    <option value="02">02 (BSIS)</option>
                  </select>
                  {errors.idCode && (
                    <p className={`mt-1 text-sm flex items-center gap-1 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`}>
                      <AlertCircle className="h-4 w-4" />
                      {errors.idCode}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="departmentId" className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Department *
                  </label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleInputChange}
                    disabled={departmentLoading}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.departmentId 
                        ? 'border-red-300' 
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departments
                      .filter((dept) => dept.isActive)
                      .map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                  {errors.departmentId && (
                    <p className={`mt-1 text-sm flex items-center gap-1 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`}>
                      <AlertCircle className="h-4 w-4" />
                      {errors.departmentId}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
                      errors.description 
                        ? 'border-red-300' 
                        : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    placeholder="Enter course description (optional)"
                  />
                  {errors.description && (
                    <p className={`mt-1 text-sm flex items-center gap-1 ${
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    }`}>
                      <AlertCircle className="h-4 w-4" />
                      {errors.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column (1/3) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Assessment Settings */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <Settings className="h-5 w-5 text-blue-600" />
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Assessment Settings
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="tuitionPerUnit" className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Tuition Per Unit
                </label>
                <input
                  type="number"
                  id="tuitionPerUnit"
                  name="tuitionPerUnit"
                  value={formData.tuitionPerUnit ?? ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.tuitionPerUnit
                      ? 'border-red-300'
                      : theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="e.g. 1000"
                />
                {errors.tuitionPerUnit && (
                  <p className={`mt-1 text-xs flex items-center gap-1 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.tuitionPerUnit}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="miscellaneousFee" className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Miscellaneous Fee
                </label>
                <input
                  type="number"
                  id="miscellaneousFee"
                  name="miscellaneousFee"
                  value={formData.miscellaneousFee ?? ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.miscellaneousFee
                      ? 'border-red-300'
                      : theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="e.g. 2500"
                />
                {errors.miscellaneousFee && (
                  <p className={`mt-1 text-xs flex items-center gap-1 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.miscellaneousFee}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="downpaymentRate" className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Downpayment Rate (%)
                </label>
                <input
                  type="number"
                  id="downpaymentRate"
                  name="downpaymentRate"
                  value={formData.downpaymentRate ?? ''}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.downpaymentRate
                      ? 'border-red-300'
                      : theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-gray-300'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  placeholder="e.g. 25"
                />
                {errors.downpaymentRate && (
                  <p className={`mt-1 text-xs flex items-center gap-1 ${
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  }`}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.downpaymentRate}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center gap-3 ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Status
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="isActive" className={`ml-2 block text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Course is active
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className={`lg:col-span-3 flex items-center justify-end space-x-4 pt-6 border-t mt-8 ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            type="button"
            onClick={handleCancel}
            className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Course' : 'Create Course'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourseForm;
