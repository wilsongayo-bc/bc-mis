import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  CourseSection,
  CourseSectionState,
  CourseSectionFilters,
  CreateCourseSectionData,
  UpdateCourseSectionData,
  CourseSectionsApiResponse,
  CourseSectionApiResponse,
  CourseSectionOption
} from '../../types/courseSection.types';
import { resolveApiBaseUrl } from '../../lib/api';

// Initial state
const initialState: CourseSectionState = {
  courseSections: [],
  currentCourseSection: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  filters: {},
};

// API base URL
const API_BASE_URL = resolveApiBaseUrl();

// Helper function to get auth headers
const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Async thunks
export const fetchCourseSections = createAsyncThunk<
  CourseSectionsApiResponse,
  CourseSectionFilters,
  { rejectValue: string }
>(
  'courseSection/fetchCourseSections',
  async (filters: CourseSectionFilters = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const queryParams = new URLSearchParams();

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.courseId) queryParams.append('courseId', filters.courseId);
      if (filters.yearLevel) queryParams.append('yearLevel', filters.yearLevel);
      if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
      if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${API_BASE_URL}/course-sections?${queryParams}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch course sections');
      }

      const data: CourseSectionsApiResponse = await response.json();
      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchCourseSectionById = createAsyncThunk<
  CourseSection,
  string,
  { rejectValue: string }
>(
  'courseSection/fetchCourseSectionById',
  async (sectionId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/course-sections/${sectionId}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch course section');
      }

      const result: CourseSectionApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchCourseSectionsByCourse = createAsyncThunk<
  CourseSection[],
  string,
  { rejectValue: string }
>(
  'courseSection/fetchCourseSectionsByCourse',
  async (courseId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/course-sections/course/${courseId}?_t=${Date.now()}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch course sections');
      }

      const result = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchActiveCourseSections = createAsyncThunk<
  CourseSectionOption[],
  void,
  { rejectValue: string }
>(
  'courseSection/fetchActiveCourseSections',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/course-sections/active/list?_t=${Date.now()}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch active course sections');
      }

      const result = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createCourseSection = createAsyncThunk<
  CourseSection,
  CreateCourseSectionData,
  { rejectValue: string }
>(
  'courseSection/createCourseSection',
  async (sectionData: CreateCourseSectionData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/course-sections`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(sectionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to create course section');
      }

      const result: CourseSectionApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateCourseSection = createAsyncThunk<
  CourseSection,
  { id: string; sectionData: UpdateCourseSectionData },
  { rejectValue: string }
>(
  'courseSection/updateCourseSection',
  async ({ id, sectionData }: { id: string; sectionData: UpdateCourseSectionData }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/course-sections/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(sectionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to update course section');
      }

      const result: CourseSectionApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteCourseSection = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'courseSection/deleteCourseSection',
  async (sectionId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/course-sections/${sectionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to delete course section');
      }

      return sectionId;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateCourseSectionStatus = createAsyncThunk<
  CourseSection,
  { id: string; isActive: boolean },
  { rejectValue: string }
>(
  'courseSection/updateCourseSectionStatus',
  async ({ id, isActive }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/course-sections/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to update course section status');
      }

      const result = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Course section slice
const courseSectionSlice = createSlice({
  name: 'courseSection',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCourseSection: (state) => {
      state.currentCourseSection = null;
    },
    setFilters: (state, action: PayloadAction<CourseSectionFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
      state.filters.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
      state.filters.limit = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch course sections
    builder
      .addCase(fetchCourseSections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourseSections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courseSections = action.payload.data;
        state.total = action.payload.pagination.totalCount;
        state.page = action.payload.pagination.currentPage;
        state.totalPages = action.payload.pagination.totalPages;
        state.limit = action.payload.pagination.limit;
      })
      .addCase(fetchCourseSections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch course sections';
      })

    // Fetch course section by ID
    builder
      .addCase(fetchCourseSectionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourseSectionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCourseSection = action.payload;
      })
      .addCase(fetchCourseSectionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch course section';
      })

    // Fetch course sections by course
    builder
      .addCase(fetchCourseSectionsByCourse.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchCourseSectionsByCourse.fulfilled, (_state) => {
        // Course sections by course are typically used for specific views, not stored in main state
      })
      .addCase(fetchCourseSectionsByCourse.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch course sections by course';
      })

    // Fetch active course sections
    builder
      .addCase(fetchActiveCourseSections.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchActiveCourseSections.fulfilled, (_state) => {
        // Active course sections are typically used for dropdowns, not stored in main state
      })
      .addCase(fetchActiveCourseSections.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch active course sections';
      })

    // Create course section
    builder
      .addCase(createCourseSection.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCourseSection.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courseSections.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCourseSection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to create course section';
      })

    // Update course section
    builder
      .addCase(updateCourseSection.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCourseSection.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.courseSections.findIndex(section => section.id === action.payload.id);
        if (index !== -1) {
          state.courseSections[index] = action.payload;
        }
        if (state.currentCourseSection?.id === action.payload.id) {
          state.currentCourseSection = action.payload;
        }
      })
      .addCase(updateCourseSection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update course section';
      })

    // Delete course section
    builder
      .addCase(deleteCourseSection.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCourseSection.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courseSections = state.courseSections.filter(section => section.id !== action.payload);
        state.total -= 1;
        if (state.currentCourseSection?.id === action.payload) {
          state.currentCourseSection = null;
        }
      })
      .addCase(deleteCourseSection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to delete course section';
      })
      
    // Update course section status
    builder
      .addCase(updateCourseSectionStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCourseSectionStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.courseSections.findIndex(section => section.id === action.payload.id);
        if (index !== -1) {
          state.courseSections[index] = action.payload;
        }
        if (state.currentCourseSection?.id === action.payload.id) {
          state.currentCourseSection = action.payload;
        }
      })
      .addCase(updateCourseSectionStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update course section status';
      });
  },
});

// Export actions
export const {
  clearError,
  clearCurrentCourseSection,
  setFilters,
  clearFilters,
  setPage,
  setLimit,
} = courseSectionSlice.actions;

// Export selectors
export const selectCourseSections = (state: { courseSection: CourseSectionState }) => state.courseSection.courseSections;
export const selectCurrentCourseSection = (state: { courseSection: CourseSectionState }) => state.courseSection.currentCourseSection;
export const selectCourseSectionLoading = (state: { courseSection: CourseSectionState }) => state.courseSection.isLoading;
export const selectCourseSectionError = (state: { courseSection: CourseSectionState }) => state.courseSection.error;
export const selectCourseSectionPagination = (state: { courseSection: CourseSectionState }) => ({
  page: state.courseSection.page,
  limit: state.courseSection.limit,
  total: state.courseSection.total,
  totalPages: state.courseSection.totalPages,
});
export const selectCourseSectionFilters = (state: { courseSection: CourseSectionState }) => state.courseSection.filters;

// Export reducer
export default courseSectionSlice.reducer;
