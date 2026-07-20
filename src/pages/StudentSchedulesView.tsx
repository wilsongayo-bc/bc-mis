// Dweezil's Code - Student-specific Schedules view component
import React, { useEffect, useState } from 'react';
import { useSettingsContext } from '../utils/settingsUtils';
import { Calendar, Clock, MapPin, BookOpen, AlertCircle, Loader, User } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
// Dweezil's Code - Import StudentStatusMessage component (Issue #6)
import StudentStatusMessage from '../components/StudentStatusMessage';

interface Schedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  subject: {
    id: string;
    name: string;
    code: string;
    units: number;
  };
  teacher: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  courseSection: {
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

interface Enrollment {
  id: string;
  status: string;
  registrarRemarks?: string | null;
}

const DAYS_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const normalizeDayOfWeek = (value: string) => {
  const normalized = value.trim().toUpperCase();
  const aliasMap: Record<string, string> = {
    MON: 'MONDAY',
    TUE: 'TUESDAY',
    TUES: 'TUESDAY',
    WED: 'WEDNESDAY',
    THU: 'THURSDAY',
    THUR: 'THURSDAY',
    FRI: 'FRIDAY',
    SAT: 'SATURDAY',
    SUN: 'SUNDAY',
  };
  return aliasMap[normalized] || normalized;
};

const formatDayLabel = (value: string) => {
  const normalized = normalizeDayOfWeek(value);
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
};

const expandSchedulesByDay = (scheduleList: Schedule[]) =>
  scheduleList.flatMap((schedule) => {
    const rawDays = schedule.dayOfWeek
      .split(',')
      .map((day) => day.trim())
      .filter(Boolean);

    if (rawDays.length <= 1) {
      return [schedule];
    }

    return rawDays.map((day) => ({
      ...schedule,
      dayOfWeek: day,
    }));
  });

const StudentSchedulesView: React.FC = () => {
  const { theme } = useSettingsContext();
  const [student, setStudent] = useState<Student | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [latestEnrollment, setLatestEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduleData();
  }, []);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);

      // Dweezil's Code - Fix double /api/api path issue (Issue #7)
      // Get student record
      const studentResponse = await api.get('/students/me');
      const studentData = studentResponse.data.data;
      setStudent(studentData);

      const enrollmentsResponse = await api.get('/enrollments/my-enrollments');
      const enrollmentsData = enrollmentsResponse.data.data || [];
      const currentEnrollment = enrollmentsData.length > 0 ? enrollmentsData[0] : null;
      setLatestEnrollment(currentEnrollment);

      if (!currentEnrollment || currentEnrollment.status !== 'ENROLLED') {
        setSchedules([]);
        setLoading(false);
        return;
      }

      const schedulesResponse = await api.get(`/schedules/student/${studentData.id}`);
      const schedulesData = expandSchedulesByDay(schedulesResponse.data.data || []);
      
      const sortedSchedules = schedulesData.sort((a: Schedule, b: Schedule) => {
        const dayCompare = DAYS_ORDER.indexOf(normalizeDayOfWeek(a.dayOfWeek)) - DAYS_ORDER.indexOf(normalizeDayOfWeek(b.dayOfWeek));
        if (dayCompare !== 0) return dayCompare;
        return a.startTime.localeCompare(b.startTime);
      });
      
      setSchedules(sortedSchedules);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching schedule data:', error);
      toast.error('Failed to load schedule information');
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const groupSchedulesByDay = () => {
    const grouped: Record<string, Schedule[]> = {};
    schedules.forEach(schedule => {
      const normalizedDay = normalizeDayOfWeek(schedule.dayOfWeek);
      if (!grouped[normalizedDay]) {
        grouped[normalizedDay] = [];
      }
      grouped[normalizedDay].push(schedule);
    });
    return grouped;
  };

  const getScheduleStatusMessage = () => {
    if (latestEnrollment?.status === 'VERIFIED') {
      return 'ENROLLMENT_VERIFIED';
    }

    if (latestEnrollment?.status === 'PENDING') {
      return 'ENROLLMENT_SUBMITTED';
    }

    return student?.registrationStatus || 'REGISTERED';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Loading schedule information...</p>
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
              <Calendar className="h-8 w-8 text-blue-600" />
              My Schedule
            </h1>
          </div>

          <StudentStatusMessage status={student.registrationStatus} context="schedules" />
        </div>
      </div>
    );
  }

  if (student.registrationStatus === 'REGISTERED' && schedules.length === 0) {
    return (
      <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <Calendar className="h-8 w-8 text-blue-600" />
              My Schedule
            </h1>
          </div>

          <StudentStatusMessage
            status={getScheduleStatusMessage()}
            context="schedules"
          />

          {latestEnrollment?.status === 'PENDING' && latestEnrollment.registrarRemarks && (
            <div className={`mt-6 rounded-lg border p-4 ${theme === 'dark' ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`mt-0.5 h-5 w-5 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-600'}`} />
                <div>
                  <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-amber-200' : 'text-amber-900'}`}>
                    Registrar Remarks
                  </h3>
                  <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-amber-100' : 'text-amber-800'}`}>
                    {latestEnrollment.registrarRemarks}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const groupedSchedules = groupSchedulesByDay();

  return (
    <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Calendar className="h-8 w-8 text-blue-600" />
            My Schedule
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            View your class schedule and timetable
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
          </div>
        </div>

        {/* Schedule Display */}
        {schedules.length === 0 ? (
          <div className={`rounded-lg shadow-sm border p-12 text-center ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <Calendar className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              No Schedule Available
            </h3>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Your class schedule has not been set up yet. Please contact the registrar.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {DAYS_ORDER.map(day => {
              const daySchedules = groupedSchedules[day];
              if (!daySchedules || daySchedules.length === 0) return null;

              return (
                <div
                  key={day}
                  className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                >
                  {/* Day Header */}
                  <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatDayLabel(day)}
                    </h3>
                  </div>

                  {/* Schedule Items */}
                  <div className="p-4 space-y-3">
                    {daySchedules.map(schedule => (
                      <div
                        key={schedule.id}
                        className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="h-5 w-5 text-blue-600" />
                              <h4 className={`text-base font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {schedule.subject?.name || 'Subject not assigned'}
                              </h4>
                            </div>
                            <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {schedule.subject?.code || 'N/A'} • {schedule.subject?.units || 0} units
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="flex items-center gap-2">
                                <Clock className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {schedule.room}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {schedule.teacher?.user?.firstName || ''} {schedule.teacher?.user?.lastName || 'No teacher assigned'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSchedulesView;
