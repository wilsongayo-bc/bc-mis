import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_BASE_URL } from './authSlice';

export interface Employee {
  id: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  salary?: number;
  phoneNumber?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN';
    isActive: boolean;
  };
}

export interface EmployeeFilters {
  search?: string;
  role?: string;
  department?: string;
  position?: string;
}

export interface EmployeesResponse {
  success: boolean;
  data: Employee[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export type CreateEmployeeData =
  | {
      userId: string;
      user?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        role?: string;
        isActive?: boolean;
      };
      employee: {
        department: string;
        position: string;
        hireDate: string;
        salary?: number;
        phoneNumber?: string;
        address?: string;
      };
    }
  | {
      user: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        role: string;
        isActive?: boolean;
      };
      employee: {
        department: string;
        position: string;
        hireDate: string;
        salary?: number;
        phoneNumber?: string;
        address?: string;
      };
    };

export interface UpdateEmployeeData {
  employeeId?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  salary?: number;
  phoneNumber?: string;
  address?: string;
  isActive?: boolean;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  };
}

export interface EmployeeState {
  employees: Employee[];
  teachers: Employee[];
  currentEmployee: Employee | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

const initialState: EmployeeState = {
  employees: [],
  teachers: [],
  currentEmployee: null,
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  },
};

// Async thunks
export const fetchEmployees = createAsyncThunk<
  EmployeesResponse,
  { page?: number; limit?: number; filters?: EmployeeFilters },
  { rejectValue: string }
>(
  'employees/fetchEmployees',
  async ({ page = 1, limit = 10, filters = {} }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await fetch(`${API_BASE_URL}/employees?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch employees');
      }

      const data = await response.json();
      
      // Map API pagination format to state format
      return {
        ...data,
        pagination: {
          currentPage: data.pagination.page,
          totalPages: data.pagination.pages,
          totalItems: data.pagination.total,
          itemsPerPage: data.pagination.limit,
        }
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch employees');
    }
  }
);

export const fetchTeachers = createAsyncThunk<
  EmployeesResponse,
  { page?: number; limit?: number; search?: string },
  { rejectValue: string }
>(
  'employees/fetchTeachers',
  async ({ page = 1, limit = 50, search = '' }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
      });

      const response = await fetch(`${API_BASE_URL}/employees/role/teachers?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch teachers');
      }

      const data = await response.json();
      
      // Map API pagination format to state format
      return {
        ...data,
        pagination: {
          currentPage: data.pagination.page,
          totalPages: data.pagination.pages,
          totalItems: data.pagination.total,
          itemsPerPage: data.pagination.limit,
        }
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch teachers');
    }
  }
);

export const fetchEmployeeById = createAsyncThunk<
  { success: boolean; data: Employee },
  string,
  { rejectValue: string }
>(
  'employees/fetchEmployeeById',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch employee');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch employee');
    }
  }
);

export const createEmployee = createAsyncThunk<
  { success: boolean; data: Employee },
  CreateEmployeeData,
  { rejectValue: string }
>(
  'employees/createEmployee',
  async (employeeData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create employee');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create employee');
    }
  }
);

export const updateEmployee = createAsyncThunk<
  { success: boolean; data: Employee },
  { id: string; data: UpdateEmployeeData },
  { rejectValue: string }
>(
  'employees/updateEmployee',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update employee');
      }

      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update employee');
    }
  }
);

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearEmployees: (state) => {
      state.employees = [];
      state.teachers = [];
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentEmployee: (state) => {
      state.currentEmployee = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch employees
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action: PayloadAction<EmployeesResponse>) => {
        state.isLoading = false;
        state.employees = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch employees';
      })
      // Fetch teachers
      .addCase(fetchTeachers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeachers.fulfilled, (state, action: PayloadAction<EmployeesResponse>) => {
        state.isLoading = false;
        state.teachers = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchTeachers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch teachers';
      })
      // Fetch employee by ID
      .addCase(fetchEmployeeById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.currentEmployee = null;
      })
      .addCase(fetchEmployeeById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEmployee = action.payload.data;
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch employee';
      })
      // Create employee
      .addCase(createEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to create employee';
      })
      // Update employee
      .addCase(updateEmployee.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEmployee = action.payload.data;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to update employee';
      });
  },
});

export const { clearEmployees, clearError, clearCurrentEmployee } = employeeSlice.actions;

export const selectCurrentEmployee = (state: { employee: EmployeeState }) => state.employee.currentEmployee;
export const selectEmployeeLoading = (state: { employee: EmployeeState }) => state.employee.isLoading;
export const selectEmployeeError = (state: { employee: EmployeeState }) => state.employee.error;

export default employeeSlice.reducer;
