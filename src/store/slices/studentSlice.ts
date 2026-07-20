import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { resolveApiBaseUrl } from '../../lib/api';

// Types
export interface Student {
  id: string;
  studentId: string;
  temporaryId?: string;
  userId: string;
  gradeLevelId: string;
  courseId?: string;
  idCode?: string;
  enrollmentDate: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  phoneNumber?: string;
  email?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  notes?: string;
  // Dweezil's Code - Issue #4: Add registrationNotes field
  registrationNotes?: string;
  balance?: number;
  status: 'ENROLLED' | 'PRE_REGISTERED';
  registrationStatus: 'PRE_REGISTERED' | 'REGISTERED' | 'WITHDRAWN';
  documentsRequired?: Array<{
    id?: string;
    type: string;
    name: string;
    required: boolean;
    submitted: boolean;
    submittedDate?: Date;
    notes?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }>;
  documentsSubmitted?: Array<{
    id?: string;
    type: string;
    name: string;
    required: boolean;
    submitted: boolean;
    submittedDate?: Date;
    notes?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    middleInitial?: string | null;
    email: string;
    username?: string;
    phone?: string;
    role: string;
    // Dweezil's Code - Issue #3: Add isActive for account management
    isActive?: boolean;
  };
  gradeLevel?: {
    id: string;
    name: string;
    description?: string;
  };
  course?: {
    id: string;
    courseCode: string;
    name: string;
  } | null;
  teachingSubjects?: string[];
  enrollments?: Array<{
    id: string;
    studentId: string;
    courseId: string;
    enrollmentDate: string;
    status: string;
    course?: {
      id: string;
      courseCode: string;
      name: string;
      credits: number;
      yearLevel: string;
    };
  }>;
  payments?: Array<{
    id: string;
    studentId: string;
    amount: number;
    paymentDate: string;
    status: string;
    description?: string;
  }>;
  borrowingRecords?: Array<{
    id: string;
    studentId: string;
    bookId: string;
    borrowDate: string;
    returnDate?: string;
    status: string;
  }>;
}

export interface StudentState {
  students: Student[];
  currentStudent: Student | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentFilters {
  gradeLevel?: string;
  status?: string;
  registrationStatus?: string;
  checkEnrollmentStatus?: 'enrolled' | 'not-enrolled';
  enrollmentAcademicYear?: string;
  enrollmentSemester?: string;
  teachingScope?: 'mine';
  courseCode?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface CreateStudentData {
  studentId: string;
  gradeLevelId: string;
  enrollmentDate: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  notes?: string;
  status?: 'ENROLLED' | 'PRE_REGISTERED';
  registrationStatus?: 'PRE_REGISTERED' | 'REGISTERED' | 'WITHDRAWN';
  user: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    address?: string;
    dateOfBirth: string;
  };
}

export interface UpdateStudentData {
  studentId?: string;
  gradeLevelId?: string;
  // Dweezil's Code - Task 14: Add courseId field for student course assignment
  courseId?: string;
  enrollmentDate?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  phoneNumber?: string;
  email?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  notes?: string;
  // Dweezil's Code - Issue #4: Add registrationNotes field
  registrationNotes?: string;
  balance?: number;
  status?: 'ENROLLED' | 'PRE_REGISTERED';
  registrationStatus?: 'PRE_REGISTERED' | 'REGISTERED' | 'WITHDRAWN';
  documentsRequired?: Array<{
    type: string;
    name: string;
    required: boolean;
    submitted: boolean;
    submittedDate?: Date;
    notes?: string;
  }>;
  documentsSubmitted?: Array<{
    type: string;
    name: string;
    required: boolean;
    submitted: boolean;
    submittedDate?: Date;
    notes?: string;
  }>;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    // Dweezil's Code - Issue #3: Add username and password for account activation
    username?: string;
    password?: string;
  };
}

export interface UpgradeStudentData {
  studentId: string;
  emergencyContact: string;
  emergencyPhone: string;
  gradeLevel: string;
  enrollmentDate: string;
}

