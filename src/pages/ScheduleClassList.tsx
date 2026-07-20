import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Calendar, Search, Users } from 'lucide-react';
import api from '../lib/api';
import { AppDispatch, RootState } from '../store';
import { clearError, fetchScheduleById } from '../store/slices/schedulingSlice';
import { selectUser as selectAuthUser } from '../store/slices/authSlice';
import { format } from 'date-fns';

type CourseSectionRosterEnrollment = {
  id: string;
  studentId: string;
  selectedSubjects?: string[] | null;
  student?: {
    id: string;
    studentId?: string | null;
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

type CourseSectionRoster = {
  id: string;
  sectionName: string;
  yearLevel: string;
  semester: string;
  academicYear: string;
  enrollments?: CourseSectionRosterEnrollment[];
};

const ScheduleClassList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { id } = useParams<{ id: string }>();

  const { currentSchedule, isLoading, error } = useSelector((state: RootState) => state.scheduling);
  const authUser = useSelector(selectAuthUser);

  const [courseSectionRoster, setCourseSectionRoster] = useState<CourseSectionRoster | null>(null);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterQuery, setRosterQuery] = useState('');

  useEffect(() => {
    if (!id) return;
    if (!currentSchedule || currentSchedule.id !== id) {
      dispatch(fetchScheduleById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    const courseSectionId = currentSchedule?.courseSectionId || currentSchedule?.courseSection?.id;

    const loadRoster = async () => {
      if (!courseSectionId) {
        setCourseSectionRoster(null);
        setRosterError(null);
        return;
      }

      setIsRosterLoading(true);
      setRosterError(null);
      try {
        const res = await api.get(`/course-sections/${courseSectionId}`);
        const data = res?.data?.data as CourseSectionRoster | undefined;
        setCourseSectionRoster(data ?? null);
      } catch (e: any) {
        const message =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          'Failed to load class list';
        setRosterError(String(message));
        setCourseSectionRoster(null);
      } finally {
        setIsRosterLoading(false);
      }
    };

    loadRoster();
  }, [currentSchedule?.courseSectionId, currentSchedule?.courseSection?.id]);

  const subjectId = currentSchedule?.subjectId || currentSchedule?.subject?.id;

  const enrolledStudents = useMemo(() => {
    const raw = (courseSectionRoster?.enrollments ?? []) as CourseSectionRosterEnrollment[];
    const filtered = raw.filter(enrollment => {
      if (!subjectId) return true;
      const selected = enrollment.selectedSubjects ?? [];
      if (!Array.isArray(selected) || selected.length === 0) return true;
      return selected.includes(subjectId);
    });

    return filtered
      .slice()
      .sort((a, b) => {
        const aLast = (a.student?.user?.lastName ?? '').toString().toUpperCase();
        const bLast = (b.student?.user?.lastName ?? '').toString().toUpperCase();
        if (aLast !== bLast) return aLast.localeCompare(bLast);
        const aFirst = (a.student?.user?.firstName ?? '').toString().toUpperCase();
        const bFirst = (b.student?.user?.firstName ?? '').toString().toUpperCase();
        return aFirst.localeCompare(bFirst);
      });
  }, [courseSectionRoster?.enrollments, subjectId]);

  const displayedEnrolledStudents = useMemo(() => {
    const query = rosterQuery.trim().toLowerCase();
    if (!query) return enrolledStudents;

    return enrolledStudents.filter(enrollment => {
      const student = enrollment.student;
      const user = student?.user;
      const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').toLowerCase();
      const studentNumber = (student?.studentId ?? enrollment.studentId ?? '').toString().toLowerCase();
      const email = (user?.email ?? '').toString().toLowerCase();
      return fullName.includes(query) || studentNumber.includes(query) || email.includes(query);
    });
  }, [enrolledStudents, rosterQuery]);

  const canSeeStudentLinks =
    authUser?.role === 'ADMIN' ||
    authUser?.role === 'SUPERADMIN' ||
    authUser?.role === 'REGISTRAR' ||
    authUser?.role === 'TEACHER';

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading class list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSchedule) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">Schedule not found.</span>
          </div>
        </div>
      </div>
    );
  }

  const headerTitle = currentSchedule.subject?.name || currentSchedule.subject?.code || 'Class List';
  const sectionLabel = courseSectionRoster
    ? `${courseSectionRoster.sectionName} • ${courseSectionRoster.yearLevel} • ${courseSectionRoster.semester} • ${courseSectionRoster.academicYear}`
    : currentSchedule.courseSection
    ? `${currentSchedule.courseSection.sectionName} • ${currentSchedule.courseSection.yearLevel}`
    : undefined;

  const dateRangeLabel = (() => {
    if (!currentSchedule.startDate || !currentSchedule.endDate) return undefined;
    try {
      return `${format(new Date(currentSchedule.startDate), 'MMM d, yyyy')} - ${format(new Date(currentSchedule.endDate), 'MMM d, yyyy')}`;
    } catch {
      return undefined;
    }
  })();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/timetable"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Back to Timetable"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{headerTitle}</h1>
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{currentSchedule.dayOfWeek}</span>
              <span className="mx-2">•</span>
              <span>
                {currentSchedule.startTime} - {currentSchedule.endTime}
              </span>
              {currentSchedule.room ? (
                <>
                  <span className="mx-2">•</span>
                  <span>{currentSchedule.room}</span>
                </>
              ) : null}
            </div>
            {sectionLabel ? (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">{sectionLabel}</div>
            ) : null}
            {dateRangeLabel ? (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{dateRangeLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/schedules/${currentSchedule.id}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm"
          >
            View Details
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {displayedEnrolledStudents.length} student{displayedEnrolledStudents.length !== 1 ? 's' : ''} enrolled
            {rosterQuery.trim() ? (
              <span className="ml-2 text-gray-500 dark:text-gray-400">(filtered from {enrolledStudents.length})</span>
            ) : null}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={rosterQuery}
              onChange={(e) => setRosterQuery(e.target.value)}
              placeholder="Search student ID, name, email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {isRosterLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading students...</p>
          </div>
        )}

        {!isRosterLoading && rosterError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800">{rosterError}</span>
            </div>
          </div>
        )}

        {!isRosterLoading && !rosterError && (
          <>
            {displayedEnrolledStudents.length === 0 ? (
              <div className="text-center py-10 text-gray-600 dark:text-gray-400">
                {rosterQuery.trim() ? 'No students match your search.' : 'No enrolled students found for this class.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[560px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {displayedEnrolledStudents.map(enrollment => {
                      const student = enrollment.student;
                      const user = student?.user;
                      const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
                      const studentNumber = student?.studentId ?? enrollment.studentId;

                      return (
                        <tr key={enrollment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2">
                            {canSeeStudentLinks && student?.id ? (
                              <Link to={`/students/${student.id}`} className="text-blue-600 hover:text-blue-800">
                                <div className="font-medium text-sm">{displayName || 'Unnamed Student'}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{studentNumber}</div>
                              </Link>
                            ) : (
                              <>
                                <div className="font-medium text-sm text-gray-900 dark:text-white">{displayName || 'Unnamed Student'}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{studentNumber}</div>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{user?.email || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ScheduleClassList;
