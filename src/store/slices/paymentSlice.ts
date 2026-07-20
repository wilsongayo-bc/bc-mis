import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { resolveApiBaseUrl } from '../../lib/api';

// Types
export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  paymentType:
    | 'TUITION'
    | 'REGISTRATION'
    | 'LIBRARY'
    | 'LABORATORY'
    | 'MISCELLANEOUS'
    | 'LIBRARY_FEE'
    | 'LAB_FEE'
    | 'EXAM_FEE'
    | 'OTHER';
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE' | 'CHECK';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  transactionId?: string;
  description?: string;
  remarks?: string;
  dueDate?: string;
  paymentDate?: string;
  semester: string;
  year: number;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    gradeLevel: string;
  };
}

export interface PaymentState {
  payments: Payment[];
  currentPayment: Payment | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentFilters {
  studentId?: string;
  paymentType?: string;
  paymentMethod?: string;
  status?: string;
  semester?: string;
  year?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface CreatePaymentData {
  studentId: string;
  amount: number;
  paymentType: 'TUITION' | 'LIBRARY_FEE' | 'LAB_FEE' | 'EXAM_FEE' | 'OTHER';
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE';
  description?: string;
  dueDate?: string;
  semester: string;
  year: number;
}

export interface UpdatePaymentData {
  amount?: number;
  paymentType?: 'TUITION' | 'LIBRARY_FEE' | 'LAB_FEE' | 'EXAM_FEE' | 'OTHER';
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE';
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  description?: string;
  dueDate?: string;
  paymentDate?: string;
  semester?: string;
  year?: number;
}

export interface ProcessPaymentData {
  paymentId: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE';
  transactionId?: string;
  remarks?: string;
}

export interface UpdatePaymentStatusData {
  paymentId: string;
  status: 'PENDING' | 'CANCELLED';
  remarks?: string;
}

export interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentStatistics {
  totalPayments: number;
  totalAmount: number;
  pendingPayments: number;
  pendingAmount: number;
  completedPayments: number;
  completedAmount: number;
  failedPayments: number;
  refundedPayments: number;
  paymentsByType: Array<{
    type: string;
    count: number;
    amount: number;
  }>;
  paymentsByMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  paymentsByMonth: Array<{
    month: string;
    year: number;
    count: number;
    amount: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    year: number;
    revenue: number;
  }>;
}

export interface StudentFinancialSummary {
  studentId: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
  payments: Payment[];
  upcomingDues: Array<{
    type: string;
    amount: number;
    dueDate: string;
  }>;
}

// Initial state
const initialState: PaymentState = {
  payments: [],
  currentPayment: null,
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

const mapPaymentTypeToApi = (paymentType: string): string => {
  switch (paymentType) {
    case 'TUITION':
    case 'tuition':
      return 'TUITION';
    case 'REGISTRATION':
    case 'registration':
      return 'REGISTRATION';
    case 'LIBRARY':
    case 'LIBRARY_FEE':
    case 'library':
      return 'LIBRARY';
    case 'LABORATORY':
    case 'LAB_FEE':
    case 'laboratory':
    case 'lab':
      return 'LABORATORY';
    case 'MISCELLANEOUS':
    case 'EXAM_FEE':
    case 'examination':
    case 'transport':
    case 'hostel':
    case 'fine':
    case 'other':
      return 'MISCELLANEOUS';
    default:
      return 'MISCELLANEOUS';
  }
};

const mapPaymentMethodToApi = (paymentMethod: string | undefined): string | undefined => {
  if (!paymentMethod) return undefined;

  switch (paymentMethod) {
    case 'CASH':
    case 'cash':
      return 'CASH';
    case 'BANK_TRANSFER':
    case 'bank_transfer':
      return 'BANK_TRANSFER';
    case 'CREDIT_CARD':
    case 'card':
      return 'CREDIT_CARD';
    case 'CHECK':
    case 'check':
      return 'CHECK';
    default:
      return undefined;
  }
};

const mapPaymentStatusToApi = (status: string | undefined): string | undefined => {
  if (!status) return undefined;

  switch (status) {
    case 'PENDING':
    case 'pending':
      return 'PENDING';
    case 'COMPLETED':
    case 'completed':
      return 'PAID';
    case 'FAILED':
    case 'failed':
      return 'CANCELLED';
    case 'REFUNDED':
    case 'refunded':
      return 'REFUNDED';
    default:
      return undefined;
  }
};

const mapApiPaymentToPayment = (api: any): Payment => {
  const amount =
    typeof api.amount === 'number'
      ? api.amount
      : api.amount !== undefined
      ? parseFloat(api.amount)
      : 0;

  const dueDate = api.dueDate ?? api.due_date ?? undefined;
  const paidDate = api.paidDate ?? api.paymentDate ?? api.paid_date ?? undefined;
  const paymentType = api.paymentType ?? api.type ?? 'MISCELLANEOUS';
  const paymentMethod = api.paymentMethod ?? api.payment_method ?? 'CASH';
  const status = api.status ?? 'PENDING';
  const createdAt = api.createdAt ?? api.created_at ?? new Date().toISOString();
  const updatedAt = api.updatedAt ?? api.updated_at ?? createdAt;

  return {
    id: api.id,
    studentId: api.studentId,
    amount,
    paymentType,
    paymentMethod,
    status,
    transactionId: api.transactionId ?? undefined,
    description: api.description ?? undefined,
    remarks: api.remarks ?? undefined,
    dueDate,
    paymentDate: paidDate,
    semester: api.semester ?? '',
    year:
      api.year ??
      (createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear()),
    createdAt,
    updatedAt,
    student: api.student
      ? {
          id: api.student.id,
          studentId: api.student.studentId,
          user: {
            firstName: api.student.user?.firstName ?? '',
            lastName: api.student.user?.lastName ?? '',
            email: api.student.user?.email ?? '',
          },
          gradeLevel: api.student.gradeLevel ?? '',
        }
      : undefined,
  };
};

export const fetchPayments = createAsyncThunk(
  'payment/fetchPayments',
  async (filters: PaymentFilters, { rejectWithValue, getState }) => {
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

      const response = await fetch(`${API_BASE_URL}/payments?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to fetch payments');
      }

      const apiPayments: any[] = json.data ?? [];
      const mappedPayments = apiPayments.map(mapApiPaymentToPayment);
      const pagination = json.pagination ?? {};

      const pageNumber =
        typeof pagination.currentPage === 'number'
          ? pagination.currentPage
          : filters.page ?? 1;
      const limitNumber =
        typeof pagination.limit === 'number' ? pagination.limit : filters.limit ?? 20;

      const result: PaymentsResponse = {
        payments: mappedPayments,
        total: pagination.totalCount ?? mappedPayments.length,
        page: pageNumber,
        limit: limitNumber,
        totalPages: pagination.totalPages ?? 1,
      };

      return result;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchPaymentById = createAsyncThunk(
  'payment/fetchPaymentById',
  async (paymentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to fetch payment');
      }

      const payment: Payment = mapApiPaymentToPayment(json.data ?? json);
      return payment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createPayment = createAsyncThunk(
  'payment/createPayment',
  async (paymentData: CreatePaymentData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          studentId: paymentData.studentId,
          amount: paymentData.amount,
          type: mapPaymentTypeToApi(paymentData.paymentType),
          paymentMethod: mapPaymentMethodToApi(paymentData.paymentMethod),
          description: paymentData.description,
          dueDate: paymentData.dueDate,
          semester: paymentData.semester,
          year: paymentData.year,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to create payment');
      }

      const payment: Payment = mapApiPaymentToPayment(json.data ?? json);
      return payment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updatePayment = createAsyncThunk(
  'payment/updatePayment',
  async (
    { paymentId, paymentData }: { paymentId: string; paymentData: UpdatePaymentData },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          amount: paymentData.amount,
          type: paymentData.paymentType ? mapPaymentTypeToApi(paymentData.paymentType) : undefined,
          paymentMethod: mapPaymentMethodToApi(paymentData.paymentMethod),
          status: mapPaymentStatusToApi(paymentData.status),
          transactionId: paymentData.transactionId,
          description: paymentData.description,
          dueDate: paymentData.dueDate,
          paidDate: paymentData.paymentDate,
          semester: paymentData.semester,
          year: paymentData.year,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to update payment');
      }

      const payment: Payment = mapApiPaymentToPayment(json.data ?? json);
      return payment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const processPayment = createAsyncThunk(
  'payment/processPayment',
  async (processData: ProcessPaymentData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/${processData.paymentId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          status: 'PAID',
          paymentMethod: mapPaymentMethodToApi(processData.paymentMethod),
          externalReference: processData.transactionId,
          remarks: processData.remarks,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to process payment');
      }

      const payment: Payment = mapApiPaymentToPayment(json.data ?? json);
      return payment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const refundPayment = createAsyncThunk(
  'payment/refundPayment',
  async ({ paymentId, remarks }: { paymentId: string; remarks?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          status: 'REFUNDED',
          remarks,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to refund payment');
      }

      const payment: Payment = mapApiPaymentToPayment(json.data ?? json);
      return payment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updatePaymentStatus = createAsyncThunk(
  'payment/updatePaymentStatus',
  async (data: UpdatePaymentStatusData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/${data.paymentId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          status: data.status,
          remarks: data.remarks,
        }),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to update payment status');
      }

      const payment: Payment = mapApiPaymentToPayment(json.data ?? json);
      return payment;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deletePayment = createAsyncThunk(
  'payment/deletePayment',
  async ({ paymentId, remarks }: { paymentId: string; remarks?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          remarks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete payment');
      }

      return paymentId;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchPaymentStatistics = createAsyncThunk(
  'payment/fetchPaymentStatistics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/statistics`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch statistics');
      }

      const statistics: PaymentStatistics = await response.json();
      return statistics;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchStudentPayments = createAsyncThunk(
  'payment/fetchStudentPayments',
  async (studentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/student/${studentId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to fetch student payments');
      }

      const apiPayments: any[] = json.data ?? json;
      const payments: Payment[] = apiPayments.map(mapApiPaymentToPayment);
      return payments;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchStudentFinancialSummary = createAsyncThunk(
  'payment/fetchStudentFinancialSummary',
  async (studentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/payments/student/${studentId}/summary`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        return rejectWithValue(json.message || 'Failed to fetch financial summary');
      }

      const apiSummary = json.summary ?? json;
      const apiPayments: any[] = json.data ?? [];
      const payments: Payment[] = apiPayments.map(mapApiPaymentToPayment);

      const summary: StudentFinancialSummary = {
        studentId: studentId,
        totalDue: apiSummary.outstandingBalance ?? apiSummary.totalDue ?? 0,
        totalPaid: apiSummary.paidAmount ?? apiSummary.totalPaid ?? 0,
        balance:
          apiSummary.outstandingBalance ??
          (apiSummary.totalDue !== undefined && apiSummary.totalPaid !== undefined
            ? apiSummary.totalDue - apiSummary.totalPaid
            : 0),
        payments,
        upcomingDues: [],
      };

      return summary;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Payment slice
const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentPayment: (state) => {
      state.currentPayment = null;
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
      // Fetch payments
      .addCase(fetchPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload.payments;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalPages = action.payload.totalPages;
        state.error = null;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch payment by ID
      .addCase(fetchPaymentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPayment = action.payload;
        state.error = null;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create payment
      .addCase(createPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments.unshift(action.payload);
        state.total += 1;
        state.error = null;
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update payment
      .addCase(updatePayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePayment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.payments.findIndex(payment => payment.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.currentPayment?.id === action.payload.id) {
          state.currentPayment = action.payload;
        }
        state.error = null;
      })
      .addCase(updatePayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Process payment
      .addCase(processPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.payments.findIndex(payment => payment.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.currentPayment?.id === action.payload.id) {
          state.currentPayment = action.payload;
        }
        state.error = null;
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Refund payment
      .addCase(refundPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refundPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.payments.findIndex(payment => payment.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.currentPayment?.id === action.payload.id) {
          state.currentPayment = action.payload;
        }
        state.error = null;
      })
      .addCase(refundPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update payment status (pending/cancelled)
      .addCase(updatePaymentStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePaymentStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.payments.findIndex(payment => payment.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
        if (state.currentPayment?.id === action.payload.id) {
          state.currentPayment = action.payload;
        }
        state.error = null;
      })
      .addCase(updatePaymentStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete payment
      .addCase(deletePayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = state.payments.filter(payment => payment.id !== action.payload);
        state.total -= 1;
        if (state.currentPayment?.id === action.payload) {
          state.currentPayment = null;
        }
        state.error = null;
      })
      .addCase(deletePayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch statistics
      .addCase(fetchPaymentStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPaymentStatistics.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchPaymentStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch student payments
      .addCase(fetchStudentPayments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentPayments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.payments = action.payload;
        state.error = null;
      })
      .addCase(fetchStudentPayments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch student financial summary
      .addCase(fetchStudentFinancialSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentFinancialSummary.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchStudentFinancialSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentPayment, setPage, setLimit } = paymentSlice.actions;
export default paymentSlice.reducer;

// Selectors
export const selectPaymentState = (state: { payment: PaymentState }) => state.payment;
export const selectPayments = (state: { payment: PaymentState }) => state.payment.payments;
export const selectCurrentPayment = (state: { payment: PaymentState }) => state.payment.currentPayment;
export const selectPaymentLoading = (state: { payment: PaymentState }) => state.payment.isLoading;
export const selectPaymentError = (state: { payment: PaymentState }) => state.payment.error;
export const selectPaymentPagination = createSelector(
  [selectPaymentState],
  (payment) => ({
    total: payment.total,
    page: payment.page,
    limit: payment.limit,
    totalPages: payment.totalPages,
  })
);
