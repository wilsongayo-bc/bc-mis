import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  BookOpen as _BookOpen,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  Building,
  ChevronDown,
} from 'lucide-react';
import { AppDispatch, RootState } from '../store';
import {
  fetchTeacherTimetable,
  fetchGradeLevelTimetable,
  fetchRoomSchedule,
  clearError,
} from '../store/slices/schedulingSlice';
// import { toast } from 'sonner';
import FacultyLoadSummary from '../components/schedules/FacultyLoadSummary';
import { useSettingsContext } from '../utils/settingsUtils';

type TimetableView = 'teacher' | 'gradeLevel' | 'room';
type TimeSlot = {
  time: string;
  label: string;
};

type DropdownOption = {
  id: string;
  name: string;
  value: string;
  courseId?: string;
};

type DropdownData = {
  teachers: DropdownOption[];
  classes: DropdownOption[];
  rooms: DropdownOption[];
};

/**
 * Timetable component - Visual timetable/calendar view
 * Features: weekly schedule display, multiple view types, filtering, responsive design
 */
// Time slots for the timetable with 30-minute intervals
const timeSlots: TimeSlot[] = [
  { time: '07:30', label: '7:30 AM' },
  { time: '08:00', label: '8:00 AM' },
  { time: '08:30', label: '8:30 AM' },
  { time: '09:00', label: '9:00 AM' },
  { time: '09:30', label: '9:30 AM' },
  { time: '10:00', label: '10:00 AM' },
  { time: '10:30', label: '10:30 AM' },
  { time: '11:00', label: '11:00 AM' },
  { time: '11:30', label: '11:30 AM' },
  { time: '12:00', label: '12:00 PM' },
  { time: '12:30', label: '12:30 PM' },
  { time: '13:00', label: '1:00 PM' },
  { time: '13:30', label: '1:30 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '14:30', label: '2:30 PM' },
  { time: '15:00', label: '3:00 PM' },
  { time: '15:30', label: '3:30 PM' },
  { time: '16:00', label: '4:00 PM' },
  { time: '16:30', label: '4:30 PM' },
  { time: '17:00', label: '5:00 PM' },
  { time: '17:30', label: '5:30 PM' },
];

// Days of the week
const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Helper interface for Schedule items in the timetable
interface TimetableSchedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
  subject?: { code: string };
  room?: string;
  teacher?: { user: { firstName: string; lastName: string } };
}

