import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../lib/api';
import { API_BASE_URL } from './authSlice';

// Types
export interface Schedule {
  id: string;
  subjectId: string;
  courseSectionId?: string;
  teacherId: string;
  gradeLevelId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  semester: 'FIRST' | 'SECOND';
  year: string; // Frontend uses 'year'
  academicYear: string; // Backend uses 'academicYear'
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subject?: {
    id: string;
    name: string;
    code: string;
    units: number;
    lectureHours: number;
    labHours: number;
    department: string;
    description?: string;
    prerequisites?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  teacher?: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    department: string;
    position: string;
  };
  gradeLevel?: {
    id: string;
    name: string;
    level: number;
  };
  courseSection?: {
    id: string;
    sectionName: string;
    yearLevel: string;
    maxStudents?: number;
    course?: {
      id: string;
      courseCode: string;
      name: string;
    };
  };
}

export interface SchedulingState {
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  timetable: Schedule[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScheduleFilters {
  subjectId?: string;
  teacherId?: string;
  gradeLevelId?: string;
  dayOfWeek?: string;
  room?: string;
  sectionName?: string;
  semester?: string;
  year?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  courseId?: string;
  yearLevel?: string;
}

export interface CreateScheduleData {
  subjectId: string;
  courseSectionId?: string;
  teacherId: string;
  gradeLevelId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  semester: 'FIRST' | 'SECOND';
  year: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface CreateBulkSchedulesData {
  subjectId: string;
  courseSectionIds: string[];
  teacherId: string;
  gradeLevelId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  semester: 'FIRST' | 'SECOND';
  year: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface UpdateScheduleData {
  subjectId?: string;
  courseSectionId?: string;
  teacherId?: string;
  gradeLevelId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  semester?: 'FIRST' | 'SECOND';
  year?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface SchedulesResponse {
  schedules: Schedule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SchedulingStatistics {
  totalSchedules: number;
  activeSchedules: number;
  totalRooms: number;
  roomUtilization: Array<{
    room: string;
    utilizationPercentage: number;
    totalHours: number;
  }>;
  teacherWorkload: Array<{
    teacherId: string;
    teacherName: string;
    totalHours: number;
    subjectCount: number;
  }>;
  schedulesByDay: Array<{
    dayOfWeek: string;
    count: number;
  }>;
  schedulesByTime: Array<{
    timeSlot: string;
    count: number;
  }>;
  conflictingSchedules: Array<{
    scheduleId: string;
    conflictType: string;
    description: string;
  }>;
}

export interface TimetableEntry {
  timeSlot: string;
  monday?: Schedule;
  tuesday?: Schedule;
  wednesday?: Schedule;
  thursday?: Schedule;
  friday?: Schedule;
  saturday?: Schedule;
  sunday?: Schedule;
}

export interface WeeklyTimetable {
  entries: TimetableEntry[];
  metadata: {
    teacherId?: string;
    teacherName?: string;
    gradeLevelId?: string;
    gradeLevelName?: string;
    room?: string;
    semester: string;
    year: number;
  };
}

// Helper function to get auth headers
const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Initial state
const initialState: SchedulingState = {
  schedules: [],
  currentSchedule: null,
  timetable: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};



// Async thunks
export const fetchSchedules = createAsyncThunk(
  'scheduling/fetchSchedules',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    room?: string;
    roomId?: string;
    sectionName?: string;
    subjectId?: string;
    teacherId?: string;
    dayOfWeek?: string;
    timeSlot?: string;
    semester?: string;
    academicYear?: string;
    year?: string | number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    courseId?: string; // Dweezil's Code - Added courseId parameter
    yearLevel?: string;
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      const roomValue = params.roomId || params.room;
      if (roomValue) queryParams.append('room', roomValue);
      if (params.sectionName) queryParams.append('sectionName', params.sectionName);
      if (params.subjectId) queryParams.append('subjectId', params.subjectId);
      if (params.teacherId) queryParams.append('teacherId', params.teacherId);
      if (params.dayOfWeek) queryParams.append('dayOfWeek', params.dayOfWeek);
      if (params.timeSlot) queryParams.append('timeSlot', params.timeSlot);
      if (params.semester) queryParams.append('semester', params.semester);
      const academicYearValue = params.academicYear ?? (params.year !== undefined ? String(params.year) : undefined);
      if (academicYearValue) queryParams.append('academicYear', academicYearValue);
      if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      // Dweezil's Code - Add courseId to query params
      if (params.courseId) queryParams.append('courseId', params.courseId);
      if (params.yearLevel) queryParams.append('yearLevel', params.yearLevel);

      const url = `/schedules?${queryParams.toString()}`;
      console.log('🔍 Fetching schedules from:', url);

      const response = await api.get(url);
      console.log('✅ Schedules API success response:', response.data);

      // Handle new pagination response format
      if (response.data.pagination) {
        return {
          schedules: response.data.data,
          total: response.data.pagination.totalItems,
          page: response.data.pagination.currentPage,
          limit: response.data.pagination.itemsPerPage,
          totalPages: response.data.pagination.totalPages
        };
      }

      // Fallback for legacy format
      return {
        schedules: response.data.data || response.data,
        total: response.data.total || 0,
        page: response.data.page || 1,
        limit: response.data.limit || params.limit || 20,
        totalPages: response.data.totalPages || 1
      };
    } catch (error: unknown) {
      console.error('💥 Network error in fetchSchedules:', error);
      // Use the enhanced error message from the API interceptor
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch schedules';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchScheduleById = createAsyncThunk(
  'scheduling/fetchScheduleById',
  async (id: string, { rejectWithValue }) => {
    try {
      const url = `/schedules/${id}`;
      console.log('🔍 Fetching schedule by ID from:', url);

      const response = await api.get(url);
      console.log('✅ Schedule by ID API success response:', response.data);

      return response.data.data || response.data;
    } catch (error: unknown) {
      console.error('💥 Network error in fetchScheduleById:', error);

      // Use the enhanced error message from the API interceptor
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch schedule details';

      return rejectWithValue(errorMessage);
    }
  }
);

export const createSchedule = createAsyncThunk(
  'scheduling/createSchedule',
  async (scheduleData: CreateScheduleData, { rejectWithValue }) => {
    try {
      const url = '/schedules';
      console.log('🔍 Creating schedule at:', url);
      const payload = {
        ...scheduleData,
        academicYear: scheduleData.year
      };
      console.log('📝 Schedule data:', payload);

      const response = await api.post(url, payload);
      console.log('✅ Create schedule API success response:', response.data);

      return response.data.data || response.data;
    } catch (error: any) {
      console.error('💥 Network error in createSchedule:', error);
      // Pass the specific error message from the backend (e.g., 409 Conflict)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create schedule';
      return rejectWithValue(errorMessage);
    }
  }
);

export const createBulkSchedules = createAsyncThunk(
  'scheduling/createBulkSchedules',
  async (scheduleData: CreateBulkSchedulesData, { rejectWithValue }) => {
    try {
      const url = '/schedules/bulk';
      console.log('🔍 Creating bulk schedules at:', url);
      const payload = {
        ...scheduleData,
        academicYear: scheduleData.year
      };
      console.log('📝 Bulk schedule data:', payload);

      const response = await api.post(url, payload);
      console.log('✅ Create bulk schedules API success response:', response.data);

      return response.data.data || response.data;
    } catch (error: any) {
      console.error('💥 Network error in createBulkSchedules:', error);
      // Pass the specific error message from the backend (e.g., 409 Conflict)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create bulk schedules';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateSchedule = createAsyncThunk(
  'scheduling/updateSchedule',
  async ({ id, data }: { id: string; data: Partial<Schedule> }, { rejectWithValue }) => {
    try {
      const url = `/schedules/${id}`;
      console.log('🔍 Updating schedule at:', url);
      console.log('📝 Update data:', data);

      const response = await api.put(url, data);
      console.log('✅ Update schedule API success response:', response.data);

      return response.data.data || response.data;
    } catch (error: any) {
      console.error('💥 Network error in updateSchedule:', error);
      // Pass the specific error message from the backend
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update schedule';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteSchedule = createAsyncThunk(
  'scheduling/deleteSchedule',
  async (id: string, { rejectWithValue }) => {
    try {
      const url = `/schedules/${id}`;
      console.log('🔍 Deleting schedule at:', url);

      await api.delete(url);
      console.log('✅ Schedule deleted successfully');

      return id;
    } catch (error: any) {
      console.error('💥 Network error in deleteSchedule:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete schedule';
      return rejectWithValue(errorMessage);
    }
  }
);

export const fetchTeacherTimetable = createAsyncThunk(
  'scheduling/fetchTeacherTimetable',
  async (teacherId: string, { rejectWithValue, getState }) => {
    try {
      console.log('🔍 Fetching teacher timetable for ID:', teacherId);
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/schedules/teachers/${teacherId}/timetable`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch teacher timetable:', response.status, response.statusText);
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch teacher timetable');
      }

      const result = await response.json();
      console.log('📥 Received teacher timetable data:', result);
      console.log('Teacher timetable API response:', result);
      // Extract the timetable data from the API response
      return result.data || result;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchGradeLevelTimetable = createAsyncThunk(
  'scheduling/fetchGradeLevelTimetable',
  async (gradeLevelId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/schedules/grade-levels/${gradeLevelId}/timetable`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch grade level timetable');
      }

      const result = await response.json();
      console.log('Grade level timetable API response:', result);
      // Extract the timetable data from the API response
      return result.data || result;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchRoomSchedule = createAsyncThunk(
  'scheduling/fetchRoomSchedule',
  async (room: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/schedules/rooms/${encodeURIComponent(room)}/schedule`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch room schedule');
      }

      const result = await response.json();
      return result.data || result;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchSchedulingStatistics = createAsyncThunk(
  'scheduling/fetchSchedulingStatistics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/schedules/statistics`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch statistics');
      }

      const statistics: SchedulingStatistics = await response.json();
      return statistics;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchTeacherSchedules = createAsyncThunk(
  'scheduling/fetchTeacherSchedules',
  async (teacherId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/schedules/instructor/${teacherId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch teacher schedules');
      }

      const schedules: Schedule[] = await response.json();
      return schedules;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchSubjectSchedules = createAsyncThunk(
  'scheduling/fetchSubjectSchedules',
  async (subjectId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/schedules/subject/${subjectId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch subject schedules');
      }

      const schedules: Schedule[] = await response.json();
      return schedules;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchGradeLevelSchedules = createAsyncThunk(
  'scheduling/fetchGradeLevelSchedules',
  async (gradeLevelId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/api/schedules/grade-levels/${gradeLevelId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch grade level schedules');
      }

      const schedules: Schedule[] = await response.json();
      return schedules;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Scheduling slice
const schedulingSlice = createSlice({
  name: 'scheduling',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSchedule: (state) => {
      state.currentSchedule = null;
    },
    clearTimetable: (state) => {
      state.timetable = [];
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch schedules
      .addCase(fetchSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules = action.payload.schedules;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
        state.error = null;
        console.log('✅ fetchSchedules.fulfilled - Updated state:', {
          schedulesCount: state.schedules.length,
          total: state.total,
          page: state.page,
          totalPages: state.totalPages
        });
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch schedule by ID
      .addCase(fetchScheduleById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScheduleById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSchedule = action.payload;
        state.error = null;
      })
      .addCase(fetchScheduleById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create schedule
      .addCase(createSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules.unshift(action.payload);
        state.total += 1;
        state.error = null;
      })
      .addCase(createSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create bulk schedules
      .addCase(createBulkSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBulkSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        const newSchedules = Array.isArray(action.payload) ? action.payload : [action.payload];
        state.schedules.unshift(...newSchedules);
        state.total += newSchedules.length;
        state.error = null;
      })
      .addCase(createBulkSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update schedule
      .addCase(updateSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.schedules.findIndex(schedule => schedule.id === action.payload.id);
        if (index !== -1) {
          state.schedules[index] = action.payload;
        }
        if (state.currentSchedule?.id === action.payload.id) {
          state.currentSchedule = action.payload;
        }
        state.error = null;
      })
      .addCase(updateSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete schedule
      .addCase(deleteSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules = state.schedules.filter(schedule => schedule.id !== action.payload);
        state.total -= 1;
        if (state.currentSchedule?.id === action.payload) {
          state.currentSchedule = null;
        }
        state.error = null;
      })
      .addCase(deleteSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch teacher timetable
      .addCase(fetchTeacherTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeacherTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        console.log('✅ Processing teacher timetable data in Redux:', action.payload);
        // Extract the timetable data from the API response
        const timetableData = action.payload;
        console.log('📊 Extracted timetable data:', timetableData);
        if (timetableData && typeof timetableData === 'object') {
          // Convert the timetable object to an array of schedules
          const schedules: Schedule[] = [];
          Object.values(timetableData).forEach((daySchedules: unknown) => {
            if (Array.isArray(daySchedules)) {
              console.log('📅 Adding schedules for day:', daySchedules.length, 'schedules');
              schedules.push(...daySchedules);
            }
          });
          console.log('🗂️ Final schedules array:', schedules.length, 'total schedules');
          state.timetable = schedules;
        } else {
          console.warn('⚠️ No valid timetable data found, setting empty array');
          state.timetable = [];
        }
      })
      .addCase(fetchTeacherTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch grade level timetable
      .addCase(fetchGradeLevelTimetable.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGradeLevelTimetable.fulfilled, (state, action) => {
        state.isLoading = false;
        console.log('Processing grade level timetable data:', action.payload);
        // Extract schedules from timetable data
        const schedules: Schedule[] = [];
        const timetableData = action.payload;

        if (timetableData && typeof timetableData === 'object') {
          // Iterate through each day of the week
          Object.values(timetableData).forEach(daySchedules => {
            if (Array.isArray(daySchedules)) {
              daySchedules.forEach(schedule => {
                if (schedule && typeof schedule === 'object' && 'id' in schedule) {
                  schedules.push(schedule as Schedule);
                }
              });
            }
          });
        }

        console.log('Extracted schedules for grade level timetable:', schedules);
        state.timetable = schedules;
        state.error = null;
      })
      .addCase(fetchGradeLevelTimetable.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch room schedule
      .addCase(fetchRoomSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoomSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        state.timetable = action.payload;
        state.error = null;
      })
      .addCase(fetchRoomSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch statistics
      .addCase(fetchSchedulingStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSchedulingStatistics.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchSchedulingStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch teacher schedules
      .addCase(fetchTeacherSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeacherSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules = action.payload;
        state.error = null;
      })
      .addCase(fetchTeacherSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch subject schedules
      .addCase(fetchSubjectSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubjectSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules = action.payload;
        state.error = null;
      })
      .addCase(fetchSubjectSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch grade level schedules
      .addCase(fetchGradeLevelSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGradeLevelSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules = action.payload;
        state.error = null;
      })
      .addCase(fetchGradeLevelSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentSchedule,
  clearTimetable,
  setPage,
  setLimit,
} = schedulingSlice.actions;

// Async thunks are already exported individually above

export default schedulingSlice.reducer;

// Selectors
export const selectSchedules = (state: { scheduling: SchedulingState }) => state.scheduling.schedules;
export const selectCurrentSchedule = (state: { scheduling: SchedulingState }) => state.scheduling.currentSchedule;
export const selectTimetable = (state: { scheduling: SchedulingState }) => state.scheduling.timetable;
export const selectSchedulingLoading = (state: { scheduling: SchedulingState }) => state.scheduling.isLoading;
export const selectSchedulingError = (state: { scheduling: SchedulingState }) => state.scheduling.error;
export const selectSchedulingPagination = (state: { scheduling: SchedulingState }) => ({
  total: state.scheduling.total,
  page: state.scheduling.page,
  limit: state.scheduling.limit,
  totalPages: state.scheduling.totalPages,
});
