import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';

// Types
export interface EnrollmentAssessmentDetails {
  totalAssessed?: number;
  downpaymentRequired?: number;
  totalUnits?: number;
  tuition?: number;
  miscellaneousFee?: number;
  discountPercentage?: number;
  discountAmount?: number;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string;
  status: 'ENROLLED' | 'COMPLETED' | 'DROPPED' | 'FAILED' | 'PENDING' | 'VERIFIED';
  registrarRemarks?: string | null;
  grade?: string;
  semester: string;
  year: number;
  createdAt: string;
  updatedAt: string;
  selectedSubjects?: string[];
  totalAssessed?: number;
  totalPaid?: number;
  balance?: number;
  downpaymentRequired?: number;
  assessmentDetails?: EnrollmentAssessmentDetails | null;
  submittedByStudent?: boolean; // Dweezil's Code - Track if student submitted enrollment
  studentSubmissionDate?: string; // Dweezil's Code - Track when student submitted
  student?: {
    id: string;
    studentId: string;
    registrationStatus?: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    gradeLevel: string | { name: string };
  };
  course?: {
    id: string;
    courseCode: string;
    name: string;
    credits: number;
    departmentId: string;
    yearLevel: string;
  };
  // Dweezil's Code - Added courseSection to Enrollment interface
  courseSection?: {
    id: string;
    sectionName: string;
    semester?: string;
  };
}

