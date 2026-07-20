import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchPaymentById,
  deletePayment as _deletePayment,
  processPayment,
  refundPayment,
  updatePaymentStatus,
  selectCurrentPayment,
  selectPaymentLoading,
  selectPaymentError,
  clearCurrentPayment,
  clearError,
} from '../store/slices/paymentSlice';
import type { AppDispatch } from '../store';
import type { ProcessPaymentData as _ProcessPaymentData } from '../store/slices/paymentSlice';
import {
  ChevronLeft,
  Edit,
  UserX,
  UserCheck,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Receipt,
} from 'lucide-react';

/**
 * PaymentDetails component - Displays comprehensive payment information
 * Features:
 * - Payment overview with status badges
 * - Student information
 * - Payment details and history
 * - Action buttons for edit, delete, process, refund
 * - Confirmation modals for destructive actions
 * - Integration with Redux for data fetching
 */
const PaymentDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Redux state
  const payment = useSelector(selectCurrentPayment);
  const isLoading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);

  // Local state

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [processData, setProcessData] = useState({
    paymentMethod: '' as '' | 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE',
    transactionId: '',
  });
  const [processError, setProcessError] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch payment data on component mount
  useEffect(() => {
    if (id) {
      dispatch(fetchPaymentById(id));
    }

    return () => {
      dispatch(clearCurrentPayment());
      dispatch(clearError());
    };
  }, [dispatch, id]);

  // Handle navigation
  const handleBack = () => {
    navigate('/payments');
  };

  const handleEdit = () => {
    navigate(`/payments/${id}/edit`);
  };

  // Handle toggle payment status (pending <-> cancelled)
  const handleToggleStatus = async () => {
    try {
      setIsProcessing(true);
      if (!id) return;

      const newStatus = payment.status === 'CANCELLED' ? 'PENDING' : 'CANCELLED';
      if (newStatus === 'CANCELLED') {
        if (!cancelReason.trim()) return;
        await dispatch(updatePaymentStatus({ paymentId: id, status: newStatus, remarks: cancelReason })).unwrap();
      } else {
        await dispatch(updatePaymentStatus({ paymentId: id, status: newStatus })).unwrap();
      }
    } catch (_error) {
      console.error('Error toggling payment status:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle process payment
  const handleProcessPayment = async () => {
    if (!id) return;

    if (!processData.paymentMethod) {
      setProcessError('Payment method is required');
      return;
    }

    const isCash = processData.paymentMethod === 'CASH';
    if (!isCash && !processData.transactionId.trim()) {
      setProcessError('External reference is required for non-cash payments');
      return;
    }

    setProcessError('');

    setIsProcessing(true);
    try {
      await dispatch(processPayment({ 
        paymentId: id, 
        paymentMethod: processData.paymentMethod,
        transactionId: processData.transactionId 
      })).unwrap();
      setShowProcessModal(false);
      setProcessData({ paymentMethod: '', transactionId: '' });
    } catch (_error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle refund payment
  const handleRefundPayment = async () => {
    if (!id) return;

    if (!refundReason.trim()) return;

    setIsProcessing(true);
    try {
      await dispatch(refundPayment({ paymentId: id, remarks: refundReason })).unwrap();
      setShowRefundModal(false);
      setRefundReason('');
    } catch (_error) {
      console.error('Error refunding payment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      PAID: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Paid' },
      CANCELLED: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      REFUNDED: { icon: RotateCcw, color: 'bg-blue-100 dark:bg-gray-700 text-blue-800', label: 'Refunded' },
    };

    const normalized = (status || 'PENDING').toUpperCase();
    const config = statusConfig[normalized as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
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
      month: 'long',
      day: 'numeric',
    });
  };

  // Payment method options
  const paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CREDIT_CARD', label: 'Credit/Debit Card' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHECK', label: 'Check' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment not found</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">The payment you're looking for doesn't exist.</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Payments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Payment Details
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Payment ID: {payment.id}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {payment.status === 'PENDING' && (
            <button
              onClick={() => setShowProcessModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Process Payment
            </button>
          )}
          {payment.status === 'PAID' && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refund
            </button>
          )}
          {payment.status !== 'REFUNDED' && (
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          )}
          {(payment.status === 'PENDING' || payment.status === 'CANCELLED') && (
            <button
              onClick={() => {
                if (payment.status === 'PENDING') {
                  setCancelReason('');
                  setShowCancelModal(true);
                } else {
                  handleToggleStatus();
                }
              }}
              disabled={isProcessing}
              className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors text-sm font-medium shadow-sm ${
                payment.status === 'PENDING'
                  ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 dark:bg-gray-800 dark:border-red-900 dark:text-red-400'
                  : 'border-yellow-300 text-yellow-700 bg-white hover:bg-yellow-50 dark:bg-gray-800 dark:border-yellow-900 dark:text-yellow-400'
              }`}
              title={payment.status === 'PENDING' ? 'Cancel Payment' : 'Reopen as Pending'}
            >
              {payment.status === 'PENDING' ? (
                <UserX className="w-4 h-4 mr-2" />
              ) : (
                <UserCheck className="w-4 h-4 mr-2" />
              )}
              {payment.status === 'PENDING' ? 'Cancel Payment' : 'Reopen as Pending'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Payment Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Overview</h2>
              {getStatusBadge(payment.status)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                    {payment.paymentType.replace('_', ' ')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatDate(payment.dueDate)}
                  </p>
                </div>
              </div>
              
              {payment.paymentMethod && (
                <div className="flex items-center">
                  <CreditCard className="w-8 h-8 text-indigo-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                      {payment.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {payment.description && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Description</p>
                <p className="text-gray-900 dark:text-white">{payment.description}</p>
              </div>
            )}
            
            {payment.transactionId && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Transaction ID</p>
                <p className="text-gray-900 dark:text-white font-mono">{payment.transactionId}</p>
              </div>
            )}
          </div>

          {/* Student Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Student Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Student ID</p>
                <p className="font-medium text-gray-900 dark:text-white">{payment.student?.studentId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {payment.student?.user.firstName} {payment.student?.user.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Grade</p>
                <p className="font-medium text-gray-900 dark:text-white">{payment.student?.gradeLevel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{payment.student?.user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment Timeline</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Created</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(payment.createdAt)}</p>
                </div>
              </div>
              
              {payment.paymentDate && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Completed</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(payment.paymentDate)}</p>
                  </div>
                </div>
              )}
              
              {payment.status === 'REFUNDED' && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Payment Refunded</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(payment.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Additional Information</h3>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(payment.createdAt)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(payment.updatedAt)}</p>
              </div>

              {payment.description && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                  <p className="text-sm text-gray-900 dark:text-white">{payment.description}</p>
                </div>
              )}

              {payment.remarks && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Latest Remarks</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                    {payment.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Process Payment Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <Receipt className="w-6 h-6 text-green-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Process Payment</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={processData.paymentMethod}
                  onChange={(e) => setProcessData(prev => ({ ...prev, paymentMethod: e.target.value as 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'ONLINE' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  External Reference No. (optional)
                </label>
                <input
                  type="text"
                  value={processData.transactionId}
                  onChange={(e) => setProcessData(prev => ({ ...prev, transactionId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bank/gateway reference (required for non-cash)"
                />
              </div>
              {processError && (
                <p className="text-sm text-red-600">
                  {processError}
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={isProcessing || !processData.paymentMethod}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Process Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Payment Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <RotateCcw className="w-6 h-6 text-orange-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Refund Payment</h3>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Refund Reason *
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reason for refund..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefundPayment}
                disabled={isProcessing || !refundReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Refund Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Payment Modal (details view) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <UserX className="w-6 h-6 text-red-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cancel Payment</h3>
            </div>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Are you sure you want to cancel this payment? This will mark the payment as cancelled and keep an audit trail.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reason for cancellation..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  await handleToggleStatus();
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={isProcessing || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
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

export default PaymentDetails;
