import React, { useState, useEffect } from 'react';
import BaseDashboard, { StatCard } from './BaseDashboard';
import { 
  DashboardService, 
  FinanceStats, 
  QuickAction, 
  UserRole,
  RecentActivity 
} from '../../services/dashboardService';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  AlertTriangle,
  Calendar,
  FileText,
  Calculator,
  PieChart
} from 'lucide-react';

/**
 * Finance Dashboard Component
 * 
 * Provides finance-specific overview including:
 * - Revenue and payment statistics
 * - Outstanding balances and collections
 * - Financial quick actions
 * - Recent financial activities
 */
const FinanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<FinanceStats | null>(null);
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
          DashboardService.getDashboardStats(UserRole.FINANCE),
          DashboardService.getQuickActions(UserRole.FINANCE),
          DashboardService.getRecentActivities(UserRole.FINANCE)
        ]);

        setStats(statsData as FinanceStats);
        setQuickActions(actionsData);
        setRecentActivities(activitiesData);
      } catch (err) {
        console.error('Error fetching Finance dashboard data:', err);
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Finance Dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalPaymentRecords = stats
    ? stats.paidPayments + stats.pendingPayments + stats.overduePayments
    : 0;

  const collectionRate =
    stats && totalPaymentRecords > 0
      ? Math.round((stats.paidPayments / totalPaymentRecords) * 100)
      : 0;

  const enrollmentCollectionRate =
    stats && stats.enrollmentTotalAssessed > 0
      ? Math.round((stats.enrollmentTotalPaid / stats.enrollmentTotalAssessed) * 100)
      : 0;

  // Statistics grid
  const statsGrid = stats ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Revenue"
        value={`₱${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={<DollarSign className="h-5 w-5" />}
        trend={{
          value: 12,
          isPositive: true
        }}
      />
      <StatCard
        title="Outstanding Balance"
        value={`₱${stats.enrollmentTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        icon={<AlertTriangle className="h-5 w-5" />}
        trend={{
          value: 5,
          isPositive: false
        }}
      />
      <StatCard
        title="Pending Payments"
        value={stats.pendingPayments}
        icon={<CreditCard className="h-5 w-5" />}
        trend={{
          value: 18,
          isPositive: true
        }}
      />
      <StatCard
        title="Collection Rate"
        value={`${collectionRate}%`}
        icon={<TrendingUp className="h-5 w-5" />}
        trend={{
          value: 3,
          isPositive: true
        }}
      />
    </div>
  ) : null;

  // Financial overview and payment tracking
  const financialOverview = stats ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enrollment Financial Overview</h3>
          <PieChart className="h-5 w-5 text-blue-500" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Total Assessed</span>
              <span className="text-sm font-medium">
                ₱{stats.enrollmentTotalAssessed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min(100, enrollmentCollectionRate || 1)}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Total Paid</span>
              <span className="text-sm font-medium">
                ₱{stats.enrollmentTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${Math.min(100, enrollmentCollectionRate)}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Outstanding Balance</span>
              <span className="text-sm font-medium">
                ₱{stats.enrollmentTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, 100 - enrollmentCollectionRate)}%` }}></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center mt-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {enrollmentCollectionRate}%
              </div>
              <p className="text-xs text-gray-600">Enrollment Collection Rate</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.paidPayments}</div>
              <p className="text-xs text-gray-600">Paid Payments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Outstanding Balances</h3>
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Overdue (&gt;90 days)</p>
              <p className="text-sm text-gray-600">Critical collection needed</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-red-600">${(stats.pendingAmount * 0.2).toLocaleString()}</p>
              <p className="text-xs text-gray-500">15 accounts</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Past Due (30-90 days)</p>
              <p className="text-sm text-gray-600">Follow-up required</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-yellow-600">${(stats.pendingAmount * 0.35).toLocaleString()}</p>
              <p className="text-xs text-gray-500">28 accounts</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Current (&lt;30 days)</p>
              <p className="text-sm text-gray-600">Within payment terms</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">
                ₱{(stats.pendingAmount * 0.45).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">42 accounts</p>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Downpayment Status</p>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Eligible for confirmation</span>
              <span className="font-medium text-green-600">{stats.downpaymentMetCount}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Below minimum downpayment</span>
              <span className="font-medium text-red-600">{stats.downpaymentNotMetCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Payment methods and financial reports
  const paymentAnalysis = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
          <CreditCard className="h-5 w-5 text-green-500" />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Bank Transfer</span>
            <span className="text-sm font-medium">45%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Credit Card</span>
            <span className="text-sm font-medium">30%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Cash</span>
            <span className="text-sm font-medium">20%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Check</span>
            <span className="text-sm font-medium">5%</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Targets</h3>
          <Calculator className="h-5 w-5 text-purple-500" />
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">85%</div>
            <p className="text-sm text-gray-600">Target Achievement</p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Target Revenue:</span>
            <span className="font-medium">${(stats?.totalRevenue * 1.2).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Actual Revenue:</span>
            <span className="font-medium">${stats?.totalRevenue.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Reports</h3>
          <FileText className="h-5 w-5 text-orange-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center p-2 bg-green-50 rounded">
            <Calendar className="h-4 w-4 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium">Monthly Report</p>
              <p className="text-xs text-gray-500">Generated Mar 1</p>
            </div>
          </div>
          <div className="flex items-center p-2 bg-blue-50 rounded">
            <FileText className="h-4 w-4 text-blue-500 mr-2" />
            <div>
              <p className="text-sm font-medium">Aging Report</p>
              <p className="text-xs text-gray-500">Updated daily</p>
            </div>
          </div>
          <div className="flex items-center p-2 bg-purple-50 rounded">
            <TrendingUp className="h-4 w-4 text-purple-500 mr-2" />
            <div>
              <p className="text-sm font-medium">Revenue Analysis</p>
              <p className="text-xs text-gray-500">Weekly update</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <BaseDashboard
      title="Finance Dashboard"
      description="Monitor financial performance and manage payments"
      stats={statsGrid}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
    >
      {financialOverview}
      {paymentAnalysis}
    </BaseDashboard>
  );
};

export default FinanceDashboard;
