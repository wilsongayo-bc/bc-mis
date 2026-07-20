import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAuth as _useAuth } from '../hooks/useAuth';
import { useSettingsContext } from '../utils/settingsUtils';
import { usePasswordRequirements } from '../hooks/usePasswordRequirements';
import {
  Users as _Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2 as _Trash2,
  Key,
  UserCheck,
  UserX,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Shield,
  XCircle,
  User as UserIcon,
  CheckSquare,
  Square,
  X,
  MoreHorizontal as _MoreHorizontal,
  Loader2,
  Eye,
  EyeOff,
  User as ViewIcon
} from 'lucide-react';
import Avatar from '../components/Avatar';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser as _deleteUser,
  resetUserPassword,
  bulkResetUserPasswords,
  fetchManageableRoles,
  bulkDeleteUsers as _bulkDeleteUsers,
  bulkUpdateUserStatus,
  bulkUpdateUserRoles,
  exportUsersToCSV,
  parseCSVForImport,
  bulkImportUsers,
  formatLastLogin,
  getActivityStatusColor,
  User,
  CreateUserRequest,
  UpdateUserRequest
} from '../services/userService';
import { fetchActivePositions, Position } from '../services/positionService';
import {
  validateCreateUserForm,
  validateUpdateUserForm,
  validatePasswordReset,
  validateImportData,
  getFieldError,
  hasFieldError,
  ValidationError
} from '../utils/validation';
import { UserRole } from '../utils/roleHierarchy';
import {
  handleApiError,
  handleSuccess,
  handleValidationErrors,
  handleBulkOperationError,
  handleImportExportError
} from '../utils/errorHandling';
import PageSizeDropdown from '../components/PageSizeDropdown';


