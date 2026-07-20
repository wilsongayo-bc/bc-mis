import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api, { resolveApiBaseUrl } from '../../lib/api';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN' | 'STAFF';
  roles?: Array<User['role']>;
  position?: string;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  mustChangePassword?: boolean;
  profilePicture?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  twoFactorUserId: string | null;
}

export interface LoginCredentials {
  login: string;
  password: string;
  loginType?: 'AUTO' | 'EMAIL_OR_USERNAME' | 'STUDENT_ID' | 'EMPLOYEE_ID';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  requiresTwoFactor?: boolean;
  data: {
    user?: User;
    token?: string;
    userId?: string;
    email?: string;
  };
}

// Initial state
const getInitialState = (): AuthState => {
  const token = localStorage.getItem('token');
  return {
    user: null,
    token,
    isAuthenticated: false,
    // Set isLoading to true if we have a token to prevent premature redirects
    // during session restoration
    isLoading: !!token,
    error: null,
    requiresTwoFactor: false,
    twoFactorUserId: null,
  };
};

const initialState: AuthState = getInitialState();

// Set API_BASE_URL based on environment
export const API_BASE_URL = (() => {
  return resolveApiBaseUrl();
})();

console.log('🌐 API_BASE_URL set to:', API_BASE_URL);

// Helper function to determine if we're in development environment
const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

// Helper function to get user-friendly error messages
const getUserFriendlyErrorMessage = (error: unknown, response?: Response): string => {
  // Network/connection errors
  if (!response || (error && ((error as Error).name === 'TypeError' || (error as Error).message?.includes('fetch')))) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Server response errors
  if (response) {
    switch (response.status) {
      case 401: {
        const baseMessage = 'The username/email or password you entered is incorrect. Please verify your credentials and try again.';
        const suggestions = [
          '• Double-check that your username/email is spelled correctly',
          '• Make sure your password is entered correctly',
          '• Check that Caps Lock is not turned on',
          '• Contact your administrator if you continue having trouble'
        ];
        
        if (isDevelopment()) {
          suggestions.unshift('• For testing, try default credentials: super/Super123! or admin/Admin123!');
        }
        
        return `${baseMessage}\n\n${suggestions.join('\n')}`;
      }
        
      case 403:
        return 'Your account has been disabled. Please contact your administrator for assistance.';
        
      case 429:
        return 'Too many login attempts. Please wait a few minutes before trying again.';
        
      case 500:
        return 'Server error occurred. Please try again later or contact your administrator.';
        
      case 503:
        return 'Service temporarily unavailable. Please try again in a few minutes.';
        
      default:
        return 'Login failed. Please try again or contact your administrator if the problem persists.';
    }
  }

  // Fallback for unknown errors
  return 'An unexpected error occurred. Please try again or contact your administrator.';
};

// Async thunks
type LoginSuccessPayload = { user: User; token: string };
type RequiresTwoFactorPayload = { requiresTwoFactor: true; userId: string };

export const loginUser = createAsyncThunk<
  LoginSuccessPayload | RequiresTwoFactorPayload,
  LoginCredentials,
  { rejectValue: string }
>(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log('🔐 Attempting login for:', credentials.login);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      console.log('📡 Login response:', { 
        status: response.status, 
        success: data.success,
        hasToken: !!data.data?.token 
      });

      if (!response.ok) {
        // Dweezil's Code - Check for specific error messages from server
        let errorMessage = data.message || getUserFriendlyErrorMessage(null, response);
        
        // If server returns "Account is deactivated", use a more user-friendly message
        if (errorMessage.toLowerCase().includes('deactivated') || errorMessage.toLowerCase().includes('disabled')) {
          errorMessage = 'Your account has been deactivated. Please contact your administrator for assistance.';
        }
        
        console.error('❌ Login failed:', { status: response.status, message: data.message });
        return rejectWithValue(errorMessage);
      }

      // Check if 2FA is required
      if (data.success && data.requiresTwoFactor) {
        console.log('🔐 2FA required for user:', data.data?.userId);
        return { requiresTwoFactor: true, userId: data.data?.userId as string };
      }

      if (data.success && data.data?.token) {
        // Store token in localStorage
        localStorage.setItem('token', data.data.token);
        console.log('✅ Login successful, token stored');
        return { user: data.data.user as User, token: data.data.token as string };
      } else {
        const errorMessage = 'Invalid response from server. Please try again.';
        console.error('❌ Login failed:', errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (error: unknown) {
      console.error('❌ Login network error:', error);
      const errorMessage = getUserFriendlyErrorMessage(error);
      return rejectWithValue(errorMessage);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue, getState }) => {
    console.log('🔐 getCurrentUser thunk started');
    
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.token || localStorage.getItem('token');
      
      console.log('🔐 getCurrentUser - Token check:', {
        hasStateToken: !!state.auth.token,
        hasLocalStorageToken: !!localStorage.getItem('token'),
        finalToken: !!token,
        timestamp: new Date().toISOString()
      });

      if (!token) {
        console.log('❌ getCurrentUser - No token found');
        return rejectWithValue('No token found');
      }

      console.log('🌐 getCurrentUser - Making API call to /auth/profile');
      // Set token in localStorage for the API interceptor to pick up
      localStorage.setItem('token', token);
      const response = await api.get('/auth/profile');
      const response_data = response.data;
      console.log('📋 getCurrentUser - Raw API response:', response_data);
      
      // Extract user data from the nested structure
      const userData = response_data.data?.user || response_data.data || response_data;
      
      console.log('✅ getCurrentUser - Extracted user data:', {
        userId: userData?.id,
        userRole: userData?.role,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        fullUserData: userData,
        timestamp: new Date().toISOString()
      });
      
      return userData;
    } catch (error: unknown) {
      console.log('💥 getCurrentUser - Network error:', error);
      const errorMessage = (error as ApiError).response?.data?.message || (error as Error).message || 'Network error. Please try again.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: Partial<User>, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await api.put('/auth/profile', profileData);
      const response_data = response.data;
      return response_data.data || response_data;
    } catch (error: unknown) {
      const errorMessage = (error as ApiError).response?.data?.message || (error as Error).message || 'Network error. Please try again.';
      return rejectWithValue(errorMessage);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (
    passwordData: { currentPassword: string; newPassword: string },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await api.post('/auth/change-password', passwordData);
      return response.data;
    } catch (error: unknown) {
      const errorMessage = (error as ApiError).response?.data?.message || (error as Error).message || 'Network error. Please try again.';
      return rejectWithValue(errorMessage);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.requiresTwoFactor = false;
      state.twoFactorUserId = null;
      localStorage.removeItem('token');
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      state.requiresTwoFactor = false;
      state.twoFactorUserId = null;
    },
    clear2FAState: (state) => {
      state.requiresTwoFactor = false;
      state.twoFactorUserId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if ('requiresTwoFactor' in action.payload && action.payload.requiresTwoFactor) {
          state.requiresTwoFactor = true;
          state.twoFactorUserId = action.payload.userId;
          state.isAuthenticated = false;
          state.error = null;
        } else {
          const payload = action.payload as LoginSuccessPayload;
          state.user = payload.user;
          state.token = payload.token;
          state.isAuthenticated = true;
          state.error = null;
          state.requiresTwoFactor = false;
          state.twoFactorUserId = null;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Get current user
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
      })
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Change password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError, setCredentials, clear2FAState } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
