import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Search,
  User,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle as _CheckCircle,
  Clock as _Clock
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  borrowBook,
  fetchBooks,
  selectBooks,
  selectLibraryLoading,
  selectLibraryError,
  clearError
} from '../store/slices/librarySlice';
import {
  fetchStudents,
  selectStudents,
  selectStudentLoading
} from '../store/slices/studentSlice';
import { selectUser } from '../store/slices/authSlice';
// import { toast } from 'sonner'; // Temporarily disabled
import type { BorrowBookData } from '../store/slices/librarySlice';

interface FormData {
  studentId: string;
  bookId: string;
  dueDate: string;
  notes?: string;
}

interface FormErrors {
  studentId?: string;
  bookId?: string;
  dueDate?: string;
  submit?: string;
}

const BorrowForm: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const books = useAppSelector(selectBooks);
  const booksLoading = useAppSelector(selectLibraryLoading);
  const students = useAppSelector(selectStudents);
  const studentsLoading = useAppSelector(selectStudentLoading);
  const error = useAppSelector(selectLibraryError);
  const user = useAppSelector(selectUser);

  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    bookId: searchParams.get('bookId') || '',
    dueDate: '',
    notes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  useEffect(() => {
    // Fetch books and students
    dispatch(fetchBooks({ limit: 100 }));
    dispatch(fetchStudents({ limit: 100 }));

    // Set default due date (2 weeks from now)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14);
    setFormData(prev => ({
      ...prev,
      dueDate: defaultDueDate.toISOString().split('T')[0]
    }));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      setErrors(prev => ({ ...prev, submit: error }));
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.studentId) {
      newErrors.studentId = 'Student is required';
    }

    if (!formData.bookId) {
      newErrors.bookId = 'Book is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate <= today) {
        newErrors.dueDate = 'Due date must be in the future';
      }
      
      // Check if due date is more than 30 days from now
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      if (dueDate > maxDate) {
        newErrors.dueDate = 'Due date cannot be more than 30 days from now';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const borrowData: BorrowBookData = {
        studentId: formData.studentId,
        bookId: formData.bookId,
        dueDate: formData.dueDate,
        notes: formData.notes || undefined
      };

      await dispatch(borrowBook(borrowData)).unwrap();
      console.log('Book borrowed successfully');
      navigate('/borrow-records');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to borrow book';
      setErrors({ submit: errorMessage });
      console.error('Failed to borrow book');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const filteredBooks = books.filter(book => 
    book.availableCopies > 0 && (
      book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
      book.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
      book.isbn.toLowerCase().includes(bookSearch.toLowerCase())
    )
  );

  const filteredStudents = students.filter(student =>
    `${student.user.firstName} ${student.user.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.user.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedBook = books.find(book => book.id === formData.bookId);
  const selectedStudent = students.find(student => student.id === formData.studentId);

  const canBorrowBooks = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  if (!canBorrowBooks) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You don't have permission to borrow books.</p>
          <Link
            to="/borrow-records"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Records</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/borrow-records')}
              className="p-2 hover:bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Borrow Book</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Create a new book borrowing record</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{errors.submit}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Student Information</span>
              </h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Student *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by name, student ID, or email..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.studentId ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  
                  {showStudentDropdown && filteredStudents.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {studentsLoading ? (
                        <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : (
                        filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => {
                              handleInputChange('studentId', student.id);
                              setStudentSearch(`${student.user.firstName} ${student.user.lastName}`);
                              setShowStudentDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {student.user.firstName} {student.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {student.studentId} • {student.user.email}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  
                  {errors.studentId && (
                    <p className="mt-1 text-sm text-red-600">{errors.studentId}</p>
                  )}
                </div>
                
                {selectedStudent && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Selected Student</h4>
                    <div className="text-sm text-blue-800">
                      <p><strong>Name:</strong> {selectedStudent.user.firstName} {selectedStudent.user.lastName}</p>
                      <p><strong>Student ID:</strong> {selectedStudent.studentId}</p>
                      <p><strong>Email:</strong> {selectedStudent.user.email}</p>
                      <p><strong>Grade:</strong> {selectedStudent.gradeLevel?.name || 'Not assigned'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Book Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Book Information</span>
              </h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search Book *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search by title, author, or ISBN..."
                      value={bookSearch}
                      onChange={(e) => {
                        setBookSearch(e.target.value);
                        setShowBookDropdown(true);
                      }}
                      onFocus={() => setShowBookDropdown(true)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.bookId ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  
                  {showBookDropdown && filteredBooks.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {booksLoading ? (
                        <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : (
                        filteredBooks.map((book) => (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => {
                              handleInputChange('bookId', book.id);
                              setBookSearch(book.title);
                              setShowBookDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">{book.title}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              by {book.author} • {book.availableCopies} available
                            </div>
                            <div className="text-xs text-gray-400">{book.isbn}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  
                  {errors.bookId && (
                    <p className="mt-1 text-sm text-red-600">{errors.bookId}</p>
                  )}
                </div>
                
                {selectedBook && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Selected Book</h4>
                    <div className="text-sm text-green-800">
                      <p><strong>Title:</strong> {selectedBook.title}</p>
                      <p><strong>Author:</strong> {selectedBook.author}</p>
                      <p><strong>ISBN:</strong> {selectedBook.isbn}</p>
                      <p><strong>Available Copies:</strong> {selectedBook.availableCopies}</p>
                      <p><strong>Location:</strong> {selectedBook.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Borrowing Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Borrowing Details</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // Tomorrow
                  max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]} // 30 days from now
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.dueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
                )}
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Standard borrowing period is 14 days. Maximum 30 days.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional notes about this borrowing..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/borrow-records')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.studentId || !formData.bookId || !formData.dueDate}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Borrow Book</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Click outside handlers */}
      {(showBookDropdown || showStudentDropdown) && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => {
            setShowBookDropdown(false);
            setShowStudentDropdown(false);
          }}
        />
      )}
    </div>
  );
};

export default BorrowForm;