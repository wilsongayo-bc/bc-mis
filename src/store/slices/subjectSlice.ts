import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import api from '../../lib/api';
import {
  SubjectState,
  SubjectCreateData as _CreateSubjectData,
  SubjectUpdateData as _UpdateSubjectData,
  SubjectFilters,
  SubjectStatistics,
  SubjectDetailsResponse,
  SubjectListResponse,
  SubjectCreateResponse,
  SubjectUpdateResponse,
  SubjectDeleteResponse,
} from '../../types/subject.types';

// Initial state
const initialState: SubjectState = {
  subjects: [],
  currentSubject: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  filters: {
    search: '',
    departmentId: '',
    isActive: undefined,

    hasPrerequisites: undefined,
  },
  statistics: null,
  searchResults: null,
};

// Note: Authentication headers are handled automatically by the api instance

// Async thunks
export const fetchSubjects = createAsyncThunk<
  SubjectListResponse,
  Partial<SubjectFilters> & { page?: number; limit?: number },
  { state: RootState }
>('subjects/fetchSubjects', async (params, { rejectWithValue }) => {
  try {
    const queryParams = new URLSearchParams();

    // Add pagination params
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    // Add filter params
    if (params.search) queryParams.append('search', params.search);
    if (params.departmentId) queryParams.append('departmentId', params.departmentId);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.hasPrerequisites !== undefined) queryParams.append('hasPrerequisites', params.hasPrerequisites.toString());
    if (params.units) queryParams.append('units', params.units.toString());
    if (params.courseId) queryParams.append('courseId', params.courseId);
    if (params.yearLevel) queryParams.append('yearLevel', params.yearLevel.toString());
    if (params.semester) queryParams.append('semester', params.semester);

    const response = await api.get(`/subjects?${queryParams.toString()}`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch subjects');
  }
});

export const fetchSubjectById = createAsyncThunk<
  SubjectDetailsResponse,
  string,
  { state: RootState }
>('subjects/fetchSubjectById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch subject');
  }
});

export const createSubject = createAsyncThunk<
  SubjectCreateResponse,
  _CreateSubjectData,
  { state: RootState }
>('subjects/createSubject', async (subjectData, { rejectWithValue }) => {
  try {
    const response = await api.post('/subjects', subjectData);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to create subject');
  }
});

export const updateSubject = createAsyncThunk<
  SubjectUpdateResponse,
  { id: string; data: _UpdateSubjectData },
  { state: RootState }
>('subjects/updateSubject', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/subjects/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to update subject');
  }
});

export const deleteSubject = createAsyncThunk<
  SubjectDeleteResponse,
  string,
  { state: RootState }
>('subjects/deleteSubject', async (id, { rejectWithValue }) => {
  try {
    const response = await api.delete(`/subjects/${id}`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to delete subject');
  }
});

export const fetchSubjectStatistics = createAsyncThunk<
  SubjectStatistics,
  void,
  { state: RootState }
>('subjects/fetchSubjectStatistics', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/subjects/statistics');
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch subject statistics');
  }
});

export const fetchSubjectsByDepartment = createAsyncThunk<
  SubjectListResponse,
  string,
  { state: RootState }
>('subjects/fetchSubjectsByDepartment', async (departmentId, { rejectWithValue }) => {
  try {
    const response = await api.get(`/subjects/department/${departmentId}`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch subjects by department');
  }
});

export const activateSubject = createAsyncThunk<
  SubjectUpdateResponse,
  string,
  { state: RootState }
>('subjects/activateSubject', async (id, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/subjects/${id}/activate`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to activate subject');
  }
});

export const deactivateSubject = createAsyncThunk<
  SubjectUpdateResponse,
  string,
  { state: RootState }
>('subjects/deactivateSubject', async (id, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/subjects/${id}/deactivate`);
    return response.data;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    return rejectWithValue(err.response?.data?.message || err.message || 'Failed to deactivate subject');
  }
});

// Create slice
const subjectSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSubject: (state) => {
      state.currentSubject = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<SubjectFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch subjects
      .addCase(fetchSubjects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subjects = action.payload.data || [];
        state.total = action.payload.pagination?.totalItems || 0;
        state.page = action.payload.pagination?.currentPage || 1;
        state.limit = action.payload.pagination?.itemsPerPage || 10;
        state.totalPages = action.payload.pagination?.totalPages || 0;
      })
      .addCase(fetchSubjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch subject by ID
      .addCase(fetchSubjectById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubjectById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSubject = action.payload.data;
      })
      .addCase(fetchSubjectById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create subject
      .addCase(createSubject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSubject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subjects.unshift(action.payload.data);
        state.total += 1;
      })
      .addCase(createSubject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update subject
      .addCase(updateSubject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSubject.fulfilled, (state, action) => {
        state.isLoading = false;
        const subject = action.payload.data;
        const index = state.subjects.findIndex(s => s.id === subject.id);
        if (index !== -1) {
          state.subjects[index] = subject;
        }
        if (state.currentSubject?.id === subject.id) {
          state.currentSubject = subject;
        }
      })
      .addCase(updateSubject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete subject
      .addCase(deleteSubject.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSubject.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subjects = state.subjects.filter(subject => subject.id !== action.payload.id);
        state.total -= 1;
        if (state.currentSubject?.id === action.payload.id) {
          state.currentSubject = null;
        }
      })
      .addCase(deleteSubject.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch subject statistics
      .addCase(fetchSubjectStatistics.fulfilled, (_state, action) => {
        _state.statistics = action.payload;
      })
      // Fetch subjects by department
      .addCase(fetchSubjectsByDepartment.fulfilled, (_state, action) => {
        _state.subjects = action.payload.data || [];
        _state.total = action.payload.pagination?.totalItems || 0;
      })
      // Activate subject
      .addCase(activateSubject.fulfilled, (state, action) => {
        const subject = action.payload.data;
        const index = state.subjects.findIndex(s => s.id === subject.id);
        if (index !== -1) {
          state.subjects[index] = subject;
        }
        if (state.currentSubject?.id === subject.id) {
          state.currentSubject = subject;
        }
      })
      // Deactivate subject
      .addCase(deactivateSubject.fulfilled, (state, action) => {
        const subject = action.payload.data;
        const index = state.subjects.findIndex(s => s.id === subject.id);
        if (index !== -1) {
          state.subjects[index] = subject;
        }
        if (state.currentSubject?.id === subject.id) {
          state.currentSubject = subject;
        }
      });
  },
});

// Export actions
export const {
  clearError,
  clearCurrentSubject,
  setPage,
  setLimit,
  setFilters,
  clearFilters,
} = subjectSlice.actions;

// Export selectors
export const selectSubjects = (state: RootState) => state.subjects.subjects;
export const selectCurrentSubject = (state: RootState) => state.subjects.currentSubject;
export const selectSubjectsLoading = (state: RootState) => state.subjects.isLoading;
export const selectSubjectsError = (state: RootState) => state.subjects.error;
export const selectSubjectsTotal = (state: RootState) => state.subjects.total;
export const selectSubjectsPage = (state: RootState) => state.subjects.page;
export const selectSubjectsLimit = (state: RootState) => state.subjects.limit;
export const selectSubjectsTotalPages = (state: RootState) => state.subjects.totalPages;
export const selectSubjectsFilters = (state: RootState) => state.subjects.filters;
export const selectSubjectsStatistics = (state: RootState) => state.subjects.statistics;
export const selectSubjectsSearchResults = (state: RootState) => state.subjects.searchResults;

// Export reducer
export default subjectSlice.reducer;