export interface StudentsResponse {
  students: Student[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StudentStatistics {
  totalStudents: number;
  enrolledStudents: number;
  preRegisteredStudents: number;
  studentsByGrade: Array<{
    gradeLevel: string;
    count: number;
  }>;
  recentEnrollments: number;
}

// Initial state
const initialState: StudentState = {
  students: [],
  currentStudent: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

// API base URL
const API_BASE_URL = resolveApiBaseUrl();

// Helper function to get auth headers
const getAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

// Async thunks
export const fetchStudents = createAsyncThunk(
  'student/fetchStudents',
  async (filters: StudentFilters, { rejectWithValue, getState }) => {
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

      const url = `${API_BASE_URL}/students?${queryParams}`;
      console.log('🌐 fetchStudents - Making API call to:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      console.log('📡 fetchStudents - Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ fetchStudents - API Error:', errorData);
        return rejectWithValue(errorData.message || 'Failed to fetch students');
      }

      const apiResponse = await response.json();
      console.log('✅ fetchStudents - API Response:', apiResponse);
      console.log('📊 fetchStudents - Students array:', apiResponse.data);
      console.log('📄 fetchStudents - Pagination:', apiResponse.pagination);

      // Transform API response to match expected format
      const data: StudentsResponse = {
        students: apiResponse.data || [],
        total: apiResponse.pagination?.totalCount || 0,
        page: apiResponse.pagination?.currentPage || 1,
        limit: apiResponse.pagination?.limit || 20,
        totalPages: apiResponse.pagination?.totalPages || 1
      };

      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchStudentById = createAsyncThunk(
  'student/fetchStudentById',
  async (studentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const url = `${API_BASE_URL}/students/${studentId}`;
      console.log('🌐 fetchStudentById - Making API call to:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      console.log('📡 fetchStudentById - Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ fetchStudentById - API Error:', errorData);
        return rejectWithValue(errorData.message || 'Failed to fetch student');
      }

      const apiResponse = await response.json();
      console.log('✅ fetchStudentById - API Response:', apiResponse);
      console.log('👤 fetchStudentById - Student data:', apiResponse.data);

      // Extract student data from API response
      const student: Student = apiResponse.data;
      return student;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createStudent = createAsyncThunk(
  'student/createStudent',
  async (studentData: CreateStudentData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const url = `${API_BASE_URL}/students`;
      console.log('🌐 createStudent - Making API call to:', url);
      console.log('📝 createStudent - Request data:', studentData);
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(studentData),
      });

      console.log('📡 createStudent - Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ createStudent - API Error:', errorData);
        return rejectWithValue(errorData.message || 'Failed to create student');
      }

      const apiResponse = await response.json();
      console.log('✅ createStudent - API Response:', apiResponse);
      console.log('👤 createStudent - Created student data:', apiResponse.data);

      // Extract student data from API response
      const student: Student = apiResponse.data;
      return student;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateStudent = createAsyncThunk(
  'student/updateStudent',
  async (
    { studentId, studentData }: { studentId: string; studentData: UpdateStudentData },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const url = `${API_BASE_URL}/students/${studentId}`;
      console.log('🌐 updateStudent - Making API call to:', url);
      console.log('📝 updateStudent - Request data:', studentData);
      const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify(studentData),
      });

      console.log('📡 updateStudent - Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ updateStudent - API Error:', errorData);
        
        // Dweezil's Code - Enhanced error handling for payment validation
        // Pass the complete error object including error code for better error handling
        if (errorData.error === 'NO_PAYMENT_RECORD') {
          return rejectWithValue(errorData.message || 'No payment record found for this student');
        }
        
        return rejectWithValue(errorData.message || 'Failed to update student');
      }

      const apiResponse = await response.json();
      console.log('✅ updateStudent - API Response:', apiResponse);
      console.log('👤 updateStudent - Updated student data:', apiResponse.data);

      // Extract student data from API response
      const student: Student = apiResponse.data;
      return student;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteStudent = createAsyncThunk(
  'student/deleteStudent',
  async (studentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete student');
      }

      return studentId;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateStudentStatus = createAsyncThunk(
  'student/updateStudentStatus',
  async (
    { studentId, status }: { studentId: string; status: 'ENROLLED' | 'PRE_REGISTERED' },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const url = `${API_BASE_URL}/students/${studentId}/status`;
      console.log('🌐 updateStudentStatus - Making API call to:', url);
      console.log('📝 updateStudentStatus - Request data:', { status });
      const response = await fetch(url, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ status }),
      });

      console.log('📡 updateStudentStatus - Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ updateStudentStatus - API Error:', errorData);
        return rejectWithValue(errorData.message || 'Failed to update student status');
      }

      const apiResponse = await response.json();
      console.log('✅ updateStudentStatus - API Response:', apiResponse);
      console.log('👤 updateStudentStatus - Updated student data:', apiResponse.data);

      // Extract student data from API response
      const student: Student = apiResponse.data;
      return student;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const upgradeStudent = createAsyncThunk(
  'student/upgradeStudent',
  async (
    { studentId, upgradeData }: { studentId: string; upgradeData: UpgradeStudentData },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const url = `${API_BASE_URL}/students/${studentId}/upgrade`;
      console.log('🌐 upgradeStudent - Making API call to:', url);
      console.log('📝 upgradeStudent - Request data:', upgradeData);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify(upgradeData),
      });

      console.log('📡 upgradeStudent - Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ upgradeStudent - API Error:', errorData);
        return rejectWithValue(errorData.message || 'Failed to upgrade student');
      }

      const apiResponse = await response.json();
      console.log('✅ upgradeStudent - API Response:', apiResponse);
      console.log('👤 upgradeStudent - Upgraded student data:', apiResponse.data);

      // Extract student data from API response
      const student: Student = apiResponse.data;
      return student;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchStudentStatistics = createAsyncThunk(
  'student/fetchStudentStatistics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/students/statistics`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch statistics');
      }

      const statistics: StudentStatistics = await response.json();
      return statistics;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchStudentsByGrade = createAsyncThunk(
  'student/fetchStudentsByGrade',
  async (gradeLevel: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/students/grade/${gradeLevel}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch students by grade');
      }

      const students: Student[] = await response.json();
      return students;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Student slice
const studentSlice = createSlice({
  name: 'student',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentStudent: (state) => {
      state.currentStudent = null;
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
      // Fetch students
      .addCase(fetchStudents.pending, (state) => {
        console.log('⏳ fetchStudents.pending - Setting isLoading to true');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        console.log('🔄 fetchStudents.fulfilled - Payload received:', action.payload);
        console.log('👥 fetchStudents.fulfilled - Students to set:', action.payload.students);
        console.log('🔄 fetchStudents.fulfilled - Setting isLoading to false');
        state.isLoading = false;
        state.students = action.payload.students;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
        state.error = null;
        console.log('✅ fetchStudents.fulfilled - State updated, students count:', state.students.length);
        console.log('✅ fetchStudents.fulfilled - Final isLoading state:', state.isLoading);
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch student by ID
      .addCase(fetchStudentById.pending, (state) => {
        console.log('⏳ fetchStudentById.pending - Setting isLoading to true');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentStudent = action.payload;
        state.error = null;
      })
      .addCase(fetchStudentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create student
      .addCase(createStudent.pending, (state) => {
        console.log('⏳ createStudent.pending - Setting isLoading to true');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createStudent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.students.unshift(action.payload);
        state.total += 1;
        state.error = null;
      })
      .addCase(createStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update student
      .addCase(updateStudent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateStudent.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.students.findIndex(student => student.id === action.payload.id);
        if (index !== -1) {
          state.students[index] = action.payload;
        }
        if (state.currentStudent?.id === action.payload.id) {
          state.currentStudent = action.payload;
        }
        state.error = null;
      })
      .addCase(updateStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete student
      .addCase(deleteStudent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.students = state.students.filter(student => student.id !== action.payload);
        state.total -= 1;
        if (state.currentStudent?.id === action.payload) {
          state.currentStudent = null;
        }
        state.error = null;
      })
      .addCase(deleteStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update student status
      .addCase(updateStudentStatus.pending, (state) => {
        console.log('⏳ updateStudentStatus.pending - Setting isLoading to true');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateStudentStatus.fulfilled, (state, action) => {
        console.log('✅ updateStudentStatus.fulfilled - Setting isLoading to false');
        state.isLoading = false;
        const index = state.students.findIndex(student => student.id === action.payload.id);
        if (index !== -1) {
          state.students[index] = action.payload;
        }
        if (state.currentStudent?.id === action.payload.id) {
          state.currentStudent = action.payload;
        }
        state.error = null;
      })
      .addCase(updateStudentStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Upgrade student
      .addCase(upgradeStudent.pending, (state) => {
        console.log('⏳ upgradeStudent.pending - Setting isLoading to true');
        state.isLoading = true;
        state.error = null;
      })
      .addCase(upgradeStudent.fulfilled, (state, action) => {
        console.log('✅ upgradeStudent.fulfilled - Setting isLoading to false');
        state.isLoading = false;
        const index = state.students.findIndex(student => student.id === action.payload.id);
        if (index !== -1) {
          state.students[index] = action.payload;
        }
        if (state.currentStudent?.id === action.payload.id) {
          state.currentStudent = action.payload;
        }
        state.error = null;
      })
      .addCase(upgradeStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch statistics
      .addCase(fetchStudentStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentStatistics.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchStudentStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch students by grade
      .addCase(fetchStudentsByGrade.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentsByGrade.fulfilled, (state, action) => {
        state.isLoading = false;
        state.students = action.payload;
        state.error = null;
      })
      .addCase(fetchStudentsByGrade.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentStudent, setPage, setLimit } = studentSlice.actions;
export default studentSlice.reducer;

// Base selectors
const selectStudentState = (state: { student: StudentState }) => state.student;

// Memoized selectors
export const selectStudents = createSelector(
  [selectStudentState],
  (studentState) => studentState.students
);

export const selectCurrentStudent = createSelector(
  [selectStudentState],
  (studentState) => studentState.currentStudent
);

export const selectStudentLoading = createSelector(
  [selectStudentState],
  (studentState) => studentState.isLoading
);

export const selectStudentError = createSelector(
  [selectStudentState],
  (studentState) => studentState.error
);

export const selectStudentPagination = createSelector(
  [selectStudentState],
  (studentState) => ({
    total: studentState.total,
    page: studentState.page,
    limit: studentState.limit,
    totalPages: studentState.totalPages,
  })
);
