import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  fetchEmployeeById,
  createEmployee,
  updateEmployee,
  clearError,
  clearCurrentEmployee
} from '../store/slices/employeeSlice';
import { fetchDepartments } from '../store/slices/departmentSlice';
import { fetchPositions } from '../services/positionService';
import { fetchManageableRoles } from '../services/userService';
import type { AppDispatch, RootState } from '../store';
import { useForm } from 'react-hook-form';
import api from '../lib/api';

interface EmployeeFormData {
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: string;
  department: string;
  position: string;
  hireDate: string;
  salary?: number;
  phoneNumber?: string;
  address?: string;
  isActive: boolean;
}

interface EmployeeUserSearchResult {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  middleInitial?: string | null;
  role: string;
  isActive: boolean;
  employee?: { id: string } | null;
}

const EmployeeForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const currentEmployee = useSelector((state: RootState) => state.employee.currentEmployee);
  const isLoading = useSelector((state: RootState) => state.employee.isLoading);
  const error = useSelector((state: RootState) => state.employee.error);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const departments = useSelector((state: RootState) => state.department.departments);
  const [positions, setPositions] = useState<{id: string, name: string}[]>([]);
  const [manageableRoles, setManageableRoles] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<EmployeeUserSearchResult[]>([]);
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<EmployeeUserSearchResult | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<EmployeeFormData>({
    defaultValues: {
      isActive: true,
      role: 'TEACHER',
      hireDate: new Date().toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    dispatch(fetchDepartments({ limit: 100 }));
    
    // Dweezil's Code
    const loadManageableRoles = async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const roles = await fetchManageableRoles(token);
        setManageableRoles(roles || []);
      } catch (err) {
        console.error('Failed to load manageable roles', err);
        // Fallback to basic roles if API fails
        setManageableRoles(['STUDENT', 'TEACHER', 'STAFF', 'ADMIN', 'REGISTRAR', 'FINANCE', 'LIBRARIAN']);
      }
    };
    
    const loadPositions = async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const response = await fetchPositions(token);
        if (response.positions) {
          setPositions(response.positions);
        }
      } catch (err) {
        console.error('Failed to load positions', err);
      }
    };
    
    loadManageableRoles();
    loadPositions();

    if (isEditMode && id) {
      dispatch(fetchEmployeeById(id));
    }

    return () => {
      dispatch(clearCurrentEmployee());
      dispatch(clearError());
    };
  }, [dispatch, id, isEditMode]);

  useEffect(() => {
    if (isEditMode && currentEmployee) {
      setValue('employeeId', currentEmployee.employeeId);
      setValue('firstName', currentEmployee.user.firstName);
      setValue('lastName', currentEmployee.user.lastName);
      setValue('email', currentEmployee.user.email);
      setValue('role', currentEmployee.user.role);
      setValue('department', currentEmployee.department);
      setValue('position', currentEmployee.position);
      setValue('hireDate', currentEmployee.hireDate ? new Date(currentEmployee.hireDate).toISOString().split('T')[0] : '');
      setValue('salary', currentEmployee.salary);
      setValue('phoneNumber', currentEmployee.phoneNumber);
      setValue('address', currentEmployee.address);
      setValue('isActive', currentEmployee.status === 'ACTIVE');
    }
  }, [currentEmployee, isEditMode, setValue]);

  useEffect(() => {
    if (isEditMode) return;
    if (selectedUser) return;

    const q = userSearchQuery.trim();
    if (q.length < 2) {
      setUserSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsUserSearchLoading(true);
        const response = await api.get('/users/employees/search', {
          params: {
            q,
            limit: 20,
            includeWithEmployee: false
          }
        });

        if (!cancelled) {
          setUserSearchResults(Array.isArray(response.data?.data) ? response.data.data : []);
        }
      } catch (_error) {
        if (!cancelled) setUserSearchResults([]);
      } finally {
        if (!cancelled) setIsUserSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isEditMode, selectedUser, userSearchQuery]);

  const selectExistingUser = (user: EmployeeUserSearchResult) => {
    setSelectedUser(user);
    setUserSearchQuery(`${user.lastName}, ${user.firstName}`);
    setUserSearchResults([]);

    setValue('firstName', user.firstName || '');
    setValue('lastName', user.lastName || '');
    setValue('email', user.email || '');
    setValue('role', user.role || 'TEACHER');
    setValue('isActive', typeof user.isActive === 'boolean' ? user.isActive : true);
    setValue('password', '');
  };

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      if (isEditMode && id) {
        const canEditEmployeeId = currentUser?.role === 'SUPERADMIN';
        await dispatch(updateEmployee({
          id,
          data: {
            ...(canEditEmployeeId && data.employeeId && data.employeeId.trim() !== currentEmployee?.employeeId
              ? { employeeId: data.employeeId.trim() }
              : {}),
            department: data.department,
            position: data.position,
            hireDate: data.hireDate,
            salary: data.salary ? Number(data.salary) : undefined,
            phoneNumber: data.phoneNumber,
            address: data.address,
            isActive: data.isActive,
            user: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              role: data.role,
              isActive: data.isActive
            }
          }
        })).unwrap();
        navigate(`/employees/${id}`);
      } else {
        if (selectedUser) {
          await dispatch(createEmployee({
            userId: selectedUser.id,
            user: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              role: data.role,
              isActive: data.isActive
            },
            employee: {
              department: data.department,
              position: data.position,
              hireDate: data.hireDate,
              salary: data.salary ? Number(data.salary) : undefined,
              phoneNumber: data.phoneNumber,
              address: data.address
            }
          })).unwrap();
        } else {
          await dispatch(createEmployee({
            user: {
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              password: data.password || '',
              role: data.role,
              isActive: data.isActive
            },
            employee: {
              department: data.department,
              position: data.position,
              hireDate: data.hireDate,
              salary: data.salary ? Number(data.salary) : undefined,
              phoneNumber: data.phoneNumber,
              address: data.address
            }
          })).unwrap();
        }
        navigate('/employees');
      }
    } catch (err) {
      // Error is handled by reducer
      console.error('Failed to save employee:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/employees')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit Employee' : 'Add New Employee'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-500" />
              User Information
            </h2>
            <div className="space-y-4">
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Existing User (optional)</label>
                  <div className="relative">
                    <input
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        if (selectedUser) setSelectedUser(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Search by name, email, or username"
                    />
                  </div>
                  {!selectedUser && (isUserSearchLoading || userSearchResults.length > 0) && (
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      {isUserSearchLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">Searching...</div>
                      ) : (
                        userSearchResults.slice(0, 10).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => selectExistingUser(u)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {u.lastName}, {u.firstName}
                              {u.middleInitial ? ` ${u.middleInitial}` : ''}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {u.email} · {u.username}
                              {u.employee?.id ? ' · has employee record' : ''}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <input
                    {...register('firstName', { required: 'First name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <input
                    {...register('lastName', { required: 'Last name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    {...register('email', { required: 'Email is required' })}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              {!isEditMode && !selectedUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      {...register('password', { required: 'Password is required for new users', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  {...register('role', { required: 'Role is required' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={manageableRoles.length === 0}
                >
                  <option value="" disabled>
                    {manageableRoles.length === 0 ? 'Loading roles...' : 'Select a role'}
                  </option>
                  {manageableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-blue-500" />
              Employee Details
            </h2>
            <div className="space-y-4">
              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID</label>
                  <input
                    {...register('employeeId', {
                      pattern: { value: /^\d{4}-E-\d{5}$/, message: 'Expected format YYYY-E-00001' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={currentUser?.role !== 'SUPERADMIN'}
                  />
                  {errors.employeeId && <p className="mt-1 text-sm text-red-600">{errors.employeeId.message}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select
                    {...register('department', { required: 'Department is required' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments
                      .filter((dept) => dept.isActive)
                      .map((dept) => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                  </select>
                  {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                  <input
                    list="positions-list"
                    {...register('position', { required: 'Position is required' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter or select position"
                  />
                  <datalist id="positions-list">
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.name} />
                    ))}
                  </datalist>
                  {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hire Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      {...register('hireDate', { required: 'Hire date is required' })}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {errors.hireDate && <p className="mt-1 text-sm text-red-600">{errors.hireDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      {...register('salary')}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    {...register('phoneNumber')}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-2 pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    {...register('address')}
                    rows={3}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {isEditMode && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...register('isActive')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Active Status
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
