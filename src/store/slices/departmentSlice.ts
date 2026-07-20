import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  Department,
  DepartmentState,
  DepartmentFilters,
  CreateDepartmentData,
  UpdateDepartmentData,
  DepartmentsApiResponse,
  DepartmentApiResponse,
  DepartmentOption
} from '../../types/department.types';
import { resolveApiBaseUrl } from '../../lib/api';

// Initial state
const initialState: DepartmentState = {
  departments: [],
  currentDepartment: null,
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
export const fetchDepartments = createAsyncThunk<
  DepartmentsApiResponse,
  DepartmentFilters,
  { rejectValue: string }
>(
  'department/fetchDepartments',
  async (filters: DepartmentFilters = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const queryParams = new URLSearchParams();

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${API_BASE_URL}/departments?${queryParams}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch departments');
      }

      const data: DepartmentsApiResponse = await response.json();
      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchDepartmentById = createAsyncThunk<
  Department,
  string,
  { rejectValue: string }
>(
  'department/fetchDepartmentById',
  async (departmentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/departments/${departmentId}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch department');
      }

      const result: DepartmentApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchActiveDepartments = createAsyncThunk<
  DepartmentOption[],
  void,
  { rejectValue: string }
>(
  'department/fetchActiveDepartments',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/departments/active/list`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch active departments');
      }

      const result = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createDepartment = createAsyncThunk<
  Department,
  CreateDepartmentData,
  { rejectValue: string }
>(
  'department/createDepartment',
  async (departmentData: CreateDepartmentData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(departmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to create department');
      }

      const result: DepartmentApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateDepartment = createAsyncThunk<
  Department,
  { id: string; departmentData: UpdateDepartmentData },
  { rejectValue: string }
>(
  'department/updateDepartment',
  async ({ id, departmentData }: { id: string; departmentData: UpdateDepartmentData }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/departments/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(departmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to update department');
      }

      const result: DepartmentApiResponse = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteDepartment = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'department/deleteDepartment',
  async (departmentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/departments/${departmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Failed to delete department');
      }

      return departmentId;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Department slice
const departmentSlice = createSlice({
  name: 'department',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDepartment: (state) => {
      state.currentDepartment = null;
    },
    setFilters: (state, action: PayloadAction<DepartmentFilters>) => {
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
    // Fetch departments
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.departments = action.payload.data;
        state.total = action.payload.pagination.totalCount;
        state.page = action.payload.pagination.currentPage;
        state.totalPages = action.payload.pagination.totalPages;
        state.limit = action.payload.pagination.limit;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch departments';
      })

    // Fetch department by ID
    builder
      .addCase(fetchDepartmentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDepartmentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDepartment = action.payload;
      })
      .addCase(fetchDepartmentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch department';
      })

    // Fetch active departments
    builder
      .addCase(fetchActiveDepartments.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchActiveDepartments.fulfilled, (_state) => {
        // Active departments are typically used for dropdowns, not stored in main state
      })
      .addCase(fetchActiveDepartments.rejected, (state, action) => {
        state.error = action.payload || 'Failed to fetch active departments';
      })

    // Create department
    builder
      .addCase(createDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.departments.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to create department';
      })

    // Update department
    builder
      .addCase(updateDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.departments.findIndex(dept => dept.id === action.payload.id);
        if (index !== -1) {
          state.departments[index] = action.payload;
        }
        if (state.currentDepartment?.id === action.payload.id) {
          state.currentDepartment = action.payload;
        }
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update department';
      })

    // Delete department
    builder
      .addCase(deleteDepartment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.departments = state.departments.filter(dept => dept.id !== action.payload);
        state.total -= 1;
        if (state.currentDepartment?.id === action.payload) {
          state.currentDepartment = null;
        }
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to delete department';
      });
  },
});

// Export actions
export const {
  clearError,
  clearCurrentDepartment,
  setFilters,
  clearFilters,
  setPage,
  setLimit,
} = departmentSlice.actions;

// Export selectors
export const selectDepartments = (state: { department: DepartmentState }) => state.department.departments;
export const selectCurrentDepartment = (state: { department: DepartmentState }) => state.department.currentDepartment;
export const selectDepartmentLoading = (state: { department: DepartmentState }) => state.department.isLoading;
export const selectDepartmentError = (state: { department: DepartmentState }) => state.department.error;
export const selectDepartmentPagination = (state: { department: DepartmentState }) => ({
  page: state.department.page,
  limit: state.department.limit,
  total: state.department.total,
  totalPages: state.department.totalPages,
});
export const selectDepartmentFilters = (state: { department: DepartmentState }) => state.department.filters;

// Export reducer
export default departmentSlice.reducer;
