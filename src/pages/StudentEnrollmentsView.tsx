// Dweezil's Code - Student-specific Enrollments view component
import React, { useEffect, useState } from 'react';
import { useSettingsContext } from '../utils/settingsUtils';
import { GraduationCap, BookOpen, Calendar, AlertCircle, Loader, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
// Dweezil's Code - Import StudentStatusMessage component (Issue #6)
import StudentStatusMessage from '../components/StudentStatusMessage';

interface Subject {
  id: string;
  name: string;
  code: string;
  units: number;
  lectureHours: number;
  labHours: number;
}

interface Enrollment {
  id: string;
  status: string;
  enrollmentDate: string;
  selectedSubjects: string[];
  registrarRemarks?: string | null;
  course: {
    id: string;
    name: string;
    courseCode: string;
  };
  courseSection: {
    id: string;
    sectionName: string;
    yearLevel: string;
  };
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

const StudentEnrollmentsView: React.FC = () => {
  const { theme } = useSettingsContext();
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [subjectsByEnrollmentId, setSubjectsByEnrollmentId] = useState<Record<string, Subject[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollmentData();
  }, []);

  const fetchEnrollmentData = async () => {
    try {
      setLoading(true);

      // Dweezil's Code - Get student record
      const studentResponse = await api.get('/students/me');
      const studentData = studentResponse.data.data;
      setStudent(studentData);

      // Dweezil's Code - Always try to fetch enrollments to check if student has submitted
      // This helps determine what message to show
      try {
        const enrollmentsResponse = await api.get('/enrollments/my-enrollments');
        const enrollmentsData = enrollmentsResponse.data.data || [];
        
        // Dweezil's Code - Parse selectedSubjects if it's a JSON string
        const parsedEnrollments: Enrollment[] = enrollmentsData.map((enrollment: {
          selectedSubjects?: string | string[];
          [key: string]: unknown;
        }) => ({
          ...enrollment,
          selectedSubjects: typeof enrollment.selectedSubjects === 'string' 
            ? JSON.parse(enrollment.selectedSubjects || '[]')
            : enrollment.selectedSubjects || []
        }));
        
        setEnrollments(parsedEnrollments);

        const subjectMapEntries = await Promise.all(
          parsedEnrollments.map(async (enrollment) => {
            const enrollmentCourseId = (enrollment as unknown as { course?: { id?: string } | null })?.course?.id;
            const yearLevel = enrollment.courseSection?.yearLevel || undefined;

            if (!studentData?.id || !enrollmentCourseId || !Array.isArray(enrollment.selectedSubjects) || enrollment.selectedSubjects.length === 0) {
              return [enrollment.id, []] as const;
            }

            try {
              const response = await api.get(`/subjects/student/${studentData.id}/available`, {
                params: {
                  courseId: enrollmentCourseId,
                  yearLevel
                }
              });
              const subjects: Subject[] = Array.isArray(response.data?.data) ? response.data.data : [];
              const subjectById = new Map(subjects.map(subject => [subject.id, subject]));
              const resolved = enrollment.selectedSubjects
                .map(id => subjectById.get(id) || null)
                .filter((value): value is Subject => value !== null);

              return [enrollment.id, resolved] as const;
            } catch {
              return [enrollment.id, []] as const;
            }
          })
        );

        setSubjectsByEnrollmentId(Object.fromEntries(subjectMapEntries));
      } catch (enrollmentError) {
        // If enrollment fetch fails, just set empty array
        console.log('No enrollments found or error fetching:', enrollmentError);
        setEnrollments([]);
        setSubjectsByEnrollmentId({});
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching enrollment data:', error);
      toast.error('Failed to load enrollment information');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      PENDING: {
        bg: theme === 'dark' ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-100 text-yellow-800',
        text: 'Pending',
        icon: <Clock className="h-4 w-4" />
      },
      VERIFIED: {
        bg: theme === 'dark' ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-800',
        text: 'Verified',
        icon: <CheckCircle className="h-4 w-4" />
      },
      ENROLLED: {
        bg: theme === 'dark' ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-100 text-blue-800',
        text: 'Enrolled',
        icon: <CheckCircle className="h-4 w-4" />
      }
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg}`}>
        {config.icon}
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Loading enrollment information...</p>
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
              <GraduationCap className="h-8 w-8 text-blue-600" />
              My Enrollments
            </h1>
          </div>

          <StudentStatusMessage 
            status={student.registrationStatus} 
            context="enrollments" 
            hasEnrollment={enrollments.length > 0}
          />
        </div>
      </div>
    );
  }

  if (student.registrationStatus === 'REGISTERED' && enrollments.length === 0) {
    return (
      <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <GraduationCap className="h-8 w-8 text-blue-600" />
              My Enrollments
            </h1>
          </div>

          <StudentStatusMessage
            status={student.registrationStatus}
            context="enrollments"
            hasEnrollment={false}
          />
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
            <GraduationCap className="h-8 w-8 text-blue-600" />
            My Enrollments
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            View your enrollment history and current enrollment status
          </p>
        </div>

        {/* Student Information */}
        <div className={`rounded-lg shadow-sm border p-6 mb-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Student Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Student ID
              </label>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {student.studentId}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Course
              </label>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {student.course?.name || 'N/A'}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {student.course?.courseCode || 'N/A'}
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Year Level
              </label>
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {student.gradeLevel?.name || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Enrollments List */}
        {enrollments.length === 0 ? (
          <div className={`rounded-lg shadow-sm border p-12 text-center ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <BookOpen className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              No Enrollments Yet
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              You haven't enrolled in any courses yet. Visit the Courses page to enroll.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                {/* Enrollment Header */}
                <div className={`p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {enrollment.course.name}
                      </h3>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {enrollment.course.courseCode} • {enrollment.courseSection.sectionName} • {enrollment.courseSection.yearLevel}
                      </p>
                    </div>
                    {getStatusBadge(enrollment.status)}
                  </div>
                  <div className={`flex items-center gap-2 mt-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar className="h-4 w-4" />
                    <span>Enrolled on {new Date(enrollment.enrollmentDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Selected Subjects */}
                <div className="p-6">
                  {enrollment.status === 'PENDING' && enrollment.registrarRemarks && (
                    <div className={`mb-4 rounded-lg border p-4 ${theme === 'dark' ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`mt-0.5 h-5 w-5 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`} />
                        <div>
                          <h4 className={`text-sm font-semibold ${theme === 'dark' ? 'text-amber-200' : 'text-amber-900'}`}>
                            Registrar Remarks
                          </h4>
                          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-amber-100' : 'text-amber-800'}`}>
                            {enrollment.registrarRemarks}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <h4 className={`text-sm font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Enrolled Subjects ({enrollment.selectedSubjects?.length || 0})
                  </h4>
                  <div className="space-y-3">
                    {(subjectsByEnrollmentId[enrollment.id] || []).length === 0 ? (
                      <div className={`rounded-lg border p-4 text-sm ${theme === 'dark' ? 'bg-gray-750 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                        Subject details are not available yet.
                      </div>
                    ) : (
                      (subjectsByEnrollmentId[enrollment.id] || []).map((subject) => (
                        <div
                          key={subject.id}
                          className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h5 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {subject.name}
                              </h5>
                              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {subject.code}
                              </p>
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
                      ))
                    )}
                  </div>

                  {/* Total Units */}
                  <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Total Units
                      </span>
                      <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {(subjectsByEnrollmentId[enrollment.id] || []).reduce((sum, subject) => sum + subject.units, 0)} units
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentEnrollmentsView;
