import { useAppSelector } from './redux';
import { selectUser, selectIsAuthenticated, selectAuthLoading } from '../store/slices/authSlice';

/**
 * Custom hook for accessing authentication state
 * Provides easy access to user data, authentication status, and loading state
 */
export const useAuth = () => {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const token = localStorage.getItem('token');

  return {
    user,
    isAuthenticated,
    isLoading,
    token,
  };
};