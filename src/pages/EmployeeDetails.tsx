import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  fetchEmployeeById,
  clearError,
  clearCurrentEmployee
} from '../store/slices/employeeSlice';
import type { AppDispatch, RootState } from '../store';
import { format } from 'date-fns';

const EmployeeDetails: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Use RootState type for selector to ensure type safety
  const employee = useSelector((state: RootState) => state.employee.currentEmployee);
  const isLoading = useSelector((state: RootState) => state.employee.isLoading);
  const error = useSelector((state: RootState) => state.employee.error);

  useEffect(() => {
    if (id) {
      dispatch(fetchEmployeeById(id));
    }
    return () => {
      dispatch(clearCurrentEmployee());
      dispatch(clearError());
    };
  }, [dispatch, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center text-red-700 dark:text-red-400">
          <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate('/employees')}
          className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Employee not found.</p>
        <button
          onClick={() => navigate('/employees')}
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {employee.user.firstName} {employee.user.lastName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 flex items-center mt-1">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300 mr-2">
                {employee.employeeId}
              </span>
              {employee.position}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/employees/${employee.id}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Employee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                <p className="mt-1 text-base text-gray-900 dark:text-white font-medium">
                  {employee.user.firstName} {employee.user.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Email Address</label>
                <div className="mt-1 flex items-center text-base text-gray-900 dark:text-white">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  {employee.user.email}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
                <div className="mt-1 flex items-center text-base text-gray-900 dark:text-white">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  {employee.phoneNumber || 'Not provided'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                <div className="mt-1 flex items-center text-base text-gray-900 dark:text-white">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {employee.address || 'Not provided'}
                </div>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
              Employment Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Department</label>
                <p className="mt-1 text-base text-gray-900 dark:text-white font-medium">
                  {employee.department}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Position</label>
                <p className="mt-1 text-base text-gray-900 dark:text-white font-medium">
                  {employee.position}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">System Role</label>
                <p className="mt-1 text-base text-gray-900 dark:text-white font-medium">
                  {employee.user.role}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Hire Date</label>
                <div className="mt-1 flex items-center text-base text-gray-900 dark:text-white">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {employee.hireDate ? format(new Date(employee.hireDate), 'MMMM d, yyyy') : 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Salary</label>
                <div className="mt-1 flex items-center text-base text-gray-900 dark:text-white">
                  <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                  {employee.salary ? employee.salary.toLocaleString() : 'Not set'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    employee.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {employee.status === 'ACTIVE' ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Active</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Quick Stats / Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Account Status
            </h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-700 dark:text-gray-300">User Account</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                employee.user.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {employee.user.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
               <p className="text-xs text-gray-500 dark:text-gray-400">
                 Created on {format(new Date(), 'MMM d, yyyy')}
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetails;