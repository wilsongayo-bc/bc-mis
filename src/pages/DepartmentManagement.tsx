import React, { useState, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchDepartments,
  // fetchActiveDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment as _deleteDepartment,
  clearError,
  // clearCurrentDepartment,
  setFilters,
  clearFilters,
  setPage,
  setLimit as setDepartmentLimit
} from '../store/slices/departmentSlice';
import { useSettingsContext } from '../utils/settingsUtils';
import PageSizeDropdown from '../components/PageSizeDropdown';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  AlertCircle,
  ChevronDown,
  XCircle,
  CheckSquare,
  // Square,
  X,
  Loader2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Department, CreateDepartmentData, UpdateDepartmentData } from '../types/department.types';
import { toast } from 'sonner';

// Memoized DepartmentRow component for better performance
const DepartmentRow = memo(({
  department,
  isSelected,
  onSelect,
  onEdit,
  onToggleStatus,
  theme
}: {
  department: Department;
  isSelected: boolean;
  onSelect: (departmentId: string) => void;
  onEdit: (department: Department) => void;
  onToggleStatus: (departmentId: string) => void;
  theme: string;
}) => {
  return (
    <tr className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} ${isSelected ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(department.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-10 w-10 rounded-lg ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-100'} flex items-center justify-center`}>
              <Building2 className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-blue-600'}`} />
            </div>
          </div>
          <div className="ml-4">
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {department.name}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {department.code}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'} max-w-xs truncate`}>
          {department.description || 'No description'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {department.isActive ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckSquare className="h-3 w-3 mr-1" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle className="h-3 w-3 mr-1" />
              Inactive
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onEdit(department)}
            className="text-blue-600 hover:text-blue-900"
            title="Edit department"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggleStatus(department.id)}
            className={`${department.isActive ? 'text-green-600 hover:text-green-900' : 'text-gray-400 hover:text-gray-600'}`}
            title={department.isActive ? 'Disable department' : 'Enable department'}
          >
            {department.isActive ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
});

DepartmentRow.displayName = 'DepartmentRow';

// Loading skeleton component
const DepartmentRowSkeleton = memo(({ theme }: { theme: string }) => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className={`h-4 w-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`h-10 w-10 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-lg`}></div>
        </div>
        <div className="ml-4 space-y-2">
          <div className={`h-4 w-32 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
          <div className={`h-3 w-20 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className={`h-4 w-48 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className={`h-6 w-16 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full`}></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right">
      <div className="flex items-center justify-end space-x-2">
        <div className={`h-4 w-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
        <div className={`h-4 w-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
      </div>
    </td>
  </tr>
));

DepartmentRowSkeleton.displayName = 'DepartmentRowSkeleton';

const DepartmentManagement: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSettingsContext();
  const {
    departments,
    isLoading: loading,
    error,
    total,
    page: currentPage,
    limit,
    filters,
    currentDepartment: _currentDepartment
  } = useSelector((state: RootState) => state.department);

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // State for forms
  const [createForm, setCreateForm] = useState<CreateDepartmentData>({
    name: '',
    code: '',
    description: '',
    isActive: true
  });
  const [editForm, setEditForm] = useState<UpdateDepartmentData>({});

  // State for filters and search
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [statusFilter, setStatusFilter] = useState(filters.isActive?.toString() || '');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk operations state
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [_showBulkActions, _setShowBulkActions] = useState(false);

  // Form validation errors
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Calculate pagination values
  const totalPages = Math.ceil(total / limit);
  const isAllSelected = departments.length > 0 && selectedDepartments.size === departments.length;
  const hasActiveFilters = searchTerm || statusFilter;

  // Load departments on component mount and when filters change
  useEffect(() => {
    dispatch(fetchDepartments({}));
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(setFilters({ search: searchTerm }));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, dispatch]);

  // Handle status filter
  useEffect(() => {
    if (statusFilter === '') {
      dispatch(setFilters({ isActive: undefined }));
    } else {
      dispatch(setFilters({ isActive: statusFilter === 'true' }));
    }
  }, [statusFilter, dispatch]);

  // Validation functions
  const validateCreateForm = (form: CreateDepartmentData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = 'Department name is required';
    } else if (form.name.length < 2) {
      errors.name = 'Department name must be at least 2 characters';
    }

    if (!form.code.trim()) {
      errors.code = 'Department code is required';
    } else if (form.code.length < 2) {
      errors.code = 'Department code must be at least 2 characters';
    } else if (!/^[A-Z0-9_-]+$/i.test(form.code)) {
      errors.code = 'Department code can only contain letters, numbers, hyphens, and underscores';
    }

    return errors;
  };

  const validateEditForm = (form: UpdateDepartmentData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (form.name !== undefined) {
      if (!form.name.trim()) {
        errors.name = 'Department name is required';
      } else if (form.name.length < 2) {
        errors.name = 'Department name must be at least 2 characters';
      }
    }

    if (form.code !== undefined) {
      if (!form.code.trim()) {
        errors.code = 'Department code is required';
      } else if (form.code.length < 2) {
        errors.code = 'Department code must be at least 2 characters';
      } else if (!/^[A-Z0-9_-]+$/i.test(form.code)) {
        errors.code = 'Department code can only contain letters, numbers, hyphens, and underscores';
      }
    }

    return errors;
  };

  // Handle create department
  const handleCreateDepartment = async () => {
    const errors = validateCreateForm(createForm);
    setCreateFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await dispatch(createDepartment(createForm)).unwrap();
      setShowCreateModal(false);
      setCreateForm({ name: '', code: '', description: '', isActive: true });
      setCreateFormErrors({});
      toast.success('Department created successfully');
    } catch (error) {
      toast.error(error as string || 'Failed to create department');
    }
  };

  // Handle edit department
  const handleEditDepartment = async () => {
    if (!selectedDepartment) return;

    const errors = validateEditForm(editForm);
    setEditFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await dispatch(updateDepartment({ id: selectedDepartment.id, departmentData: editForm })).unwrap();
      setShowEditModal(false);
      setSelectedDepartment(null);
      setEditForm({});
      setEditFormErrors({});
      toast.success('Department updated successfully');
    } catch (error) {
      toast.error(error as string || 'Failed to update department');
    }
  };



  // Handle department selection
  const handleSelectDepartment = (departmentId: string) => {
    const newSelected = new Set(selectedDepartments);
    if (newSelected.has(departmentId)) {
      newSelected.delete(departmentId);
    } else {
      newSelected.add(departmentId);
    }
    setSelectedDepartments(newSelected);
  };

  // Handle select all departments
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDepartments(new Set());
    } else {
      setSelectedDepartments(new Set(departments.map(dept => dept.id)));
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    dispatch(clearFilters());
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    dispatch(setPage(page));
  };

  const handleLimitChange = (newLimit: number) => {
    dispatch(setDepartmentLimit(newLimit));
    dispatch(setPage(1));
  };

  // Open edit modal
  const openEditModal = (department: Department) => {
    setSelectedDepartment(department);
    setEditForm({
      name: department.name,
      code: department.code,
      description: department.description,
      isActive: department.isActive
    });
    setEditFormErrors({});
    setShowEditModal(true);
  };

  // Handle toggle department status
  const handleToggleStatus = async (departmentId: string) => {
    const department = departments.find(d => d.id === departmentId);
    if (!department) return;

    try {
      await dispatch(updateDepartment({ 
        id: departmentId, 
        departmentData: { isActive: !department.isActive } 
      })).unwrap();
      toast.success(`Department ${!department.isActive ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error(error as string || 'Failed to update department status');
    }
  };

  return (
    <div className={`p-6 space-y-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Department Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage academic departments and their information
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Department
        </button>
      </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => dispatch(clearError())}
                  className="inline-flex text-red-400 hover:text-red-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className={`mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 dark:placeholder-gray-500'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 dark:placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900'
                    }`}
                  >
                    <option value="">All Statuses</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedDepartments.size > 0 && (
          <div className={`mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {selectedDepartments.size} department{selectedDepartments.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedDepartments(new Set())}
                  className={`text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Clear selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Departments Table */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Department
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Description
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 dark:divide-gray-700 bg-white'}`}>
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: limit }).map((_, index) => (
                    <DepartmentRowSkeleton key={index} theme={theme} />
                  ))
                ) : departments.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <Building2 className={`h-12 w-12 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
                        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'} mb-2`}>
                          No departments found
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mb-4`}>
                          {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Get started by creating your first department.'}
                        </p>
                        {!hasActiveFilters && (
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Department
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Department rows
                  departments.map((department) => (
                    <DepartmentRow
                      key={department.id}
                      department={department}
                      isSelected={selectedDepartments.has(department.id)}
                      onSelect={handleSelectDepartment}
                      onEdit={openEditModal}
                      onToggleStatus={handleToggleStatus}
                      theme={theme}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-6 py-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                  Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} departments
                </div>
                <div className="flex items-center space-x-2">
                  <PageSizeDropdown
                    value={limit}
                    onChange={handleLimitChange}
                  />
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      currentPage === 1
                        ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                        : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      currentPage === totalPages
                        ? theme === 'dark' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                        : theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Create Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Create New Department
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Department Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    createFormErrors.name ? 'border-red-300' : theme === 'dark' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                  } ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                  }`}
                  placeholder="e.g., Computer Studies"
                />
                {createFormErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{createFormErrors.name}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Department Code *
                </label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    createFormErrors.code ? 'border-red-300' : theme === 'dark' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                  } ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                  }`}
                  placeholder="e.g., CS"
                />
                {createFormErrors.code && (
                  <p className="mt-1 text-sm text-red-600">{createFormErrors.code}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900'
                  }`}
                  placeholder="Optional description of the department"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="createActive"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="createActive" className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Active
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ name: '', code: '', description: '', isActive: true });
                  setCreateFormErrors({});
                }}
                className={`px-4 py-2 border rounded-md text-sm font-medium ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartment}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Department'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Edit Department
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Department Name *
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    editFormErrors.name ? 'border-red-300' : theme === 'dark' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                  } ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                  }`}
                  placeholder="e.g., Computer Studies"
                />
                {editFormErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{editFormErrors.name}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Department Code *
                </label>
                <input
                  type="text"
                  value={editForm.code || ''}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    editFormErrors.code ? 'border-red-300' : theme === 'dark' ? 'border-gray-600' : 'border-gray-300 dark:border-gray-600'
                  } ${
                    theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'
                  }`}
                  placeholder="e.g., CS"
                />
                {editFormErrors.code && (
                  <p className="mt-1 text-sm text-red-600">{editFormErrors.code}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Description
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900'
                  }`}
                  placeholder="Optional description of the department"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editActive"
                  checked={editForm.isActive ?? false}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="editActive" className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Active
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedDepartment(null);
                  setEditForm({});
                  setEditFormErrors({});
                }}
                className={`px-4 py-2 border rounded-md text-sm font-medium ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleEditDepartment}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Department'
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default DepartmentManagement;