// Memoized UserRow component for better performance
const UserRow = memo(({
  user,
  isSelected,
  currentUserId,
  onSelect,
  onEdit,
  onToggleStatus,
  onPasswordReset,
  onViewProfile,
  canViewProfile,
  getRoleIcon,
  getRoleBadgeColor,
  theme
}: {
  user: User;
  isSelected: boolean;
  currentUserId?: string;
  onSelect: (userId: string) => void;
  onEdit: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onPasswordReset: (user: User) => void;
  onViewProfile: (user: User) => void;
  canViewProfile: (user: User) => boolean;
  getRoleIcon: (role: string) => React.ReactNode;
  getRoleBadgeColor: (role: string) => string;
  theme: string;
}) => {
  return (
    <tr className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} ${isSelected ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50') : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(user.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
          />
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Avatar
              user={user}
              size="sm"
              showUpload={false}
            />
          </div>
          <div className="ml-4">
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {user.firstName} {user.lastName}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {user.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
            {getRoleIcon(user.role)}
            <span className="ml-1">{user.role}</span>
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {user.isActive ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <UserCheck className="h-3 w-3 mr-1" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <UserX className="h-3 w-3 mr-1" />
              Inactive
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm">
          {user.lastLoginAt ? (
            <div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${getActivityStatusColor(user.lastLoginAt).includes('green') ? 'bg-green-400' :
                  getActivityStatusColor(user.lastLoginAt).includes('yellow') ? 'bg-yellow-400' :
                    getActivityStatusColor(user.lastLoginAt).includes('orange') ? 'bg-orange-400' :
                      'bg-red-400'
                  }`}></div>
                <span className={`font-medium ${getActivityStatusColor(user.lastLoginAt)}`}>
                  {formatLastLogin(user.lastLoginAt)}
                </span>
              </div>
              {user.loginCount && (
                <div className="text-xs text-gray-400 mt-1">
                  {user.loginCount} total login{user.loginCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-gray-400 italic">Never logged in</span>
            </div>
          )}
        </div>
      </td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          {canViewProfile(user) && (
            <button
              onClick={() => onViewProfile(user)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="View profile"
            >
              <ViewIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(user)}
            className="text-blue-600 hover:text-blue-900"
            title="Edit user"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPasswordReset(user)}
            className="text-yellow-600 hover:text-yellow-900"
            title="Reset password"
          >
            <Key className="h-4 w-4" />
          </button>
          {user.id !== currentUserId && (
            <button
              onClick={() => onToggleStatus(user)}
              className={user.isActive ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
              title={user.isActive ? "Disable user" : "Enable user"}
            >
              {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

UserRow.displayName = 'UserRow';

// Loading skeleton component
const UserRowSkeleton = memo(({ theme }: { theme: string }) => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className={`h-4 w-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`h-8 w-8 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full`}></div>
        </div>
        <div className="ml-4 space-y-2">
          <div className={`h-4 w-32 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
          <div className={`h-3 w-48 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className={`h-6 w-20 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full`}></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className={`h-6 w-16 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full`}></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="space-y-1">
        <div className={`h-4 w-24 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
        <div className={`h-3 w-16 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className={`h-4 w-20 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right">
      <div className="flex items-center justify-end space-x-2">
        <div className={`h-4 w-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
        <div className={`h-4 w-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
        <div className={`h-4 w-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded`}></div>
      </div>
    </td>
  </tr>
));

UserRowSkeleton.displayName = 'UserRowSkeleton';

const UserManagement: React.FC = () => {
  const { token, user: currentUser } = useSelector((state: RootState) => state.auth);
  const { theme } = useSettingsContext();
  const navigate = useNavigate();
  const { requirements: passwordRequirements } = usePasswordRequirements();

  // State for users data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [_limit, setLimit] = useState(20);

  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [manageableRoles, setManageableRoles] = useState<string[]>([]);

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // State for forms
  const [createForm, setCreateForm] = useState<Omit<CreateUserRequest, 'role'> & { role: CreateUserRequest['role'] | '' }>({
    email: '',
    username: '',
    firstName: '',
    lastName: '',
    middleInitial: '',
    position: '',
    password: '',
    role: '',
    roles: [],
    isEmailVerified: false
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [editForm, setEditForm] = useState<UpdateUserRequest>({});
  const [newPassword, setNewPassword] = useState('');
  const [useCustomResetPassword, setUseCustomResetPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Bulk operations state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [_showBulkActions, _setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'role-change' | 'reset-password' | null>('activate');
  const [bulkRole, setBulkRole] = useState<string>('');
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [_importFile, _setImportFile] = useState<File | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<CreateUserRequest, 'password'>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Positions state
  const [positions, setPositions] = useState<Position[]>([]);

  // Validation states
  const [createFormErrors, setCreateFormErrors] = useState<ValidationError[]>([]);
  const [editFormErrors, setEditFormErrors] = useState<ValidationError[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<ValidationError[]>([]);
  const [importErrors, setImportErrors] = useState<ValidationError[]>([]);

  // Check if current user has permission to manage users
  const canManageUsers = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';



  // Filter users based on current user role
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    // Super Admin can see all users
    if (currentUser?.role === 'SUPERADMIN') {
      return users;
    }

    // Admin users cannot see Super Admin users and demo users
    if (currentUser?.role === 'ADMIN') {
      return users.filter(user => {
        // Hide Super Admin users
        if (user.role === 'SUPERADMIN') {
          return false;
        }

        // Hide demo users (users with 'demo' in their email or name)
        const isDemoUser =
          user.email.toLowerCase().includes('demo') ||
          user.firstName.toLowerCase().includes('demo') ||
          user.lastName.toLowerCase().includes('demo');

        return !isDemoUser;
      });
    }

    return users;
  }, [users, currentUser?.role]);

  // Calculate filtered total for pagination
  const filteredTotal = useMemo(() => {
    if (currentUser?.role === 'SUPERADMIN') {
      return total;
    }
    // For non-SUPERADMIN users, we need to estimate the total based on the API response
    // Since we filter out SUPERADMIN and demo users client-side, we use the API total
    // This assumes the API doesn't return SUPERADMIN users for ADMIN users
    return total;
  }, [total, currentUser?.role]);

  // Calculate pagination values based on filtered data
  const totalPages = Math.ceil(filteredTotal / _limit);



  const isAllSelected = filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length;
  const hasActiveFilters = searchTerm || roleFilter || statusFilter || activityFilter || dateRangeFilter.start || dateRangeFilter.end;


  const loadUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetchUsers(
        token,
        currentPage,
        _limit,
        searchTerm,
        roleFilter,
        statusFilter,
        activityFilter,
        dateRangeFilter.start || dateRangeFilter.end ? dateRangeFilter : undefined
      );

      setUsers(response.users || []);
      setTotal(response.total || 0);
      setError(null);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, _limit, searchTerm, roleFilter, statusFilter, activityFilter, dateRangeFilter]);

  const loadManageableRoles = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const roles = await fetchManageableRoles(token);
      setManageableRoles(roles || []);
    } catch (err) {
      console.error('Failed to load manageable roles:', err);
      // Fallback to basic roles if API fails
      setManageableRoles(['STUDENT', 'TEACHER', 'STAFF', 'ADMIN']);
    }
  }, [token]);

  const loadPositions = useCallback(async () => {
    if (!token) {
      console.log('🔍 loadPositions: No token available');
      return;
    }

    console.log('🔍 loadPositions: Starting to fetch positions...');
    try {
      const positionsData = await fetchActivePositions();
      console.log('🔍 loadPositions: Received positions data:', positionsData);
      setPositions(positionsData || []);
      console.log('🔍 loadPositions: Set positions state to:', positionsData || []);
    } catch (err) {
      console.error('❌ Failed to load positions:', err);
      setPositions([]);
    }
  }, [token]);

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (canManageUsers && token) {
      loadUsers();
      loadManageableRoles();
      loadPositions();
    }
  }, [canManageUsers, token, currentPage, searchTerm, roleFilter, statusFilter, activityFilter, dateRangeFilter, loadManageableRoles, loadUsers, loadPositions]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Clear previous errors
    setCreateFormErrors([]);

    // Validate form with dynamic password requirements
    const validation = validateCreateUserForm(createForm, manageableRoles, passwordRequirements);
    if (!validation.isValid) {
      setCreateFormErrors(validation.errors);
      handleValidationErrors(validation.errors);
      return;
    }

    try {
      // Type assertion is safe here because validation ensures role is not empty
      await createUser(token, createForm as CreateUserRequest);
      handleSuccess('User created successfully');
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        username: '',
        firstName: '',
        lastName: '',
        middleInitial: '',
        position: '',
        password: '',
        role: '',
        roles: [],
        isEmailVerified: false
      });
      setCreateFormErrors([]);
      loadUsers();
    } catch (err) {
      handleApiError(err, 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;

    // Clear previous errors
    setEditFormErrors([]);

    // Validate form
    const validation = validateUpdateUserForm(editForm, manageableRoles);
    if (!validation.isValid) {
      setEditFormErrors(validation.errors);
      handleValidationErrors(validation.errors);
      return;
    }

    try {
      await updateUser(token, selectedUser.id, editForm);
      handleSuccess('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({});
      setEditFormErrors([]);
      loadUsers();
    } catch (err) {
      handleApiError(err, 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!token) return;

    try {
      const newStatus = !user.isActive;
      await bulkUpdateUserStatus(token, [user.id], newStatus);
      handleSuccess(`User ${newStatus ? 'enabled' : 'disabled'} successfully`);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUser) return;

    // Clear previous errors
    setPasswordErrors([]);

    if (useCustomResetPassword) {
      const validation = validatePasswordReset(newPassword);
      if (!validation.isValid) {
        setPasswordErrors(validation.errors);
        handleValidationErrors(validation.errors);
        return;
      }
    }

    try {
      if (useCustomResetPassword) {
        await resetUserPassword(token, selectedUser.id, { newPassword });
      } else {
        await resetUserPassword(token, selectedUser.id, {});
      }
      handleSuccess('Password reset successfully. User will be required to change password on next login.');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      setUseCustomResetPassword(false);
      setPasswordErrors([]);
    } catch (err) {
      handleApiError(err, 'Failed to reset password');
    }
  };

  // Bulk operations handlers
  const handleSelectUser = useCallback((userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  }, [selectedUsers]);

  const handleSelectAll = useCallback(() => {
    if (!filteredUsers || filteredUsers.length === 0) {
      setSelectedUsers(new Set());
      return;
    }

    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  }, [selectedUsers.size, filteredUsers]);

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'role-change' | 'reset-password') => {
    setBulkAction(action);
    setShowBulkConfirm(true);
  };

  const executeBulkAction = async () => {
    if (!token || selectedUsers.size === 0) return;

    if (currentUser?.id && selectedUsers.has(currentUser.id)) {
      handleApiError(new Error('You cannot reset or update your own account using bulk actions'), 'Bulk operation blocked');
      return;
    }

    setBulkLoading(true);
    try {
      const userIds = Array.from(selectedUsers);
      let actionName = '';

      switch (bulkAction) {
        case 'activate':
          await bulkUpdateUserStatus(token, userIds, true);
          actionName = 'Users activated';
          break;
        case 'deactivate':
          await bulkUpdateUserStatus(token, userIds, false);
          actionName = 'Users deactivated';
          break;
        case 'role-change':
          if (bulkRole) {
            await bulkUpdateUserRoles(token, userIds, bulkRole as UserRole);
            actionName = `User roles updated to ${bulkRole}`;
          }
          break;
        case 'reset-password':
          await bulkResetUserPasswords(token, userIds);
          actionName = 'Passwords reset';
          break;
      }

      handleSuccess(`${actionName} successfully`);
      setSelectedUsers(new Set());
      setShowBulkConfirm(false);
      setBulkAction('activate');
      setBulkRole('');
      loadUsers();
    } catch (_error: unknown) {
      handleBulkOperationError(_error, bulkAction || 'unknown');
    } finally {
      setBulkLoading(false);
    }
  };

  const openEditModal = useCallback((user: User) => {
    console.log('🔍 openEditModal: Opening edit modal for user:', user);
    console.log('🔍 openEditModal: Current positions state:', positions);
    console.log('🔍 openEditModal: Positions length:', positions.length);
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      username: user.username || '',
      firstName: user.firstName,
      lastName: user.lastName,
      middleInitial: user.middleInitial || '',
      position: user.position || '',
      role: user.role,
      roles: user.roles && user.roles.length > 0 ? user.roles : [user.role],
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    });
    console.log('🔍 openEditModal: Set edit form with position:', user.position || '');
    setShowEditModal(true);
  }, [positions]);

  // Permission check for viewing user profiles
  const canViewProfile = useCallback((user: User) => {
    if (!currentUser) return false;

    // Users can always view their own profile
    if (currentUser.id === user.id) return true;

    // Role-based access control based on PRD requirements
    switch (currentUser.role) {
      case 'SUPERADMIN':
        // SUPERADMIN can view all profiles
        return true;
      case 'ADMIN':
        // ADMIN can view profiles within their management scope (exclude SUPERADMIN)
        return user.role !== 'SUPERADMIN';
      case 'TEACHER':
        // TEACHER can view own profile and basic student information
        return user.role === 'STUDENT';
      case 'REGISTRAR':
      case 'FINANCE':
      case 'LIBRARIAN':
        // Staff roles can view relevant user information (students and other staff)
        return ['STUDENT', 'TEACHER', 'REGISTRAR', 'FINANCE', 'LIBRARIAN'].includes(user.role);
      case 'STUDENT':
        // STUDENT can only view own profile
        return false;
      default:
        return false;
    }
  }, [currentUser]);

  const handleViewProfile = useCallback((user: User) => {
    if (canViewProfile(user)) {
      navigate(`/users/${user.id}/profile`);
    }
  }, [navigate, canViewProfile]);



  const openPasswordModal = useCallback((user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setUseCustomResetPassword(false);
    setShowResetPassword(false);
    setPasswordErrors([]);
    setShowPasswordModal(true);
  }, []);

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  }, []);

  const getRoleBadgeColor = useCallback((role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-red-100 text-red-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Import/Export handlers
  const handleExportUsers = async () => {
    setExportLoading(true);
    try {
      await exportUsersToCSV(filteredUsers);
      handleSuccess('Users exported successfully');
    } catch (_error) {
      handleImportExportError(error, 'export');
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      _setImportFile(file);
      setImportErrors([]);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const parsedUsers = parseCSVForImport(csvText);

          // Validate import data
          const validation = validateImportData(parsedUsers);
          if (!validation.isValid) {
            setImportErrors(validation.errors);
            handleValidationErrors(validation.errors);
            return;
          }

          setImportPreview(parsedUsers);
          setShowImportModal(true);
        } catch (_error) {
          handleImportExportError(error, 'import');
        }
      };
      reader.readAsText(file);
    }
  };

  const executeImport = async () => {
    if (!token || importPreview.length === 0) return;

    setImportLoading(true);
    try {
      const result = await bulkImportUsers(token, importPreview);
      handleSuccess(`Successfully imported ${result.success} users`);
      setShowImportModal(false);
      _setImportFile(null);
      setImportPreview([]);
      setImportErrors([]);
      loadUsers();

      if (result.failed > 0) {
        setError(`Import completed with ${result.failed} failures. ${result.errors.join(', ')}`);
      } else {
        // Success message could be shown here
      }
    } catch (_error) {
      setError('Failed to import users');
    } finally {
      setImportLoading(false);
    }
  };

  // Removed unused selectedUserIds variable

  if (!canManageUsers) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Access Denied</h3>
          <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
            You don't have permission to manage users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <_Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            User Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>
        {/* Action Buttons */}
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN') && (
          <div className="flex items-center space-x-3">
            {/* Import/Export Buttons - Only for SUPERADMIN */}
            {currentUser?.role === 'SUPERADMIN' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportUsers}
                  disabled={users.length === 0 || exportLoading}
                  className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
                    ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  {exportLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {exportLoading ? 'Exporting...' : 'Export'}
                </button>
                <label className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${theme === 'dark'
                  ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            {/* Add User Button - Available for both ADMIN and SUPERADMIN */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        )}
      </div>



      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              showFilters
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {(roleFilter || statusFilter || activityFilter || dateRangeFilter.start || dateRangeFilter.end) && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full">
                {(roleFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (activityFilter ? 1 : 0) + (dateRangeFilter.start || dateRangeFilter.end ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Roles</option>
                {manageableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Activity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Activity
              </label>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Users</option>
                <option value="recent">Recently Active</option>
                <option value="inactive">Long Inactive</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created Date
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRangeFilter.start}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <input
                  type="date"
                  value={dateRangeFilter.end}
                  onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-end lg:col-span-4">
              <button
                onClick={() => {
                  setRoleFilter('');
                  setStatusFilter('');
                  setActivityFilter('');
                  setDateRangeFilter({ start: '', end: '' });
                }}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Toolbar - For ADMIN and SUPERADMIN */}
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN') && selectedUsers.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => handleBulkAction('activate')}
              disabled={bulkLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              disabled={bulkLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserX className="h-4 w-4 mr-1" />}
              Deactivate
            </button>
            <button
              onClick={() => handleBulkAction('role-change')}
              disabled={bulkLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
              Change Role
            </button>
            <button
              onClick={() => handleBulkAction('reset-password')}
              disabled={bulkLoading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Key className="h-4 w-4 mr-1" />}
              Reset Passwords
            </button>
          </div>
        </div>
      )}

        {/* No Users Found */}
        {!loading && filteredUsers && filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>No users found</h3>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
              {hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first user'}
            </p>
          </div>
        )}

      {/* Users Table */}
      {(loading || (filteredUsers && filteredUsers.length > 0)) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {/* Show select column for Admin and Super Admin */}
                  {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN') && (
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center space-x-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        <span>Select</span>
                      </button>
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors duration-200">
                {loading ? (
                  Array.from({ length: _limit }, (_, index) => (
                    <UserRowSkeleton key={`skeleton-${index}`} theme={theme} />
                  ))
                ) : (
                  filteredUsers?.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isSelected={selectedUsers.has(user.id)}
                      currentUserId={currentUser?.id}
                      onSelect={handleSelectUser}
                      onEdit={openEditModal}
                      onViewProfile={handleViewProfile}
                      canViewProfile={canViewProfile}
                      onToggleStatus={handleToggleUserStatus}
                      onPasswordReset={openPasswordModal}
                      getRoleIcon={getRoleIcon}
                      getRoleBadgeColor={getRoleBadgeColor}
                      theme={theme}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredUsers && filteredUsers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * _limit + 1}</span> to <span className="font-medium">{Math.min(currentPage * _limit, filteredTotal)}</span> of <span className="font-medium">{filteredTotal}</span> results
                  </p>
                  <PageSizeDropdown
                    value={_limit}
                    onChange={(n) => { setLimit(n); setCurrentPage(1); }}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md border ${
                      currentPage === 1
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md border ${
                      currentPage === totalPages
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:text-gray-600'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
            <div className="mt-3">
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Email</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'email')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                  />
                  {getFieldError(createFormErrors, 'email') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'email')}</p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Username</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'username')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                  />
                  {getFieldError(createFormErrors, 'username') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'username')}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>First Name</label>
                    <input
                      type="text"
                      required
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'firstName')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        }`}
                    />
                    {getFieldError(createFormErrors, 'firstName') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'firstName')}</p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>M.I.</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={createForm.middleInitial}
                      onChange={(e) => setCreateForm({ ...createForm, middleInitial: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'middleInitial')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        }`}
                    />
                    {getFieldError(createFormErrors, 'middleInitial') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'middleInitial')}</p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Last Name</label>
                    <input
                      type="text"
                      required
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'lastName')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        }`}
                    />
                    {getFieldError(createFormErrors, 'lastName') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'lastName')}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Position</label>
                  <select
                    value={createForm.position}
                    onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'position')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                    disabled={positions.length === 0}
                  >
                    <option key="create-position-placeholder" value="">
                      {positions.length === 0 ? 'Loading positions...' : 'Select a position'}
                    </option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.name}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {getFieldError(createFormErrors, 'position') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'position')}</p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Password</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? 'text' : 'password'}
                      required
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 pr-12 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'password')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        }`}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {showCreatePassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {getFieldError(createFormErrors, 'password') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'password')}</p>
                  )}
                  {!getFieldError(createFormErrors, 'password') && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {passwordRequirements.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as CreateUserRequest['role'];
                      setCreateForm({ ...createForm, role: nextRole, roles: nextRole ? [nextRole] : [] });
                    }}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(createFormErrors, 'role')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                    disabled={manageableRoles.length === 0}
                  >
                    <option key="create-role-placeholder" value="" disabled>
                      {manageableRoles.length === 0 ? 'Loading roles...' : 'Select a role'}
                    </option>
                    {manageableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {getFieldError(createFormErrors, 'role') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(createFormErrors, 'role')}</p>
                  )}
                </div>
                {createForm.role && (
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Additional Roles</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {manageableRoles
                        .filter((r) => r !== createForm.role)
                        .map((r) => {
                          const checked = (createForm.roles || []).includes(r as CreateUserRequest['role']);
                          return (
                            <label key={r} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const base = new Set<CreateUserRequest['role']>(createForm.role ? [createForm.role as CreateUserRequest['role']] : []);
                                  (createForm.roles || []).forEach((existing) => base.add(existing));
                                  if (e.target.checked) {
                                    base.add(r as CreateUserRequest['role']);
                                  } else {
                                    base.delete(r as CreateUserRequest['role']);
                                  }
                                  setCreateForm({ ...createForm, roles: Array.from(base) });
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                              />
                              <span>{r}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="createIsEmailVerified"
                    checked={createForm.isEmailVerified ?? false}
                    onChange={(e) => setCreateForm({ ...createForm, isEmailVerified: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="createIsEmailVerified" className={`ml-2 block text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                    Email Verified
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
            <div className="mt-3">
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Edit User</h3>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div className="flex justify-center mb-4">
                  <Avatar
                    user={selectedUser}
                    size="lg"
                    showUpload={true}
                    onAvatarUpdate={() => {
                      // Refresh user data after avatar update
                      loadUsers();
                    }}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(editFormErrors, 'email')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                  />
                  {getFieldError(editFormErrors, 'email') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(editFormErrors, 'email')}</p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Username</label>
                  <input
                    type="text"
                    value={editForm.username || ''}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(editFormErrors, 'username')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                  />
                  {getFieldError(editFormErrors, 'username') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(editFormErrors, 'username')}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>First Name</label>
                    <input
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(editFormErrors, 'firstName')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        }`}
                    />
                    {getFieldError(editFormErrors, 'firstName') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError(editFormErrors, 'firstName')}</p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>M.I.</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={editForm.middleInitial || ''}
                      onChange={(e) => setEditForm({ ...editForm, middleInitial: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(editFormErrors, 'middleInitial')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        }`}
                    />
                    {getFieldError(editFormErrors, 'middleInitial') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError(editFormErrors, 'middleInitial')}</p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Last Name</label>
                    <input
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(editFormErrors, 'lastName')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        }`}
                    />
                    {getFieldError(editFormErrors, 'lastName') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError(editFormErrors, 'lastName')}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Position</label>
                  <select
                    value={editForm.position || ''}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(editFormErrors, 'position')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                    disabled={positions.length === 0}
                  >
                    <option key="edit-position-placeholder" value="">
                      {positions.length === 0 ? 'Loading positions...' : 'Select a position'}
                    </option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.name}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {getFieldError(editFormErrors, 'position') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(editFormErrors, 'position')}</p>
                  )}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Role</label>
                  <select
                    value={editForm.role || ''}
                    onChange={(e) => {
                      const nextRole = e.target.value as UpdateUserRequest['role'];
                      const existingRoles = (editForm.roles && editForm.roles.length > 0
                        ? editForm.roles
                        : editForm.role
                          ? [editForm.role]
                          : []) as NonNullable<UpdateUserRequest['role']>[];
                      const keptSecondary = existingRoles.filter(r => r !== editForm.role);
                      setEditForm({ ...editForm, role: nextRole, roles: nextRole ? Array.from(new Set([nextRole, ...keptSecondary])) : [] });
                    }}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(editFormErrors, 'role')
                      ? 'border-red-300'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-700 text-white'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                    disabled={manageableRoles.length === 0}
                  >
                    {!editForm.role && (
                      <option key="edit-role-placeholder" value="" disabled>
                        {manageableRoles.length === 0 ? 'Loading roles...' : 'Select a role'}
                      </option>
                    )}
                    {manageableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {getFieldError(editFormErrors, 'role') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError(editFormErrors, 'role')}</p>
                  )}
                </div>
                {editForm.role && (
                  <div>
                    <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>Additional Roles</label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {manageableRoles
                        .filter((r) => r !== editForm.role)
                        .map((r) => {
                          const checked = (editForm.roles || []).includes(r as NonNullable<UpdateUserRequest['role']>);
                          return (
                            <label key={r} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const base = new Set<NonNullable<UpdateUserRequest['role']>>(
                                    editForm.role ? [editForm.role as NonNullable<UpdateUserRequest['role']>] : []
                                  );
                                  (editForm.roles || []).forEach((existing) => base.add(existing as NonNullable<UpdateUserRequest['role']>));
                                  if (e.target.checked) {
                                    base.add(r as NonNullable<UpdateUserRequest['role']>);
                                  } else {
                                    base.delete(r as NonNullable<UpdateUserRequest['role']>);
                                  }
                                  setEditForm({ ...editForm, roles: Array.from(base) });
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                              />
                              <span>{r}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editForm.isActive ?? true}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="isActive" className={`ml-2 block text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                    Active
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isEmailVerified"
                    checked={editForm.isEmailVerified ?? false}
                    onChange={(e) => setEditForm({ ...editForm, isEmailVerified: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="isEmailVerified" className={`ml-2 block text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                    }`}>
                    Email Verified
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}



      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
            <div className="mt-3">
              <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                Reset Password for {selectedUser.firstName} {selectedUser.lastName}
              </h3>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Default reset uses <span className="font-mono">bc-</span> + last 5 digits of employee/student ID and forces a password change on next login.
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="useCustomResetPassword"
                    type="checkbox"
                    checked={useCustomResetPassword}
                    onChange={(e) => {
                      setUseCustomResetPassword(e.target.checked);
                      setPasswordErrors([]);
                      setNewPassword('');
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label
                    htmlFor="useCustomResetPassword"
                    className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    Set custom password instead of default
                  </label>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>New Password</label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required={useCustomResetPassword}
                      disabled={!useCustomResetPassword}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 pr-12 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${hasFieldError(passwordErrors, 'password')
                        ? 'border-red-300'
                        : theme === 'dark'
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                        } ${!useCustomResetPassword ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      disabled={!useCustomResetPassword}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                        } ${!useCustomResetPassword ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {showResetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {useCustomResetPassword && getFieldError(passwordErrors, 'password') && (
                    <p className="mt-1 text-sm text-red-600">
                      {getFieldError(passwordErrors, 'password')}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className={`px-4 py-2 border rounded-md text-sm font-medium ${theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                  >
                    {useCustomResetPassword ? 'Reset Password' : 'Reset to Default'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md ${theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
            <div className="mt-3 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-600" />
              <h3 className={`text-lg font-medium mt-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                Confirm Bulk Action
              </h3>
              <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {bulkAction === 'activate' && `Are you sure you want to activate ${selectedUsers.size} selected users?`}
                {bulkAction === 'deactivate' && `Are you sure you want to deactivate ${selectedUsers.size} selected users?`}
                {bulkAction === 'role-change' && `Are you sure you want to change the role of ${selectedUsers.size} selected users to ${bulkRole}?`}
                {bulkAction === 'reset-password' && `Are you sure you want to reset passwords for ${selectedUsers.size} selected users to their default (bc-xxxxx) and force a password change on next login?`}
              </p>
              {bulkAction === 'role-change' && (
                <div className="mt-4">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>New Role</label>
                  <select
                    value={bulkRole}
                    onChange={(e) => setBulkRole(e.target.value)}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark'
                      ? 'border-gray-600 bg-gray-700 text-white'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'
                      }`}
                  >
                    {manageableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-center space-x-3 mt-6">
                <button
                  onClick={() => setShowBulkConfirm(false)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium ${theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkAction}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Users Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className={`relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md ${theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                  Import Users Preview
                </h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className={`${theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  Review the users to be imported. {importPreview.length} users found.
                </p>
                {importErrors.length > 0 && (
                  <div className={`mt-2 p-3 border rounded-md ${theme === 'dark'
                    ? 'bg-red-900/20 border-red-800'
                    : 'bg-red-50 border-red-200'
                    }`}>
                    <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'
                      }`}>Import Errors:</h4>
                    <ul className={`text-sm space-y-1 ${theme === 'dark' ? 'text-red-300' : 'text-red-700'
                      }`}>
                      {importErrors.map((error, index) => (
                        <li key={`error-${index}-${error.message.slice(0, 20)}`} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{error.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {importPreview.length > 0 && (
                <div className={`max-h-96 overflow-y-auto border rounded-md ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                  <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-600' : 'divide-gray-200 dark:divide-gray-700'
                    }`}>
                    <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Email
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          First Name
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Last Name
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Role
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'dark'
                      ? 'bg-gray-800 divide-gray-700'
                      : 'bg-white divide-gray-200 dark:divide-gray-700'
                      }`}>
                      {importPreview.map((user, index) => (
                        <tr key={user.email || `preview-user-${index}`} className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                            }`}>
                            {user.email}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                            }`}>
                            {user.firstName}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'
                            }`}>
                            {user.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'SUPERADMIN' ? 'bg-red-100 text-red-800' :
                              user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className={`px-4 py-2 border rounded-md text-sm font-medium ${theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  disabled={importLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={executeImport}
                  disabled={importLoading || importPreview.length === 0}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importLoading ? 'Importing...' : `Import ${importPreview.length} Users`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
