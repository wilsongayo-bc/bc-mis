import api from '../lib/api';
import { BackendUserProfile } from '../types/userProfile.types';

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  position: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN' | 'STAFF';
  roles?: Array<User['role']>;
  isActive: boolean;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  loginCount?: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  success?: boolean;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  position: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN' | 'STAFF';
  roles?: Array<User['role']>;
  password: string;
  status?: 'active' | 'inactive';
  isEmailVerified?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  position?: string;
  role?: 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN' | 'STAFF';
  roles?: Array<User['role']>;
  isActive?: boolean;
  isEmailVerified?: boolean;
  avatar?: string;
}

export interface ResetPasswordRequest {
  newPassword?: string;
}

/**
 * Fetch all manageable users (requires authentication)
 */
export const fetchUsers = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string,
  status?: string,
  activity?: string,
  dateRange?: { start?: string; end?: string }
): Promise<UsersResponse> => {
  try {
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }
    
    if (role) {
      params.append('role', role);
    }
    
    if (status) {
      params.append('isActive', status === 'active' ? 'true' : 'false');
    }
    
    if (activity) {
      params.append('activity', activity);
    }
    
    if (dateRange?.start) {
      params.append('startDate', dateRange.start);
    }
    
    if (dateRange?.end) {
      params.append('endDate', dateRange.end);
    }

    const response = await api.get(`/users?${params}`);
    const data = response.data;
    
    // Transform backend response format {success: true, data: users, pagination: {total}} to expected format
    return {
      users: data.data || [],
      total: data.pagination?.total || 0,
      page: page,
      limit: limit,
      success: data.success
    };
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch a specific user by ID (requires authentication)
 */
export const fetchUserById = async (token: string, userId: string): Promise<User> => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

/**
 * Fetch detailed user profile information (requires authentication)
 */
export const fetchUserProfile = async (token: string, userId: string): Promise<BackendUserProfile> => {
  try {
    const response = await api.get(`/users/${userId}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Create a new user (requires authentication)
 */
export const createUser = async (token: string, userData: CreateUserRequest): Promise<User> => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update a user (requires authentication)
 */
export const updateUser = async (token: string, userId: string, userData: UpdateUserRequest): Promise<User> => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Update current user's own profile (requires authentication)
 */
export const updateCurrentUserProfile = async (token: string, userData: UpdateUserRequest): Promise<User> => {
  try {
    const response = await api.patch('/users/profile', userData);
    return response.data;
  } catch (error) {
    console.error('Error updating current user profile:', error);
    throw error;
  }
};

/**
 * Reset user password (requires authentication)
 */
export const resetUserPassword = async (token: string, userId: string, passwordData: ResetPasswordRequest): Promise<{ message: string }> => {
  try {
    const response = await api.put(`/users/${userId}/password`, passwordData);
    return response.data;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

export const bulkResetUserPasswords = async (
  token: string,
  userIds: string[]
): Promise<{
  message: string;
  data?: {
    successCount: number;
    failureCount: number;
    results: Array<{ userId: string; success: boolean; reason?: string }>;
  };
}> => {
  try {
    const response = await api.post('/users/bulk-reset-password', { userIds });
    return response.data;
  } catch (error) {
    console.error('Error bulk resetting passwords:', error);
    throw error;
  }
};

/**
 * Delete a user (requires authentication)
 */
export const deleteUser = async (token: string, userId: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Fetch manageable roles for current user (requires authentication)
 */
export const fetchManageableRoles = async (_token: string): Promise<string[]> => {
  try {
    const response = await api.get('/users/manageable-roles');
    return response.data.data || response.data;
  } catch (error) {
    console.error('Error fetching manageable roles:', error);
    throw error;
  }
};

/**
 * Bulk delete users (requires authentication)
 */
export const bulkDeleteUsers = async (token: string, userIds: string[]): Promise<{ message: string; deletedCount: number }> => {
  try {
    const response = await api.post('/users/bulk-delete', { userIds });
    return response.data;
  } catch (error) {
    console.error('Error bulk deleting users:', error);
    throw error;
  }
};

/**
 * Bulk update user status (activate/deactivate) (requires authentication)
 */
export const bulkUpdateUserStatus = async (token: string, userIds: string[], isActive: boolean): Promise<{ message: string; updatedCount: number }> => {
  try {
    const response = await api.post('/users/bulk-status', { userIds, isActive });
    return response.data;
  } catch (error) {
    console.error('Error bulk updating user status:', error);
    throw error;
  }
};

/**
 * Bulk update user roles (requires authentication)
 */
export const bulkUpdateUserRoles = async (token: string, userIds: string[], role: string): Promise<{ message: string }> => {
  try {
    const response = await api.put('/users/bulk/roles', { userIds, role });
    return response.data;
  } catch (error) {
    console.error('Error updating user roles:', error);
    throw error;
  }
};

/**
 * Upload user avatar (requires authentication)
 */
export const uploadUserAvatar = async (token: string, userId: string, file: File): Promise<{ avatarUrl: string }> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

/**
 * Delete user avatar (requires authentication)
 */
export const deleteUserAvatar = async (token: string, userId: string): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/users/${userId}/avatar`);
    return response.data;
  } catch (error) {
    console.error('Error deleting avatar:', error);
    throw error;
  }
};

/**
 * Fetch user activity statistics (requires authentication)
 */
export const fetchUserActivity = async (token: string, userId: string): Promise<{
  lastLoginAt?: string;
  loginCount: number;
  lastActivityAt?: string;
}> => {
  try {
    const response = await api.get(`/users/${userId}/activity`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw error;
  }
};

/**
 * Utility function to format last login time
 */
export const formatLastLogin = (lastLoginAt?: string): string => {
  if (!lastLoginAt) return 'Never';
  
  const loginDate = new Date(lastLoginAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
  
  return loginDate.toLocaleDateString();
};

/**
 * Utility function to get activity status color
 */
export const getActivityStatusColor = (lastLoginAt?: string): string => {
  if (!lastLoginAt) return 'text-gray-400';
  
  const loginDate = new Date(lastLoginAt);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - loginDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays <= 1) return 'text-green-600';
  if (diffInDays <= 7) return 'text-yellow-600';
  if (diffInDays <= 30) return 'text-orange-600';
  
  return 'text-red-600';
};

/**
 * Export users to CSV format
 */
export const exportUsersToCSV = (users: User[]): void => {
  const headers = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Role',
    'Status',
    'Created At',
    'Last Login',
    'Login Count'
  ];
  
  const csvContent = [
    headers.join(','),
    ...users.map(user => [
      user.id,
      `"${user.firstName}"`,
      `"${user.lastName}"`,
      user.email,
      user.role,
      user.status,
      user.createdAt ? new Date(user.createdAt).toISOString() : '',
      user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : '',
      user.loginCount || 0
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parse CSV file for user import
 */
export const parseCSVForImport = (csvText: string): Omit<CreateUserRequest, 'password'>[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) throw new Error('CSV file must contain headers and at least one data row');
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['firstname', 'lastname', 'email', 'role'];
  
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"/g, ''));
    const user: Omit<CreateUserRequest, 'password'> = {} as Omit<CreateUserRequest, 'password'>;
    
    headers.forEach((header, i) => {
      switch (header) {
        case 'firstname':
          user.firstName = values[i];
          break;
        case 'lastname':
          user.lastName = values[i];
          break;
        case 'email':
          user.email = values[i];
          break;
        case 'role':
          user.role = values[i] as CreateUserRequest['role'];
          break;
        case 'status':
          user.status = (values[i] || 'active') as CreateUserRequest['status'];
          break;
      }
    });
    
    // Validate required fields
    if (!user.firstName || !user.lastName || !user.email || !user.role) {
      throw new Error(`Row ${index + 2}: Missing required fields`);
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user.email)) {
      throw new Error(`Row ${index + 2}: Invalid email format`);
    }
    
    return user;
  });
};

/**
 * Bulk import users (requires authentication)
 */
export const bulkImportUsers = async (token: string, users: Omit<CreateUserRequest, 'password'>[]): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> => {
  try {
    const response = await api.post('/users/bulk-import', { users });
    return response.data;
  } catch (error) {
    console.error('Error importing users:', error);
    throw error;
  }
};
