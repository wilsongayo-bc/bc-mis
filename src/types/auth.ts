/**
 * Authentication and authorization types
 */

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STAFF' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  username: string;
  position: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}