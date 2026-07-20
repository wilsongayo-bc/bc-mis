import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Save,
  X,
  Search,
  User,
  BookOpen,
  Calendar as _Calendar,
  AlertCircle,
  CheckCircle,
  CheckSquare,
  Square,
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useAcademicYear } from '../hooks/useAcademicYear';
import {
  createEnrollment,
  fetchEnrollmentById,
  selectEnrollmentLoading,
  selectEnrollmentError,
  selectCurrentEnrollment
} from '../store/slices/enrollmentSlice';
import {
  fetchDepartments,
  selectDepartments
} from '../store/slices/departmentSlice';
import {
  fetchStudents,
  selectStudents,
  selectStudentLoading
} from '../store/slices/studentSlice';
import {
  fetchCourses,
  selectCourses,
  selectCourseLoading
} from '../store/slices/courseSlice';

import type { Course } from '../types/course.types';
import type { CourseSection } from '../types/courseSection.types';
import type { Student } from '../store/slices/studentSlice';

const formatDateForInput = (value?: string | Date | null): string => {
  if (!value) return new Date().toISOString().split('T')[0];

  if (typeof value === 'string') {
    const datePart = value.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return parsedDate.toISOString().split('T')[0];
};

const EnrollmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectEnrollmentLoading);
  const error = useAppSelector(selectEnrollmentError);
  const currentEnrollment = useAppSelector(selectCurrentEnrollment);
  const departments = useAppSelector(selectDepartments);
  
  // Redux selectors for students and courses
  const students = useAppSelector(selectStudents);
  const _studentLoading = useAppSelector(selectStudentLoading);
  const courses = useAppSelector(selectCourses);
  const _courseLoading = useAppSelector(selectCourseLoading);

  const isEditing = Boolean(id);
  const { academicYear } = useAcademicYear();

  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    courseId: '',
    courseSectionId: '',
    enrollmentDate: new Date().toISOString().split('T')[0], // Default to today's date
    status: '',
    registrarRemarks: ''
  });

  // Search states
  const [studentSearch, setStudentSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Course section states
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [_selectedCourseSection, setSelectedCourseSection] = useState<CourseSection | null>(null);
  const [loadingCourseSections, setLoadingCourseSections] = useState(false);

  // Subject selection states
  const [availableSubjects, setAvailableSubjects] = useState<Array<{
    id: string;
    name: string;
    code: string;
    department?: { name: string };
    description?: string;
    units?: number;
    lectureHours?: number;
    labHours?: number;
  }>>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectSelectionInitKey, setSubjectSelectionInitKey] = useState<string | null>(null);

  const [registrarAction, setRegistrarAction] = useState<'FOR_SCHEDULING' | 'RE_SUBMIT' | ''>('');

  const activeStudent = selectedStudent || currentEnrollment?.student || null;

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState({
    studentId: false,
    courseId: false,
    courseSectionId: false,
    enrollmentDate: false
  });



  useEffect(() => {
    dispatch(fetchDepartments({}));
    // Fetch all registered students for enrollment form (no pagination)
    dispatch(fetchStudents({
      registrationStatus: 'REGISTERED',
      checkEnrollmentStatus: isEditing ? undefined : 'not-enrolled',
      enrollmentAcademicYear: academicYear,
      limit: 1000
    }));
    dispatch(fetchCourses({}));
    if (isEditing && id) {
      dispatch(fetchEnrollmentById(id));
    }
  }, [dispatch, id, isEditing]);



  // Fetch course sections when a course is selected
  useEffect(() => {
    const fetchCourseSections = async () => {
      if (selectedCourse) {
        console.log('🔍 Fetching course sections for course ID:', selectedCourse.id);
        setLoadingCourseSections(true);
        try {
          const response = await api.get('/course-sections', {
            params: {
              page: 1,
              limit: 500,
              courseId: selectedCourse.id,
              ...(isEditing ? {} : { isActive: 'true' })
            }
          });
          console.log('✅ Course sections fetched successfully:', response.data);
          const sections = response.data.data || response.data || [];
          let nextSections = sections;

          const effectiveCourseSectionId =
            formData.courseSectionId || currentEnrollment?.courseSection?.id || '';

          if (isEditing && effectiveCourseSectionId && !sections.some((s: CourseSection) => s.id === effectiveCourseSectionId)) {
            try {
              const sectionRes = await api.get(`/course-sections/${effectiveCourseSectionId}`);
              const loadedSection = sectionRes.data?.data || null;
              if (loadedSection && loadedSection.id) {
                nextSections = [loadedSection, ...sections];
              }
            } catch (_e) {
              void _e;
            }
          }

          setCourseSections(nextSections);
          
          // Dweezil's Code - Auto-select course section based on student's year level
          if (!isEditing && !formData.courseSectionId && selectedStudent && selectedStudent.gradeLevel && nextSections.length > 0) {
            const studentYearLevel = selectedStudent.gradeLevel.name; // e.g., "First Year", "Second Year"
            
            // Find matching section by year level
            const matchingSection = nextSections.find((section: CourseSection) => 
              section.yearLevel === studentYearLevel
            );
            
            if (matchingSection) {
              console.log(`✅ Auto-selected course section for ${studentYearLevel}:`, matchingSection.sectionName);
              setSelectedCourseSection(matchingSection);
              setFormData(prev => ({ ...prev, courseSectionId: matchingSection.id }));
            } else {
              console.log(`⚠️ No matching course section found for ${studentYearLevel}`);
            }
          }

          if (isEditing && formData.courseSectionId) {
            const selected = nextSections.find((section: CourseSection) => section.id === formData.courseSectionId) || null;
            if (selected) {
              setSelectedCourseSection(selected);
            }
          }
        } catch (error) {
          console.error('💥 Error fetching course sections - Details:', error);
          if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          setCourseSections([]);
        } finally {
          setLoadingCourseSections(false);
        }
      } else {
        setCourseSections([]);
        setSelectedCourseSection(null);
        setFormData(prev => ({ ...prev, courseSectionId: '' }));
      }
    };

    fetchCourseSections();
  }, [selectedCourse, selectedStudent, isEditing, formData.courseSectionId, currentEnrollment?.courseSection?.id]);

  useEffect(() => {
    if (isEditing && currentEnrollment) {
      setFormData({
        studentId: currentEnrollment.student?.id || '',
        courseId: currentEnrollment.course?.id || '',
        courseSectionId: currentEnrollment.courseSection?.id || '', // Dweezil's Code - Auto-populate course section
        enrollmentDate: currentEnrollment.enrollmentDate || new Date().toISOString().split('T')[0],
        status: currentEnrollment.status || '',
        registrarRemarks: currentEnrollment.registrarRemarks || ''
      });

      if (currentEnrollment.status === 'ENROLLED') {
        setRegistrarAction('FOR_SCHEDULING');
      } else if (currentEnrollment.status === 'PENDING') {
        setRegistrarAction('RE_SUBMIT');
      } else {
        setRegistrarAction('');
      }
      // Find the full student data from the Redux store
      if (currentEnrollment.student?.id) {
        const fullStudent = students.find(s => s.id === currentEnrollment.student?.id);
        setSelectedStudent(fullStudent || null);
        
        // Set the search text for display
        if (currentEnrollment.student) {
          const firstName = currentEnrollment.student.user?.firstName || '';
          const lastName = currentEnrollment.student.user?.lastName || '';
          setStudentSearch(`${firstName} ${lastName} (${currentEnrollment.student.studentId})`);
        }
      } else {
        setSelectedStudent(null);
      }
      // Convert enrollment course to Course type
      if (currentEnrollment.course) {
        const enrollmentCourse = currentEnrollment.course;
        const course: Course = {
          id: enrollmentCourse.id,
          courseCode: enrollmentCourse.courseCode,
          name: enrollmentCourse.name,
          description: '',
          credits: enrollmentCourse.credits,
          yearLevel: enrollmentCourse.yearLevel,
          departmentId: enrollmentCourse.departmentId,
          maxStudents: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          gradeLevel: { id: '', name: '', level: 0 },
          prerequisites: []
        };
        setSelectedCourse(course);
        setCourseSearch(`${enrollmentCourse.courseCode} - ${enrollmentCourse.name}`); // Dweezil's Code - Set course search text
      } else {
        setSelectedCourse(null);
      }
      
      // Dweezil's Code - Set the selected course section if available
      if (currentEnrollment.courseSection) {
        // Cast to CourseSection type since it comes from the API with all required fields
        setSelectedCourseSection(currentEnrollment.courseSection as CourseSection);
      }
    }
  }, [isEditing, currentEnrollment, students]);

  useEffect(() => {
    if (isEditing || !selectedStudent || formData.courseId || !selectedStudent.courseId) {
      return;
    }

    const studentCourse = resolveStudentCourse(selectedStudent);
    if (!studentCourse) {
      return;
    }

    setSelectedCourse(studentCourse);
    setCourseSearch(`${studentCourse.courseCode} - ${studentCourse.name}`);
    setFormData(prev => ({
      ...prev,
      courseId: studentCourse.id
    }));
  }, [isEditing, selectedStudent, courses, formData.courseId]);

  // Dweezil's Code - Load available subjects when student and course section are selected
  useEffect(() => {
    const loadAvailableSubjects = async () => {
      const activeStudentId = selectedStudent?.id || formData.studentId || currentEnrollment?.student?.id;

      // Changed: Allow subject loading for both new and edit modes, even when the student
      // is not present in the first paginated students list on live environments.
      if (activeStudentId && formData.courseSectionId) {
        // Prefer the fetched section list, but fall back to the enrollment's current section
        // so edit mode still works with older/live records.
        const selectedSection =
          courseSections.find(s => s.id === formData.courseSectionId) ||
          (_selectedCourseSection?.id === formData.courseSectionId ? _selectedCourseSection : null) ||
          (currentEnrollment?.courseSection?.id === formData.courseSectionId
            ? (currentEnrollment.courseSection as CourseSection)
            : null);

        if (!selectedSection) {
          return;
        }

        setLoadingSubjects(true);
        try {
          // Dweezil's Code - Pass year level and semester as query parameters
          const params = new URLSearchParams({
            yearLevel: selectedSection.yearLevel,
            semester: selectedSection.semester
          });

          if (formData.courseId) {
            params.set('courseId', formData.courseId);
          }
          const response = await api.get(`/subjects/student/${activeStudentId}/available?${params.toString()}`);
          const subjects = response.data.data || [];
          setAvailableSubjects(subjects);

          const initKey = `${isEditing ? 'edit' : 'new'}:${currentEnrollment?.id ?? 'new'}:${formData.courseSectionId}:${formData.courseId ?? ''}`;
          const shouldInitializeSelection = subjectSelectionInitKey !== initKey;

          if (shouldInitializeSelection) {
            const allSubjectIds = new Set<string>(subjects.map((subject: { id: string }) => subject.id));
            const enrollmentSelectedSubjects = Array.isArray(currentEnrollment?.selectedSubjects)
              ? currentEnrollment.selectedSubjects
              : [];

            const isEditSameSection = Boolean(
              isEditing && currentEnrollment?.courseSection?.id && currentEnrollment.courseSection.id === formData.courseSectionId
            );

            if (isEditSameSection && enrollmentSelectedSubjects.length > 0) {
              const existingSelectedSubjectIds = new Set<string>(
                subjects
                  .filter((subject: { id: string }) => enrollmentSelectedSubjects.includes(subject.id))
                  .map((subject: { id: string }) => subject.id)
              );

              setSelectedSubjects(existingSelectedSubjectIds.size > 0 ? existingSelectedSubjectIds : allSubjectIds);
            } else {
              setSelectedSubjects(allSubjectIds);
            }

            setSubjectSelectionInitKey(initKey);
          }
        } catch (error) {
          setAvailableSubjects([]);
          setSelectedSubjects(new Set());
          setSubjectSelectionInitKey(null);
        } finally {
          setLoadingSubjects(false);
        }
      } else if (activeStudentId && !formData.courseSectionId) {
        // Clear subjects if no course section is selected
        setAvailableSubjects([]);
        setSelectedSubjects(new Set());
        setSubjectSelectionInitKey(null);
      }
    };

    loadAvailableSubjects();
  }, [selectedStudent, formData.studentId, formData.courseSectionId, formData.courseId, courseSections, _selectedCourseSection, currentEnrollment, isEditing, subjectSelectionInitKey]);

  const toggleSubject = (subjectId: string) => {
    const newSelected = new Set(selectedSubjects);
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      newSelected.add(subjectId);
    }
    setSelectedSubjects(newSelected);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.studentId) {
      newErrors.studentId = 'Student is required';
    }

    if (!formData.courseId) {
      newErrors.courseId = 'Course is required';
    }

    if (!formData.courseSectionId) {
      newErrors.courseSectionId = 'Course Section is required';
    }

    if (!formData.enrollmentDate) {
      newErrors.enrollmentDate = 'Enrollment Date is required';
    }

    if (isEditing && registrarAction === 'RE_SUBMIT') {
      if (!formData.registrarRemarks || formData.registrarRemarks.trim().length === 0) {
        newErrors.registrarRemarks = 'Remarks are required when setting to RE SUBMIT';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Dweezil's Code - Handle form submission with proper student status workflow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const newTouched = {
      studentId: true,
      courseId: true,
      courseSectionId: true,
      enrollmentDate: true
    };
    setTouched(newTouched);

    if (!validateForm()) {
      return;
    }

    try {
      if (isEditing) {
        const enrollmentUpdateData: any = {
          ...formData,
          selectedSubjects: Array.from(selectedSubjects),
          status: formData.status ? formData.status : undefined,
          registrarRemarks: formData.registrarRemarks && formData.registrarRemarks.trim().length > 0 ? formData.registrarRemarks.trim() : undefined
        };

        if (!enrollmentUpdateData.status) delete enrollmentUpdateData.status;
        if (!enrollmentUpdateData.registrarRemarks) delete enrollmentUpdateData.registrarRemarks;

        await api.patch(`/enrollments/${id}`, enrollmentUpdateData);

        console.log('Enrollment updated successfully');
      } else {
        const enrollmentData: any = {
          ...formData,
          selectedSubjects: Array.from(selectedSubjects)
        };

        if (!enrollmentData.status) delete enrollmentData.status;
        if (!enrollmentData.registrarRemarks) delete enrollmentData.registrarRemarks;

        await dispatch(createEnrollment(enrollmentData)).unwrap();
      }
      navigate('/enrollments');
    } catch (_error: any) {
      console.error('Failed to save enrollment:', _error);

      if (typeof _error === 'string') {
        toast.error(_error);
        return;
      }

      const apiMessage = _error?.response?.data?.message;
      if (apiMessage) {
        toast.error(apiMessage);
        return;
      }

      toast.error('An unexpected error occurred while saving the enrollment. Please try again.');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      // Clear error when user starts typing
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRegistrarActionChange = (value: 'FOR_SCHEDULING' | 'RE_SUBMIT' | '') => {
    setRegistrarAction(value);

    const nextStatus = value === 'FOR_SCHEDULING' ? 'ENROLLED' : value === 'RE_SUBMIT' ? 'PENDING' : '';
    setFormData(prev => ({
      ...prev,
      status: nextStatus
    }));

    if (errors.registrarRemarks) {
      setErrors(prev => ({ ...prev, registrarRemarks: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateForm();
  };

  // Only students with completed registration can be enrolled.
  const filteredStudents = students.filter(student => {
    if (student.registrationStatus !== 'REGISTERED') return false;

    if (!isEditing) {
      const hasActiveEnrollment = (student.enrollments || []).some(enrollment => {
        const isActiveStatus = ['PENDING', 'VERIFIED', 'ENROLLED'].includes(String(enrollment.status));
        if (!isActiveStatus) return false;

        if (!academicYear) return true;

        const enrollmentAcademicYearValue = (enrollment as { academicYear?: string | null }).academicYear;
        return enrollmentAcademicYearValue === academicYear;
      });
      if (hasActiveEnrollment) return false;
    }
    
    // Filter by search term
    if (!studentSearch) return true;
    
    const searchLower = (studentSearch || '').toLowerCase().trim();
    const firstName = student.user?.firstName?.toLowerCase() || '';
    const lastName = student.user?.lastName?.toLowerCase() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const studentId = student.studentId?.toLowerCase() || '';
    
    // Dweezil's Code - Support full name search with spaces
    return firstName.includes(searchLower) || 
           lastName.includes(searchLower) || 
           fullName.includes(searchLower) ||
           studentId.includes(searchLower);
  });

  // Filter courses to show only active ones
  const filteredCourses = courses.filter(course => {
    // Only show active courses
    if (course.isActive === false) return false;
    
    // Filter by search term
    if (!courseSearch) return true;
    
    const searchLower = (courseSearch || '').toLowerCase();
    return (course.name?.toLowerCase() || '').includes(searchLower) ||
           (course.courseCode?.toLowerCase() || '').includes(searchLower);
  });

  const resolveStudentCourse = (student: Student): Course | null => {
    const matchedCourse = courses.find(course => course.id === student.courseId);
    if (matchedCourse) return matchedCourse;

    if (!student.course) return null;

    return {
      id: student.course.id,
      courseCode: student.course.courseCode,
      name: student.course.name,
      description: '',
      credits: 0,
      yearLevel: student.gradeLevel?.name || '',
      departmentId: '',
      maxStudents: 0,
      isActive: true,
      createdAt: '',
      updatedAt: '',
      prerequisites: []
    };
  };

  const applyStudentEnrollmentDefaults = (student: Student) => {
    const studentCourse = resolveStudentCourse(student);
    const normalizedEnrollmentDate = formatDateForInput(student.enrollmentDate);

    setFormData(prev => ({
      ...prev,
      studentId: student.id,
      courseId: studentCourse?.id || '',
      courseSectionId: '',
      enrollmentDate: normalizedEnrollmentDate
    }));

    setSelectedCourse(studentCourse);
    setCourseSearch(studentCourse ? `${studentCourse.courseCode} - ${studentCourse.name}` : '');
    setCourseSections([]);
    setSelectedCourseSection(null);
    setAvailableSubjects([]);
    setSelectedSubjects(new Set());
  };

  const selectStudent = (student: Student) => {
    setSelectedStudent(student);
    const firstName = student.user?.firstName || '';
    const lastName = student.user?.lastName || '';
    setStudentSearch(`${firstName} ${lastName} (${student.studentId})`);
    setShowStudentDropdown(false);
    applyStudentEnrollmentDefaults(student);
    if (touched.studentId) {
      setErrors(prev => ({ ...prev, studentId: '' }));
    }
    if (touched.courseId) {
      setErrors(prev => ({ ...prev, courseId: '' }));
    }
    if (touched.enrollmentDate) {
      setErrors(prev => ({ ...prev, enrollmentDate: '' }));
    }
  };

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormData(prev => ({ ...prev, courseId: course.id, courseSectionId: '' }));
    setCourseSearch(`${course.courseCode} - ${course.name}`);
    setShowCourseDropdown(false);
    if (touched.courseId) {
      setErrors(prev => ({ ...prev, courseId: '' }));
    }
    // Dweezil's Code - Clear course section and subjects when course changes
    setSelectedCourseSection(null);
    setAvailableSubjects([]);
    setSelectedSubjects(new Set());
  };

  const selectCourseSection = (sectionId: string) => {
    const section = courseSections.find(s => s.id === sectionId);
    setSelectedCourseSection(section || null);
    setFormData(prev => ({ ...prev, courseSectionId: sectionId }));
    if (touched.courseSectionId) {
      setErrors(prev => ({ ...prev, courseSectionId: '' }));
    }
  };

  const studentRegisteredCourse = !isEditing && selectedStudent ? resolveStudentCourse(selectedStudent) : null;
  const isCourseLockedFromStudent = Boolean(studentRegisteredCourse);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/enrollments')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Enrollment' : 'New Enrollment'}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Enrollment Information (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enrollment Information</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student *
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search for a student..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => !isEditing && setShowStudentDropdown(true)}
                      onBlur={(_e) => {
                        handleBlur('studentId');
                        setTimeout(() => setShowStudentDropdown(false), 200);
                      }}
                      disabled={isEditing}
                      className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                        isEditing ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed text-gray-500' : 'bg-white dark:bg-gray-900'
                      } ${
                        errors.studentId && touched.studentId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {selectedStudent && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(null);
                          setFormData(prev => ({
                            ...prev,
                            studentId: '',
                            courseId: '',
                            courseSectionId: '',
                            enrollmentDate: new Date().toISOString().split('T')[0]
                          }));
                          setStudentSearch('');
                          setShowStudentDropdown(false);
                          setAvailableSubjects([]);
                          setSelectedSubjects(new Set());
                          setCourseSections([]);
                          setSelectedCourse(null);
                          setCourseSearch('');
                          setSelectedCourseSection(null);
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {!isEditing && showStudentDropdown && filteredStudents.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-xl max-h-60 rounded-lg py-1 text-base ring-1 ring-black/5 overflow-auto focus:outline-none border border-gray-200 dark:border-gray-700">
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          onClick={() => selectStudent(student)}
                          className="cursor-pointer select-none relative py-2.5 pl-3 pr-9 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {student.user.firstName} {student.user.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {student.studentId} • {student.gradeLevel?.name || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.studentId && touched.studentId && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.studentId}</p>
                )}
                {activeStudent && (
                  <div className="mt-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                          {activeStudent.user.firstName} {activeStudent.user.lastName}
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                          {activeStudent.studentId} • {activeStudent.user.email}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course *
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder={isCourseLockedFromStudent ? 'Course is populated from student registration' : 'Search for a course...'}
                      value={courseSearch}
                      onChange={(e) => {
                        if (isCourseLockedFromStudent) return;
                        setCourseSearch(e.target.value);
                        setShowCourseDropdown(true);
                      }}
                      onFocus={() => !isCourseLockedFromStudent && setShowCourseDropdown(true)}
                      onBlur={(_e) => {
                        handleBlur('courseId');
                        setTimeout(() => setShowCourseDropdown(false), 200);
                      }}
                      readOnly={isCourseLockedFromStudent}
                      className={`block w-full pl-10 pr-10 py-2.5 border rounded-lg leading-5 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                        isCourseLockedFromStudent ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed text-gray-500' : 'bg-white dark:bg-gray-900'
                      } ${
                        errors.courseId && touched.courseId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {selectedCourse && !isCourseLockedFromStudent && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourse(null);
                          setFormData(prev => ({ ...prev, courseId: '', courseSectionId: '' }));
                          setCourseSearch('');
                          setShowCourseDropdown(false);
                          setCourseSections([]);
                          setSelectedCourseSection(null);
                          setAvailableSubjects([]);
                          setSelectedSubjects(new Set());
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  {!isCourseLockedFromStudent && showCourseDropdown && filteredCourses.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-xl max-h-60 rounded-lg py-1 text-base ring-1 ring-black/5 overflow-auto focus:outline-none border border-gray-200 dark:border-gray-700">
                      {filteredCourses.map((course) => (
                        <div
                          key={course.id}
                          onClick={() => selectCourse(course)}
                          className="cursor-pointer select-none relative py-2.5 pl-3 pr-9 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {course.courseCode} - {course.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {course.credits} credits • {departments.find(d => d.id === course.departmentId)?.name || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.courseId && touched.courseId && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.courseId}</p>
                )}
                {selectedCourse && (
                  <div className="mt-3 p-4 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-semibold text-green-900 dark:text-green-200">
                          {selectedCourse.courseCode} - {selectedCourse.name}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                          {selectedCourse.credits} credits • {departments.find(d => d.id === selectedCourse.departmentId)?.name || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section and Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course Section *
                  </label>
                  <select
                    value={formData.courseSectionId}
                    onChange={(e) => {
                      handleInputChange('courseSectionId', e.target.value);
                      selectCourseSection(e.target.value);
                    }}
                    onBlur={() => handleBlur('courseSectionId')}
                    disabled={!selectedCourse || loadingCourseSections}
                    className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white ${
                      errors.courseSectionId && touched.courseSectionId ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                    } ${!selectedCourse ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {!selectedCourse ? 'Select a course first' : loadingCourseSections ? 'Loading sections...' : 'Select Course Section'}
                    </option>
                    {courseSections.map(section => (
                      <option key={section.id} value={section.id}>
                        Year {section.yearLevel} - Section {section.sectionName} | {section.semester}
                      </option>
                    ))}
                  </select>
                  {errors.courseSectionId && touched.courseSectionId && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.courseSectionId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enrollment Date *
                  </label>
                  <input
                    type="date"
                    value={formData.enrollmentDate}
                    onChange={(e) => handleInputChange('enrollmentDate', e.target.value)}
                    onBlur={() => handleBlur('enrollmentDate')}
                    className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-gray-900 dark:text-white ${
                      errors.enrollmentDate && touched.enrollmentDate ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.enrollmentDate && touched.enrollmentDate && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.enrollmentDate}</p>
                  )}
                </div>
              </div>

              {/* Status and Remarks (Editing Mode) */}
              {isEditing && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Registrar Action
                    </label>
                    <select
                      value={registrarAction}
                      onChange={(e) => handleRegistrarActionChange(e.target.value as 'FOR_SCHEDULING' | 'RE_SUBMIT' | '')}
                      className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">Select action</option>
                      <option value="FOR_SCHEDULING">FOR SCHEDULING (Approve)</option>
                      <option value="RE_SUBMIT">RE SUBMIT (Request Changes)</option>
                    </select>
                  </div>

                  {registrarAction === 'RE_SUBMIT' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Remarks *
                      </label>
                      <textarea
                        value={formData.registrarRemarks}
                        onChange={(e) => handleInputChange('registrarRemarks', e.target.value)}
                        rows={4}
                        className={`block w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-gray-900 dark:text-white transition-all ${
                          errors.registrarRemarks ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="Provide details on why the enrollment needs to be re-submitted..."
                      />
                      {errors.registrarRemarks && (
                        <p className="mt-1.5 text-xs text-red-600">{errors.registrarRemarks}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar (1/3) */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Selected Subjects</h3>
            </div>
            <div className="p-6">
              {!formData.courseSectionId ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select a Course Section first to view available subjects
                  </p>
                </div>
              ) : loadingSubjects ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading subjects...</p>
                </div>
              ) : availableSubjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No subjects available for the selected course section
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Toggle subjects to include in this enrollment.
                  </p>
                  <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableSubjects.map((subject) => (
                      <div
                        key={subject.id}
                        onClick={() => toggleSubject(subject.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                          selectedSubjects.has(subject.id)
                            ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700 ring-1 ring-blue-500/10'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className={`mt-0.5 transition-colors ${selectedSubjects.has(subject.id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600'}`}>
                            {selectedSubjects.has(subject.id) ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {subject.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                {subject.code}
                              </span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {subject.units} Units
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                              {subject.department?.name || 'General'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="lg:col-span-3 flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-8">
          <button
            type="button"
            onClick={() => navigate('/enrollments')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Enrollment' : 'Create Enrollment'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnrollmentForm;
