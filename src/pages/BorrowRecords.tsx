import React, { useEffect, useState } from 'react';
import PageSizeDropdown from '../components/PageSizeDropdown';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Eye,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchBorrowRecords,
  returnBook,
  renewBook,
  selectBorrowRecords,
  selectLibraryLoading,
  selectLibraryError,
  selectLibraryPagination,
  clearError,
  setPage,
  setLimit
} from '../store/slices/librarySlice';
import { selectUser } from '../store/slices/authSlice';
// import { toast } from 'sonner'; // Temporarily disabled
import type { BorrowRecordFilters } from '../store/slices/librarySlice';
import { useSettingsContext } from '../utils/settingsUtils';

const BorrowRecords: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const borrowRecords = useAppSelector(selectBorrowRecords);
  const isLoading = useAppSelector(selectLibraryLoading);
  const error = useAppSelector(selectLibraryError);
  const pagination = useAppSelector(selectLibraryPagination);
  const user = useAppSelector(selectUser);
  const { theme } = useSettingsContext();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<BorrowRecordFilters>({
    status: (searchParams.get('status') as 'BORROWED' | 'RETURNED') || undefined,
    studentId: searchParams.get('studentId') || undefined,
    bookId: searchParams.get('bookId') || undefined,
    overdue: searchParams.get('overdue') === 'true' ? true : undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined
  });
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const params: BorrowRecordFilters = {
      ...filters,
      search: searchTerm || undefined
    };
    dispatch(fetchBorrowRecords(params));
  }, [dispatch, searchTerm, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    if (error) {
      console.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newSearchParams = new URLSearchParams(searchParams);
    if (searchTerm) {
      newSearchParams.set('search', searchTerm);
    } else {
      newSearchParams.delete('search');
    }
    setSearchParams(newSearchParams);
  };

  const handleFilterChange = (key: keyof BorrowRecordFilters, value: string | boolean | undefined) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set(key, value.toString());
    } else {
      newSearchParams.delete(key);
    }
    setSearchParams(newSearchParams);
  };

  const clearFilters = () => {
    setFilters({
      status: undefined,
      studentId: undefined,
      bookId: undefined,
      overdue: undefined,
      startDate: undefined,
      endDate: undefined
    });
    setSearchTerm('');
    setSearchParams({});
  };

  const handleReturn = async (recordId: string) => {
    setProcessingIds(prev => new Set(prev).add(recordId));
    try {
      await dispatch(returnBook({ borrowRecordId: recordId })).unwrap();
      console.log('Book returned successfully');
      // Refresh the list
      const params: BorrowRecordFilters = {
        ...filters,
        search: searchTerm || undefined
      };
      dispatch(fetchBorrowRecords(params));
    } catch (_error) {
      console.error('Failed to return book');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const handleRenew = async (recordId: string) => {
    setProcessingIds(prev => new Set(prev).add(recordId));
    try {
      // Calculate new due date (typically 2 weeks from now)
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + 14);
      
      await dispatch(renewBook({ 
        borrowRecordId: recordId, 
        newDueDate: newDueDate.toISOString().split('T')[0] 
      })).unwrap();
      console.log('Book renewed successfully');
      // Refresh the list
      const params: BorrowRecordFilters = {
        ...filters,
        search: searchTerm || undefined
      };
      dispatch(fetchBorrowRecords(params));
    } catch (_error) {
      console.error('Failed to renew book');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setLimit(newLimit));
    dispatch(setPage(1));
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'BORROWED';
    
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </span>
      );
    }
    
    switch (status) {
      case 'BORROWED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Borrowed
          </span>
        );
      case 'RETURNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const canManageRecords = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const canBorrowBooks = user?.role === 'STUDENT' || user?.role === 'TEACHER';

  const totalPages = Math.ceil((pagination.borrowRecordsTotal || 0) / pagination.limit);

  return (
    <div className={`min-h-screen py-8 ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold flex items-center ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                <BookOpen className={`w-8 h-8 mr-3 ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`} />
                Borrow Records
              </h1>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>Manage library book borrowing and returns</p>
            </div>
            {canBorrowBooks && (
              <Link
                to="/borrow-records/new"
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Borrow Book</span>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className={`rounded-lg shadow p-6 mb-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-lg">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                }`} />
                <input
                  type="text"
                  placeholder="Search by student name, book title, or ISBN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
              
              {(Object.values(filters).some(v => v !== undefined) || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className={`flex items-center space-x-2 px-4 py-2 transition-colors ${
                    theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <X className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className={`mt-6 pt-6 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Status</label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Statuses</option>
                    <option value="BORROWED">Borrowed</option>
                    <option value="RETURNED">Returned</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Overdue Status</label>
                  <select
                    value={filters.overdue === true ? 'true' : filters.overdue === false ? 'false' : ''}
                    onChange={(e) => handleFilterChange('overdue', e.target.value === '' ? undefined : e.target.value === 'true')}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Records</option>
                    <option value="true">Overdue Only</option>
                    <option value="false">Not Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>End Date</label>
                  <input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                    className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Records List */}
        <div className={`rounded-lg shadow overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                theme === 'dark' ? 'border-blue-400' : 'border-blue-600'
              }`}></div>
              <span className={`ml-3 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>Loading borrow records...</span>
            </div>
          ) : borrowRecords.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className={`h-12 w-12 mx-auto mb-4 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <h3 className={`text-lg font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>No borrow records found</h3>
              <p className={`mb-6 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>No records match your current search criteria.</p>
              {canBorrowBooks && (
                <Link
                  to="/borrow-records/new"
                  className={`px-4 py-2 rounded-lg transition-colors inline-flex items-center space-x-2 ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Borrow First Book</span>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className={`min-w-full divide-y ${
                  theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                }`}>
                  <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Student
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Book
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Dates
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Status
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    theme === 'dark' 
                      ? 'bg-gray-800 divide-gray-700' 
                      : 'bg-white divide-gray-200'
                  }`}>
                    {borrowRecords.map((record) => {
                      const isOverdue = new Date(record.dueDate) < new Date() && record.status === 'BORROWED';
                      const isProcessing = processingIds.has(record.id);
                      
                      return (
                        <tr key={record.id} className={isOverdue 
                          ? (theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50')
                          : (theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                        }>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className={`h-5 w-5 mr-3 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                              <div>
                                <div className={`text-sm font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {record.student.user.firstName} {record.student.user.lastName}
                                </div>
                                <div className={`text-sm ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>{record.student.studentId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <BookOpen className={`h-5 w-5 mr-3 ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                              <div>
                                <div className={`text-sm font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>{record.book.title}</div>
                                <div className={`text-sm ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>by {record.book.author}</div>
                                <div className={`text-sm ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>{record.book.isbn}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                            }`}>
                              <div className="flex items-center mb-1">
                                <Calendar className={`h-4 w-4 mr-1 ${
                                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`} />
                                <span>Borrowed: {new Date(record.borrowDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className={`h-4 w-4 mr-1 ${
                                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`} />
                                <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                  Due: {new Date(record.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                              {record.returnDate && (
                                <div className="flex items-center mt-1">
                                  <Calendar className={`h-4 w-4 mr-1 ${
                                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                  }`} />
                                  <span>Returned: {new Date(record.returnDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(record.status, record.dueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Link
                                to={`/borrow-records/${record.id}`}
                                className={`p-1 rounded transition-colors ${
                                  theme === 'dark'
                                    ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20'
                                    : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                                }`}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              
                              {record.status === 'BORROWED' && canManageRecords && (
                                <>
                                  <button
                                    onClick={() => handleReturn(record.id)}
                                    disabled={isProcessing}
                                    className={`p-1 rounded transition-colors disabled:opacity-50 ${
                                      theme === 'dark'
                                        ? 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                                        : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                    }`}
                                    title="Return Book"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  
                                  <button
                                    onClick={() => handleRenew(record.id)}
                                    disabled={isProcessing || isOverdue}
                                    className={`p-1 rounded transition-colors disabled:opacity-50 ${
                                      theme === 'dark'
                                        ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/20'
                                        : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                                    }`}
                                    title={isOverdue ? 'Cannot renew overdue book' : 'Renew Book'}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                {borrowRecords.map((record) => {
                  const isOverdue = new Date(record.dueDate) < new Date() && record.status === 'BORROWED';
                  const isProcessing = processingIds.has(record.id);
                  
                  return (
                    <div key={record.id} className={`p-4 border-b ${
                      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    } ${isOverdue 
                      ? (theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50') 
                      : ''
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>{record.book.title}</h3>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>by {record.book.author}</p>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>{record.student.user.firstName} {record.student.user.lastName}</p>
                        </div>
                        {getStatusBadge(record.status, record.dueDate)}
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className={`flex items-center text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Borrowed: {new Date(record.borrowDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className={isOverdue 
                            ? 'text-red-600 font-medium' 
                            : (theme === 'dark' ? 'text-gray-300' : 'text-gray-600')
                          }>
                            Due: {new Date(record.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        {record.returnDate && (
                          <div className={`flex items-center text-sm ${
                            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Returned: {new Date(record.returnDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/borrow-records/${record.id}`}
                          className={`text-sm font-medium ${
                            theme === 'dark'
                              ? 'text-blue-400 hover:text-blue-300'
                              : 'text-blue-600 hover:text-blue-900'
                          }`}
                        >
                          View Details
                        </Link>
                        
                        {record.status === 'BORROWED' && canManageRecords && (
                          <>
                            <button
                              onClick={() => handleReturn(record.id)}
                              disabled={isProcessing}
                              className={`text-sm font-medium disabled:opacity-50 ${
                                theme === 'dark'
                                  ? 'text-green-400 hover:text-green-300'
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              Return
                            </button>
                            
                            <button
                              onClick={() => handleRenew(record.id)}
                              disabled={isProcessing || isOverdue}
                              className={`text-sm font-medium disabled:opacity-50 ${
                                theme === 'dark'
                                  ? 'text-blue-400 hover:text-blue-300'
                                  : 'text-blue-600 hover:text-blue-900'
                              }`}
                            >
                              Renew
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={`px-4 py-3 border-t sm:px-6 ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.borrowRecordsTotal || 0)} of{' '}
              {pagination.borrowRecordsTotal || 0} results
                      </span>
                      <PageSizeDropdown
                        value={pagination.limit}
                        onChange={handleLimitChange}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
                        className={`p-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                          theme === 'dark'
                            ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Page {pagination.page} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
                        className={`p-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                          theme === 'dark'
                            ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BorrowRecords;
