import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import {
  Course,
  CourseState,
  CourseFilters,
  CreateCourseData,
  UpdateCourseData,
  CoursesApiResponse,
  CourseStatistics,
  CourseApiResponse
} from '../../types/course.types';

// Legacy interface for backward compatibility
export interface CoursesResponse {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Initial state
const initialState: CourseState = {
  courses: [],
  currentCourse: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  filters: {},
  statistics: null,
  searchResults: null,
};

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api');

// Helper function to get auth headers
const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Async thunks
export const fetchCourses = createAsyncThunk<
  CoursesApiResponse,
  CourseFilters,
  { rejectValue: string }
>(
  'course/fetchCourses',
  async (filters: CourseFilters = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      console.log('🔍 fetchCourses - Starting course fetch with filters:', filters);
      console.log('🔑 fetchCourses - Authentication token available:', !!token);

      if (!token) {
        console.error('❌ fetchCourses - No authentication token');
        return rejectWithValue('Authentication required');
      }

      const queryParams = new URLSearchParams();

      if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
      if (filters.yearLevel) queryParams.append('yearLevel', filters.yearLevel);
      if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
      if (filters.instructorId) queryParams.append('instructorId', filters.instructorId);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const url = `${API_BASE_URL}/courses?${queryParams}`;
      console.log('🌐 fetchCourses - Making API call to:', url);

      const response = await fetch(url, {
        headers: getAuthHeaders(token),
      });

      console.log('📡 fetchCourses - Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ fetchCourses - Failed with status:', response.status, 'Response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          return rejectWithValue(errorData.message || 'Failed to fetch courses');
        } catch {
          return rejectWithValue(`Failed to fetch courses: ${response.status} ${response.statusText}`);
        }
      }

      const data: CoursesApiResponse = await response.json();
      console.log('✅ fetchCourses - Success response:', data);
      return data;
    } catch (error) {
      console.error('💥 fetchCourses - Network error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchCourseById = createAsyncThunk<
  Course,
  string,
  { rejectValue: string }
>(
  'course/fetchCourseById',
  async (courseId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch course');
      }

      const result: CourseApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createCourse = createAsyncThunk<
  Course,
  CreateCourseData,
  { rejectValue: string }
>(
  'course/createCourse',
  async (courseData: CreateCourseData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create course');
      }

      const result: CourseApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateCourse = createAsyncThunk<
  Course,
  { id: string; courseData: UpdateCourseData },
  { rejectValue: string }
>(
  'course/updateCourse',
  async ({ id, courseData }: { id: string; courseData: UpdateCourseData }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(courseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to update course');
      }

      const result: CourseApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteCourse = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'course/deleteCourse',
  async (courseId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete course');
      }

      return courseId;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchCourseStatistics = createAsyncThunk<
  CourseStatistics,
  void,
  { rejectValue: string }
>(
  'course/fetchCourseStatistics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/statistics`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch course statistics');
      }

      const statistics: CourseStatistics = await response.json();
      return statistics;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchCoursesByDepartment = createAsyncThunk<
  CoursesApiResponse,
  string,
  { rejectValue: string }
>(
  'course/fetchCoursesByDepartment',
  async (department: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/department/${department}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch courses by department');
      }

      const data: CoursesApiResponse = await response.json();
      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchCoursesByGrade = createAsyncThunk<
  CoursesApiResponse,
  string,
  { rejectValue: string }
>(
  'course/fetchCoursesByGrade',
  async (gradeLevel: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/grade/${gradeLevel}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch courses by grade level');
      }

      const data: CoursesApiResponse = await response.json();
      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Activate course
export const activateCourse = createAsyncThunk<
  Course,
  { id: string },
  { rejectValue: string }
>(
  'course/activate',
  async ({ id }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/${id}/activate`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to activate course');
      }

      const result: CourseApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Deactivate course
export const deactivateCourse = createAsyncThunk<
  Course,
  { id: string },
  { rejectValue: string }
>(
  'course/deactivate',
  async ({ id }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/courses/${id}/deactivate`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to deactivate course');
      }

      const result: CourseApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Course slice
const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCourse: (state) => {
      state.currentCourse = null;
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
      // Fetch courses
      .addCase(fetchCourses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses = action.payload.data;
        state.total = action.payload.pagination?.totalItems || 0;
        state.page = action.payload.pagination?.currentPage || 1;
        state.limit = action.payload.pagination?.itemsPerPage || 10;
        state.totalPages = action.payload.pagination?.totalPages || 1;
        state.error = null;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch course by ID
      .addCase(fetchCourseById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourseById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCourse = action.payload;
        state.error = null;
      })
      .addCase(fetchCourseById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create course
      .addCase(createCourse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses.unshift(action.payload);
        state.total += 1;
        state.error = null;
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update course
      .addCase(updateCourse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.courses.findIndex(course => course.id === action.payload.id);
        if (index !== -1) {
          state.courses[index] = action.payload;
        }
        if (state.currentCourse?.id === action.payload.id) {
          state.currentCourse = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete course
      .addCase(deleteCourse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses = state.courses.filter(course => course.id !== action.payload);
        state.total -= 1;
        if (state.currentCourse?.id === action.payload) {
          state.currentCourse = null;
        }
        state.error = null;
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch statistics
      .addCase(fetchCourseStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourseStatistics.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchCourseStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch courses by department
      .addCase(fetchCoursesByDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCoursesByDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses = action.payload.data;
        state.error = null;
      })
      .addCase(fetchCoursesByDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch courses by grade
      .addCase(fetchCoursesByGrade.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCoursesByGrade.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses = action.payload.data;
        state.error = null;
      })
      .addCase(fetchCoursesByGrade.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Activate course
      .addCase(activateCourse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(activateCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.courses.findIndex(course => course.id === action.payload.id);
        if (index !== -1) {
          state.courses[index] = action.payload;
        }
        if (state.currentCourse?.id === action.payload.id) {
          state.currentCourse = action.payload;
        }
        state.error = null;
      })
      .addCase(activateCourse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Deactivate course
      .addCase(deactivateCourse.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deactivateCourse.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.courses.findIndex(course => course.id === action.payload.id);
        if (index !== -1) {
          state.courses[index] = action.payload;
        }
        if (state.currentCourse?.id === action.payload.id) {
          state.currentCourse = action.payload;
        }
        state.error = null;
      })
      .addCase(deactivateCourse.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentCourse, setPage, setLimit } = courseSlice.actions;
export default courseSlice.reducer;

// Selectors
export const selectCourses = (state: { course: CourseState }) => state.course.courses;
export const selectCurrentCourse = (state: { course: CourseState }) => state.course.currentCourse;
export const selectCourseLoading = (state: { course: CourseState }) => state.course.isLoading;
export const selectCourseError = (state: { course: CourseState }) => state.course.error;

// Dweezil's Code - Memoized selector to prevent unnecessary re-renders
const selectCourseState = (state: { course: CourseState }) => state.course;
export const selectCoursePagination = createSelector(
  [selectCourseState],
  (course) => ({
    total: course.total,
    page: course.page,
    limit: course.limit,
    totalPages: course.totalPages,
  })
);