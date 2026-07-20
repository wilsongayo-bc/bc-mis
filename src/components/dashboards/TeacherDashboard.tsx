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
  Calendar, 
  CheckSquare,
  Clock,
  Award,
  FileText,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

/**
 * Teacher Dashboard Component
 * 
 * Provides teacher-specific overview including:
 * - Class and student statistics
 * - Schedule and assignment management
 * - Teaching quick actions
 * - Recent class activities
 */
const TeacherDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof analyticsDashboardService.getTeacherDashboard>> | null>(null);
  const [quickActions, setQuickActions] = useState<QuickAction[]>([
    { 
      name: 'Schedules', 
      href: '/schedules', 
      icon: 'Calendar',
      description: 'View your weekly teaching schedule and room assignments',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      name: 'Class Lists', 
      href: '/schedules', 
      icon: 'Users',
      description: 'Access student rosters and attendance for your classes',
      color: 'bg-green-600 hover:bg-green-700'
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

      const dashboard = await analyticsDashboardService.getTeacherDashboard();
      setAnalytics(dashboard);
      setRecentActivities(
        dashboard.data.schedules.next3Today.map((c) => ({
          id: c.id,
          date: dashboard.meta.generatedAt,
          type: 'schedule',
          description: `${c.subject.code || 'SUBJECT'} ${c.subject.name} • ${c.startTime.slice(0, 5)}-${c.endTime.slice(0, 5)} • ${c.room}`
        }))
      );
    } catch (err) {
      console.error('Error fetching Teacher dashboard data:', err);
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
    const base = `teacher-dashboard-${analytics.meta.academicYear}-${analytics.meta.semester}`.toLowerCase();
    return base.replace(/\s+/g, '-').replace(/[^a-z0-9-_]+/g, '');
  }, [analytics]);

  // Statistics grid
  const statsGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Classes (Today)"
        value={analytics?.data.schedules.next3Today.length ?? 0}
        icon={<BookOpen />}
        color="bg-blue-500"
        link="/schedules"
        isLoading={isLoading}
      />
      <StatCard
        title="Students (Distinct)"
        value={analytics?.data.students.totalDistinctAcrossClasses ?? 0}
        icon={<Users />}
        color="bg-indigo-500"
        isLoading={isLoading}
      />
      <StatCard
        title="Next Class Lists"
        value={analytics?.data.quickLinks.classLists.length ?? 0}
        icon={<Calendar />}
        color="bg-green-500"
        link="/schedules"
        isLoading={isLoading}
      />
      <StatCard
        title="Term"
        value={analytics?.meta.academicYear ?? '—'}
        icon={<CheckSquare />}
        color="bg-purple-500"
        subtitle={analytics ? analytics.meta.semester : undefined}
        isLoading={isLoading}
      />
    </div>
  );

  // Class overview and performance
  const todayCard = (
    <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold">Today</CardTitle>
            <div className="text-sm text-gray-600 dark:text-gray-400">Next classes with class-list links</div>
          </div>
          <Clock className="h-6 w-6 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <DashboardTable
          rows={analytics?.data.schedules.next3Today ?? []}
          getRowHref={(r) => r.classListHref}
          columns={[
            {
              header: 'Subject',
              render: (r) => (
                <div className="min-w-0 ml-6">
                  <div className="truncate font-bold text-gray-900 dark:text-white">{r.subject.code || 'SUBJECT'}</div>
                  <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.subject.name}</div>
                </div>
              ),
              searchText: (r) => `${r.subject.code} ${r.subject.name}`,
            },
            {
              header: 'Section',
              render: (r) => (
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.courseSection?.yearLevel || '—'}</div>
                  <div className="truncate text-gray-500 dark:text-gray-400 text-xs">{r.courseSection?.sectionName || '—'}</div>
                </div>
              ),
              searchText: (r) => `${r.courseSection?.yearLevel || ''} ${r.courseSection?.sectionName || ''}`,
            },
            {
              header: 'Time',
              headerClassName: 'text-right pr-6',
              className: 'text-right pr-6 whitespace-nowrap',
              render: (r) => <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.startTime.slice(0, 5)}-{r.endTime.slice(0, 5)}</span>,
            },
          ]}
          emptyLabel={isLoading ? 'Loading…' : 'No classes scheduled for today.'}
          maxHeightClassName="max-h-[28rem]"
        />
      </CardContent>
    </Card>
  );

  const classListsCard = (
    <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardHeader className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg font-bold">Class Lists</CardTitle>
            <div className="text-sm text-gray-600 dark:text-gray-400">Quick access</div>
          </div>
          <Award className="h-6 w-6 text-yellow-600" />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <DashboardTable
          rows={analytics?.data.quickLinks.classLists ?? []}
          getRowHref={(r) => r.href}
          columns={[
            {
              header: 'Link',
              render: () => (
                <div className="inline-flex items-center gap-2 ml-6">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-bold text-gray-900 dark:text-white">Class List</span>
                </div>
              ),
            },
            {
              header: 'Schedule ID',
              headerClassName: 'text-right pr-6',
              className: 'text-right pr-6',
              render: (r) => <span className="font-mono text-xs text-gray-500">{r.scheduleId.slice(0, 8)}</span>,
              searchText: (r) => r.scheduleId,
            },
          ]}
          emptyLabel={isLoading ? 'Loading…' : 'No class lists available.'}
          maxHeightClassName="max-h-[28rem]"
        />
      </CardContent>
    </Card>
  );

  const overviewPanel = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {todayCard}
      {classListsCard}
    </div>
  );

  // Grading overview
  const gradingOverview = null;

  return (
    <BaseDashboard
      title="Teacher Dashboard"
      description="Manage your classes, students, and academic activities"
      icon={GraduationCap}
      stats={activeTab === 'overview' ? statsGrid : null}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
      error={error}
      onRetry={fetchDashboardData}
      tabs={[
        { id: 'overview', label: 'Overview', icon: TrendingUp },
        { id: 'today', label: 'Today', icon: Clock },
        { id: 'class-lists', label: 'Class Lists', icon: FileText },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={fetchDashboardData}
      exportFileBaseName={exportFileBaseName}
      exportPayload={analytics ?? undefined}
    >
      {activeTab === 'overview' && overviewPanel}
      {activeTab === 'today' && <div className="mt-6">{todayCard}</div>}
      {activeTab === 'class-lists' && <div className="mt-6">{classListsCard}</div>}
      {gradingOverview}
    </BaseDashboard>
  );
};

export default TeacherDashboard;
