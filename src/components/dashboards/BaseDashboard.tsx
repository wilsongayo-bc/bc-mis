import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  BookOpen,
  Calendar,
  Bell,
  Settings,
  Activity,
  Download,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { QuickAction } from '../../services/dashboardService';
import { useAuth } from '../../hooks/useAuth';
import type { DashboardTab } from './DashboardTabs';
import { DashboardTabs } from './DashboardTabs';

/**
 * Icon mapping for quick actions
 */
const iconMap: Record<string, React.ComponentType<Record<string, unknown>>> = {
  Users,
  Settings,
  BarChart3,
  Database: Activity,
  UserPlus: Users,
  BookOpen,
  Edit: Settings,
  Calendar,
  TrendingUp,
  Award: TrendingUp,
  CreditCard: DollarSign,
  FileText: BookOpen,
  FileCheck: BookOpen,
  DollarSign,
  Calculator: DollarSign,
  BookPlus: BookOpen,
  RotateCcw: Activity,
  Library: BookOpen,
  Bell,
  CheckSquare: Settings,
  Phone: Users
};

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  isLoading?: boolean;
  subtitle?: string;
  color?: string;
  link?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  className = '',
  isLoading = false,
  subtitle,
  color = 'bg-blue-600',
  link
}) => {
  const content = (
    <Card className={`${className} hover:shadow-md transition-shadow cursor-default ${link ? 'cursor-pointer' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">
              {title}
            </p>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <div className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
            )}
            {subtitle && !isLoading && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</div>
            )}
            {trend && !isLoading && (
              <p
                className={`text-xs ${
                  trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                } flex items-center mt-2`}
              >
                <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
                {Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className={`${color} p-3 rounded-xl flex-shrink-0 ml-4`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6 text-white' })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
};

/**
 * Quick Actions Component
 */
interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ 
  actions, 
  title = 'Quick Actions' 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center space-x-2 mb-6">
      <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action, index) => {
        const IconComponent = iconMap[action.icon] || BookOpen;
        const colorClass = action.color || 'bg-blue-600 hover:bg-blue-700';
        return (
          <Link
            key={index}
            to={action.href}
            className={`${colorClass} text-white rounded-xl p-4 transition-all hover:shadow-lg transform hover:-translate-y-1`}
          >
            <div className="flex items-start space-x-3">
              <IconComponent className="h-6 w-6 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-base mb-0.5">{action.name}</h3>
                <p className="text-sm opacity-90 line-clamp-2">
                  {action.description || `Manage ${action.name.toLowerCase()} and related records`}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  </div>
);

/**
 * Recent Activities Component
 */
interface RecentActivity {
  id: string;
  date: string;
  type: string;
  description: string;
  studentName?: string;
  courseName?: string;
  amount?: number;
}

interface RecentActivitiesProps {
  activities: RecentActivity[];
  title?: string;
  isLoading?: boolean;
}

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ 
  activities, 
  title = 'Recent Activities',
  isLoading = false 
}) => (
  <Card>
    <CardHeader className="px-4 py-3">
      <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
          No recent activities to display
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-shrink-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'enrollment' ? 'bg-green-500 dark:bg-green-400' :
                  activity.type === 'payment' ? 'bg-blue-500 dark:bg-blue-400' :
                  'bg-gray-500 dark:bg-gray-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(activity.date).toLocaleDateString()} at{' '}
                  {new Date(activity.date).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * Base Dashboard Layout Component
 */
interface BaseDashboardProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  stats: React.ReactNode;
  quickActions?: QuickAction[];
  recentActivities?: RecentActivity[];
  children?: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  tabs?: DashboardTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onRefresh?: () => void;
  exportFileBaseName?: string;
  exportPayload?: unknown;
}

const BaseDashboard: React.FC<BaseDashboardProps> = ({
  title,
  description,
  icon: HeaderIcon,
  stats,
  quickActions = [],
  recentActivities = [],
  children,
  isLoading = false,
  error,
  onRetry,
  tabs = [],
  activeTab,
  onTabChange,
  onRefresh,
  exportFileBaseName,
  exportPayload
}) => {
  const { user } = useAuth();
  const [showExportMenu, setShowExportMenu] = useState(false);

  const resolvedActiveTab = useMemo(() => {
    if (activeTab) return activeTab;
    return tabs[0]?.id || 'overview';
  }, [activeTab, tabs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const el = event.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('.export-menu-container')) return;
      setShowExportMenu(false);
    };

    if (!showExportMenu) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  const canExport = Boolean(exportPayload && exportFileBaseName);

  const exportAsJson = () => {
    if (!exportPayload || !exportFileBaseName) return;
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFileBaseName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                {HeaderIcon && <HeaderIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />}
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{description}</p>
              {user && (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Logged in as:</span>
                  <span className="text-sm font-medium text-blue-600">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{user.role}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to="/documentation/dashboards"
                className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Dashboard Docs
              </Link>

              <button
                type="button"
                onClick={() => (onRefresh ? onRefresh() : window.location.reload())}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {canExport && (
                <div className="relative export-menu-container">
                  <button
                    type="button"
                    onClick={() => setShowExportMenu((v) => !v)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            exportAsJson();
                            setShowExportMenu(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export as JSON
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-red-700">{error}</div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {tabs.length > 0 && onTabChange && (
          <DashboardTabs tabs={tabs} activeTab={resolvedActiveTab} onChange={onTabChange} />
        )}

        {stats && <div className="mb-8">{stats}</div>}

        <div className="space-y-8">
          {quickActions.length > 0 && (
            <QuickActions actions={quickActions} />
          )}

          <div className="grid grid-cols-1 gap-8">
            <RecentActivities activities={recentActivities} isLoading={isLoading} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseDashboard;