export interface EnrollmentState {
  enrollments: Enrollment[];
  currentEnrollment: Enrollment | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EnrollmentFilters {
  studentId?: string;
  courseId?: string;
  courseSectionId?: string;
  status?: string;
  semester?: string;
  academicYear?: string;
  gradeLevelId?: string;
  year?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface CreateEnrollmentData {
  studentId: string;
  courseId: string;
  courseSectionId: string;
  enrollmentDate?: string;
  selectedSubjects?: string[]; // Dweezil's Code - Added for subject selection during enrollment creation
}

export interface UpdateEnrollmentData {
  status?: 'ENROLLED' | 'COMPLETED' | 'DROPPED' | 'FAILED';
  grade?: string;
  semester?: string;
  year?: number;
}

export interface BulkEnrollmentData {
  studentIds: string[];
  courseId: string;
  semester: string;
  year: number;
}

export interface EnrollmentsResponse {
  success: boolean;
  data: Enrollment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface EnrollmentStatistics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  failedEnrollments: number;
  enrollmentsBySemester: Array<{
    semester: string;
    year: number;
    count: number;
  }>;
  enrollmentsByStatus: Array<{
    status: string;
    count: number;
  }>;
  topCourses: Array<{
    courseId: string;
    name: string;
    enrollmentCount: number;
  }>;
}

// Initial state
const initialState: EnrollmentState = {
  enrollments: [],
  currentEnrollment: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.benedictcollege.com/api' : '/api');

// Helper function to get auth headers
const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Async thunks
export const fetchEnrollments = createAsyncThunk(
  'enrollment/fetchEnrollments',
  async (filters: EnrollmentFilters, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`${API_BASE_URL}/enrollments?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch enrollments');
      }

      const data: EnrollmentsResponse = await response.json();
      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Dweezil's Code - Add debug logging to fetchEnrollmentById
export const fetchEnrollmentById = createAsyncThunk(
  'enrollment/fetchEnrollmentById',
  async (enrollmentId: string, { rejectWithValue, getState }) => {
    try {
      console.log('🔍 fetchEnrollmentById - Starting fetch for ID:', enrollmentId);
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        console.error('❌ fetchEnrollmentById - No token found');
        return rejectWithValue('No token found');
      }

      console.log('📡 fetchEnrollmentById - Making API call to:', `${API_BASE_URL}/enrollments/${enrollmentId}`);
      const response = await fetch(`${API_BASE_URL}/enrollments/${enrollmentId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      console.log('📡 fetchEnrollmentById - Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ fetchEnrollmentById - Error response:', errorData);
        return rejectWithValue(errorData.message || 'Failed to fetch enrollment');
      }

      const responseData = await response.json();
      console.log('✅ fetchEnrollmentById - Raw response data:', responseData);
      
      // Dweezil's Code - Extract enrollment from response.data
      const enrollment: Enrollment = responseData.data || responseData;
      console.log('✅ fetchEnrollmentById - Enrollment data received:', enrollment);
      console.log('📋 fetchEnrollmentById - Selected subjects:', enrollment.selectedSubjects);
      console.log('👤 fetchEnrollmentById - Student data:', enrollment.student);
      return enrollment;
    } catch (_error) {
      console.error('❌ fetchEnrollmentById - Network error:', _error);
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createEnrollment = createAsyncThunk(
  'enrollment/createEnrollment',
  async (enrollmentData: CreateEnrollmentData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/enrollments`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(enrollmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create enrollment');
      }

      const enrollment: Enrollment = await response.json();
      return enrollment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const bulkCreateEnrollments = createAsyncThunk(
  'enrollment/bulkCreateEnrollments',
  async (bulkData: BulkEnrollmentData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/enrollments/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bulkData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create bulk enrollments');
      }

      const enrollments: Enrollment[] = await response.json();
      return enrollments;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateEnrollment = createAsyncThunk(
  'enrollment/updateEnrollment',
  async (
    { enrollmentId, enrollmentData }: { enrollmentId: string; enrollmentData: UpdateEnrollmentData },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify(enrollmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to update enrollment');
      }

      const enrollment: Enrollment = await response.json();
      return enrollment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteEnrollment = createAsyncThunk(
  'enrollment/deleteEnrollment',
  async (enrollmentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete enrollment');
      }

      return enrollmentId;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchEnrollmentStatistics = createAsyncThunk(
  'enrollment/fetchEnrollmentStatistics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/enrollments/statistics`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch statistics');
      }

      const statistics: EnrollmentStatistics = await response.json();
      return statistics;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchStudentEnrollments = createAsyncThunk(
  'enrollment/fetchStudentEnrollments',
  async (studentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/enrollments/student/${studentId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch student enrollments');
      }

      const enrollments: Enrollment[] = await response.json();
      return enrollments;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchCourseEnrollments = createAsyncThunk(
  'enrollment/fetchCourseEnrollments',
  async (courseId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/enrollments/course/${courseId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch course enrollments');
      }

      const enrollments: Enrollment[] = await response.json();
      return enrollments;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Enrollment slice
const enrollmentSlice = createSlice({
  name: 'enrollment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentEnrollment: (state) => {
      state.currentEnrollment = null;
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
      // Fetch enrollments
      .addCase(fetchEnrollments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEnrollments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollments = action.payload.data;
        state.total = action.payload.pagination.totalItems;
        state.page = action.payload.pagination.currentPage;
        state.limit = action.payload.pagination.itemsPerPage;
        state.totalPages = action.payload.pagination.totalPages;
        state.error = null;
      })
      .addCase(fetchEnrollments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch enrollment by ID
      .addCase(fetchEnrollmentById.pending, (state) => {
        console.log('⏳ fetchEnrollmentById.pending - Setting loading state');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEnrollmentById.fulfilled, (state, action) => {
        console.log('✅ fetchEnrollmentById.fulfilled - Enrollment loaded:', action.payload);
        state.isLoading = false;
        state.currentEnrollment = action.payload;
        state.error = null;
      })
      .addCase(fetchEnrollmentById.rejected, (state, action) => {
        console.error('❌ fetchEnrollmentById.rejected - Error:', action.payload);
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create enrollment
      .addCase(createEnrollment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEnrollment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollments.unshift(action.payload);
        state.total += 1;
        state.error = null;
      })
      .addCase(createEnrollment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Bulk create enrollments
      .addCase(bulkCreateEnrollments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(bulkCreateEnrollments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollments = [...action.payload, ...state.enrollments];
        state.total += action.payload.length;
        state.error = null;
      })
      .addCase(bulkCreateEnrollments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update enrollment
      .addCase(updateEnrollment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateEnrollment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.enrollments.findIndex(enrollment => enrollment.id === action.payload.id);
        if (index !== -1) {
          state.enrollments[index] = action.payload;
        }
        if (state.currentEnrollment?.id === action.payload.id) {
          state.currentEnrollment = action.payload;
        }
        state.error = null;
      })
      .addCase(updateEnrollment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete enrollment
      .addCase(deleteEnrollment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteEnrollment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollments = state.enrollments.filter(enrollment => enrollment.id !== action.payload);
        state.total -= 1;
        if (state.currentEnrollment?.id === action.payload) {
          state.currentEnrollment = null;
        }
        state.error = null;
      })
      .addCase(deleteEnrollment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch statistics
      .addCase(fetchEnrollmentStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEnrollmentStatistics.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchEnrollmentStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch student enrollments
      .addCase(fetchStudentEnrollments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentEnrollments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollments = action.payload;
        state.error = null;
      })
      .addCase(fetchStudentEnrollments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch course enrollments
      .addCase(fetchCourseEnrollments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourseEnrollments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.enrollments = action.payload;
        state.error = null;
      })
      .addCase(fetchCourseEnrollments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentEnrollment, setPage, setLimit } = enrollmentSlice.actions;
export default enrollmentSlice.reducer;

// Selectors
export const selectEnrollments = (state: { enrollment: EnrollmentState }) => state.enrollment.enrollments;
export const selectCurrentEnrollment = (state: { enrollment: EnrollmentState }) => state.enrollment.currentEnrollment;
export const selectEnrollmentLoading = (state: { enrollment: EnrollmentState }) => state.enrollment.isLoading;
export const selectEnrollmentError = (state: { enrollment: EnrollmentState }) => state.enrollment.error;

// Dweezil's Code - Memoized selector to prevent unnecessary re-renders
const selectEnrollmentState = (state: { enrollment: EnrollmentState }) => state.enrollment;
export const selectEnrollmentPagination = createSelector(
  [selectEnrollmentState],
  (enrollment) => ({
    total: enrollment.total,
    page: enrollment.page,
    limit: enrollment.limit,
    totalPages: enrollment.totalPages,
  })
);
