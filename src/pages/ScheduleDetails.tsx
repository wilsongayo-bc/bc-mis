import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  User,
  BookOpen,
  Edit,
  UserX,
  UserCheck,
  ChevronLeft,
  AlertCircle,
  GraduationCap,
  Building,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';
import { AppDispatch, RootState } from '../store';
import {
  fetchScheduleById,
  clearError,
} from '../store/slices/schedulingSlice';
import api from '../lib/api';

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

/**
 * ScheduleDetails component - Detailed view of a schedule
 * Features: comprehensive schedule information, teacher details, course info, actions
 */
const ScheduleDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    currentSchedule,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.scheduling);
  const { user } = useSelector((state: RootState) => state.auth);

  const [courseSectionRoster, setCourseSectionRoster] = useState<CourseSectionRoster | null>(null);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterQuery, setRosterQuery] = useState('');



  // Load schedule data
  useEffect(() => {
    console.log('🔍 [ScheduleDetails] useEffect triggered:', {
      id,
      hasId: !!id,
      currentSchedule: currentSchedule?.id,
      isLoading,
      error
    });
    
    if (id && (!currentSchedule || currentSchedule.id !== id)) {
      console.log('📡 [ScheduleDetails] Dispatching fetchScheduleById with ID:', id);
      dispatch(fetchScheduleById(id));
    } else if (!id) {
      console.warn('⚠️ [ScheduleDetails] No ID found in URL params');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id]);

  // Clear error when component unmounts
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
          'Failed to load enrolled students';
        setRosterError(String(message));
        setCourseSectionRoster(null);
      } finally {
        setIsRosterLoading(false);
      }
    };

    loadRoster();
  }, [currentSchedule?.courseSectionId, currentSchedule?.courseSection?.id]);

  const handleToggleStatus = async () => {
    try {
      // TODO: Implement actual API call to toggle schedule status
      const newStatus = currentSchedule.isActive ? false : true;
      console.log('Toggling schedule status:', currentSchedule.id, 'to', newStatus ? 'ACTIVE' : 'INACTIVE');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local state (in a real app, this would be handled by your state management)
      // dispatch(updateScheduleStatus({ id: currentSchedule.id, isActive: newStatus }));
    } catch (_error) {
      console.error('Error toggling schedule status:', error);
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    try {
      // Handle both HH:MM and HH:MM:SS formats
      const timeStr = time.includes(':') ? time : `${time}:00`;
      const date = new Date(`2000-01-01T${timeStr}`);
      if (isNaN(date.getTime())) return 'Invalid Time';
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Time';
    }
  };

  // Format day of week
  const formatDayOfWeek = (day: string | undefined) => {
    if (!day) return 'Unknown';
    return day.charAt(0) + day.slice(1).toLowerCase();
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Format date only (no time)
  const formatDateOnly = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Get status badge
  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
        <CheckCircle className="w-4 h-4 mr-1" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
        <XCircle className="w-4 h-4 mr-1" />
        Inactive
      </span>
    );
  };

  // Check permissions
  const canEdit = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'REGISTRAR';
  const canDelete = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading schedule details...</p>
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
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Schedule not found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The schedule you're looking for doesn't exist or has been deleted.</p>
          <Link
            to="/schedules"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Schedules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
              {currentSchedule.subject?.name || 'Schedule Details'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {formatDayOfWeek(currentSchedule.dayOfWeek)} • {formatTime(currentSchedule.startTime)} - {formatTime(currentSchedule.endTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(currentSchedule.isActive)}
          {canEdit && (
            <Link
              to={`/schedules/${currentSchedule.id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                currentSchedule.isActive
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {currentSchedule.isActive ? (
                <UserX className="w-4 h-4 mr-2" />
              ) : (
                <UserCheck className="w-4 h-4 mr-2" />
              )}
              {currentSchedule.isActive ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Schedule Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Schedule Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {currentSchedule.subject?.name || 'No Subject Assigned'}
                    </p>
                    {currentSchedule.subject?.code && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{currentSchedule.subject.code}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Day & Time</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDayOfWeek(currentSchedule.dayOfWeek)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(currentSchedule.startTime)} - {formatTime(currentSchedule.endTime)}
                    </p>
                  </div>
                </div>
                {currentSchedule.startDate && (
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Date Range</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDateOnly(currentSchedule.startDate)} - {formatDateOnly(currentSchedule.endDate)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Room</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.room || 'No Room Assigned'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Building className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Academic Period</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {currentSchedule.semester === 'FIRST' ? 'First' : 'Second'} Semester
                    </p>
                    {/* Dweezil's Code - Display academicYear field properly */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentSchedule.academicYear || currentSchedule.year || 'N/A'}
                    </p>
                  </div>
                </div>
                {/* Dweezil's Code - Display Course information from courseSection */}
                {currentSchedule.courseSection?.course && (
                  <div className="flex items-center">
                    <BookOpen className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Course</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {currentSchedule.courseSection.course.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentSchedule.courseSection.course.courseCode}
                      </p>
                    </div>
                  </div>
                )}
                {currentSchedule.gradeLevel && (
                  <div className="flex items-center">
                    <GraduationCap className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Grade Level</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.gradeLevel.name}</p>
                    </div>
                  </div>
                )}
                {/* Dweezil's Code - Display Year Level from courseSection if gradeLevel is not available */}
                {!currentSchedule.gradeLevel && currentSchedule.courseSection?.yearLevel && (
                  <div className="flex items-center">
                    <GraduationCap className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Grade Level</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.courseSection.yearLevel}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className={`font-medium ${
                      currentSchedule.isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentSchedule.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Information */}
          {currentSchedule.subject && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                Subject Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subject Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.subject?.name || 'No Subject Name'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subject Code</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.subject?.code || 'No Subject Code'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Units</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.subject?.units || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Lecture Hours</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.subject?.lectureHours || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Lab Hours</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.subject?.labHours || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {(currentSchedule.subject?.lectureHours || 0) + (currentSchedule.subject?.labHours || 0)}
                    </p>
                  </div>
                </div>
              </div>
              {currentSchedule.subject.description && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Description</p>
                  <p className="text-gray-900 dark:text-white">{currentSchedule.subject.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Teacher Information */}
          {currentSchedule.teacher && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Teacher Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {currentSchedule.teacher?.user?.firstName && currentSchedule.teacher?.user?.lastName 
                        ? `${currentSchedule.teacher.user.firstName} ${currentSchedule.teacher.user.lastName}`
                        : 'No Teacher Assigned'
                      }
                    </p>
                  </div>
                  {currentSchedule.teacher.user.email && (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                        <a
                          href={`mailto:${currentSchedule.teacher?.user?.email || ''}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {currentSchedule.teacher?.user?.email || 'No Email'}
                        </a>
                      </div>
                    </div>
                  )}
                  {currentSchedule.teacher.employeeId && (
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Employee ID</p>
                        <p className="text-gray-900 dark:text-white">{currentSchedule.teacher?.employeeId || 'No Employee ID'}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {currentSchedule.teacher.department && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.teacher?.department || 'No Department'}</p>
                    </div>
                  )}
                  {currentSchedule.teacher.position && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                      <p className="font-medium text-gray-900 dark:text-white">{currentSchedule.teacher?.position || 'No Position'}</p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {(currentSchedule.courseSectionId || currentSchedule.courseSection?.id) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Class List
                </h2>
                {courseSectionRoster && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {courseSectionRoster.sectionName} • {courseSectionRoster.yearLevel} • {courseSectionRoster.semester} • {courseSectionRoster.academicYear}
                  </div>
                )}
              </div>

              {isRosterLoading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading enrolled students...</p>
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
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {displayedEnrolledStudents.length} student{displayedEnrolledStudents.length !== 1 ? 's' : ''} enrolled
                      {rosterQuery.trim() ? (
                        <span className="ml-2 text-gray-500 dark:text-gray-400">
                          (filtered from {enrolledStudents.length})
                        </span>
                      ) : null}
                    </div>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={rosterQuery}
                        onChange={(e) => setRosterQuery(e.target.value)}
                        placeholder="Search student ID, name, email..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {displayedEnrolledStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                      {rosterQuery.trim() ? 'No students match your search.' : 'No enrolled students found for this class.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg max-h-[520px] overflow-y-auto">
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
                                  {student?.id ? (
                                    <Link
                                      to={`/students/${student.id}`}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
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
                                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                  {user?.email || '—'}
                                </td>
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
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Duration</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(() => {
                    try {
                      if (!currentSchedule.startTime || !currentSchedule.endTime) {
                        return 'N/A';
                      }
                      
                      const startTimeStr = currentSchedule.startTime.includes(':') ? currentSchedule.startTime : `${currentSchedule.startTime}:00`;
                      const endTimeStr = currentSchedule.endTime.includes(':') ? currentSchedule.endTime : `${currentSchedule.endTime}:00`;
                      
                      const start = new Date(`2000-01-01T${startTimeStr}`);
                      const end = new Date(`2000-01-01T${endTimeStr}`);
                      
                      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                        return 'Invalid Time';
                      }
                      
                      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
                      
                      if (duration < 0) {
                        return 'Invalid Duration';
                      }
                      
                      const hours = Math.floor(duration / 60);
                      const minutes = Math.floor(duration % 60);
                      return `${hours}h ${minutes}m`;
                    } catch (error) {
                      console.error('Error calculating duration:', error);
                      return 'Error';
                    }
                  })()} 
                </span>
              </div>
              {currentSchedule.subject?.units && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Units</span>
                  <span className="font-medium text-gray-900 dark:text-white">{currentSchedule.subject.units}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Room</span>
                <span className="font-medium text-gray-900 dark:text-white">{currentSchedule.room || 'No Room Assigned'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Semester</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentSchedule.semester === 'FIRST' ? 'First' : 'Second'}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadata</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Schedule ID</p>
                <p className="font-mono text-gray-900 dark:text-white">{currentSchedule.id}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Created</p>
                <p className="text-gray-900 dark:text-white">{formatDate(currentSchedule.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-gray-900 dark:text-white">{formatDate(currentSchedule.updatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
            <div className="space-y-3">
              {canEdit && (
                <Link
                  to={`/schedules/${currentSchedule.id}/edit`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Schedule
                </Link>
              )}
              <Link
                to="/schedules"
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Schedules
              </Link>
              {canDelete && (
                <button
                  onClick={handleToggleStatus}
                  className={`w-full inline-flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                    currentSchedule.isActive
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {currentSchedule.isActive ? (
                    <UserX className="w-4 h-4 mr-2" />
                  ) : (
                    <UserCheck className="w-4 h-4 mr-2" />
                  )}
                  {currentSchedule.isActive ? 'Disable Schedule' : 'Enable Schedule'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default ScheduleDetails;
