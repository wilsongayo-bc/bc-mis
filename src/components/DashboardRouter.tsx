import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole as _UserRole } from '../services/dashboardService';

// Import role-specific dashboard components
import AdminDashboard from './dashboards/AdminDashboard';
import TeacherDashboard from './dashboards/TeacherDashboard';
import StudentDashboard from './dashboards/StudentDashboard';
import RegistrarDashboard from './dashboards/RegistrarDashboard';

/**
 * Dashboard Router Component
 * 
 * This component automatically routes users to their role-specific dashboard
 * based on their authenticated user role. It eliminates the need for manual
 * role checking and provides a seamless dashboard experience.
 */
const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  // If user is not authenticated, return null (should be handled by ProtectedRoute)
  if (!user) {
    return null;
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'SUPERADMIN':
      return <AdminDashboard />;
    
    case 'ADMIN':
      return <AdminDashboard />;
    
    case 'TEACHER':
      return <TeacherDashboard />;
    
    case 'STUDENT':
      return <StudentDashboard />;
    
    case 'REGISTRAR':
      return <RegistrarDashboard />;
    
    case 'FINANCE':
    case 'LIBRARIAN':
    case 'STAFF':
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Dashboard analytics for role ({user.role}) is not yet migrated to the new analytics endpoints.
              </p>
            </div>
          </div>
        </div>
      );
    
    default:
      // Fallback for unknown roles - show basic dashboard
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Dashboard Access Error
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your user role ({user.role}) does not have access to a specific dashboard.
                Please contact your administrator for assistance.
              </p>
            </div>
          </div>
        </div>
      );
  }
};

export default DashboardRouter;
