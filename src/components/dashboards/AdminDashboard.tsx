import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BaseDashboard, { StatCard } from './BaseDashboard';
import { 
  QuickAction, 
  RecentActivity 
} from '../../services/dashboardService';
import { analyticsDashboardService } from '../../services/analyticsDashboardService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DashboardTable } from './DashboardTable';
import { 
  Users, 
  BookOpen, 
  DollarSign, 
  GraduationCap,
  TrendingUp,
  Calendar,
  UserCheck,
  Activity,
  LayoutDashboard
} from 'lucide-react';

/**
 * Admin Dashboard Component
 * 
 * Provides school-level administrative overview including:
 * - School statistics (students, teachers, courses, revenue)
 * - Enrollment trends
 * - Administrative quick actions
 * - Recent school activities
 */
const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof analyticsDashboardService.getAdminDashboard>> | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { 
      name: 'Students', 
      href: '/students', 
      icon: 'Users',
      description: 'Manage student records, registrations, and academic history',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      name: 'Enrollments', 
      href: '/enrollments', 
      icon: 'UserPlus',
      description: 'Process new enrollments and manage student applications',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      name: 'Payments', 
      href: '/payments', 
      icon: 'DollarSign',
      description: 'Track school fees, student payments, and financial records',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    { 
      name: 'Reports', 
      href: '/reports', 
      icon: 'BarChart3',
      description: 'View detailed analytics and export school performance data',
      color: 'bg-purple-600 hover:bg-purple-700'
    }
  ]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dashboard = await analyticsDashboardService.getAdminDashboard();
      setAnalytics(dashboard);

      const topModules = dashboard.data.activity.topModules.slice(0, 5);
      setRecentActivities(
        topModules.map((m) => ({
          id: `module-${m.module}`,
          date: dashboard.meta.generatedAt,
          type: 'system',
          description: `${m.module}: ${m.count.toLocaleString()} actions (last 30d)`
        }))
      );
    } catch (err) {
      console.error('Error fetching Admin dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const exportFileBaseName = useMemo(() => {
    if (!analytics) return undefined;
    const base = `admin-dashboard-${analytics.meta.academicYear}-${analytics.meta.semester}`.toLowerCase();
    return base.replace(/\s+/g, '-').replace(/[^a-z0-9-_]+/g, '');
  }, [analytics]);

  // Statistics grid
  const statsGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Active Users"
        value={
          analytics ? Object.values(analytics.data.users.activeByRole).reduce((sum, v) => sum + v, 0) : 0
        }
        icon={<Users />}
        color="bg-blue-500"
        link="/employees"
        isLoading={isLoading}
      />
      <StatCard
        title="New Users (7d)"
        value={analytics?.data.users.newUsers.last7d ?? 0}
        icon={<GraduationCap />}
        color="bg-green-500"
        link="/students"
        isLoading={isLoading}
      />
      <StatCard
        title="Enrolled"
        value={analytics?.data.enrollments.countsByStatus.ENROLLED ?? 0}
        icon={<BookOpen />}
        color="bg-indigo-500"
        link="/enrollments"
        isLoading={isLoading}
      />
      <StatCard
        title="Payments (30d)"
        value={analytics ? `₱${analytics.data.payments.totals.last30d.toLocaleString()}` : '₱0'}
        icon={<DollarSign />}
        color="bg-yellow-500"
        link="/payments"
        isLoading={isLoading}
      />
    </div>
  );

  // Additional overview cards
  const enrollmentCard = (
    <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold">Enrollment Pipeline</CardTitle>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {analytics ? `${analytics.meta.academicYear} • ${analytics.meta.semester}` : '—'}
            </div>
          </div>
          <UserCheck className="h-6 w-6 text-green-600" />
        </div>
      </CardHeader>
      <CardContent className="px-6 py-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Pending</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
              {(analytics?.data.enrollments.countsByStatus.PENDING ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Verified</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
              {(analytics?.data.enrollments.countsByStatus.VERIFIED ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Enrolled</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
              {(analytics?.data.enrollments.countsByStatus.ENROLLED ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const usersByRoleCard = (
    <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold">Active Users by Role</CardTitle>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active accounts</div>
          </div>
          <TrendingUp className="h-6 w-6 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <DashboardTable
          rows={Object.entries(analytics?.data.users.activeByRole ?? {})}
          columns={[
            {
              header: 'Role',
              render: ([role]) => <span className="font-bold text-gray-900 dark:text-white ml-6">{role}</span>,
              searchText: ([role]) => role,
            },
            {
              header: 'Count',
              headerClassName: 'text-right pr-6',
              className: 'text-right pr-6',
              render: ([, count]) => <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{Number(count).toLocaleString()}</span>,
            },
          ]}
          emptyLabel={isLoading ? 'Loading…' : 'No users found.'}
          maxHeightClassName="max-h-72"
        />
      </CardContent>
    </Card>
  );

  const paymentsCard = (
    <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold">Payments</CardTitle>
            <div className="text-sm text-gray-600 dark:text-gray-400">Paid totals</div>
          </div>
          <Calendar className="h-6 w-6 text-purple-600" />
        </div>
      </CardHeader>
      <CardContent className="px-6 py-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Today</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              ₱{(analytics?.data.payments.totals.today ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Last 7d</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white text-blue-600 dark:text-blue-400">
              ₱{(analytics?.data.payments.totals.last7d ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Last 30d</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white text-green-600 dark:text-green-400">
              ₱{(analytics?.data.payments.totals.last30d ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const activityModules = (
    <div className="mt-4">
      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold">Top Activity Modules</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">Last 30 days</div>
            </div>
            <Activity className="h-6 w-6 text-gray-500" />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <DashboardTable
            rows={analytics?.data.activity.topModules ?? []}
            columns={[
              {
                header: 'Module',
                render: (r) => <span className="font-bold text-gray-900 dark:text-white ml-6">{r.module}</span>,
                searchText: (r) => r.module,
              },
              {
                header: 'Actions',
                headerClassName: 'text-right pr-6',
                className: 'text-right pr-6',
                render: (r) => <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{r.count.toLocaleString()}</span>,
              },
            ]}
            emptyLabel={isLoading ? 'Loading…' : 'No activity logs found.'}
            maxHeightClassName="max-h-56"
          />
        </CardContent>
      </Card>
    </div>
  );

  const tabContent = (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">{enrollmentCard}</div>
          <div className="lg:col-span-1">{paymentsCard}</div>
          <div className="lg:col-span-3">{usersByRoleCard}</div>
        </div>
      )}
      {activeTab === 'users' && usersByRoleCard}
      {activeTab === 'payments' && paymentsCard}
      {activeTab === 'activity' && activityModules}
    </div>
  );

  return (
    <BaseDashboard
      title="Administrative Dashboard"
      description="School administration overview and management tools"
      icon={LayoutDashboard}
      stats={statsGrid}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
      error={error}
      onRetry={fetchDashboardData}
      tabs={[
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'activity', label: 'Activity', icon: Activity },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={fetchDashboardData}
      exportFileBaseName={exportFileBaseName}
      exportPayload={analytics ?? undefined}
    >
      {tabContent}
    </BaseDashboard>
  );
};

export default AdminDashboard;
