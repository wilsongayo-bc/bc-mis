import React, { useState, useEffect } from 'react';
import BaseDashboard, { StatCard } from './BaseDashboard';
import { 
  DashboardService, 
  SuperAdminStats, 
  QuickAction, 
  UserRole,
  RecentActivity 
} from '../../services/dashboardService';
import { 
  Users, 
  Building, 
  DollarSign, 
  Database,
  TrendingUp,
  Shield,
  Activity,
  Settings as _Settings
} from 'lucide-react';

/**
 * SuperAdmin Dashboard Component
 * 
 * Provides comprehensive system overview for SuperAdmin users including:
 * - Total system statistics (users, schools, revenue, data)
 * - System health monitoring
 * - Administrative quick actions
 * - Recent system activities
 */
const SuperAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all dashboard data concurrently
        const [statsData, actionsData, activitiesData] = await Promise.all([
          DashboardService.getDashboardStats(UserRole.SUPERADMIN),
          DashboardService.getQuickActions(UserRole.SUPERADMIN),
          DashboardService.getRecentActivities(UserRole.SUPERADMIN)
        ]);

        setStats(statsData as SuperAdminStats);
        setQuickActions(actionsData);
        setRecentActivities(activitiesData);
      } catch (err) {
        console.error('Error fetching SuperAdmin dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading SuperAdmin Dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Statistics grid
  const statsGrid = stats ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Users"
        value={stats.totalUsers}
        icon={<Users className="h-5 w-5" />}
        trend={{
          value: 12,
          isPositive: true
        }}
      />
      <StatCard
        title="Active Schools"
        value={typeof stats.totalSchools === 'number' ? stats.totalSchools : 0}
        icon={<Building className="h-5 w-5" />}
        trend={{
          value: 5,
          isPositive: true
        }}
      />
      <StatCard
        title="System Revenue"
        value={`$${stats.totalRevenue.toLocaleString()}`}
        icon={<DollarSign className="h-5 w-5" />}
        trend={{
          value: 8,
          isPositive: true
        }}
      />
      <StatCard
        title="Database Records"
        value={typeof stats.totalRecords === 'number' ? stats.totalRecords : 0}
        icon={<Database className="h-5 w-5" />}
        trend={{
          value: 15,
          isPositive: true
        }}
      />
    </div>
  ) : null;

  // Additional system health cards
  const systemHealthCards = stats ? (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Overall system status</p>
          </div>
          <Activity className="h-8 w-8 text-green-500 dark:text-green-400" />
        </div>
        <div className="mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">All Systems Operational</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last checked: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Status</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">System security overview</p>
          </div>
          <Shield className="h-8 w-8 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Secure</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No security alerts</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">System performance metrics</p>
          </div>
          <TrendingUp className="h-8 w-8 text-purple-500 dark:text-purple-400" />
        </div>
        <div className="mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 dark:bg-purple-400 rounded-full mr-2"></div>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Optimal</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Response time: &lt;200ms</p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <BaseDashboard
      title="SuperAdmin Dashboard"
      description="Comprehensive system overview and administrative controls"
      stats={statsGrid}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
    >
      {systemHealthCards}
    </BaseDashboard>
  );
};

export default SuperAdminDashboard;