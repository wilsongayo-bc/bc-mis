import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseDashboard, { StatCard } from './BaseDashboard';
import {
  QuickAction,
  RecentActivity
} from '../../services/dashboardService';
import { analyticsDashboardService } from '../../services/analyticsDashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DashboardTable } from './DashboardTable';
import {
  BookOpen,
  Calendar as CalendarIcon,
  DollarSign,
  Clock,
  FileText,
  CheckCircle as CheckCircleIcon,
  TrendingUp,
  User as UserIcon
} from 'lucide-react';
import api from '../../lib/api';
import StudentStatusMessage from '../StudentStatusMessage';

interface StudentDashboardStudent {
  id: string;
  studentId: string;
  registrationStatus: string;
  gradeLevel: {
    name: string;
  };
  course?: {
    id: string;
    name: string;
    courseCode: string;
  } | null;
}

interface StudentDashboardEnrollment {
  id: string;
  status: string;
  enrollmentDate: string;
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

interface StudentDashboardSchedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  subject: {
    id: string;
    name: string;
    code: string;
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

const expandSchedulesByDay = (scheduleList: StudentDashboardSchedule[]) =>
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

/**
 * Student Dashboard Component
 * 
 * Provides student-specific overview including:
 * - Academic progress and enrollment statistics
 * - Schedule and assignment tracking
 * - Student quick actions
 * - Recent academic activities
 */
const StudentDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof analyticsDashboardService.getStudentDashboard>> | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { 
      name: 'Timetable', 
      href: '/timetable', 
      icon: 'Calendar',
      description: 'Check your weekly class schedule and room assignments',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      name: 'Enrollments', 
      href: '/enrollments', 
      icon: 'FileText',
      description: 'View your enrollment history and current registration status',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      name: 'Profile', 
      href: '/profile', 
      icon: 'Users',
      description: 'Manage your personal information and academic profile',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentDashboardStudent | null>(null);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const [enrollments, setEnrollments] = useState<StudentDashboardEnrollment[]>([]);
  const [schedules, setSchedules] = useState<StudentDashboardSchedule[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      try {
        const dashboard = await analyticsDashboardService.getStudentDashboard();
        setAnalytics(dashboard);
        setRecentActivities([
          {
            id: 'enrollment-status',
            date: dashboard.meta.generatedAt,
            type: 'enrollment',
            description: `Enrollment status: ${dashboard.data.enrollment.status ?? 'N/A'} (${dashboard.meta.academicYear}, ${dashboard.meta.semester})`
          },
          ...(dashboard.data.schedule.nextClass
            ? [
                {
                  id: `next-${dashboard.data.schedule.nextClass.id}`,
                  date: dashboard.meta.generatedAt,
                  type: 'schedule',
                  description: `Next class: ${dashboard.data.schedule.nextClass.subject.code || 'SUBJECT'} ${
                    dashboard.data.schedule.nextClass.subject.name
                  } • ${dashboard.data.schedule.nextClass.startTime.slice(0, 5)}-${dashboard.data.schedule.nextClass.endTime.slice(0, 5)}`
                }
              ]
            : [])
        ]);
      } catch (analyticsErr) {
        void analyticsErr;
      }

      try {
        const studentResponse = await api.get('/students/me');
        const studentData: StudentDashboardStudent = studentResponse.data.data;
        setStudent(studentData);
        setStudentNotFound(false);

        const [enrollmentsResponse, schedulesResponse] = await Promise.all([
          api.get('/enrollments/my-enrollments'),
          api.get(`/schedules/student/${studentData.id}`)
        ]);

        const enrollmentsData: StudentDashboardEnrollment[] = enrollmentsResponse.data.data || [];
        const schedulesData: StudentDashboardSchedule[] = expandSchedulesByDay(schedulesResponse.data.data || []);

        setEnrollments(enrollmentsData);

        const sortedSchedules = schedulesData.sort((a, b) => {
          const dayCompare =
            DAYS_ORDER.indexOf(normalizeDayOfWeek(a.dayOfWeek)) - DAYS_ORDER.indexOf(normalizeDayOfWeek(b.dayOfWeek));
          if (dayCompare !== 0) return dayCompare;
          return a.startTime.localeCompare(b.startTime);
        });

        setSchedules(sortedSchedules);
      } catch (studentError: unknown) {
        const anyError = studentError as { response?: { status?: number } };
        if (anyError.response?.status === 404) {
          setStudent(null);
          setStudentNotFound(true);
        }
      }
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const exportFileBaseName = useMemo(() => {
    if (!analytics) return undefined;
    const base = `student-dashboard-${analytics.meta.academicYear}-${analytics.meta.semester}`.toLowerCase();
    return base.replace(/\s+/g, '-').replace(/[^a-z0-9-_]+/g, '');
  }, [analytics]);

  const statsGrid = analytics ? (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Enrollment Status"
        value={analytics.data.enrollment.status ?? 'N/A'}
        icon={<BookOpen />}
        color="bg-blue-500"
        link="/enrollments"
        isLoading={isLoading}
      />
      <StatCard
        title="Classes Today"
        value={analytics.data.schedule.todayClassCount.toLocaleString()}
        icon={<CheckCircleIcon />}
        color="bg-green-500"
        link="/timetable"
        isLoading={isLoading}
      />
      <StatCard
        title="Balance"
        value={`₱${analytics.data.enrollment.balance.toLocaleString()}`}
        icon={<DollarSign />}
        color="bg-red-500"
        link="/enrollments"
        isLoading={isLoading}
      />
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard title="Enrollment Status" value="—" icon={<BookOpen />} color="bg-blue-500" isLoading={isLoading} />
      <StatCard title="Classes Today" value="—" icon={<CheckCircleIcon />} color="bg-green-500" isLoading={isLoading} />
      <StatCard title="Balance" value="—" icon={<DollarSign />} color="bg-red-500" isLoading={isLoading} />
    </div>
  );

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const registrationSection = student ? (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold">Registration</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">Student profile</div>
            </div>
            <UserIcon className="h-6 w-6 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <dl className="space-y-4">
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 bg-gray-50/30 dark:bg-gray-800/30">
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Student ID</dt>
              <dd className="text-sm font-bold text-gray-900 dark:text-white">{student.studentId}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Course</dt>
              <dd className="text-sm font-bold text-gray-900 dark:text-white">
                {student.course?.name || 'Not assigned yet'}
                {student.course?.courseCode && (
                  <span className="block text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">
                    {student.course.courseCode}
                  </span>
                )}
              </dd>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Year Level</dt>
              <dd className="text-sm font-bold text-gray-900 dark:text-white">{student.gradeLevel?.name || 'N/A'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        {(() => {
          const latestEnrollment = enrollments[0] || null;
          const statusMessage =
            latestEnrollment?.status === 'PENDING'
              ? 'ENROLLMENT_SUBMITTED'
              : latestEnrollment?.status === 'VERIFIED'
              ? 'ENROLLMENT_VERIFIED'
              : latestEnrollment?.status === 'ENROLLED'
              ? 'ENROLLMENT_ENROLLED'
              : student.registrationStatus;

          return (
            <>
              <StudentStatusMessage
                status={statusMessage}
                context="enrollments"
                hasEnrollment={Boolean(latestEnrollment)}
              />

              {latestEnrollment?.status === 'PENDING' && latestEnrollment.registrarRemarks && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 mb-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-amber-900 dark:text-amber-100">
                        Registrar Remarks
                      </div>
                      <div className="mt-1 text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                        {latestEnrollment.registrarRemarks}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        })()}
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all"
          >
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            View Registration Details
          </button>
          <button
            type="button"
            onClick={() => navigate('/enrollments')}
            className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-200 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 shadow-sm transition-all"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Go to Enrollments
          </button>
          {enrollments[0]?.status === 'ENROLLED' && (
            <button
              type="button"
              onClick={() => navigate('/timetable')}
              className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all"
            >
              <CalendarIcon className="h-4 w-4 mr-2 text-green-600" />
              View My Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  ) : studentNotFound ? (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-red-600">
          <CalendarIcon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Student record not found
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Your user account is not yet linked to a student record. Please contact the registrar
            to complete your registration.
          </p>
          <button
            type="button"
            onClick={() => navigate('/documentation')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            View student onboarding guide
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const enrollmentSection =
    student && enrollments.length > 0 ? (
      <div className="mt-6">
        <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg font-bold">Recent Enrollments</CardTitle>
                <div className="text-sm text-gray-600 dark:text-gray-400">Your latest enrollment history</div>
              </div>
              <FileText className="h-6 w-6 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <DashboardTable
              rows={enrollments.slice(0, 10)}
              columns={[
                {
                  header: 'Course',
                  render: (r) => (
                    <div className="min-w-0 ml-6">
                      <div className="truncate font-bold text-gray-900 dark:text-white">{r.course.name}</div>
                      <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.course.courseCode}</div>
                    </div>
                  ),
                  searchText: (r) => `${r.course.name} ${r.course.courseCode}`,
                },
                {
                  header: 'Section',
                  render: (r) =>
                    r.courseSection ? (
                      <div className="min-w-0">
                        <div className="truncate font-medium">{r.courseSection.sectionName}</div>
                        <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.courseSection.yearLevel}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">—</span>
                    ),
                  searchText: (r) =>
                    r.courseSection ? `${r.courseSection.sectionName} ${r.courseSection.yearLevel}` : '',
                },
                {
                  header: 'Status',
                  render: (r) => (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        r.status === 'ENROLLED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                          : r.status === 'VERIFIED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                      }`}
                    >
                      {r.status === 'ENROLLED' ? 'FOR SCHEDULING' : r.status}
                    </span>
                  ),
                  searchText: (r) => r.status,
                },
                {
                  header: 'Date',
                  headerClassName: 'text-right pr-6',
                  className: 'text-right pr-6 whitespace-nowrap',
                  render: (r) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{new Date(r.enrollmentDate).toLocaleDateString()}</span>,
                },
              ]}
              emptyLabel="No enrollments found."
              maxHeightClassName="max-h-80"
            />
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30">
              <button
                type="button"
                onClick={() => navigate('/enrollments')}
                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                View all enrollment records →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    ) : null;

  const today = new Date();
  const todayDayName = DAYS_ORDER[today.getDay() === 0 ? 6 : today.getDay() - 1];

  const todaysSchedules = schedules.filter(schedule => normalizeDayOfWeek(schedule.dayOfWeek) === todayDayName);

  const scheduleSection =
    student && schedules.length > 0 ? (
      <div className="mt-6">
        <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg font-bold">Today’s Schedule</CardTitle>
                <div className="text-sm text-gray-600 dark:text-gray-400">{todayDayName} • Class timetable</div>
              </div>
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <DashboardTable
              rows={todaysSchedules}
              columns={[
                {
                  header: 'Subject',
                  render: (r) => (
                    <div className="min-w-0 ml-6">
                      <div className="truncate font-bold text-gray-900 dark:text-white">{r.subject.code}</div>
                      <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.subject.name}</div>
                    </div>
                  ),
                  searchText: (r) => `${r.subject.code} ${r.subject.name}`,
                },
                {
                  header: 'Time',
                  className: 'whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400',
                  render: (r) => `${formatTime(r.startTime)} – ${formatTime(r.endTime)}`,
                },
                {
                  header: 'Section',
                  render: (r) => (
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.courseSection.sectionName}</div>
                      <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.courseSection.yearLevel}</div>
                    </div>
                  ),
                  searchText: (r) => `${r.courseSection.sectionName} ${r.courseSection.yearLevel}`,
                },
                {
                  header: 'Room',
                  headerClassName: 'text-right pr-6',
                  className: 'text-right pr-6 whitespace-nowrap',
                  render: (r) => <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-bold">{r.room}</span>,
                  searchText: (r) => r.room,
                },
              ]}
              emptyLabel="You do not have any classes scheduled for today."
              maxHeightClassName="max-h-80"
            />
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30">
              <button
                type="button"
                onClick={() => navigate('/timetable')}
                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                View full weekly timetable →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    ) : null;

  return (
    <BaseDashboard
      title="Student Dashboard"
      description="Track your academic progress and manage your studies"
      icon={UserIcon}
      stats={statsGrid}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
      error={error}
      onRetry={fetchDashboardData}
      tabs={[
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'registration', label: 'Registration', icon: UserIcon },
        { id: 'enrollments', label: 'Enrollments', icon: FileText },
        { id: 'today', label: 'Today', icon: CalendarIcon },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={fetchDashboardData}
      exportFileBaseName={exportFileBaseName}
      exportPayload={analytics ?? undefined}
    >
      {activeTab === 'overview' && (
        <>
          {registrationSection}
          {enrollmentSection}
          {scheduleSection}
        </>
      )}
      {activeTab === 'registration' && registrationSection}
      {activeTab === 'enrollments' && enrollmentSection}
      {activeTab === 'today' && scheduleSection}
    </BaseDashboard>
  );
};

export default StudentDashboard;
