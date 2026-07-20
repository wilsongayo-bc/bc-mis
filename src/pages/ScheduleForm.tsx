import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  Save,
  ChevronLeft,
  AlertCircle,
  GraduationCap,
  Building,
  Search,
  ChevronDown,
  Check,
} from 'lucide-react';
import { AppDispatch, RootState } from '../store';
import {
  createSchedule,
  createBulkSchedules,
  updateSchedule,
  fetchScheduleById,
  fetchSchedules,
  clearError,
  CreateScheduleData,
  CreateBulkSchedulesData,
  UpdateScheduleData,
} from '../store/slices/schedulingSlice';
import { fetchSubjects } from '../store/slices/subjectSlice';
import { fetchTeachers } from '../store/slices/employeeSlice';
import { fetchCourses } from '../store/slices/courseSlice';
import { fetchCourseSections } from '../store/slices/courseSectionSlice';
import { useAuth } from '../hooks/useAuth';
import { useAcademicYear } from '../hooks/useAcademicYear';
import { toast } from 'sonner';
import api from '../lib/api';

/**
 * ScheduleForm component - Form for creating and editing schedules
 * Features: course selection, teacher assignment, time slots, room assignment, validation
 */
const ScheduleForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const { currentAcademicYear, fetchAllAcademicYears } = useAcademicYear();

  const {
    currentSchedule,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.scheduling);
  const { subjects, isLoading: subjectsLoading, error: subjectsError } = useSelector((state: RootState) => state.subjects);
  const { teachers: employeeTeachers, isLoading: teachersLoading, error: teachersError } = useSelector((state: RootState) => state.employee);
  const { courses } = useSelector((state: RootState) => state.course);
  const { courseSections } = useSelector((state: RootState) => state.courseSection);

  // Form state
  const [formData, setFormData] = useState({
    subjectId: '',
    courseSectionId: '',
    teacherId: '',
    dayOfWeek: [] as string[],
    startTime: '',
    endTime: '',
    room: '',
    semester: 'FIRST' as 'FIRST' | 'SECOND',
    year: '',
    startDate: '',
    endDate: '',
    isActive: true,
    gradeLevelId: '',
  });
  
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [bulkCreate, setBulkCreate] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  // Dweezil's Code - State for fetched grade levels
  const [gradeLevels, setGradeLevels] = useState<Array<{ id: string; name: string; levelOrder: number }>>([]);

  // Pre-fill dates from academic year when creating new schedule
  useEffect(() => {
    fetchAllAcademicYears();
  }, [fetchAllAcademicYears]);

  useEffect(() => {
    if (!isEditing && currentAcademicYear) {
      setFormData(prev => ({
        ...prev,
        year: currentAcademicYear.year,
        startDate: currentAcademicYear.startDate ? String(currentAcademicYear.startDate).split('T')[0] : prev.startDate,
        endDate: currentAcademicYear.endDate ? String(currentAcademicYear.endDate).split('T')[0] : prev.endDate,
      }));
    }
  }, [currentAcademicYear, isEditing]);

  // Searchable Subject Dropdown State
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [selectedSubjectDisplay, setSelectedSubjectDisplay] = useState<{ id: string; name: string; code: string } | null>(null);
  const subjectDropdownRef = React.useRef<HTMLDivElement>(null);
  const prevSearchTermRef = React.useRef(subjectSearch);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [isTeacherOpen, setIsTeacherOpen] = useState(false);
  const [selectedTeacherDisplay, setSelectedTeacherDisplay] = useState<{ id: string; name: string; secondary: string } | null>(null);
  const teacherDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
        setIsSubjectOpen(false);
      }

      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(event.target as Node)) {
        setIsTeacherOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update selectedSubjectDisplay when formData.subjectId changes
  useEffect(() => {
    if (formData.subjectId && subjects) {
      const subject = subjects.find(s => s.id === formData.subjectId);
      if (subject) {
        setSelectedSubjectDisplay(subject);
      }
    }
  }, [formData.subjectId, subjects]);

  useEffect(() => {
    if (formData.teacherId && employeeTeachers) {
      const teacher = employeeTeachers.find(t => t.id === formData.teacherId);
      if (teacher) {
        const fullName = `${teacher.user?.firstName || ''} ${teacher.user?.lastName || ''}`.trim();
        const secondary = [teacher.employeeId, teacher.department].filter(Boolean).join(' • ');
        setSelectedTeacherDisplay({
          id: teacher.id,
          name: fullName || 'Unnamed Teacher',
          secondary
        });
        return;
      }
    }

    setSelectedTeacherDisplay(null);
  }, [formData.teacherId, employeeTeachers]);

  // Server-side search for subjects
  useEffect(() => {
    const timer = setTimeout(() => {
      if (subjectSearch) {
        dispatch(fetchSubjects({ 
          search: subjectSearch, 
          page: 1, 
          limit: 100,
          // We intentionally don't filter by courseId here to allow finding any subject
          // This helps if data linking is imperfect
        }));
      } else if (prevSearchTermRef.current !== '') {
        // Search was just cleared. Restore context.
        if (selectedCourseId) {
             let yearLevelParam: number | undefined = undefined;
             if (formData.courseSectionId) {
                const section = courseSections.find(s => s.id === formData.courseSectionId);
                if (section) {
                    const yearLevelNumMap: Record<string, number> = {
                      'First Year': 1, 'Second Year': 2, 'Third Year': 3, 'Fourth Year': 4
                    };
                    yearLevelParam = yearLevelNumMap[section.yearLevel];
                }
             }
             
             dispatch(fetchSubjects({ 
                courseId: selectedCourseId, 
                page: 1, 
                limit: 100,
                yearLevel: yearLevelParam
             }));
        } else {
           dispatch(fetchSubjects({ page: 1, limit: 100 }));
        }
      }
      prevSearchTermRef.current = subjectSearch;
    }, 500);

    return () => clearTimeout(timer);
  }, [subjectSearch, dispatch, selectedCourseId, formData.courseSectionId, courseSections]);

  const filteredSubjects = subjects || [];

  const selectedSubject = selectedSubjectDisplay;

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        await Promise.all([
          dispatch(fetchSubjects({ page: 1, limit: 100 })),
          dispatch(fetchTeachers({ page: 1, limit: 500 })),
          dispatch(fetchCourses({ page: 1, limit: 100 })),
        ]);

        try {
          const response = await api.get('/grade-levels', { params: { isActive: true } });
          const data = response.data?.data;
          if (Array.isArray(data)) setGradeLevels(data);
        } catch (error) {
          console.error('Error fetching grade levels:', error);
        }

        if (isEditing && id) {
          await dispatch(fetchScheduleById(id));
        }
      } catch (_error) {
        console.error('Error loading form data:', _error);
        toast.error('Failed to load form data');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [dispatch, isEditing, id]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && currentSchedule && currentSchedule.id === id) {
      // Dweezil's Code - Map academicYear to year for form compatibility
      const academicYearValue = currentSchedule.academicYear || currentSchedule.year || '';
      
      // Dweezil's Code - Derive gradeLevelId from courseSection.yearLevel
      let derivedGradeLevelId = '';
      if (currentSchedule.courseSection?.yearLevel && gradeLevels.length > 0) {
        const matchingGradeLevel = gradeLevels.find(gl => gl.name === currentSchedule.courseSection?.yearLevel);
        if (matchingGradeLevel) {
          derivedGradeLevelId = matchingGradeLevel.id;
          console.log('🎯 Matched grade level:', currentSchedule.courseSection.yearLevel, '→', matchingGradeLevel.id);
        } else {
          console.warn('⚠️ No matching grade level found for:', currentSchedule.courseSection?.yearLevel);
        }
      }
      
      setFormData({
        subjectId: currentSchedule.subjectId || '',
        courseSectionId: currentSchedule.courseSectionId || '',
        teacherId: currentSchedule.teacherId || '',
        dayOfWeek: currentSchedule.dayOfWeek ? currentSchedule.dayOfWeek.split(',') : [],
        startTime: currentSchedule.startTime || '',
        endTime: currentSchedule.endTime || '',
        room: currentSchedule.room || '',
        semester: currentSchedule.semester || 'FIRST',
        year: academicYearValue,
        startDate: currentSchedule.startDate ? currentSchedule.startDate.split('T')[0] : '',
        endDate: currentSchedule.endDate ? currentSchedule.endDate.split('T')[0] : '',
        isActive: currentSchedule.isActive !== undefined ? currentSchedule.isActive : true,
        gradeLevelId: derivedGradeLevelId,
      });
      
      // Dweezil's Code - If there is a course section, populate the course dropdown
      if (currentSchedule.courseSection?.course?.id) {
        setSelectedCourseId(currentSchedule.courseSection.course.id);
      }
    }
  }, [isEditing, currentSchedule, id, gradeLevels]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Fetch sections when course changes
  useEffect(() => {
    if (selectedCourseId) {
      dispatch(fetchCourseSections({ courseId: selectedCourseId, isActive: true, limit: 100 }));
    }
  }, [selectedCourseId, dispatch]);

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    setFormData(prev => ({ ...prev, courseSectionId: '' })); // Reset section when course changes

    if (courseId) {
      dispatch(fetchSubjects({ 
        page: 1, 
        limit: 100, 
        courseId: courseId 
      }));
    } else {
      dispatch(fetchSubjects({ page: 1, limit: 100 }));
    }
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sectionId = e.target.value;
    const section = courseSections.find(s => s.id === sectionId);
    
    // Dweezil's Code - Map CourseSection yearLevel to actual gradeLevels from database
    const yearLevelNumMap: Record<string, number> = {
      'First Year': 1,
      'Second Year': 2,
      'Third Year': 3,
      'Fourth Year': 4
    };

    setFormData(prev => ({
      ...prev,
      courseSectionId: sectionId,
      // Auto-populate fields if section is selected
      ...(section ? {
        // Dweezil's Code - Find matching grade level by name instead of using hardcoded IDs
        gradeLevelId: gradeLevels.find(gl => gl.name === section.yearLevel)?.id || prev.gradeLevelId,
        semester: section.semester === 'First Semester' ? 'FIRST' : section.semester === 'Second Semester' ? 'SECOND' : 'FIRST',
        year: section.academicYear || prev.year,
      } : {})
    }));

    // Fetch subjects filtered by course and year level
    if (section && selectedCourseId) {
      dispatch(fetchSubjects({ 
        page: 1, 
        limit: 100, 
        courseId: selectedCourseId,
        yearLevel: yearLevelNumMap[section.yearLevel]
      }));
    }
  };

  const teachers = employeeTeachers || [];
  const filteredTeachers = teachers.filter((teacher) => {
    if (!teacherSearch.trim()) return true;

    const search = teacherSearch.trim().toLowerCase();
    const fullName = `${teacher.user?.firstName || ''} ${teacher.user?.lastName || ''}`.trim().toLowerCase();
    const email = (teacher.user?.email || '').toLowerCase();
    const employeeId = (teacher.employeeId || '').toLowerCase();
    const department = (teacher.department || '').toLowerCase();

    return (
      fullName.includes(search) ||
      email.includes(search) ||
      employeeId.includes(search) ||
      department.includes(search)
    );
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDayChange = (day: string) => {
    setFormData(prev => {
      const days = prev.dayOfWeek.includes(day)
        ? prev.dayOfWeek.filter(d => d !== day)
        : [...prev.dayOfWeek, day];
      return { ...prev, dayOfWeek: days };
    });

    if (errors.dayOfWeek) {
      setErrors(prev => ({ ...prev, dayOfWeek: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.subjectId) {
      newErrors.subjectId = 'Subject is required';
    }

    if (!formData.teacherId) {
      newErrors.teacherId = 'Teacher is required';
    }

    if (!formData.dayOfWeek || formData.dayOfWeek.length === 0) {
      newErrors.dayOfWeek = 'At least one day is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const startTime = new Date(`2000-01-01T${formData.startTime}`);
      const endTime = new Date(`2000-01-01T${formData.endTime}`);
      if (startTime >= endTime) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate > endDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    if (!formData.room.trim()) {
      newErrors.room = 'Room is required';
    }

    if (!formData.year) {
      newErrors.year = 'Academic Year is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (bulkCreate && (!selectedCourseId || courseSections.length === 0)) {
      toast.error('Please select a course with sections to use bulk create');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        const updateData: UpdateScheduleData = {
          ...formData,
          dayOfWeek: formData.dayOfWeek.join(','),
          subjectId: formData.subjectId.trim() || undefined,
          teacherId: formData.teacherId.trim() || undefined,
          gradeLevelId: formData.gradeLevelId.trim() || undefined,
          startTime: formatTimeForBackend(formData.startTime),
          endTime: formatTimeForBackend(formData.endTime),
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        };
        await dispatch(updateSchedule({ id, data: updateData })).unwrap();
        toast.success('Schedule updated successfully');
      } else if (bulkCreate) {
        const createData: CreateBulkSchedulesData = {
          ...formData,
          courseSectionIds: courseSections.map(section => section.id),
          dayOfWeek: formData.dayOfWeek.join(','),
          subjectId: formData.subjectId.trim() || undefined,
          teacherId: formData.teacherId.trim() || undefined,
          gradeLevelId: formData.gradeLevelId.trim() || undefined,
          startTime: formatTimeForBackend(formData.startTime),
          endTime: formatTimeForBackend(formData.endTime),
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        };
        const result = await dispatch(createBulkSchedules(createData)).unwrap();
        const createdCount = Array.isArray(result) ? result.length : 1;
        toast.success(`${createdCount} schedules created successfully`);
      } else {
        const createData: CreateScheduleData = {
          ...formData,
          dayOfWeek: formData.dayOfWeek.join(','),
          subjectId: formData.subjectId.trim() || undefined,
          teacherId: formData.teacherId.trim() || undefined,
          gradeLevelId: formData.gradeLevelId.trim() || undefined,
          startTime: formatTimeForBackend(formData.startTime),
          endTime: formatTimeForBackend(formData.endTime),
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        };
        await dispatch(createSchedule(createData)).unwrap();
        toast.success('Schedule created successfully');
      }
      
      // Refresh schedules list before navigation
      await dispatch(fetchSchedules({ page: 1, limit: 10, sortBy: 'dayOfWeek', sortOrder: 'ASC' }));
      navigate('/schedules');
    } catch (error: any) {
      console.error('Submit error:', error);
      // Handle conflict error specifically
      if (typeof error === 'string' && error.includes('409')) {
         toast.error(error); // The thunk likely returns the error message directly if rejected with value
      } else if (error?.message && error.message.includes('409')) {
         toast.error(error.message);
      } else {
         toast.error(isEditing ? 'Failed to update schedule' : 'Failed to create schedule');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Ensure time is in HH:MM format for backend
  const formatTimeForBackend = (time: string) => {
    if (!time) return time;
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  // Check if user can access this form
  const canAccess =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPERADMIN' ||
    user?.role === 'REGISTRAR' ||
    user?.role === 'TEACHER';

  if (!canAccess) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">You don't have permission to access this page.</span>
          </div>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/schedules')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            {isEditing ? 'Edit Schedule' : 'Create New Schedule'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isEditing ? 'Update schedule information' : 'Add a new schedule to the system'}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <BookOpen className="w-5 h-5 mr-2" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Course Selection */}
            <div>
              <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course
              </label>
              <select
                id="courseId"
                name="courseId"
                value={selectedCourseId}
                onChange={handleCourseChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a course (optional)</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.courseCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Course Section Selection */}
            <div>
              <label htmlFor="courseSectionId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section
              </label>
              <select
                id="courseSectionId"
                name="courseSectionId"
                value={formData.courseSectionId}
                onChange={handleSectionChange}
                disabled={!selectedCourseId || bulkCreate}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a section (optional)</option>
                {courseSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.sectionName} ({section.yearLevel})
                  </option>
                ))}
              </select>

              {/* Bulk Create Option */}
              {!isEditing && selectedCourseId && courseSections.length > 0 && (
                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id="bulkCreate"
                    checked={bulkCreate}
                    onChange={(e) => setBulkCreate(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="bulkCreate" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Create for all sections in this course
                  </label>
                </div>
              )}
            </div>

            {/* Subject Selection */}
            <div className="relative" ref={subjectDropdownRef}>
              <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject *
              </label>
              
              <div 
                className={`w-full px-3 py-2 border rounded-lg flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 ${
                  errors.subjectId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                }`}
                onClick={() => setIsSubjectOpen(!isSubjectOpen)}
              >
                <span className={`block truncate ${!selectedSubject ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                  {selectedSubject ? `${selectedSubject.name} (${selectedSubject.code})` : 'Select a subject'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>

              {isSubjectOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Search by name or code..."
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto flex-1">
                    {filteredSubjects.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        No subjects found
                      </div>
                    ) : (
                      filteredSubjects.map((subject) => (
                        <div
                          key={subject.id}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                            formData.subjectId === subject.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                          }`}
                          onClick={() => {
                          handleInputChange({ target: { name: 'subjectId', value: subject.id } } as React.ChangeEvent<HTMLInputElement>);
                          setIsSubjectOpen(false);
                          setSubjectSearch('');
                          }}
                        >
                          <span className="truncate mr-2">
                            {subject.name} <span className="text-gray-500 dark:text-gray-400">({subject.code})</span>
                          </span>
                          {formData.subjectId === subject.id && (
                            <Check className="w-4 h-4 flex-shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {errors.subjectId && (
                <p className="mt-1 text-sm text-red-600">{errors.subjectId}</p>
              )}
            </div>

            {/* Teacher Selection */}
            <div className="relative" ref={teacherDropdownRef}>
              <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Teacher *
              </label>

              <div
                className={`w-full px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${
                  errors.teacherId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700`}
              >
                <div className="flex items-center">
                  <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <input
                    id="teacherId"
                    value={isTeacherOpen ? teacherSearch : (selectedTeacherDisplay?.name || '')}
                    onChange={(e) => {
                      setTeacherSearch(e.target.value);
                      setIsTeacherOpen(true);
                      if (formData.teacherId) {
                        setFormData(prev => ({ ...prev, teacherId: '' }));
                      }
                      if (errors.teacherId) {
                        setErrors(prev => ({ ...prev, teacherId: '' }));
                      }
                    }}
                    onFocus={() => {
                      setIsTeacherOpen(true);
                      setTeacherSearch('');
                    }}
                    placeholder="Search teachers by name, ID, email, or department..."
                    className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${isTeacherOpen ? 'rotate-180' : ''}`}
                  />
                </div>

                {!isTeacherOpen && selectedTeacherDisplay?.secondary && (
                  <p className="mt-1 ml-6 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedTeacherDisplay.secondary}
                  </p>
                )}
              </div>

              {isTeacherOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                      !formData.teacherId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                    }`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, teacherId: '' }));
                      setSelectedTeacherDisplay(null);
                      setTeacherSearch('');
                      setIsTeacherOpen(false);
                    }}
                  >
                    <span>Select a teacher</span>
                    {!formData.teacherId && <Check className="w-4 h-4 flex-shrink-0" />}
                  </div>

                  {teachersLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Loading teachers...</div>
                  ) : filteredTeachers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No teachers found.</div>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      const teacherName = `${teacher.user?.firstName || ''} ${teacher.user?.lastName || ''}`.trim() || 'Unnamed Teacher';
                      const teacherMeta = [teacher.employeeId, teacher.department].filter(Boolean).join(' • ');

                      return (
                        <div
                          key={teacher.id}
                          className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 flex items-start justify-between gap-3 ${
                            formData.teacherId === teacher.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, teacherId: teacher.id }));
                            setSelectedTeacherDisplay({
                              id: teacher.id,
                              name: teacherName,
                              secondary: teacherMeta
                            });
                            setTeacherSearch('');
                            setIsTeacherOpen(false);
                            if (errors.teacherId) {
                              setErrors(prev => ({ ...prev, teacherId: '' }));
                            }
                          }}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{teacherName}</div>
                            {teacherMeta && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {teacherMeta}
                              </div>
                            )}
                          </div>
                          {formData.teacherId === teacher.id && (
                            <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {teachersError && (
                <p className="mt-1 text-sm text-red-600">
                  {teachersError}
                </p>
              )}
              {errors.teacherId && (
                <p className="mt-1 text-sm text-red-600">{errors.teacherId}</p>
              )}
            </div>

            {/* Grade Level */}
            <div>
              <label htmlFor="gradeLevelId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grade Level
              </label>
              <select
                id="gradeLevelId"
                name="gradeLevelId"
                value={formData.gradeLevelId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select grade level (optional)</option>
                {gradeLevels.map((gradeLevel) => (
                  <option key={gradeLevel.id} value={gradeLevel.id}>
                    {gradeLevel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Room */}
            <div>
              <label htmlFor="room" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room *
              </label>
              <input
                type="text"
                id="room"
                name="room"
                value={formData.room}
                onChange={handleInputChange}
                placeholder="e.g., Room 101, Lab A, Auditorium"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.room ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.room && (
                <p className="mt-1 text-sm text-red-600">{errors.room}</p>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Schedule Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Day of Week */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day of Week *
              </label>
              <div className={`grid grid-cols-2 gap-2 p-3 border rounded-lg ${
                  errors.dayOfWeek ? 'border-red-300' : 'border-gray-300'
                }`}>
                {[
                  { value: 'MONDAY', label: 'Monday' },
                  { value: 'TUESDAY', label: 'Tuesday' },
                  { value: 'WEDNESDAY', label: 'Wednesday' },
                  { value: 'THURSDAY', label: 'Thursday' },
                  { value: 'FRIDAY', label: 'Friday' },
                  { value: 'SATURDAY', label: 'Saturday' },
                  { value: 'SUNDAY', label: 'Sunday' },
                ].map((day) => (
                  <div key={day.value} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`day-${day.value}`}
                      checked={formData.dayOfWeek.includes(day.value)}
                      onChange={() => handleDayChange(day.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`day-${day.value}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
              {errors.dayOfWeek && (
                <p className="mt-1 text-sm text-red-600">{errors.dayOfWeek}</p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.startTime ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.startTime && (
                <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
              )}
              {formData.startTime && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(formData.startTime)}
                </p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time *
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.endTime ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.endTime && (
                <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
              )}
              {formData.endTime && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(formData.endTime)}
                </p>
              )}
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date (Optional)
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Specific start date for this schedule
              </p>
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Specific end date for this schedule
              </p>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <GraduationCap className="w-5 h-5 mr-2" />
            Academic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Semester */}
            <div>
              <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Semester *
              </label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="FIRST">First Semester</option>
                <option value="SECOND">Second Semester</option>
              </select>
            </div>

            {/* Year */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Academic Year *
              </label>
              <input
                type="text"
                id="year"
                name="year"
                value={formData.year}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Academic Year is automatically set to current active year
              </p>
              {errors.year && (
                <p className="mt-1 text-sm text-red-600">{errors.year}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    value="true"
                    checked={formData.isActive === true}
                    onChange={() => setFormData(prev => ({ ...prev, isActive: true }))}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    value="false"
                    checked={formData.isActive === false}
                    onChange={() => setFormData(prev => ({ ...prev, isActive: false }))}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Inactive</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Preview */}
        {formData.subjectId && formData.teacherId && formData.startTime && formData.endTime && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Schedule Preview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-blue-800">
                <GraduationCap className="w-4 h-4 mr-2" />
                <span className="font-medium">
                  {(() => {
                    const course = courses.find(c => c.id === selectedCourseId);
                    const section = courseSections.find(s => s.id === formData.courseSectionId);
                    return course ? `${course.courseCode} ${section ? `- ${section.sectionName}` : ''}` : 'Selected Course';
                  })()}
                </span>
              </div>
              <div className="flex items-center text-blue-800">
                <BookOpen className="w-4 h-4 mr-2" />
                <span className="font-medium">
                  {subjects.find(s => s.id === formData.subjectId)?.name || 'Selected Subject'}
                </span>
              </div>
              <div className="flex items-center text-blue-800">
                <User className="w-4 h-4 mr-2" />
                <span>
                  {(() => {
                    const teacher = teachers.find(t => t.id === formData.teacherId);
                    return teacher ? `${teacher.user?.firstName} ${teacher.user?.lastName}` : 'Selected Teacher';
                  })()} 
                </span>
              </div>
              <div className="flex items-center text-blue-800">
                <Calendar className="w-4 h-4 mr-2" />
                <span>
                  {formData.dayOfWeek.length > 0 
                    ? formData.dayOfWeek.map(d => d.charAt(0) + d.slice(1).toLowerCase()).join(', ') 
                    : 'Select Days'}
                </span>
              </div>
              <div className="flex items-center text-blue-800">
                <Clock className="w-4 h-4 mr-2" />
                <span>
                  {formatTime(formData.startTime)} - {formatTime(formData.endTime)}
                </span>
              </div>
              <div className="flex items-center text-blue-800">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{formData.room}</span>
              </div>
              <div className="flex items-center text-blue-800">
                <Building className="w-4 h-4 mr-2" />
                <span>
                  {formData.semester === 'FIRST' ? 'First' : 'Second'} Semester {formData.year}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/schedules')}
            disabled={isSubmitting}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleForm;
