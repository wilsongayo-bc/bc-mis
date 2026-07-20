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
  UserPlus, 
  Users, 
  FileCheck, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  ClipboardList
} from 'lucide-react';

/**
 * Registrar Dashboard Component
 * 
 * Provides registrar-specific overview including:
 * - Registration and enrollment statistics
 * - Student management tools
 * - Registration quick actions
 * - Recent registration activities
 */
const RegistrarDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof analyticsDashboardService.getRegistrarDashboard>> | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { 
      name: 'Students', 
      href: '/students', 
      icon: 'Users',
      description: 'Access student database and registration profiles',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      name: 'Enrollments', 
      href: '/enrollments', 
      icon: 'UserPlus',
      description: 'Manage current enrollment pipeline and verification',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      name: 'Courses', 
      href: '/courses', 
      icon: 'BookOpen',
      description: 'Maintain academic courses and curriculum details',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    { 
      name: 'Documents', 
      href: '/documents', 
      icon: 'FileCheck',
      description: 'Verify student documents and academic requirements',
      color: 'bg-orange-600 hover:bg-orange-700'
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

      const dashboard = await analyticsDashboardService.getRegistrarDashboard();
      setAnalytics(dashboard);

      const missing = dashboard.data.schedulingReadiness.missingSchedules.slice(0, 5);
      setRecentActivities(
        missing.map((row) => ({
          id: `missing-${row.courseSectionId}`,
          date: dashboard.meta.generatedAt,
          type: 'enrollment',
          description: `Missing schedules: ${row.courseName} ${row.yearLevel} ${row.sectionName} (${row.enrolledCount} enrolled)`
        }))
      );
    } catch (err) {
      console.error('Error fetching Registrar dashboard data:', err);
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
    const base = `registrar-dashboard-${analytics.meta.academicYear}-${analytics.meta.semester}`.toLowerCase();
    return base.replace(/\s+/g, '-').replace(/[^a-z0-9-_]+/g, '');
  }, [analytics]);

  // Statistics grid
  const statsGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Pending"
        value={analytics?.data.enrollments.pipelineCountsByStatus.PENDING ?? 0}
        icon={<Users />}
        color="bg-yellow-500"
        link="/enrollments"
        isLoading={isLoading}
      />
      <StatCard
        title="Verified"
        value={analytics?.data.enrollments.pipelineCountsByStatus.VERIFIED ?? 0}
        icon={<UserPlus />}
        color="bg-blue-500"
        link="/enrollments"
        isLoading={isLoading}
      />
      <StatCard
        title="Enrolled"
        value={analytics?.data.enrollments.pipelineCountsByStatus.ENROLLED ?? 0}
        icon={<FileCheck />}
        color="bg-green-500"
        link="/enrollments"
        isLoading={isLoading}
      />
      <StatCard
        title="Docs Pending"
        value={analytics?.data.documents.pendingOrUnverified.total ?? 0}
        icon={<CheckCircle />}
        color="bg-orange-500"
        link="/documents"
        isLoading={isLoading}
      />
    </div>
  );

  // Registration overview and status tracking
  const registrationOverview = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold">Section Utilization</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {analytics ? `${analytics.meta.academicYear} • ${analytics.meta.semester}` : '—'}
              </div>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm">
              <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Sections</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {(analytics?.data.sections.utilizationSummary.totalSections ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm">
              <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">Utilization</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round((analytics?.data.sections.utilizationSummary.utilizationRate ?? 0) * 100)}%
              </div>
            </div>
          </div>

          <DashboardTable
            title="Top Utilized Sections"
            rows={analytics?.data.sections.topUtilized ?? []}
            columns={[
              {
                header: 'Section',
                render: (r) => (
                  <div className="min-w-0">
                    <div className="truncate font-bold text-gray-900 dark:text-white">{r.courseName}</div>
                    <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.yearLevel} • {r.sectionName}</div>
                  </div>
                ),
                searchText: (r) => `${r.courseName} ${r.yearLevel} ${r.sectionName}`,
              },
              {
                header: 'Enrolled',
                headerClassName: 'text-right pr-6',
                className: 'text-right pr-6',
                render: (r) => <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.enrolledCount.toLocaleString()}/{r.maxStudents.toLocaleString()}</span>,
              },
            ]}
            emptyLabel={isLoading ? 'Loading…' : 'No sections found.'}
            maxHeightClassName="max-h-52"
          />
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold">Scheduling Readiness</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">Enrolled sections missing schedules</div>
            </div>
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <DashboardTable
            rows={analytics?.data.schedulingReadiness.missingSchedules ?? []}
            columns={[
              {
                header: 'Section',
                render: (r) => (
                  <div className="min-w-0 ml-6">
                    <div className="truncate font-bold text-gray-900 dark:text-white">
                      {r.courseName}
                    </div>
                    <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.yearLevel} • {r.sectionName}</div>
                  </div>
                ),
                searchText: (r) => `${r.courseName} ${r.yearLevel} ${r.sectionName}`,
              },
              {
                header: 'Enrolled',
                headerClassName: 'text-right pr-6',
                className: 'text-right pr-6',
                render: (r) => <span className="font-mono font-bold text-red-600 dark:text-red-400">{r.enrolledCount.toLocaleString()}</span>,
              },
            ]}
            emptyLabel={
              isLoading
                ? 'Loading…'
                : 'All enrolled sections have schedules.'
            }
            maxHeightClassName="max-h-80"
          />
        </CardContent>
      </Card>
    </div>
  );

  // Student management and enrollment tracking
  const studentManagement = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold">Documents Queue</CardTitle>
            <FileCheck className="h-6 w-6 text-orange-600" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Pending</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {(analytics?.data.documents.pendingOrUnverified.pending ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Submitted</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {(analytics?.data.documents.pendingOrUnverified.submitted ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Total</span>
              <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                {(analytics?.data.documents.pendingOrUnverified.total ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold">Term</CardTitle>
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Academic year</span>
              <span className="font-bold text-gray-900 dark:text-white">{analytics?.meta.academicYear ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Semester</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{analytics?.meta.semester ?? '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-bold">Pipeline Snapshot</CardTitle>
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Pending</span>
              <span className="font-bold text-gray-900 dark:text-white">
                {(analytics?.data.enrollments.pipelineCountsByStatus.PENDING ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Verified</span>
              <span className="font-bold text-gray-900 dark:text-white text-blue-600 dark:text-blue-400">
                {(analytics?.data.enrollments.pipelineCountsByStatus.VERIFIED ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-3">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Enrolled</span>
              <span className="text-xl font-black text-green-600 dark:text-green-400">
                {(analytics?.data.enrollments.pipelineCountsByStatus.ENROLLED ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const utilizationOnly = (
    <div className="mt-6">
      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold">Top Utilized Sections</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {analytics ? `${analytics.meta.academicYear} • ${analytics.meta.semester}` : '—'}
              </div>
            </div>
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <DashboardTable
            rows={analytics?.data.sections.topUtilized ?? []}
            columns={[
              {
                header: 'Section',
                render: (r) => (
                  <div className="min-w-0 ml-6">
                    <div className="truncate font-bold text-gray-900 dark:text-white">{r.courseName}</div>
                    <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.yearLevel} • {r.sectionName}</div>
                  </div>
                ),
                searchText: (r) => `${r.courseName} ${r.yearLevel} ${r.sectionName}`,
              },
              {
                header: 'Enrolled',
                headerClassName: 'text-right pr-6',
                className: 'text-right pr-6',
                render: (r) => <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.enrolledCount.toLocaleString()}/{r.maxStudents.toLocaleString()}</span>,
              },
            ]}
            emptyLabel={isLoading ? 'Loading…' : 'No sections found.'}
            maxHeightClassName="max-h-[28rem]"
          />
        </CardContent>
      </Card>
    </div>
  );

  const schedulingOnly = (
    <div className="mt-6">
      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold">Missing Schedules</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">Enrolled sections with no schedules</div>
            </div>
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <DashboardTable
            rows={analytics?.data.schedulingReadiness.missingSchedules ?? []}
            columns={[
              {
                header: 'Section',
                render: (r) => (
                  <div className="min-w-0 ml-6">
                    <div className="truncate font-bold text-gray-900 dark:text-white">{r.courseName}</div>
                    <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.yearLevel} • {r.sectionName}</div>
                  </div>
                ),
                searchText: (r) => `${r.courseName} ${r.yearLevel} ${r.sectionName}`,
              },
              {
                header: 'Enrolled',
                headerClassName: 'text-right pr-6',
                className: 'text-right pr-6',
                render: (r) => <span className="font-mono font-bold text-red-600 dark:text-red-400">{r.enrolledCount.toLocaleString()}</span>,
              },
            ]}
            emptyLabel={isLoading ? 'Loading…' : 'All enrolled sections have schedules.'}
            maxHeightClassName="max-h-[28rem]"
          />
        </CardContent>
      </Card>
    </div>
  );

  const documentsOnly = (
    <div className="mt-6">
      <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-bold">Documents Queue</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending and submitted documents</div>
            </div>
            <FileCheck className="h-6 w-6 text-orange-600" />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Pending</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {(analytics?.data.documents.pendingOrUnverified.pending ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Submitted</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {(analytics?.data.documents.pendingOrUnverified.submitted ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800 shadow-sm">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-1">Total</div>
              <div className="text-3xl font-black text-orange-600 dark:text-orange-400">
                {(analytics?.data.documents.pendingOrUnverified.total ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const tabContent = (
    <div className="space-y-6">
      {activeTab === 'overview' && (
        <>
          {registrationOverview}
          {studentManagement}
        </>
      )}
      {activeTab === 'utilization' && utilizationOnly}
      {activeTab === 'scheduling' && schedulingOnly}
      {activeTab === 'documents' && documentsOnly}
    </div>
  );

  return (
    <BaseDashboard
      title="Registrar Dashboard"
      description="Manage student registrations and enrollment processes"
      icon={ClipboardList}
      stats={activeTab === 'overview' ? statsGrid : null}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
      error={error}
      onRetry={fetchDashboardData}
      tabs={[
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'utilization', label: 'Utilization', icon: TrendingUp },
        { id: 'scheduling', label: 'Scheduling', icon: AlertCircle },
        { id: 'documents', label: 'Documents', icon: FileCheck },
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

export default RegistrarDashboard;
