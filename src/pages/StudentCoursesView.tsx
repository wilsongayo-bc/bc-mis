// Dweezil's Code - Student-specific Courses view component
import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../hooks/redux';
import { selectUser } from '../store/slices/authSlice';
import { useSettingsContext } from '../utils/settingsUtils';
import { BookOpen, CheckSquare, Square, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
// Dweezil's Code - Import StudentStatusMessage component (Issue #6)
import StudentStatusMessage from '../components/StudentStatusMessage';

interface Subject {
  id: string;
  name: string;
  code: string;
  description: string;
  units: number;
  lectureHours: number;
  labHours: number;
  isActive: boolean;
  department: {
    id: string;
    name: string;
  } | null;
}

interface Student {
  id: string;
  studentId: string;
  registrationStatus: string;
  gradeLevel: {
    name: string;
  };
  course: {
    id: string;
    name: string;
    courseCode: string;
  };
}

interface Enrollment {
  id: string;
  status: string;
  selectedSubjects: string[];
  courseSectionId?: string;
  registrarRemarks?: string | null;
}

// Dweezil's Code - Add CourseSection interface
interface CourseSection {
  id: string;
  yearLevel: string;
  sectionName: string;
  semester: string;
  academicYear: string;
  maxStudents: number;
  currentEnrollment?: number;
}

const StudentCoursesView: React.FC = () => {
  const { theme } = useSettingsContext();
  const user = useAppSelector(selectUser);
  const [student, setStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  
  // Dweezil's Code - Add course section states
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [selectedCourseSectionId, setSelectedCourseSectionId] = useState<string>('');
  const [loadingCourseSections, setLoadingCourseSections] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  // Dweezil's Code - Fetch course sections when student data is loaded
  useEffect(() => {
    const fetchCourseSections = async () => {
      if (student && student.course && student.course.id) {
        setLoadingCourseSections(true);
        try {
          const response = await api.get(`/course-sections/course/${student.course.id}`);
          const sections = response.data.data || response.data || [];
          setCourseSections(sections);
          
          // Dweezil's Code - Auto-select course section based on student's year level
          if (student.gradeLevel && sections.length > 0 && !selectedCourseSectionId) {
            const studentYearLevel = student.gradeLevel.name; // e.g., "First Year", "Second Year"
            
            // Find matching section by year level
            const matchingSection = sections.find((section: CourseSection) => 
              section.yearLevel === studentYearLevel
            );
            
            if (matchingSection) {
              console.log(`✅ Auto-selected course section for ${studentYearLevel}:`, matchingSection.sectionName);
              setSelectedCourseSectionId(matchingSection.id);
            } else {
              console.log(`⚠️ No matching course section found for ${studentYearLevel}`);
            }
          }
        } catch (error) {
          console.error('Error fetching course sections:', error);
          setCourseSections([]);
        } finally {
          setLoadingCourseSections(false);
        }
      }
    };

    fetchCourseSections();
  }, [student, selectedCourseSectionId]);

  // Dweezil's Code - Load subjects when course section is selected
  useEffect(() => {
    const loadSubjectsForSection = async () => {
      if (!student || !selectedCourseSectionId) {
        setSubjects([]);
        setSelectedSubjects(new Set());
        return;
      }

      const selectedSection = courseSections.find(s => s.id === selectedCourseSectionId);
      if (!selectedSection) {
        return;
      }

      setLoadingSubjects(true);
      try {
        const params = new URLSearchParams({
          yearLevel: selectedSection.yearLevel,
          semester: selectedSection.semester
        });
        
        const response = await api.get(`/subjects/student/${student.id}/available?${params.toString()}`);
        const subjectsData = response.data.data || [];
        setSubjects(subjectsData);
        
        // Auto-select all subjects
        const allSubjectIds = new Set<string>(subjectsData.map((s: Subject) => s.id));
        setSelectedSubjects(allSubjectIds);
      } catch (error) {
        console.error('Error loading subjects:', error);
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadSubjectsForSection();
  }, [student, selectedCourseSectionId, courseSections]);

  // Dweezil's Code - Fetch enrolled subjects when enrollment is loaded
  useEffect(() => {
    const fetchEnrolledSubjects = async () => {
      // Only fetch if enrollment is ENROLLED.
      if (!enrollment || enrollment.status !== 'ENROLLED') {
        return;
      }

      if (!enrollment.selectedSubjects || enrollment.selectedSubjects.length === 0) {
        console.log('⚠️ No selected subjects in enrollment');
        return;
      }

      if (subjects.length > 0) {
        console.log('✅ Subjects already loaded:', subjects.length);
        return;
      }

      try {
        console.log('📚 Fetching enrolled subjects for enrollment:', enrollment.id);
        // Fetch all subjects and filter by enrolled ones
        const response = await api.get('/subjects', {
          params: {
            page: 1,
            limit: 100 // Get enough subjects to cover all enrolled ones
          }
        });
        
        const allSubjects = response.data.data || [];
        // Filter to only show enrolled subjects
        const enrolledSubjects = allSubjects.filter((s: Subject) => 
          enrollment.selectedSubjects?.includes(s.id)
        );
        
        console.log('✅ Loaded enrolled subjects:', enrolledSubjects.length);
        setSubjects(enrolledSubjects);
      } catch (error) {
        console.error('Error fetching enrolled subjects:', error);
      }
    };

    fetchEnrolledSubjects();
  }, [enrollment, student, subjects.length]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Dweezil's Code - Get student record
      const studentResponse = await api.get('/students/me');
      const studentData = studentResponse.data.data;
      
      setStudent(studentData);

      const enrollmentsResponse = await api.get('/enrollments/my-enrollments');
      const enrollmentsData = enrollmentsResponse.data;
      
      console.log('📚 Fetched enrollments for student:', enrollmentsData.data);
      
      if (enrollmentsData.data && enrollmentsData.data.length > 0) {
        const latestEnrollment = enrollmentsData.data[0];
        setEnrollment(latestEnrollment);
        
        if (latestEnrollment.courseSectionId) {
          setSelectedCourseSectionId(latestEnrollment.courseSectionId);
        }
        
        if (latestEnrollment.selectedSubjects && latestEnrollment.selectedSubjects.length > 0) {
          setSelectedSubjects(new Set(latestEnrollment.selectedSubjects));
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load course information');
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    const newSelected = new Set(selectedSubjects);
    if (newSelected.has(subjectId)) {
      newSelected.delete(subjectId);
    } else {
      newSelected.add(subjectId);
    }
    setSelectedSubjects(newSelected);
  };

  const handleEnroll = async () => {
    if (selectedSubjects.size === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    // Dweezil's Code - Require course section selection
    if (!selectedCourseSectionId) {
      toast.error('Please select a course section');
      return;
    }

    if (!student) {
      toast.error('Student information not found');
      return;
    }

    if (!student.course || !student.course.id) {
      toast.error('Course information not found. Please contact the registrar.');
      return;
    }

    try {
      setEnrolling(true);

      // Dweezil's Code - Create enrollment with course section
      await api.post('/enrollments/student/enroll', {
        studentId: student.id,
        courseId: student.course.id,
        courseSectionId: selectedCourseSectionId,
        selectedSubjects: Array.from(selectedSubjects)
      });

      toast.success('Enrollment submitted successfully! Status is now PENDING.');
      
      // Refresh data to show updated status
      await fetchStudentData();
    } catch (error: unknown) {
      console.error('Error enrolling:', error);
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Loading course information...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`rounded-lg border p-6 ${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className={theme === 'dark' ? 'text-red-300' : 'text-red-800'}>
                Student record not found. Please contact the registrar.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (student.registrationStatus === 'PRE_REGISTERED' || 
      student.registrationStatus === 'WITHDRAWN') {
    return (
      <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <BookOpen className="h-8 w-8 text-blue-600" />
              My Courses
            </h1>
          </div>

          <StudentStatusMessage status={student.registrationStatus} context="courses" />
        </div>
      </div>
    );
  }

  // Dweezil's Code - Show appropriate message based on enrollment status
  // Check enrollment status FIRST before showing enrollment form
  // PENDING: Enrollment submitted, waiting for verification
  // VERIFIED: Enrollment verified, waiting for admin to enroll
  // ENROLLED: Student is enrolled (FOR_SCHEDULING status), should see schedule/courses
  if (enrollment && enrollment.status === 'PENDING') {
    return (
      <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <BookOpen className="h-8 w-8 text-blue-600" />
              My Courses
            </h1>
          </div>

          <StudentStatusMessage status="ENROLLMENT_SUBMITTED" context="courses" />

          {enrollment.registrarRemarks && (
            <div className={`mt-6 rounded-lg border p-4 ${theme === 'dark' ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`mt-0.5 h-5 w-5 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`} />
                <div>
                  <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-amber-200' : 'text-amber-900'}`}>
                    Registrar Remarks
                  </h3>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-amber-100' : 'text-amber-800'}`}>
                    {enrollment.registrarRemarks}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (enrollment && enrollment.status === 'VERIFIED') {
    return (
      <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <BookOpen className="h-8 w-8 text-blue-600" />
              My Courses
            </h1>
          </div>

          <StudentStatusMessage status="ENROLLMENT_VERIFIED" context="courses" />
        </div>
      </div>
    );
  }

  // Display the enrolled course and subjects once enrollment is confirmed.
  if (enrollment && enrollment.status === 'ENROLLED') {
      return (
    <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <BookOpen className="h-8 w-8 text-blue-600" />
            My Courses
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            View your enrolled course and subjects for this semester
          </p>
        </div>

            {/* Enrollment Success Message */}
            <div className={`rounded-lg border mb-6 p-6 ${theme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-blue-100' : 'text-blue-900'}`}>
                    Ready for Scheduling
                  </h3>
                  <p className={`leading-relaxed ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                    Your enrollment has been approved and is now ready for scheduling. Your class schedule will appear in My Schedule once the registrar publishes it.
                  </p>
                </div>
              </div>
            </div>

            {/* Course Information */}
            <div className={`rounded-lg shadow-sm border p-6 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Enrolled Course
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Course
                  </label>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {student.course?.name || 'Not assigned'}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {student.course?.courseCode || ''}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Year Level
                  </label>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {student.gradeLevel?.name || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Student ID
                  </label>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {student.studentId}
                  </p>
                </div>
              </div>
            </div>

            {/* Enrolled Subjects */}
            <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Enrolled Subjects
                </h2>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {enrollment.selectedSubjects?.length || 0} subject{(enrollment.selectedSubjects?.length || 0) !== 1 ? 's' : ''} enrolled
                </p>
              </div>

              <div className="p-6">
                {!enrollment.selectedSubjects || enrollment.selectedSubjects.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      No subjects enrolled
                    </p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Loading enrolled subjects...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjects
                      .filter(subject => enrollment.selectedSubjects?.includes(subject.id))
                      .map((subject) => (
                        <div
                          key={subject.id}
                          className={`p-4 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mt-1">
                              <CheckSquare className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="ml-3 flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {subject.name}
                                  </h3>
                                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {/* Dweezil's Code - Add null check for department */}
                                    {subject.code}{subject.department ? ` • ${subject.department.name}` : ''}
                                  </p>
                                  {subject.description && (
                                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                      {subject.description}
                                    </p>
                                  )}
                                </div>
                                <div className={`text-right text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <div>{subject.units} units</div>
                                  <div className="mt-1">
                                    {subject.lectureHours}h lecture
                                    {subject.labHours > 0 && ` • ${subject.labHours}h lab`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
  }

  return (
    <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <BookOpen className="h-8 w-8 text-blue-600" />
            Course Enrollment
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Select the subjects you want to enroll in for this semester
          </p>
        </div>

        {/* Course Information */}
        <div className={`rounded-lg shadow-sm border p-6 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Course Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Course
              </label>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {student.course?.name || 'Not assigned'}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {student.course?.courseCode || ''}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Year Level
              </label>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {student.gradeLevel?.name || 'Not assigned'}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Student ID
              </label>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {student.studentId}
              </p>
            </div>
          </div>

          {/* Dweezil's Code - Course Section Selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Course Section *
            </label>
            <select
              value={selectedCourseSectionId}
              onChange={(e) => setSelectedCourseSectionId(e.target.value)}
              disabled={loadingCourseSections}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'bg-white text-gray-900 border-gray-300'
              } ${loadingCourseSections ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <option value="">
                {loadingCourseSections ? 'Loading sections...' : 'Select Course Section'}
              </option>
              {courseSections.map(section => (
                <option key={section.id} value={section.id}>
                  Year {section.yearLevel} - Section {section.sectionName} | {section.semester} {section.academicYear} | Enrolled: {section.currentEnrollment || 0}/{section.maxStudents}
                </option>
              ))}
            </select>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Select your course section to view available subjects
            </p>
          </div>
        </div>

        {/* Subject Selection */}
        <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Available Subjects
            </h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              All subjects are selected by default. Uncheck any subjects you don't want to enroll in.
            </p>
          </div>

          <div className="p-6">
            {/* Dweezil's Code - Show message if no course section selected */}
            {!selectedCourseSectionId ? (
              <div className="text-center py-8">
                <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Please select a Course Section first to view available subjects
                </p>
              </div>
            ) : loadingSubjects ? (
              <div className="text-center py-8">
                <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading subjects...
                </p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  No subjects available for the selected course section
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    onClick={() => toggleSubject(subject.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedSubjects.has(subject.id)
                        ? theme === 'dark'
                          ? 'bg-blue-900/20 border-blue-700'
                          : 'bg-blue-50 border-blue-200'
                        : theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-650'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {selectedSubjects.has(subject.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {subject.name}
                            </h3>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {/* Dweezil's Code - Add null check for department */}
                              {subject.code}{subject.department ? ` • ${subject.department.name}` : ''}
                            </p>
                            {subject.description && (
                              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {subject.description}
                              </p>
                            )}
                          </div>
                          <div className={`text-right text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <div>{subject.units} units</div>
                            <div className="mt-1">
                              {subject.lectureHours}h lecture
                              {subject.labHours > 0 && ` • ${subject.labHours}h lab`}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enroll Button */}
          {subjects.length > 0 && selectedCourseSectionId && (
            <div className={`p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {selectedSubjects.size} of {subjects.length} subjects selected
                </div>
                <button
                  onClick={handleEnroll}
                  disabled={enrolling || selectedSubjects.size === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {enrolling && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                  {enrolling ? 'Enrolling...' : 'Enroll'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentCoursesView;
