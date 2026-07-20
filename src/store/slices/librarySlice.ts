import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { resolveApiBaseUrl } from '../../lib/api';

// Types
export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  category: string;
  totalCopies: number;
  availableCopies: number;
  location: string;
  isActive: boolean;
  description?: string;
  language?: string;
  pages?: number;
  edition?: string;
  externalLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'BORROWED' | 'RETURNED' | 'OVERDUE' | 'LOST';
  fineAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  book?: Book;
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

export interface LibraryState {
  books: Book[];
  borrowRecords: BorrowRecord[];
  currentBook: Book | null;
  currentBorrowRecord: BorrowRecord | null;
  statistics: LibraryStatistics | null;
  isLoading: boolean;
  error: string | null;
  booksTotal: number;
  borrowRecordsTotal: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookFilters {
  title?: string;
  author?: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  publishedYear?: number;
  availability?: 'AVAILABLE' | 'UNAVAILABLE';
  status?: 'active' | 'inactive' | 'all';
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface BorrowRecordFilters {
  studentId?: string;
  bookId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  overdue?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

export interface CreateBookData {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  category: string;
  totalCopies: number;
  location: string;
  pages?: number;
  edition?: string;
  externalLink?: string;
}

export interface UpdateBookData {
  isbn?: string;
  title?: string;
  author?: string;
  publisher?: string;
  publishedYear?: number;
  category?: string;
  totalCopies?: number;
  location?: string;
  isActive?: boolean;
  pages?: number;
  edition?: string;
  externalLink?: string;
}

export interface BorrowBookData {
  bookId: string;
  studentId: string;
  dueDate: string;
  notes?: string;
}

export interface ReturnBookData {
  borrowRecordId: string;
  returnDate?: string;
  fineAmount?: number;
  notes?: string;
}

export interface BooksResponse {
  books: Book[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BorrowRecordsResponse {
  borrowRecords: BorrowRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LibraryStatistics {
  totalBooks: number;
  availableBooks: number;
  borrowedBooks: number;
  overdueBooks: number;
  activeBorrowers: number;
  totalBorrowings: number;
  popularCategories?: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  borrowsByMonth?: Array<{
    month: string;
    year: number;
    count: number;
  }>;
  popularBooks?: Array<{
    bookId: string;
    title: string;
    author: string;
    borrowCount: number;
  }>;
  recentActivity?: Array<{
    type: 'BORROW' | 'RETURN';
    studentName: string;
    bookTitle: string;
    date: string;
  }>;
}

// Initial state
const initialState: LibraryState = {
  books: [],
  borrowRecords: [],
  currentBook: null,
  currentBorrowRecord: null,
  statistics: null,
  isLoading: false,
  error: null,
  booksTotal: 0,
  borrowRecordsTotal: 0,
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

// Async thunks for Books
export const fetchBooks = createAsyncThunk(
  'library/fetchBooks',
  async (filters: BookFilters, { rejectWithValue, getState }) => {
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

      const response = await fetch(`${API_BASE_URL}/books?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch books');
      }

      const apiResponse = await response.json();
      // Handle the API response format: { success: true, data: books, pagination: {...} }
      const data: BooksResponse = {
        books: apiResponse.data || [],
        total: apiResponse.pagination?.total || 0,
        page: apiResponse.pagination?.page || 1,
        limit: apiResponse.pagination?.limit || 20,
        totalPages: apiResponse.pagination?.pages || 0
      };
      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchBookById = createAsyncThunk(
  'library/fetchBookById',
  async (bookId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch book');
      }

      const apiResponse = await response.json();

      // Extract the book data from the API response format: { success: true, data: book }
      const book: Book = apiResponse.data;
      return book;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const createBook = createAsyncThunk(
  'library/createBook',
  async (bookData: CreateBookData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/books`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to create book');
      }

      const apiResponse = await response.json();
      const book: Book = apiResponse.data;
      return book;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateBook = createAsyncThunk(
  'library/updateBook',
  async (
    { bookId, bookData }: { bookId: string; bookData: UpdateBookData },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to update book');
      }

      const apiResponse = await response.json();
      const book: Book = apiResponse.data;
      return book;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const deleteBook = createAsyncThunk(
  'library/deleteBook',
  async (bookId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to delete book');
      }

      return bookId;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const updateBookStatus = createAsyncThunk(
  'library/updateBookStatus',
  async (
    { bookId, isActive }: { bookId: string; isActive: boolean },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to update book status');
      }

      const apiResponse = await response.json();
      const book: Book = apiResponse.data;
      return book;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Async thunks for Borrow Records
export const fetchBorrowRecords = createAsyncThunk(
  'library/fetchBorrowRecords',
  async (filters: BorrowRecordFilters, { rejectWithValue, getState }) => {
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

      const response = await fetch(`${API_BASE_URL}/borrowrecords?${queryParams}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch borrow records');
      }

      const data: BorrowRecordsResponse = await response.json();
      return data;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const borrowBook = createAsyncThunk(
  'library/borrowBook',
  async (borrowData: BorrowBookData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/borrowrecords`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(borrowData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to borrow book');
      }

      const borrowRecord: BorrowRecord = await response.json();
      return borrowRecord;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const returnBook = createAsyncThunk(
  'library/returnBook',
  async (returnData: ReturnBookData, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/borrowrecords/${returnData.borrowRecordId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ action: 'return', ...returnData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to return book');
      }

      const borrowRecord: BorrowRecord = await response.json();
      return borrowRecord;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const renewBook = createAsyncThunk(
  'library/renewBook',
  async (
    { borrowRecordId, newDueDate }: { borrowRecordId: string; newDueDate: string },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/borrowrecords/${borrowRecordId}`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ action: 'renew', renewalDueDate: newDueDate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to renew book');
      }

      const borrowRecord: BorrowRecord = await response.json();
      return borrowRecord;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchLibraryStatistics = createAsyncThunk(
  'library/fetchLibraryStatistics',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/borrowrecords/statistics`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch statistics');
      }

      const statistics: LibraryStatistics = await response.json();
      return statistics;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchStudentBorrowHistory = createAsyncThunk(
  'library/fetchStudentBorrowHistory',
  async (studentId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/borrowrecords/student/${studentId}`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch borrow history');
      }

      const borrowRecords: BorrowRecord[] = await response.json();
      return borrowRecords;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

export const fetchOverdueBooks = createAsyncThunk(
  'library/fetchOverdueBooks',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: { token: string } };
      const token = state.auth.token;

      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await fetch(`${API_BASE_URL}/borrowrecords/overdue`, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch overdue books');
      }

      const borrowRecords: BorrowRecord[] = await response.json();
      return borrowRecords;
    } catch (_error) {
      return rejectWithValue('Network error. Please try again.');
    }
  }
);

// Library slice
const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBook: (state) => {
      state.currentBook = null;
    },
    clearCurrentBorrowRecord: (state) => {
      state.currentBorrowRecord = null;
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
      // Fetch books
      .addCase(fetchBooks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBooks.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure books is always an array
        state.books = Array.isArray(action.payload.books) ? action.payload.books : [];
        state.booksTotal = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 10;
        state.totalPages = action.payload.totalPages || 0;
        state.error = null;
      })
      .addCase(fetchBooks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch book by ID
      .addCase(fetchBookById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentBook = action.payload;
        state.error = null;
      })
      .addCase(fetchBookById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create book
      .addCase(createBook.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBook.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure books is always an array before calling unshift
        if (!Array.isArray(state.books)) {
          state.books = [];
        }
        state.books.unshift(action.payload);
        state.booksTotal += 1;
        state.error = null;
      })
      .addCase(createBook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update book
      .addCase(updateBook.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBook.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure books is always an array before operations
        if (Array.isArray(state.books)) {
          const index = state.books.findIndex(book => book.id === action.payload.id);
          if (index !== -1) {
            state.books[index] = action.payload;
          }
        }
        if (state.currentBook?.id === action.payload.id) {
          state.currentBook = action.payload;
        }
        state.error = null;
      })
      .addCase(updateBook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete book
      .addCase(deleteBook.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteBook.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure books is always an array before filtering
        if (Array.isArray(state.books)) {
          state.books = state.books.filter(book => book.id !== action.payload);
          state.booksTotal -= 1;
        }
        if (state.currentBook?.id === action.payload) {
          state.currentBook = null;
        }
        state.error = null;
      })
      .addCase(deleteBook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update book status
      .addCase(updateBookStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBookStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure books is always an array before operations
        if (Array.isArray(state.books)) {
          const index = state.books.findIndex(book => book.id === action.payload.id);
          if (index !== -1) {
            state.books[index] = action.payload;
          }
        }
        if (state.currentBook?.id === action.payload.id) {
          state.currentBook = action.payload;
        }
        state.error = null;
      })
      .addCase(updateBookStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch borrow records
      .addCase(fetchBorrowRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBorrowRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure borrowRecords is always an array
        state.borrowRecords = Array.isArray(action.payload.borrowRecords) ? action.payload.borrowRecords : [];
        state.borrowRecordsTotal = action.payload.total || 0;
        state.error = null;
      })
      .addCase(fetchBorrowRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Borrow book
      .addCase(borrowBook.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(borrowBook.fulfilled, (state, action) => {
        state.isLoading = false;
        // Ensure borrowRecords is always an array before calling unshift
        if (!Array.isArray(state.borrowRecords)) {
          state.borrowRecords = [];
        }
        state.borrowRecords.unshift(action.payload);
        state.borrowRecordsTotal += 1;
        // Update book availability
        if (Array.isArray(state.books)) {
          const bookIndex = state.books.findIndex(book => book.id === action.payload.bookId);
          if (bookIndex !== -1) {
            state.books[bookIndex].availableCopies -= 1;
          }
        }
        state.error = null;
      })
      .addCase(borrowBook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Return book
      .addCase(returnBook.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(returnBook.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update borrow record status
        if (Array.isArray(state.borrowRecords)) {
          const recordIndex = state.borrowRecords.findIndex(record => record.id === action.payload.id);
          if (recordIndex !== -1) {
            state.borrowRecords[recordIndex] = action.payload;
          }
        }
        // Update book availability
        if (Array.isArray(state.books)) {
          const bookIndex = state.books.findIndex(book => book.id === action.payload.bookId);
          if (bookIndex !== -1) {
            state.books[bookIndex].availableCopies += 1;
          }
        }
        state.error = null;
      })
      .addCase(returnBook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Renew book
      .addCase(renewBook.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(renewBook.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.borrowRecords.findIndex(record => record.id === action.payload.id);
        if (index !== -1) {
          state.borrowRecords[index] = action.payload;
        }
        if (state.currentBorrowRecord?.id === action.payload.id) {
          state.currentBorrowRecord = action.payload;
        }
        state.error = null;
      })
      .addCase(renewBook.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch statistics
      .addCase(fetchLibraryStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLibraryStatistics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.statistics = action.payload;
        state.error = null;
      })
      .addCase(fetchLibraryStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch student borrow history
      .addCase(fetchStudentBorrowHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudentBorrowHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.borrowRecords = action.payload;
        state.error = null;
      })
      .addCase(fetchStudentBorrowHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch overdue books
      .addCase(fetchOverdueBooks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOverdueBooks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.borrowRecords = action.payload;
        state.error = null;
      })
      .addCase(fetchOverdueBooks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentBook,
  clearCurrentBorrowRecord,
  setPage,
  setLimit,
} = librarySlice.actions;

export default librarySlice.reducer;

// Selectors
export const selectBooks = (state: { library: LibraryState }) => state.library.books;
export const selectBorrowRecords = (state: { library: LibraryState }) => state.library.borrowRecords;
export const selectCurrentBook = (state: { library: LibraryState }) => state.library.currentBook;
export const selectCurrentBorrowRecord = (state: { library: LibraryState }) => state.library.currentBorrowRecord;
export const selectLibraryLoading = (state: { library: LibraryState }) => state.library.isLoading;
export const selectLibraryError = (state: { library: LibraryState }) => state.library.error;
export const selectLibraryPagination = (state: { library: LibraryState }) => ({
  booksTotal: state.library.booksTotal,
  borrowRecordsTotal: state.library.borrowRecordsTotal,
  page: state.library.page,
  limit: state.library.limit,
  totalPages: state.library.totalPages,
});
export const selectLibraryStatistics = (state: { library: LibraryState }) => state.library.statistics;