const Timetable: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSettingsContext();

  const {    timetable,    isLoading,    error,  } = useSelector((state: RootState) => state.scheduling);  
  const { token, user } = useSelector((state: RootState) => state.auth);
  const isProgramHead =
    user?.role === 'TEACHER' && typeof user?.position === 'string' && user.position.toLowerCase().startsWith('program head');

  // Auto-select "me" for teachers and registrars with assigned teaching profiles.
  useEffect(() => {
    if (user?.role === 'TEACHER' && !isProgramHead) {
      setCurrentView('teacher');
      setSelectedId('me');
    } else if (isProgramHead) {
      setCurrentView('gradeLevel');
      setSelectedId('');
      setShowFilters(true);
    } else if (user?.role === 'STUDENT') {
      setCurrentView('gradeLevel');
    } else if (user?.role === 'REGISTRAR') {
      const resolveTeachingProfile = async () => {
        try {
          const response = await api.get('/teachers/profile');
          if (response.data?.data?.id) {
            setCurrentView('teacher');
            setSelectedId('me');
            return;
          }
        } catch {
          // No linked teacher profile for this registrar.
        }

      };

      resolveTeachingProfile();
    }
  }, [user, isProgramHead]);

  const [currentView, setCurrentView] = useState<TimetableView>('teacher');
  const [selectedId, setSelectedId] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'range'>('week');
  const [rangeStart, setRangeStart] = useState<string>('');
  const [rangeEnd, setRangeEnd] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [courseOptions, setCourseOptions] = useState<{ id: string; name: string; courseCode: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  // Dropdown data and loading states
  const [dropdownData, setDropdownData] = useState<DropdownData>({
    teachers: [],
    classes: [],
    rooms: []
  });
  const [dropdownLoading, setDropdownLoading] = useState({
    teachers: false,
    classes: false,
    rooms: false
  });
  const [dropdownErrors, setDropdownErrors] = useState({
    teachers: '',
    classes: '',
    rooms: ''
  });

  const [lockedStudentClass, setLockedStudentClass] = useState<DropdownOption | null>(null);

  useEffect(() => {
    const resolveStudentClass = async () => {
      if (user?.role !== 'STUDENT') {
        setLockedStudentClass(null);
        return;
      }

      try {
        const enrollmentsResponse = await api.get('/enrollments/my-enrollments');
        const enrollments = enrollmentsResponse.data?.data || [];
        const enrolled = enrollments.find((enrollment: { status?: string }) => enrollment?.status === 'ENROLLED') || enrollments[0];
        const courseSection = enrolled?.courseSection;
        const course = enrolled?.course;

        if (!courseSection?.id) {
          setLockedStudentClass(null);
          return;
        }

        const label = `${course?.courseCode || 'N/A'} - ${courseSection.sectionName || 'N/A'}`;
        const option: DropdownOption = {
          id: courseSection.id,
          value: courseSection.id,
          name: label
        };

        setLockedStudentClass(option);
        setSelectedId(prev => prev || courseSection.id);
        setShowFilters(true);
      } catch {
        setLockedStudentClass(null);
      }
    };

    resolveStudentClass();
  }, [user?.role]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await api.get('/courses?page=1&limit=500&isActive=true');
        if (response.data?.success) {
          setCourseOptions(response.data.data || []);
          return;
        }
        setCourseOptions(response.data?.data || []);
      } catch {
        setCourseOptions([]);
      }
    };

    if (!isProgramHead) {
      setSelectedCourseId('');
      return;
    }

    if (courseOptions.length > 0) return;
    loadCourses();
  }, [courseOptions.length, isProgramHead]);

  const filteredClasses = useMemo(() => {
    if (!selectedCourseId) return dropdownData.classes;
    const selectedCourse = courseOptions.find(course => course.id === selectedCourseId);
    return dropdownData.classes.filter(cls => {
      if (cls.courseId && cls.courseId === selectedCourseId) return true;
      if (selectedCourse?.courseCode && cls.name.startsWith(`${selectedCourse.courseCode} -`)) return true;
      return false;
    });
  }, [courseOptions, dropdownData.classes, selectedCourseId]);

  useEffect(() => {
    if (!isProgramHead) return;
    if (currentView !== 'gradeLevel') return;
    if (!selectedCourseId) return;
    if (!selectedId) return;
    const isStillVisible = filteredClasses.some(cls => cls.value === selectedId);
    if (!isStillVisible) {
      setSelectedId('');
    }
  }, [currentView, filteredClasses, isProgramHead, selectedCourseId, selectedId]);

  // API functions for fetching dropdown data
  const fetchTeachers = useCallback(async () => {
    setDropdownLoading(prev => ({ ...prev, teachers: true }));
    setDropdownErrors(prev => ({ ...prev, teachers: '' }));
    
    try {
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await api.get('/employees/role/teachers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = response.data;
      console.log('Teachers API response:', result);
      
      // Handle API response structure with data property
      const teachers = result.data || result;
      if (!Array.isArray(teachers)) {
        throw new Error('Teachers data is not an array');
      }
      
      const teacherOptions = teachers.map((teacher: { id: string; user: { firstName: string; lastName: string } }) => ({
        id: teacher.id,
        name: `${teacher.user?.firstName || 'Unknown'} ${teacher.user?.lastName || 'Teacher'}`,
        value: teacher.id
      }));
      
      setDropdownData(prev => ({ ...prev, teachers: teacherOptions }));
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setDropdownErrors(prev => ({ ...prev, teachers: 'Failed to load teachers' }));
    } finally {
      setDropdownLoading(prev => ({ ...prev, teachers: false }));
    }
  }, [token]);

  const fetchClasses = useCallback(async () => {
    setDropdownLoading(prev => ({ ...prev, classes: true }));
    setDropdownErrors(prev => ({ ...prev, classes: '' }));
    
    try {
      if (!token) {
        throw new Error('No authentication token available');
      }

      if (user?.role === 'STUDENT' && lockedStudentClass) {
        setDropdownData(prev => ({ ...prev, classes: [lockedStudentClass] }));
        return;
      }
      
      const response = await api.get('/course-sections', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = response.data;
      console.log('Classes API response:', result);
      
      // Handle API response structure with data property
      const classes = result.data || result;
      if (!Array.isArray(classes)) {
        throw new Error('Classes data is not an array');
      }
      
      const classOptions = classes.map((cls: { id: string; course?: { id?: string; courseCode: string }; sectionName?: string; section?: string }) => ({
        id: cls.id,
        name: `${cls.course?.courseCode || 'N/A'} - ${cls.sectionName || cls.section || 'N/A'}`,
        value: cls.id,
        courseId: cls.course?.id
      }));
      
      setDropdownData(prev => ({ ...prev, classes: classOptions }));
    } catch (error) {
      console.error('Error fetching classes:', error);
      setDropdownErrors(prev => ({ ...prev, classes: 'Failed to load classes' }));
    } finally {
      setDropdownLoading(prev => ({ ...prev, classes: false }));
    }
  }, [token, user?.role, lockedStudentClass]);

  const fetchRooms = useCallback(async () => {
    console.log('🏢 fetchRooms called - Starting room fetch');
    console.log('🏢 Making API call to /api/schedules/rooms');
    setDropdownLoading(prev => ({ ...prev, rooms: true }));
    setDropdownErrors(prev => ({ ...prev, rooms: '' }));
    
    try {
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await api.get('/schedules/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = response.data;
      console.log('Rooms API response:', result);
      
      // Handle API response structure with data property
      const rooms = result.data || result;
      if (!Array.isArray(rooms)) {
        throw new Error('Rooms data is not an array');
      }
      
      const roomOptions = rooms.map((room: { id?: string; name?: string; value?: string }) => ({
        id: room.id || room.value,
        name: room.name || room.value || 'Unknown Room',
        value: room.value || room.id
      }));
      
      setDropdownData(prev => ({ ...prev, rooms: roomOptions }));
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setDropdownErrors(prev => ({ ...prev, rooms: 'Failed to load rooms' }));
    } finally {
      setDropdownLoading(prev => ({ ...prev, rooms: false }));
    }
  }, [token]);

  // Load timetable data
  useEffect(() => {
    console.log('🔄 Timetable useEffect triggered:', { selectedId, currentView });
    if (selectedId) {
      switch (currentView) {
        case 'teacher':
          console.log('👨‍🏫 Fetching teacher timetable for ID:', selectedId);
          dispatch(fetchTeacherTimetable(selectedId));
          break;
        case 'gradeLevel':
          console.log('🎓 Fetching grade level timetable for ID:', selectedId);
          dispatch(fetchGradeLevelTimetable(selectedId));
          break;
        case 'room':
          console.log('🏫 Fetching room timetable for ID:', selectedId);
          dispatch(fetchRoomSchedule(selectedId));
          break;
      }
    } else {
      console.log('⚠️ No selectedId provided, skipping timetable fetch');
    }
  }, [dispatch, currentView, selectedId, currentWeek]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Load dropdown data when component mounts or view changes
  useEffect(() => {
    // Skip fetching dropdown data if user is a teacher (they only see their own data)
    if (user?.role === 'TEACHER' && !isProgramHead) return;

    console.log('🔄 Dropdown useEffect triggered:', { 
      currentView, 
      hasToken: !!token,
      teachersCount: dropdownData.teachers.length,
      classesCount: dropdownData.classes.length,
      roomsCount: dropdownData.rooms.length
    });
    
    switch (currentView) {
      case 'teacher':
        // Students cannot view teacher schedules
        if (user?.role === 'STUDENT') break;
        if (dropdownData.teachers.length === 0) {
          console.log('📞 Calling fetchTeachers');
          fetchTeachers();
        }
        break;
      case 'gradeLevel':
        if (dropdownData.classes.length === 0) {
          console.log('📞 Calling fetchClasses');
          fetchClasses();
        }
        break;
      case 'room':
        // Students cannot view room schedules
        if (user?.role === 'STUDENT') break;
        console.log('🏢 Room case - rooms length:', dropdownData.rooms.length);
        if (dropdownData.rooms.length === 0) {
          console.log('📞 Calling fetchRooms because rooms array is empty');
          fetchRooms();
        } else {
          console.log('⏭️ Skipping fetchRooms - rooms already loaded');
        }
        break;
    }
  }, [currentView, dropdownData.classes.length, dropdownData.rooms.length, dropdownData.teachers.length, fetchClasses, fetchRooms, fetchTeachers, isProgramHead, token, user]);

  // Get week start date (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  // Get week end date (Friday)
  const getWeekEnd = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -2 : 5);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const isRangeActive = viewMode === 'range' && rangeStart && rangeEnd;

  // Go to current week
  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  // When switching to range mode or updating rangeStart, align grid to the start week
  useEffect(() => {
    if (viewMode === 'range' && rangeStart) {
      const start = new Date(rangeStart);
      if (!isNaN(start.getTime())) {
        const weekStartStr = getWeekStart(start);
        const weekStartDate = new Date(weekStartStr);
        setCurrentWeek(weekStartDate);
      }
    }
  }, [viewMode, rangeStart]);

  // Format time for display - consistent formatting without extra spaces
  const formatTime = (time: string) => {
    const date = new Date(`2000-01-01T${time}`);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${hours}:${minutesStr} ${ampm}`;
  };

  // Helper function to check if two time ranges overlap
  const timeRangesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1Minutes = parseTime(start1);
    const end1Minutes = parseTime(end1);
    const start2Minutes = parseTime(start2);
    const end2Minutes = parseTime(end2);
    
    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  };



  // Get ALL schedules for specific day and time slot (including overlaps)
  const getSchedulesForSlot = useCallback((day: string, timeSlot: string) => {
    // console.log('🔍 Looking for schedules - Day:', day, 'Time:', timeSlot);
    
    if (!timetable || !Array.isArray(timetable)) {
      return [];
    }
    
    // Calculate the end time for the current slot (assuming 30-minute slots)
    const slotEndTime = (() => {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + 30; // Add 30 minutes
      const endHour = Math.floor(totalMinutes / 60);
      const endMinute = totalMinutes % 60;
      return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    })();
    
    const matchingSchedules = timetable.filter(schedule => {
      const scheduleDayOfWeek = schedule.dayOfWeek ? schedule.dayOfWeek.toLowerCase() : '';
      const dayMatch = scheduleDayOfWeek.includes(day.toLowerCase());
      
      if (!dayMatch) return false;

      // Check date range
      const weekStartStr = getWeekStart(currentWeek);
      const weekStartDate = new Date(weekStartStr);
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const dayOffset = days.indexOf(day.toUpperCase());
      
      if (dayOffset !== -1) {
        const targetDate = new Date(weekStartDate);
        targetDate.setDate(targetDate.getDate() + dayOffset);

        // Additional filter: when range mode is active, restrict to selected date range
        if (isRangeActive) {
          try {
            const rStart = new Date(rangeStart);
            const rEnd = new Date(rangeEnd);
            if (!isNaN(rStart.getTime()) && !isNaN(rEnd.getTime())) {
              if (targetDate < rStart || targetDate > rEnd) return false;
            }
          } catch (_err) {
            // Ignore date parsing errors
          }
        }
        
        // Only enforce start/end dates in Range View or if strictly required
        // In Week View, we treat it as a "Master Schedule"
        if (viewMode === 'range') {
          if (schedule.startDate) {
            const startDate = new Date(schedule.startDate);
            if (targetDate < startDate) return false;
          }
          if (schedule.endDate) {
            const endDate = new Date(schedule.endDate);
            if (targetDate > endDate) return false;
          }
        }
      }
      
      // Check for time overlap
      const scheduleStart = schedule.startTime.substring(0, 5);
      const scheduleEnd = schedule.endTime.substring(0, 5);
      
      const hasOverlap = timeRangesOverlap(timeSlot, slotEndTime, scheduleStart, scheduleEnd);
      
      return hasOverlap;
    });

    // Deduplicate by schedule id to avoid duplicate React keys and repeated entries
    const seen = new Set<string>();
    const uniqueSchedules = matchingSchedules.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    return uniqueSchedules;
  }, [timetable, currentWeek, viewMode, rangeStart, rangeEnd, isRangeActive]);

  // Pre-calculate grid layout with merged cells
  const processedGrid = useMemo(() => {
    const grid: Record<string, { rowSpan: number, skip: boolean, schedules: TimetableSchedule[] }> = {};
    
    daysOfWeek.forEach(day => {
      // First, collect all schedules for this day
      const rawDaySchedules = (timetable || []).filter(schedule => {
        const scheduleDayOfWeek = (schedule.dayOfWeek || '').toLowerCase();
        if (!scheduleDayOfWeek.includes(day.toLowerCase())) return false;
        
        // Apply date filtering like getSchedulesForSlot does
        const weekStartStr = getWeekStart(currentWeek);
        const weekStartDate = new Date(weekStartStr);
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        const dayOffset = days.indexOf(day.toUpperCase());
        const targetDate = new Date(weekStartDate);
        if (dayOffset !== -1) {
          targetDate.setDate(targetDate.getDate() + dayOffset);
          
          if (isRangeActive) {
            try {
              const rStart = new Date(rangeStart);
              const rEnd = new Date(rangeEnd);
              if (!isNaN(rStart.getTime()) && !isNaN(rEnd.getTime())) {
                if (targetDate < rStart || targetDate > rEnd) return false;
              }
            } catch {
              // Ignore date parsing errors
            }
          }
          
          if (viewMode === 'range') {
            if (schedule.startDate) {
              const sStart = new Date(schedule.startDate);
              if (targetDate < sStart) return false;
            }
            if (schedule.endDate) {
              const sEnd = new Date(schedule.endDate);
              if (targetDate > sEnd) return false;
            }
          }
        }
        
        return true;
      });
      
      // Deduplicate schedules - remove duplicates with same subject, time, room, teacher
      const uniqueScheduleKeys = new Set<string>();
      const daySchedules = rawDaySchedules.filter(schedule => {
        // Create a unique key for each schedule based on its attributes
        const subjectCode = schedule.subject?.code || '';
        const teacherId = schedule.teacher?.id || '';
        const room = schedule.room || '';
        const startTime = schedule.startTime.substring(0, 5);
        const endTime = schedule.endTime.substring(0, 5);
        
        const key = `${day}-${subjectCode}-${startTime}-${endTime}-${room}-${teacherId}`;
        
        if (uniqueScheduleKeys.has(key)) {
          return false;
        }
        uniqueScheduleKeys.add(key);
        return true;
      });
      
      for (let i = 0; i < timeSlots.length; i++) {
        const key = `${day}-${timeSlots[i].time}`;
        
        // If this slot was already covered by a previous span, skip
        if (grid[key]?.skip) continue;

        // Get schedules that overlap with this slot
        const parseTime = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const slotStartMinutes = parseTime(timeSlots[i].time);
        const slotEndMinutes = slotStartMinutes + 30;
        
        // Find all schedules that overlap with this slot
        const overlappingSchedules = daySchedules.filter(schedule => {
          const sStart = parseTime(schedule.startTime.substring(0, 5));
          const sEnd = parseTime(schedule.endTime.substring(0, 5));
          return sStart < slotEndMinutes && slotStartMinutes < sEnd;
        });
        
        // Find the latest end time among all overlapping schedules
        let latestEndMinutes = slotEndMinutes; // Default to just this slot
        overlappingSchedules.forEach(schedule => {
          const sEnd = parseTime(schedule.endTime.substring(0, 5));
          if (sEnd > latestEndMinutes) {
            latestEndMinutes = sEnd;
          }
        });
        
        // Calculate how many slots this span covers
        let span = 1;
        for (let j = i + 1; j < timeSlots.length; j++) {
          const nextSlotStart = parseTime(timeSlots[j].time);
          
          // Check if next slot overlaps with our latest end time
          if (nextSlotStart < latestEndMinutes) {
            span++;
            grid[`${day}-${timeSlots[j].time}`] = { rowSpan: 0, skip: true, schedules: [] };
          } else {
            break;
          }
        }
        
        // All unique schedules for this entire span
        const spanSchedules = overlappingSchedules;
        
        // Sort schedules so they appear consistently
        spanSchedules.sort((a, b) => {
          if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
          return (a.subject?.code || '').localeCompare(b.subject?.code || '');
        });
        
        grid[key] = { rowSpan: span, skip: false, schedules: spanSchedules };
      }
    });
    return grid;
  }, [getSchedulesForSlot, timetable, currentWeek, viewMode, rangeStart, rangeEnd, isRangeActive]);

  // Get week range display
  const getWeekRange = () => {
    const start = new Date(getWeekStart(currentWeek));
    const end = new Date(getWeekEnd(currentWeek));
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getDisplayRange = () => {
    if (isRangeActive) {
      const s = new Date(rangeStart);
      const e = new Date(rangeEnd);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    }
    return getWeekRange();
  };

  // Handle view change
  const handleViewChange = (view: TimetableView) => {
    console.log('🔄 View changed to:', view);
    setCurrentView(view);
    setSelectedId('');
  };

  // Get display name for selected item
  const getSelectedDisplayName = () => {
    if (!selectedId) return 'Not selected';
    if (selectedId === 'me') return currentView === 'teacher' ? 'My Teaching Schedule' : 'My Timetable';
    
    switch (currentView) {
      case 'teacher': {
        const teacher = dropdownData.teachers.find(t => t.value === selectedId);
        return teacher ? teacher.name : selectedId;
      }
      case 'gradeLevel': {
        const cls = dropdownData.classes.find(c => c.value === selectedId);
        return cls ? cls.name : selectedId;
      }
      case 'room': {
        const room = dropdownData.rooms.find(r => r.value === selectedId);
        return room ? room.name : selectedId;
      }
      default:
        return selectedId;
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (selectedId) {
      switch (currentView) {
        case 'teacher':
          dispatch(fetchTeacherTimetable(selectedId));
          break;
        case 'gradeLevel':
          dispatch(fetchGradeLevelTimetable(selectedId));
          break;
        case 'room':
          dispatch(fetchRoomSchedule(selectedId));
          break;
      }
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle export (placeholder)
  const handleExport = () => {
    // toast.info('Export functionality coming soon');
    console.log('Export functionality coming soon');
  };

  return (
    <div className="p-4 w-full mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-5 space-y-4">
        {/* Title + Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Timetable</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Visual schedule view for teachers, classes, and rooms</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 rounded-xl transition-all shadow-sm text-sm font-medium ${
                showFilters
                  ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 dark:shadow-blue-900/30'
                  : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4.5 h-4.5 mr-2" />
              Filters
            </button>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/40 disabled:opacity-50 disabled:shadow-none text-sm font-medium"
            >
              <RefreshCw className={`w-4.5 h-4.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all shadow-lg shadow-gray-200 dark:shadow-gray-900/40 text-sm font-medium"
            >
              <Printer className="w-4.5 h-4.5 mr-2" />
              Print
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-200 dark:shadow-green-900/40 text-sm font-medium"
            >
              <Download className="w-4.5 h-4.5 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Timetable Filters</h3>
            <div className={`grid grid-cols-1 gap-3 ${isProgramHead && currentView === 'gradeLevel' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              {/* View Mode */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">View Mode</label>
                <div className="space-y-1">
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="viewMode"
                      value="week"
                      checked={viewMode === 'week'}
                      onChange={(e) => setViewMode(e.target.value as 'week' | 'range')}
                      className="mr-1.5"
                    />
                    Week
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      name="viewMode"
                      value="range"
                      checked={viewMode === 'range'}
                      onChange={(e) => setViewMode(e.target.value as 'week' | 'range')}
                      className="mr-1.5"
                    />
                    Date Range
                  </label>
                </div>
              </div>
              {/* View Type */}
              {(user?.role !== 'TEACHER' || isProgramHead) && user?.role !== 'STUDENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  View Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="viewType"
                      value="teacher"
                      checked={currentView === 'teacher'}
                      onChange={(e) => handleViewChange(e.target.value as TimetableView)}
                      className="mr-2"
                    />
                    <User className="w-4 h-4 mr-1" />
                    Teacher Schedule
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="viewType"
                      value="gradeLevel"
                      checked={currentView === 'gradeLevel'}
                      onChange={(e) => handleViewChange(e.target.value as TimetableView)}
                      className="mr-2"
                    />
                    <GraduationCap className="w-4 h-4 mr-1" />
                    Class Schedule
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="viewType"
                      value="room"
                      checked={currentView === 'room'}
                      onChange={(e) => handleViewChange(e.target.value as TimetableView)}
                      className="mr-2"
                    />
                    <Building className="w-4 h-4 mr-1" />
                    Room Schedule
                  </label>
                </div>
              </div>
              )}

              {isProgramHead && currentView === 'gradeLevel' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-800 pr-10"
                    >
                      <option value="">All Courses</option>
                      {courseOptions.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.courseCode} - {course.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Selection Dropdown */}
              {(user?.role !== 'TEACHER' || isProgramHead) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {currentView === 'teacher' && 'Select Teacher'}
                  {currentView === 'gradeLevel' && (user?.role === 'STUDENT' ? 'Select Your Class' : 'Select Class')}
                  {currentView === 'room' && 'Select Room'}
                </label>
                <div className="relative">
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    disabled={
                      dropdownLoading[currentView === 'gradeLevel' ? 'classes' : currentView] ||
                      (user?.role === 'STUDENT' && Boolean(lockedStudentClass))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white dark:bg-gray-800 pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {dropdownLoading[currentView === 'gradeLevel' ? 'classes' : currentView]
                        ? 'Loading...'
                        : `Select ${currentView === 'teacher' ? 'a teacher' : currentView === 'gradeLevel' ? 'a class' : 'a room'}`
                      }
                    </option>
                    {currentView === 'teacher' &&
                      dropdownData.teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.value}>
                          {teacher.name}
                        </option>
                      ))
                    }
                    {currentView === 'gradeLevel' &&
                      filteredClasses.map((cls) => (
                        <option key={cls.id} value={cls.value}>
                          {cls.name}
                        </option>
                      ))
                    }
                    {currentView === 'room' &&
                      dropdownData.rooms.map((room) => (
                        <option key={room.id} value={room.value}>
                          {room.name}
                        </option>
                      ))
                    }
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  {dropdownErrors[currentView === 'gradeLevel' ? 'classes' : currentView] && (
                    <p className="mt-1 text-sm text-red-600">
                      {dropdownErrors[currentView === 'gradeLevel' ? 'classes' : currentView]}
                    </p>
                  )}
                </div>
              </div>
              )}

              {/* Week Navigation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Week Selection
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    disabled={viewMode === 'range'}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToCurrentWeek}
                    className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    disabled={viewMode === 'range'}
                  >
                    Current Week
                  </button>
                  <button
                    onClick={goToNextWeek}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    disabled={viewMode === 'range'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Date Range Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
                  />
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Week Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all disabled:opacity-50"
              disabled={viewMode === 'range'}
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{getDisplayRange()}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                <span className="font-medium">{viewMode === 'week' ? 'Week View' : 'Range View'}</span>
              </p>
            </div>
            <button
              onClick={goToNextWeek}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all disabled:opacity-50"
              disabled={viewMode === 'range'}
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              {currentView === 'teacher' && 'Teacher'}
              {currentView === 'gradeLevel' && 'Class'}
              {currentView === 'room' && 'Room'}
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {getSelectedDisplayName()}
            </span>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Faculty Load Summary (Only in Teacher View) */}
      {currentView === 'teacher' && selectedId && timetable && (
        <FacultyLoadSummary 
          schedules={Array.isArray(timetable) ? timetable : []} 
          theme={theme}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading timetable...</p>
        </div>
      )}

      {/* No Selection State */}
      {!selectedId && !isLoading && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a {currentView}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Choose a {currentView === 'teacher' ? 'teacher' : currentView === 'gradeLevel' ? 'grade level' : 'room'} to view the timetable.
          </p>
        </div>
      )}

      {/* Timetable Grid */}
      {selectedId && !isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 w-16 bg-white dark:bg-gray-800 sticky left-0 z-10">
                    Time
                  </th>
                  {dayLabels.map((day, _index) => (
                    <th key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {timeSlots.map((slot) => (
                  <tr key={slot.time} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-2 py-1 whitespace-nowrap text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-50/80 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-16 sticky left-0 z-10">
                      {slot.label}
                    </td>
                    {daysOfWeek.map((day) => {
                      const cellData = processedGrid[`${day}-${slot.time}`];
                      
                      if (!cellData || cellData.skip) return null;
                      
                      const { schedules, rowSpan } = cellData;
                      const hasConflict = schedules.length > 1;
                      
                      return (
                        <td 
                          key={`${day}-${slot.time}`} 
                          rowSpan={rowSpan}
                          className="px-1 py-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0 align-stretch"
                        >
                          {schedules.length > 0 ? (
                            <div className={`flex flex-col h-full gap-1 ${hasConflict ? 'overflow-y-auto' : ''}`}>
                              {schedules.map((schedule, index) => {
                                // Simple color assignment based on subject code for better visual distinction (no red/rose, that's for overlaps only)
                                const colorIndex = (schedule.subject?.code?.charCodeAt(0) || 0) % 5;
                                const colorClasses = [
                                  'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-900',
                                  'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-900',
                                  'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-900',
                                  'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-900',
                                  'bg-cyan-50 border-cyan-200 hover:bg-cyan-100 text-cyan-900'
                                ];
                                const baseColorClass = colorClasses[colorIndex];
                                
                                return (
                                <div 
                                  key={`${schedule.id}-${day}-${slot.time}-${index}`}
                                  className={`flex-1 flex flex-col rounded-md p-1.5 transition-all relative text-xs border shadow-sm ${
                                    hasConflict 
                                      ? 'bg-red-50 border-red-300 hover:bg-red-100 text-red-900' 
                                      : baseColorClass
                                  }`}
                                >
                                  {/* Conflict indicator */}
                                  {hasConflict && (
                                    <div className="absolute top-1 right-1 flex items-center bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200">
                                      <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                      <span className="text-[10px] text-red-700 ml-0.5 font-semibold">
                                        {index + 1}/{schedules.length}
                                      </span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between mb-1 shrink-0">
                                    {user?.role === 'TEACHER' || user?.role === 'REGISTRAR' ? (
                                      <Link
                                        to={`/schedules/${schedule.id}/class-list`}
                                        className={`font-bold text-xs truncate hover:underline ${
                                          hasConflict ? 'text-red-900' : ''
                                        }`}
                                        title="View class list"
                                      >
                                        {schedule.subject?.code || 'N/A'}
                                      </Link>
                                    ) : (
                                      <h4 className={`font-bold text-xs truncate ${
                                        hasConflict ? 'text-red-900' : ''
                                      }`}>
                                        {schedule.subject?.code || 'N/A'}
                                      </h4>
                                    )}
                                    <div className="flex items-center gap-1">
                                      {(user?.role === 'TEACHER' || user?.role === 'REGISTRAR') && (
                                        <Link
                                          to={`/schedules/${schedule.id}/class-list`}
                                          className={`p-1 rounded-md transition-all hover:scale-110 shadow-sm ${
                                            hasConflict 
                                              ? 'text-red-700 bg-red-100 hover:bg-red-200 border border-red-200' 
                                              : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100'
                                          }`}
                                          title="View class list"
                                        >
                                          <Users className="w-4 h-4" />
                                        </Link>
                                      )}
                                      <Link
                                        to={`/schedules/${schedule.id}`}
                                        className={`p-1 rounded-md transition-all hover:scale-110 shadow-sm ${
                                          hasConflict 
                                            ? 'text-red-700 bg-red-100 hover:bg-red-200 border border-red-200' 
                                            : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100'
                                        }`}
                                        title="View details"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Link>
                                    </div>
                                  </div>
                                  
                                  <div className={`flex-1 flex flex-col justify-center space-y-0.5 text-[10px] ${
                                    hasConflict ? 'text-red-700' : ''
                                  }`}>
                                    <div className="flex items-center font-medium">
                                      <Clock className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                                      <span className="truncate">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                                    </div>
                                    {schedule.room && (
                                    <div className="flex items-center">
                                      <MapPin className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                                      <span className="truncate">{schedule.room}</span>
                                    </div>
                                    )}
                                    {currentView !== 'teacher' && schedule.teacher && (
                                      <div className="flex items-center">
                                        <User className="w-2.5 h-2.5 mr-1 flex-shrink-0" />
                                        <span className="truncate">
                                          {schedule.teacher.user.firstName} {schedule.teacher.user.lastName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )})}
                              
                              {/* Conflict summary */}
                              {hasConflict && (
                                <div className="shrink-0 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-md p-1">
                                  <div className="flex items-center text-xs text-red-800">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    <span className="font-semibold">{schedules.length} overlapping</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-xs bg-gray-50/10 rounded-md border border-dashed border-gray-100">
                              <span className="font-medium">Free</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedId && !isLoading && timetable && Object.keys(timetable).length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No schedules found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No schedules found for the selected {currentView} in this week.
          </p>
          <Link
            to="/schedules/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Create Schedule
          </Link>
        </div>
      )}
    </div>
  );
};

export default Timetable;
