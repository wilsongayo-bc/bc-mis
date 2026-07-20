import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createPayment,
  updatePayment,
  fetchPaymentById,
  selectCurrentPayment,
  selectPaymentLoading,
  selectPaymentError,
  clearCurrentPayment,
  clearError,
} from '../store/slices/paymentSlice';
import { fetchStudents, selectStudents } from '../store/slices/studentSlice';
import type { Student } from '../store/slices/studentSlice';
import type { AppDispatch } from '../store';

import {
  ChevronLeft,
  Save,
  AlertCircle,
  DollarSign,
  User,
  CreditCard,
  Search,
} from 'lucide-react';

/**
 * PaymentForm component - Form for creating and editing payment records
 * Features:
 * - Student selection for new payments
 * - Payment type, amount, and due date configuration
 * - Payment method selection
 * - Form validation
 * - Integration with Redux for state management
 * - Support for both create and edit modes
 */
const PaymentForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  // Redux state
  const currentPayment = useSelector(selectCurrentPayment);
  const isLoading = useSelector(selectPaymentLoading);
  const error = useSelector(selectPaymentError);
  const students = useSelector(selectStudents);

  const mapApiPaymentTypeToFormValue = (apiType: string): string => {
    switch (apiType) {
      case 'TUITION':
        return 'tuition';
      case 'REGISTRATION':
        return 'registration';
      case 'LIBRARY':
        return 'library';
      case 'LABORATORY':
        return 'laboratory';
      case 'MISCELLANEOUS':
        return 'other';
      default:
        return 'other';
    }
  };

  const mapApiPaymentMethodToFormValue = (apiMethod?: string | null): string => {
    switch (apiMethod) {
      case 'CASH':
        return 'cash';
      case 'BANK_TRANSFER':
        return 'bank_transfer';
      case 'CREDIT_CARD':
        return 'card';
      case 'CHECK':
        return 'check';
      default:
        return '';
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    paymentType: 'TUITION',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    semester: '',
    year: new Date().getFullYear(),
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    dispatch(fetchStudents({ page: 1, limit: 100 })); // Fetch students for selection
    
    if (isEditing && id) {
      dispatch(fetchPaymentById(id));
    }

    return () => {
      dispatch(clearCurrentPayment());
      dispatch(clearError());
    };
  }, [dispatch, isEditing, id]);

  // Update form data when current payment changes (for editing)
  useEffect(() => {
    if (isEditing && currentPayment) {
      setFormData({
        studentId: currentPayment.studentId,
        amount: currentPayment.amount.toString(),
        paymentType: mapApiPaymentTypeToFormValue(currentPayment.paymentType),
        description: currentPayment.description || '',
        dueDate: currentPayment.dueDate ? currentPayment.dueDate.split('T')[0] : '',
        semester: currentPayment.semester || '',
        year: currentPayment.year,
      });
    }
  }, [isEditing, currentPayment]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectStudent = (student: Student) => {
    setFormData(prev => ({ ...prev, studentId: student.id }));

    const firstName = student.user?.firstName || '';
    const lastName = student.user?.lastName || '';
    const studentId = student.studentId || '';
    const label = `${firstName} ${lastName}${studentId ? ` (${studentId})` : ''}`.trim();

    setStudentSearch(label);
    setShowStudentDropdown(false);

    if (validationErrors.studentId) {
      setValidationErrors(prev => ({ ...prev, studentId: '' }));
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.studentId) errors.studentId = 'Student is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.amount = 'Valid amount is required';
    if (!formData.paymentType) errors.paymentType = 'Payment type is required';
    if (!formData.dueDate) errors.dueDate = 'Due date is required';
    if (!formData.semester) errors.semester = 'Semester is required';
    if (!formData.year) errors.year = 'Year is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && id) {
        const updateData = {
          amount: parseFloat(formData.amount),
          paymentType: formData.paymentType as 'TUITION' | 'LIBRARY_FEE' | 'LAB_FEE' | 'EXAM_FEE' | 'OTHER',
          description: formData.description,
          dueDate: formData.dueDate,
          semester: formData.semester,
          year: formData.year,
        };
        await dispatch(updatePayment({ paymentId: currentPayment.id, paymentData: updateData })).unwrap();
      } else {
        const paymentData = {
          studentId: formData.studentId,
          amount: parseFloat(formData.amount),
          paymentType: formData.paymentType as 'TUITION' | 'LIBRARY_FEE' | 'LAB_FEE' | 'EXAM_FEE' | 'OTHER',
          description: formData.description,
          dueDate: formData.dueDate,
          semester: formData.semester,
          year: formData.year,
        };
        await dispatch(createPayment(paymentData)).unwrap();
      }
      
      navigate('/payments');
    } catch (error) {
      console.error('Error saving payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/payments');
  };

  // Payment type options
  const paymentTypes = [
    { value: 'tuition', label: 'Tuition Fee' },
    { value: 'registration', label: 'Registration Fee' },
    { value: 'library', label: 'Library Fee' },
    { value: 'laboratory', label: 'Laboratory Fee' },
    { value: 'examination', label: 'Examination Fee' },
    { value: 'transport', label: 'Transport Fee' },
    { value: 'hostel', label: 'Hostel Fee' },
    { value: 'fine', label: 'Fine' },
    { value: 'other', label: 'Other' },
  ];

  // Status options
  const _statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const selectedStudent = students.find(student => student.id === formData.studentId) || null;

  const filteredStudents = students.filter(student => {
    if (!studentSearch.trim()) {
      return true;
    }

    const searchTerm = studentSearch.toLowerCase();
    const firstName = student.user?.firstName?.toLowerCase() || '';
    const lastName = student.user?.lastName?.toLowerCase() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const studentId = student.studentId?.toLowerCase() || '';
    const email = student.user?.email?.toLowerCase() || '';

    return (
      fullName.includes(searchTerm) ||
      studentId.includes(searchTerm) ||
      email.includes(searchTerm)
    );
  });

  if (isLoading && isEditing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              {isEditing ? 'Edit Payment' : 'New Payment'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {isEditing ? 'Update payment information' : 'Create a new payment record'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Student Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Student Information</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Student *
              </label>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    id="studentId"
                    value={
                      selectedStudent
                        ? `${selectedStudent.user?.firstName || ''} ${selectedStudent.user?.lastName || ''}${
                            selectedStudent.studentId ? ` (${selectedStudent.studentId})` : ''
                          }`.trim()
                        : 'Selected student'
                    }
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed border-gray-300"
                  />
                  {validationErrors.studentId && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.studentId}</p>
                  )}
                </>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      id="studentId"
                      name="studentIdSearch"
                      placeholder="Search by name, student ID, or email..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowStudentDropdown(false), 150);
                      }}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.studentId ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  {showStudentDropdown && filteredStudents.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredStudents.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectStudent(student);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {student.user?.firstName} {student.user?.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {student.studentId || 'No ID'}{student.user?.email ? ` • ${student.user.email}` : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {validationErrors.studentId && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.studentId}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Payment Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Type *
              </label>
              <select
                id="paymentType"
                name="paymentType"
                value={formData.paymentType}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.paymentType ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {paymentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {validationErrors.paymentType && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.paymentType}</p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.amount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {validationErrors.amount && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.amount}</p>
              )}
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.dueDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {validationErrors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.dueDate}</p>
              )}
            </div>

            <div>
            <label htmlFor="semester" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Semester *
              </label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.semester ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select semester</option>
                <option value="FIRST">First</option>
                <option value="SECOND">Second</option>
                <option value="SUMMER">Summer</option>
              </select>
              {validationErrors.semester && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.semester}</p>
              )}
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year *
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                min="2020"
                max="2030"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  validationErrors.year ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="2024"
              />
              {validationErrors.year && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.year}</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter payment description..."
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Payment' : 'Create Payment'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
