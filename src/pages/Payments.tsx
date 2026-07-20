import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useSettingsContext } from '../utils/settingsUtils';
import {
  fetchPayments,
  selectPayments,
  selectPaymentLoading,
  selectPaymentError,
  selectPaymentPagination,
  setPage,
  setLimit,
  deletePayment,
  processPayment,
  refundPayment,
  updatePaymentStatus,
} from '../store/slices/paymentSlice';
import type { AppDispatch } from '../store';
import type { PaymentFilters } from '../store/slices/paymentSlice';
import PageSizeDropdown from '../components/PageSizeDropdown';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  FileSpreadsheet,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV, ExportData, formatDateForExport } from '../utils/exportUtils';

/**
 * Payments component - Main interface for managing financial records and payments
 * Features:
 * - List view with search and filtering
 * - Payment status management (pending, completed, failed, refunded)
 * - Payment processing and refund capabilities
 * - Pagination and sorting
 * - CRUD operations (view, edit, delete)
 * - Responsive design for mobile and desktop
 */
const Payments: React.FC = () => {
  const { theme } = useSettingsContext();
  const dispatch = useDispatch<AppDispatch>();
  const payments = useSelector(selectPayments);
  const isLoading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);
  const pagination = useSelector(selectPaymentPagination);

  // Local state for filters and UI
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [cardType, setCardType] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [availableBanks, setAvailableBanks] = useState<{ id: string; name: string }[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Fetch banks on component mount
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch('/api/banks', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableBanks(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
      }
    };
    fetchBanks();
  }, []);

  // Bulk selection state
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [filters, setFilters] = useState<PaymentFilters>({
    status: '',
    paymentMethod: '',
    startDate: '',
    endDate: '',
    studentId: '',
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });

  // Fetch payments on component mount and when filters change
  useEffect(() => {
    const fetchData = () => {
      const queryFilters = {
        ...filters,
        search: searchTerm,
        page: pagination.page,
        limit: pagination.limit,
      };
      dispatch(fetchPayments(queryFilters));
    };

    fetchData();
  }, [dispatch, filters, searchTerm, pagination.page, pagination.limit]);

  // Dweezil's Code - Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    dispatch(setPage(newPage));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setLimit(newLimit));
  };

  // Handle payment actions
  const handleDeletePayment = async () => {
    if (selectedPayment) {
      if (!deleteReason.trim()) return;
      await dispatch(deletePayment({ paymentId: selectedPayment, remarks: deleteReason }));
      setShowDeleteModal(false);
      setSelectedPayment(null);
      setDeleteReason('');
    }
  };

  const handleProcessPayment = async (
    paymentMethod: string,
    transactionId: string,
    cardType?: string,
    bankName?: string
  ) => {
    if (selectedPayment) {
      const remarkParts: string[] = [];
      if (cardType) {
        remarkParts.push(`Paid via ${cardType}`);
      }
      if (bankName) {
        remarkParts.push(`Bank: ${bankName}`);
      }
      const remarks = remarkParts.length > 0 ? remarkParts.join(' | ') : undefined;

      await dispatch(processPayment({
        paymentId: selectedPayment,
        paymentMethod: paymentMethod as 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE',
        transactionId,
        remarks
      }));
      setShowProcessModal(false);
      setSelectedPayment(null);
      setSelectedPaymentMethod('');
      setCardType('');
      setBankName('');
    }
  };

  const handleRefundPayment = async () => {
    if (selectedPayment) {
      if (!refundReason.trim()) return;
      await dispatch(refundPayment({ paymentId: selectedPayment, remarks: refundReason }));
      setShowRefundModal(false);
      setSelectedPayment(null);
      setRefundReason('');
    }
  };

  const handleChangeStatus = async (paymentId: string, status: 'PENDING' | 'CANCELLED') => {
    await dispatch(updatePaymentStatus({ paymentId, status }));
  };

  // Dweezil's Code - Export payments list
  const handleExportPayments = (format: 'pdf' | 'excel' | 'csv') => {
    if (!payments || payments.length === 0) {
      return;
    }

    const exportData: ExportData = {
      title: 'Payments List',
      headers: ['Student', 'Student ID', 'Amount', 'Type', 'Status', 'Due Date', 'Payment Method', 'Transaction ID'],
      data: payments.map(payment => [
        `${payment.student?.user.firstName || ''} ${payment.student?.user.lastName || ''}`.trim(),
        payment.student?.studentId || '-',
        formatCurrency(payment.amount),
        payment.paymentType?.replace('_', ' ') || '-',
        payment.status || '-',
        payment.dueDate ? formatDate(payment.dueDate) : '-',
        payment.paymentMethod?.replace('_', ' ') || '-',
        payment.transactionId || '-'
      ]),
      metadata: {
        generatedAt: formatDateForExport(new Date()),
        totalRecords: payments.length,
        filters: [
          filters.status ? `Status: ${filters.status}` : '',
          filters.paymentMethod ? `Method: ${filters.paymentMethod}` : '',
          filters.startDate ? `From: ${filters.startDate}` : '',
          filters.endDate ? `To: ${filters.endDate}` : '',
          searchTerm ? `Search: ${searchTerm}` : ''
        ].filter(Boolean).join(', ') || 'No filters applied'
      }
    };

    try {
      switch (format) {
        case 'pdf':
          exportToPDF(exportData);
          break;
        case 'excel':
          exportToExcel(exportData);
          break;
        case 'csv':
          exportToCSV(exportData);
          break;
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Bulk selection handlers
  const handleSelectPayment = (paymentId: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedPayments.size === (payments || []).length) {
      setSelectedPayments(new Set());
      setShowBulkActions(false);
    } else {
      const allPaymentIds = new Set((payments || []).map(payment => payment.id));
      setSelectedPayments(allPaymentIds);
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = async (action: string) => {
    setBulkAction(action);
    setBulkActionLoading(true);

    try {
      const paymentIds = Array.from(selectedPayments);

      switch (action) {
        case 'process':
          // Process multiple payments
          for (const paymentId of paymentIds) {
            await dispatch(processPayment({
              paymentId,
              paymentMethod: 'CASH', // Default method for bulk processing
              transactionId: `BULK_${Date.now()}_${paymentId.slice(-4)}`,
            }));
          }
          break;
        case 'cancel':
          // Cancel multiple payments (set status to CANCELLED)
          for (const paymentId of paymentIds) {
            await dispatch(updatePaymentStatus({ paymentId, status: 'CANCELLED' }));
          }
          break;
        case 'delete':
          // Delete multiple payments
          for (const paymentId of paymentIds) {
            await dispatch(deletePayment({ paymentId, remarks: 'Bulk delete from Financial Management' }));
          }
          break;
      }

      // Refresh the payments list
      const queryFilters = {
        ...filters,
        search: searchTerm,
        page: pagination.page,
        limit: pagination.limit,
      };
      dispatch(fetchPayments(queryFilters));

      // Clear selection
      setSelectedPayments(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setBulkActionLoading(false);
      setBulkAction('');
    }
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'PENDING':
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'CANCELLED':
      case 'FAILED':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'REFUNDED':
      case 'refunded':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
      case 'FAILED':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'REFUNDED':
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && (payments || []).length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Financial Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage payments, fees, and financial records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative export-menu-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {showExportMenu && (
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="py-1">
                  <button
                    onClick={() => handleExportPayments('pdf')}
                    className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => handleExportPayments('excel')}
                    className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </button>
                  <button
                    onClick={() => handleExportPayments('csv')}
                    className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export as CSV
                  </button>
                </div>
              </div>
            )}
          </div>
          <Link
            to="/payments/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Payment
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`} />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={handleSearch}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                  ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className={`p-4 rounded-lg space-y-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Payment Method
                  </label>
                  <select
                    value={filters.paymentMethod}
                    onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="">All Methods</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="amount">Amount</option>
                    <option value="dueDate">Due Date</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mb-6 border rounded-lg p-4 ${theme === 'dark'
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-red-50 border-red-200 text-red-700'
            }`}>
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className={`mb-4 p-4 rounded-lg shadow-sm border ${theme === 'dark'
            ? 'bg-blue-900/20 border-blue-800'
            : 'bg-blue-50 border-blue-200'
            }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                  {selectedPayments.size} payment{selectedPayments.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkAction('process')}
                    disabled={bulkActionLoading}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${bulkActionLoading && bulkAction === 'process'
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                  >
                    {bulkActionLoading && bulkAction === 'process' ? 'Processing...' : 'Process'}
                  </button>
                  <button
                    onClick={() => handleBulkAction('cancel')}
                    disabled={bulkActionLoading}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${bulkActionLoading && bulkAction === 'cancel'
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                      }`}
                  >
                    {bulkActionLoading && bulkAction === 'cancel' ? 'Canceling...' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    disabled={bulkActionLoading}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${bulkActionLoading && bulkAction === 'delete'
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                  >
                    {bulkActionLoading && bulkAction === 'delete' ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPayments(new Set());
                  setShowBulkActions(false);
                }}
                className={`text-sm ${theme === 'dark' ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                  }`}
              >
                Clear selection
              </button>
            </div>
          </div>
        )}

        {/* Payments List */}
        <div className={`rounded-lg shadow overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    <input
                      type="checkbox"
                      checked={(payments || []).length > 0 && selectedPayments.size === (payments || []).length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Student
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Amount
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Type
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Due Date
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Method
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark'
                ? 'bg-gray-800 divide-gray-700'
                : 'bg-white divide-gray-200'
                }`}>
                {(payments || []).map((payment) => (
                  <tr
                    key={payment.id}
                    className={`transition-colors ${selectedPayments.has(payment.id)
                      ? theme === 'dark'
                        ? 'bg-blue-900/30 hover:bg-blue-900/40'
                        : 'bg-blue-50 hover:bg-blue-100'
                      : theme === 'dark'
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-50'
                      }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPayments.has(payment.id)}
                        onChange={() => handleSelectPayment(payment.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className={`w-8 h-8 mr-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                        <div>
                          <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                            }`}>
                            {payment.student?.user.firstName} {payment.student?.user.lastName}
                          </div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                            ID: {payment.student?.studentId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm capitalize ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                        {payment.paymentType.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1 capitalize">{payment.status}</span>
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                      {payment.dueDate ? formatDate(payment.dueDate) : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm capitalize ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                      {payment.paymentMethod?.replace('_', ' ') || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/payments/${payment.id}`}
                          className={`transition-colors ${theme === 'dark'
                            ? 'text-blue-400 hover:text-blue-300'
                            : 'text-blue-600 hover:text-blue-900'
                            }`}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {payment.status !== 'REFUNDED' && (
                          <Link
                            to={`/payments/${payment.id}/edit`}
                            className={`transition-colors ${theme === 'dark'
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-green-600 hover:text-green-900'
                              }`}
                            title="Edit Payment"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                        {payment.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment.id);
                              setShowProcessModal(true);
                            }}
                            className={`transition-colors ${theme === 'dark'
                              ? 'text-purple-400 hover:text-purple-300'
                              : 'text-purple-600 hover:text-purple-900'
                              }`}
                            title="Process Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        {payment.status === 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment.id);
                              setShowRefundModal(true);
                            }}
                            className={`transition-colors ${theme === 'dark'
                              ? 'text-orange-400 hover:text-orange-300'
                              : 'text-orange-600 hover:text-orange-900'
                              }`}
                            title="Refund Payment"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {payment.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment.id);
                              setCancelReason('');
                              setShowCancelModal(true);
                            }}
                            className={`transition-colors ${theme === 'dark'
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-red-600 hover:text-red-900'
                              }`}
                            title="Cancel Payment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {payment.status === 'CANCELLED' && (
                          <button
                            onClick={() => handleChangeStatus(payment.id, 'PENDING')}
                            className={`transition-colors ${theme === 'dark'
                              ? 'text-yellow-400 hover:text-yellow-300'
                              : 'text-yellow-600 hover:text-yellow-900'
                              }`}
                            title="Reopen as Pending"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {(payment.status !== 'PAID' && payment.status !== 'CANCELLED' && payment.status !== 'REFUNDED') && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment.id);
                              setShowDeleteModal(true);
                            }}
                            className={`transition-colors ${theme === 'dark'
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-red-600 hover:text-red-900'
                              }`}
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden">
            {(payments || []).map((payment) => (
              <div key={payment.id} className={`p-4 border-b relative ${selectedPayments.has(payment.id)
                ? theme === 'dark'
                  ? 'bg-blue-900/30 border-blue-800'
                  : 'bg-blue-50 border-blue-200'
                : theme === 'dark'
                  ? 'border-gray-700'
                  : 'border-gray-200'
                }`}>
                {/* Checkbox */}
                <div className="absolute top-4 right-4">
                  <input
                    type="checkbox"
                    checked={selectedPayments.has(payment.id)}
                    onChange={() => handleSelectPayment(payment.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <User className={`w-6 h-6 mr-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      }`} />
                    <div>
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                        {payment.student?.user.firstName} {payment.student?.user.lastName}
                      </div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        ID: {payment.student?.studentId}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                    {getStatusIcon(payment.status)}
                    <span className="ml-1 capitalize">{payment.status}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Amount:</span>
                    <span className={`ml-1 font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                      }`}>{formatCurrency(payment.amount)}</span>
                  </div>
                  <div>
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Type:</span>
                    <span className={`ml-1 capitalize ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                      }`}>{payment.paymentType.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Due Date:</span>
                    <span className={`ml-1 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                      }`}>{payment.dueDate ? formatDate(payment.dueDate) : '-'}</span>
                  </div>
                  <div>
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Method:</span>
                    <span className={`ml-1 capitalize ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                      }`}>{payment.paymentMethod?.replace('_', ' ') || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 mt-3">
                  <Link
                    to={`/payments/${payment.id}`}
                    className={`transition-colors ${theme === 'dark'
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-900'
                      }`}
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {payment.status !== 'REFUNDED' && (
                    <Link
                      to={`/payments/${payment.id}/edit`}
                      className={`transition-colors ${theme === 'dark'
                        ? 'text-green-400 hover:text-green-300'
                        : 'text-green-600 hover:text-green-900'
                        }`}
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  )}
                  {payment.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        setSelectedPayment(payment.id);
                        setShowProcessModal(true);
                      }}
                      className={`transition-colors ${theme === 'dark'
                        ? 'text-purple-400 hover:text-purple-300'
                        : 'text-purple-600 hover:text-purple-900'
                        }`}
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  )}
                  {payment.status === 'PAID' && (
                    <button
                      onClick={() => {
                        setSelectedPayment(payment.id);
                        setShowRefundModal(true);
                      }}
                      className={`transition-colors ${theme === 'dark'
                        ? 'text-orange-400 hover:text-orange-300'
                        : 'text-orange-600 hover:text-orange-900'
                        }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  {payment.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        setSelectedPayment(payment.id);
                        setCancelReason('');
                        setShowCancelModal(true);
                      }}
                      className={`transition-colors ${theme === 'dark'
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-red-600 hover:text-red-900'
                        }`}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  {payment.status === 'CANCELLED' && (
                    <button
                      onClick={() => handleChangeStatus(payment.id, 'PENDING')}
                      className={`transition-colors ${theme === 'dark'
                        ? 'text-yellow-400 hover:text-yellow-300'
                        : 'text-yellow-600 hover:text-yellow-900'
                        }`}
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  )}
                  {(payment.status !== 'PAID' && payment.status !== 'CANCELLED' && payment.status !== 'REFUNDED') && (
                    <button
                      onClick={() => {
                        setSelectedPayment(payment.id);
                        setShowDeleteModal(true);
                      }}
                      className={`transition-colors ${theme === 'dark'
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-red-600 hover:text-red-900'
                        }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {(payments || []).length === 0 && !isLoading && (
            <div className="text-center py-12">
              <DollarSign className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`} />
              <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>No payments found</h3>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {searchTerm || Object.values(filters).some(v => v)
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating a new payment record'}
              </p>
              {!searchTerm && !Object.values(filters).some(v => v) && (
                <div className="mt-6">
                  <Link
                    to="/payments/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Payment
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <PageSizeDropdown
                value={pagination.limit}
                onChange={handleLimitChange}
              />
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className={`p-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${theme === 'dark'
                  ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`px-3 py-1 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className={`p-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${theme === 'dark'
                  ? 'border-gray-600 hover:bg-gray-700 text-gray-300'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                  }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg max-w-md w-full p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>Delete Payment</h3>
              <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                Are you sure you want to delete this payment record? This will mark it as cancelled and keep an audit trail.
              </p>
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Reason for deletion
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  placeholder="Enter reason (required)"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPayment(null);
                    setDeleteReason('');
                  }}
                  className={`px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                    ? 'text-gray-300 border-gray-600 hover:bg-gray-700'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePayment}
                  disabled={!deleteReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Process Payment Modal */}
        {showProcessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg max-w-md w-full p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>Process Payment</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const paymentMethod = formData.get('paymentMethod') as string;
                  const transactionId = formData.get('transactionId') as string;
                  const selectedCardType = formData.get('cardType') as string;
                  const selectedBankName = formData.get('bankName') as string;
                  handleProcessPayment(paymentMethod, transactionId, selectedCardType, selectedBankName);
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      Payment Method
                    </label>
                    <select
                      name="paymentMethod"
                      required
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-100'
                        : 'bg-white border-gray-300 text-gray-900'
                        }`}
                    >
                      <option value="">Select method</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                    </select>
                  </div>

                  {selectedPaymentMethod === 'card' && (
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Card Type
                      </label>
                      <select
                        name="cardType"
                        required
                        value={cardType}
                        onChange={(e) => setCardType(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-gray-100'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                      >
                        <option value="">Select card type</option>
                        <option value="VISA">Visa</option>
                        <option value="MASTERCARD">Mastercard</option>
                      </select>
                    </div>
                  )}

                  {['bank_transfer', 'check'].includes(selectedPaymentMethod) && (
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                        Bank Name
                      </label>
                      <select
                        name="bankName"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-gray-100'
                          : 'bg-white border-gray-300 text-gray-900'
                          }`}
                      >
                        <option value="">Select bank</option>
                        {availableBanks.map(bank => (
                          <option key={bank.id} value={bank.name}>{bank.name}</option>
                        ))}
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                      {selectedPaymentMethod === 'check' ? 'Check Number' : 'Transaction ID'}
                    </label>
                    <input
                      type="text"
                      name="transactionId"
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      placeholder={selectedPaymentMethod === 'check' ? 'Enter check number' : 'Enter transaction ID'}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProcessModal(false);
                      setSelectedPayment(null);
                    }}
                    className={`px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                      ? 'text-gray-300 border-gray-600 hover:bg-gray-700'
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Process
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Refund Payment Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg max-w-md w-full p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>Refund Payment</h3>
              <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                Are you sure you want to refund this payment? This will cancel the payment and keep an audit trail.
              </p>
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Reason for refund
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  placeholder="Enter reason (required)"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedPayment(null);
                    setRefundReason('');
                  }}
                  className={`px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                    ? 'text-gray-300 border-gray-600 hover:bg-gray-700'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefundPayment}
                  disabled={!refundReason.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Refund
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Payment Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg max-w-md w-full p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                }`}>Cancel Payment</h3>
              <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                Are you sure you want to cancel this payment? This will mark the payment as cancelled and keep an audit trail.
              </p>
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Reason for cancellation
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  placeholder="Enter reason (required)"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedPayment(null);
                    setCancelReason('');
                  }}
                  className={`px-4 py-2 border rounded-lg transition-colors ${theme === 'dark'
                    ? 'text-gray-300 border-gray-600 hover:bg-gray-700'
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    if (!selectedPayment || !cancelReason.trim()) return;
                    await dispatch(updatePaymentStatus({ paymentId: selectedPayment, status: 'CANCELLED', remarks: cancelReason }));
                    setShowCancelModal(false);
                    setSelectedPayment(null);
                    setCancelReason('');
                  }}
                  disabled={!cancelReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Cancel Payment
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Payments;
