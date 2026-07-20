import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import {
  BookOpen,
  Save,
  X,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import { AppDispatch } from '../store';
import {
  createSubject,
  updateSubject,
  fetchSubjectById,
  fetchSubjects,
  clearError,
  clearCurrentSubject,
  selectCurrentSubject,
  selectSubjectsLoading,
  selectSubjectsError,
  selectSubjects,
} from '../store/slices/subjectSlice';
// Dweezil's Code - Changed to load departments instead of courses for proper department selection
import {
  fetchDepartments,
  selectDepartments,
  selectDepartmentLoading,
} from '../store/slices/departmentSlice';
import {
  SubjectFormData,
  PrerequisiteCategory,
  SubjectCreateData
} from '../types/subject.types';
import { toast } from 'sonner';
import { fetchCourses, selectCourses, selectCourseLoading } from '../store/slices/courseSlice';

// Form errors type for simple string errors
type SubjectFormErrors = {
  name?: string;
  code?: string;
  description?: string;
  departmentId?: string;
  courseId?: string;
  yearLevel?: string;
  semester?: string;
  units?: string;
  lectureHours?: string;
  labHours?: string;
  prerequisiteIds?: string;
};

const SubjectForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  // Dweezil's Code - Changed to use departments instead of courses
  const currentSubject = useAppSelector(selectCurrentSubject);
  const isLoading = useAppSelector(selectSubjectsLoading);
  const error = useAppSelector(selectSubjectsError);
  const departments = useAppSelector(selectDepartments);
  const departmentLoading = useAppSelector(selectDepartmentLoading);
  const courses = useAppSelector(selectCourses);
  const courseLoading = useAppSelector(selectCourseLoading);
  const subjects = useAppSelector(selectSubjects);

  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    code: '',
    description: '',
    departmentId: '', // Optional now, keeping empty
    courseId: '',
    yearLevel: 1,
    semester: 'First Semester',
    units: 3,
    lectureHours: 3,
    labHours: 0,
    prerequisiteIds: [],
    coRequisiteIds: [],
    isActive: true
  });

  const [errors, setErrors] = useState<SubjectFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availablePrerequisites, setAvailablePrerequisites] = useState<typeof subjects>([]);
  // Dweezil's Code - Added state for grade levels from Settings
  const [gradeLevels, setGradeLevels] = useState<Array<{ id: string; name: string; levelOrder: number }>>([]);

  // Dweezil's Code - Changed to load departments instead of courses
  // Load departments, subjects, and current subject data
  useEffect(() => {
    dispatch(fetchDepartments({ page: 1, limit: 100 }));
    dispatch(fetchCourses({ page: 1, limit: 1000 }));
    dispatch(fetchSubjects({ page: 1, limit: 1000 })); // Load all subjects for prerequisites
    if (isEditing && id) {
      dispatch(fetchSubjectById(id));
    }
    return () => {
      dispatch(clearCurrentSubject());
      dispatch(clearError());
    };
  }, [dispatch, id, isEditing]);

  // Dweezil's Code - Fetch grade levels from Settings > Grade Levels
  useEffect(() => {
    const fetchGradeLevels = async () => {
      try {
        // Import api from lib/api to use authenticated requests
        const api = (await import('../lib/api')).default;
        const response = await api.get('/grade-levels');
        
        if (response.data?.data) {
          // Filter only active grade levels and sort by levelOrder
          const activeGradeLevels = response.data.data
            .filter((gl: { isActive: boolean }) => gl.isActive)
            .sort((a: { levelOrder: number }, b: { levelOrder: number }) => a.levelOrder - b.levelOrder);
          setGradeLevels(activeGradeLevels);
        }
      } catch (error) {
        console.error('Failed to fetch grade levels:', error);
      }
    };

    fetchGradeLevels();
  }, []);

  // Filter available prerequisites (exclude current subject and its dependents)
  useEffect(() => {
    if (subjects.length > 0) {
      const filtered = subjects.filter(subject => {
        // Exclude current subject when editing
        if (isEditing && subject.id === id) {
          return false;
        }
        // Only include active subjects
        return subject.isActive;
      });
      
      setAvailablePrerequisites(filtered);
    }
  }, [subjects, formData.courseId, isEditing, id]);

  // Populate form when subject data is loaded
  useEffect(() => {
    if (currentSubject && isEditing) {
      setFormData({
        name: currentSubject.name || '',
        code: currentSubject.code || '',
        description: currentSubject.description || '',
        departmentId: currentSubject.departmentId || '',
        courseId: currentSubject.courseId || '',
        yearLevel: currentSubject.yearLevel || 1,
        semester: currentSubject.semester || 'First Semester',
        units: currentSubject.units || 3,
        lectureHours: currentSubject.lectureHours || 3,
        labHours: currentSubject.labHours || 0,
        prerequisiteIds: currentSubject.prerequisites
          ?.filter(p => p.category === PrerequisiteCategory.REQUIRED)
          .map(p => p.prerequisiteId) || [],
        coRequisiteIds: currentSubject.prerequisites
          ?.filter(p => p.category === PrerequisiteCategory.COREQUISITE)
          .map(p => p.prerequisiteId) || [],
        isActive: currentSubject.isActive !== undefined ? currentSubject.isActive : true,
      });
    }
  }, [currentSubject, isEditing]);

  // Handle error display
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: SubjectFormErrors = {};

    // Subject name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Subject name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Subject name must be at least 2 characters long';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Subject name must not exceed 100 characters';
    }

    // Subject code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Subject code is required';
    } else if (formData.code.trim().length < 2 || formData.code.trim().length > 20) {
      newErrors.code = 'Subject code must be between 2 and 20 characters';
    }

    // Description validation
    if (formData.description && formData.description.trim().length > 1000) {
      newErrors.description = 'Description must not exceed 1000 characters';
    }

    if (!formData.courseId) {
      newErrors.courseId = 'Course is required';
    }

    // Year Level validation
    if (!formData.yearLevel) {
      newErrors.yearLevel = 'Year Level is required';
    }

    if (!formData.semester) {
      newErrors.semester = 'Semester is required';
    }

    // Units validation
    if (formData.units < 1 || formData.units > 10) {
      newErrors.units = 'Units must be between 1 and 10';
    }

    // Lecture hours validation
    if (formData.lectureHours < 0 || formData.lectureHours > 20) {
      newErrors.lectureHours = 'Lecture hours must be between 0 and 20';
    }

    // Lab hours validation
    if (formData.labHours < 0 || formData.labHours > 20) {
      newErrors.labHours = 'Lab hours must be between 0 and 20';
    }

    // Total hours validation
    if (formData.lectureHours + formData.labHours === 0) {
      newErrors.lectureHours = 'Total hours (lecture + lab) must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    let processedValue: string | number | boolean = value;
    
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (name === 'units' || name === 'lectureHours' || name === 'labHours' || name === 'yearLevel') {
      processedValue = parseInt(value) || 0;
    } else if (name === 'code') {
      processedValue = value.toUpperCase();
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof SubjectFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSelectFieldChange = (field: 'departmentId' | 'courseId', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Handle prerequisite selection
  const handlePrerequisiteChange = (prerequisiteId: string) => {
    setFormData(prev => ({
      ...prev,
      prerequisiteIds: prev.prerequisiteIds.includes(prerequisiteId)
        ? prev.prerequisiteIds.filter(id => id !== prerequisiteId)
        : [...prev.prerequisiteIds, prerequisiteId]
    }));
  };

  // Remove prerequisite
  const removePrerequisite = (prerequisiteId: string) => {
    setFormData(prev => ({
      ...prev,
      prerequisiteIds: prev.prerequisiteIds.filter(id => id !== prerequisiteId)
    }));
  };

  // Handle co-requisite selection
  const handleCoRequisiteChange = (coRequisiteId: string) => {
    setFormData(prev => ({
      ...prev,
      coRequisiteIds: prev.coRequisiteIds.includes(coRequisiteId)
        ? prev.coRequisiteIds.filter(id => id !== coRequisiteId)
        : [...prev.coRequisiteIds, coRequisiteId]
    }));
  };

  // Remove co-requisite
  const removeCoRequisite = (coRequisiteId: string) => {
    setFormData(prev => ({
      ...prev,
      coRequisiteIds: prev.coRequisiteIds.filter(id => id !== coRequisiteId)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Dweezil's Code - Updated payload to use departmentId as primary field
    try {
      const payload = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          description: formData.description.trim(),
          departmentId: formData.departmentId || undefined,
          courseId: formData.courseId,
          yearLevel: formData.yearLevel,
          semester: formData.semester,
          units: formData.units,
          lectureHours: formData.lectureHours,
          labHours: formData.labHours,
          prerequisiteIds: formData.prerequisiteIds,
          coRequisiteIds: formData.coRequisiteIds,
          isActive: formData.isActive
      } as SubjectCreateData;

      if (isEditing && id) {
        await dispatch(updateSubject({ id, data: payload })).unwrap();
        toast.success('Subject updated successfully');
      } else {
        await dispatch(createSubject(payload)).unwrap();
        toast.success('Subject created successfully');
      }
      navigate('/subjects');
    } catch (error: any) {
      const message =
        typeof error === 'string'
          ? error
          : error?.response?.data?.message || error?.message || (isEditing ? 'Failed to update subject' : 'Failed to create subject');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/subjects');
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/subjects')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              {isEditing ? 'Edit Subject' : 'Add New Subject'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isEditing ? 'Update subject information' : 'Create a new subject for the academic program'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white dark:text-white">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Subject Name *
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
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                  placeholder="Enter subject name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Subject Code *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.code 
                      ? 'border-red-300' 
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                  placeholder="e.g., MATH101, CS201"
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.code && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.code}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description 
                      ? 'border-red-300' 
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                  placeholder="Enter subject description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white dark:text-white">
              Academic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label htmlFor="departmentId" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Department
                </label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={(e) => handleSelectFieldChange('departmentId', e.target.value)}
                  disabled={departmentLoading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                >
                  <option value="">Select Department</option>
                  {departments
                    .filter((department) => department.isActive)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.code} - {department.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="courseId" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Course *
                </label>
                <select
                  id="courseId"
                  name="courseId"
                  value={formData.courseId}
                  onChange={(e) => handleSelectFieldChange('courseId', e.target.value)}
                  disabled={courseLoading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.courseId
                      ? 'border-red-300'
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                >
                  <option value="">Select Course</option>
                  {courses
                    .filter(course => course.isActive)
                    .map(course => (
                      <option key={course.id} value={course.id}>
                        {course.courseCode} - {course.name}
                      </option>
                    ))}
                </select>
                {errors.courseId && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.courseId}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="yearLevel" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Year Level *
                </label>
                <select
                  id="yearLevel"
                  name="yearLevel"
                  value={formData.yearLevel}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.yearLevel 
                      ? 'border-red-300' 
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                >
                  <option value="">Select Year Level</option>
                  {gradeLevels.map((level) => (
                    <option key={level.id} value={level.levelOrder}>
                      {level.name}
                    </option>
                  ))}
                </select>
                {errors.yearLevel && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.yearLevel}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="semester" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Semester *
                </label>
                <select
                  id="semester"
                  name="semester"
                  value={formData.semester}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.semester
                      ? 'border-red-300'
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                >
                  <option value="">Select Semester</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                  <option value="Summer">Summer</option>
                </select>
                {errors.semester && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.semester}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="units" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Units *
                </label>
                <input
                  type="number"
                  id="units"
                  name="units"
                  value={formData.units}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.units 
                      ? 'border-red-300' 
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                />
                {errors.units && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.units}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lectureHours" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Lecture Hours *
                </label>
                <input
                  type="number"
                  id="lectureHours"
                  name="lectureHours"
                  value={formData.lectureHours}
                  onChange={handleInputChange}
                  min="0"
                  max="20"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.lectureHours 
                      ? 'border-red-300' 
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                />
                {errors.lectureHours && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.lectureHours}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="labHours" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Lab Hours *
                </label>
                <input
                  type="number"
                  id="labHours"
                  name="labHours"
                  value={formData.labHours}
                  onChange={handleInputChange}
                  min="0"
                  max="20"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.labHours 
                      ? 'border-red-300' 
                      : 'border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:text-gray-300'
                  }`}
                />
                {errors.labHours && (
                  <p className="mt-1 text-sm flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    {errors.labHours}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Prerequisites */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white dark:text-white">
              Prerequisites
            </h2>
            
            {/* Selected Prerequisites */}
            {formData.prerequisiteIds.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Selected Prerequisites:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.prerequisiteIds.map(prereqId => {
                    const prereq = availablePrerequisites.find(s => s.id === prereqId);
                    if (!prereq) return null;
                    return (
                      <div
                        key={prereqId}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        <span>{prereq.code} - {prereq.name}</span>
                        <button
                          type="button"
                          onClick={() => removePrerequisite(prereqId)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Prerequisites */}
            {availablePrerequisites.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Available Prerequisites:
                </h3>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                  {availablePrerequisites.map(subject => (
                    <label
                      key={subject.id}
                      className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded px-2"
                    >
                      <input
                        type="checkbox"
                        checked={formData.prerequisiteIds.includes(subject.id)}
                        onChange={() => handlePrerequisiteChange(subject.id)}
                        disabled={formData.coRequisiteIds.includes(subject.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-900 dark:text-white dark:text-gray-300">
                        {subject.code} - {subject.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                No available prerequisites found.
              </p>
            )}
          </div>

          {/* Co-requisites */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
              Co-requisites
            </h2>
            
            {/* Selected Co-requisites */}
            {formData.coRequisiteIds.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Selected Co-requisites:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.coRequisiteIds.map(coreqId => {
                    const coreq = availablePrerequisites.find(s => s.id === coreqId);
                    if (!coreq) return null;
                    return (
                      <div
                        key={coreqId}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
                        <span>{coreq.code} - {coreq.name}</span>
                        <button
                          type="button"
                          onClick={() => removeCoRequisite(coreqId)}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Co-requisites */}
            {availablePrerequisites.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Available Co-requisites:
                </h3>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                  {availablePrerequisites.map(subject => (
                    <label
                      key={`coreq-${subject.id}`}
                      className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-2"
                    >
                      <input
                        type="checkbox"
                        checked={formData.coRequisiteIds.includes(subject.id)}
                        onChange={() => handleCoRequisiteChange(subject.id)}
                        disabled={formData.prerequisiteIds.includes(subject.id)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-300">
                        {subject.code} - {subject.name}
                        {formData.prerequisiteIds.includes(subject.id) && (
                          <span className="ml-2 text-xs text-red-500">
                            (Prerequisite)
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No available co-requisites found.
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <h2 className="text-lg font-medium mb-4 text-gray-900 dark:text-white dark:text-white">
              Status
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                Active Subject
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
              Inactive subjects will not be available for enrollment or scheduling.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 dark:border-gray-600">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2 inline" />
                  {isEditing ? 'Update Subject' : 'Create Subject'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubjectForm;
