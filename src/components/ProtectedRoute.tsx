import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { selectIsAuthenticated, selectAuthLoading } from '../store/slices/authSlice';
// Removed unused imports: hasRolePermission, UserRole

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const user = useAppSelector(state => state.auth.user);
  const location = useLocation();
  // Removed unused variable: startTime

  // Debug logging for authentication issues
  console.debug('🛡️ ProtectedRoute Debug:', {
    isAuthenticated,
    isLoading,
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    hasToken: !!localStorage.getItem('token'),
    pathname: location.pathname
  });
  
  if (!isAuthenticated && !isLoading) {
    console.log('🛡️ ProtectedRoute: User not authenticated, redirecting to login');
  }

  // Show loading during auth loading OR when user data is missing
  if (isLoading || (!user && localStorage.getItem('token'))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }



  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.mustChangePassword && location.pathname !== '/profile/edit') {
    return <Navigate to="/profile/edit" state={{ from: location, reason: 'mustChangePassword' }} replace />;
  }

  // Check role-based permissions
  if (requiredRoles && requiredRoles.length > 0) {
    const effectiveRoles = user?.roles && user.roles.length > 0 ? user.roles : (user?.role ? [user.role] : []);
    const hasPermission = effectiveRoles.includes('SUPERADMIN') || effectiveRoles.some(role => requiredRoles.includes(role));
    
    if (!hasPermission) {
      console.log('❌ ProtectedRoute: Access denied - insufficient permissions for', location.pathname, {
        userRole: user?.role,
        effectiveRoles,
        requiredRoles,
        hasUser: !!user
      });
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
