import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Fee, CreateFeeData, UpdateFeeData, FeeState, FeeFilters } from '../../types/fee.types';
import { resolveApiBaseUrl } from '../../lib/api';

const API_BASE_URL = resolveApiBaseUrl();

// Helper function to get auth headers
const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Async thunks
export const fetchFees = createAsyncThunk<
  Fee[],
  FeeFilters,
  { rejectValue: string }
>(
  'fee/fetchFees',
  async (filters: FeeFilters = {}, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const queryParams = new URLSearchParams();

      if (filters.courseId) queryParams.append('courseId', filters.courseId);
      if (filters.yearLevel) queryParams.append('yearLevel', filters.yearLevel.toString());
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());

      const response = await fetch(`${API_BASE_URL}/fees?${queryParams}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch fees');
      }

      const data = await response.json();
      return data.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createFee = createAsyncThunk<
  Fee,
  CreateFeeData,
  { rejectValue: string }
>(
  'fee/createFee',
  async (feeData: CreateFeeData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/fees`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(feeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create fee');
      }

      const result = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateFee = createAsyncThunk<
  Fee,
  { id: string; feeData: UpdateFeeData },
  { rejectValue: string }
>(
  'fee/updateFee',
  async ({ id, feeData }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/fees/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(feeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to update fee');
      }

      const result = await response.json();
      return result.data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteFee = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'fee/deleteFee',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/fees/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete fee');
      }

      return id;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Initial state
const initialState: FeeState = {
  fees: [],
  currentFee: null,
  isLoading: false,
  error: null,
  filters: {},
};

// Fee slice
const feeSlice = createSlice({
  name: 'fee',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentFee: (state) => {
      state.currentFee = null;
    },
    setFilters: (state, action: PayloadAction<FeeFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    // Fetch fees
    builder
      .addCase(fetchFees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fees = action.payload;
      })
      .addCase(fetchFees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch fees';
      })

    // Create fee
    builder
      .addCase(createFee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createFee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fees.unshift(action.payload);
      })
      .addCase(createFee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to create fee';
      })

    // Update fee
    builder
      .addCase(updateFee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateFee.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.fees.findIndex(fee => fee.id === action.payload.id);
        if (index !== -1) {
          state.fees[index] = action.payload;
        }
        if (state.currentFee?.id === action.payload.id) {
          state.currentFee = action.payload;
        }
      })
      .addCase(updateFee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update fee';
      })

    // Delete fee
    builder
      .addCase(deleteFee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteFee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.fees = state.fees.filter(fee => fee.id !== action.payload);
      })
      .addCase(deleteFee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to delete fee';
      });
  },
});

export const {
  clearError,
  clearCurrentFee,
  setFilters,
  clearFilters,
} = feeSlice.actions;

export const selectFees = (state: { fee: FeeState }) => state.fee.fees;
export const selectCurrentFee = (state: { fee: FeeState }) => state.fee.currentFee;
export const selectFeeLoading = (state: { fee: FeeState }) => state.fee.isLoading;
export const selectFeeError = (state: { fee: FeeState }) => state.fee.error;
export const selectFeeFilters = (state: { fee: FeeState }) => state.fee.filters;

export default feeSlice.reducer;
