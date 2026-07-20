import React, { useState, useEffect } from 'react';
import BaseDashboard, { StatCard } from './BaseDashboard';
import { 
  BookOpen, 
  Users, 
  RotateCcw, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  Search,
  Clock
} from 'lucide-react';
import { 
  DashboardService, 
  LibrarianStats, 
  QuickAction, 
  UserRole,
  RecentActivity 
} from '../../services/dashboardService';

/**
 * Librarian Dashboard Component
 * 
 * Provides librarian-specific overview including:
 * - Library inventory and circulation statistics
 * - Book borrowing and return tracking
 * - Library management quick actions
 * - Recent library activities
 */
const LibrarianDashboard: React.FC = () => {
  const [stats, setStats] = useState<LibrarianStats | null>(null);
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
          DashboardService.getDashboardStats(UserRole.LIBRARIAN),
          DashboardService.getQuickActions(UserRole.LIBRARIAN),
          DashboardService.getRecentActivities(UserRole.LIBRARIAN)
        ]);

        setStats(statsData as LibrarianStats);
        setQuickActions(actionsData);
        setRecentActivities(activitiesData);
      } catch (err) {
        console.error('Error fetching Librarian dashboard data:', err);
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
          <p className="mt-4 text-gray-600">Loading Librarian Dashboard...</p>
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

  // Statistics grid
  const statsGrid = stats ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Books"
        value={stats.totalBooks}
        icon={<BookOpen className="h-5 w-5" />}
        trend={{
          value: 5,
          isPositive: true
        }}
      />
      <StatCard
        title="Books Borrowed"
        value={typeof stats.booksBorrowed === 'number' ? stats.booksBorrowed : 0}
        icon={<Users className="h-5 w-5" />}
        trend={{
          value: 12,
          isPositive: true
        }}
      />
      <StatCard
        title="Overdue Books"
        value={stats.overdueBooks}
        icon={<AlertTriangle className="h-5 w-5" />}
        trend={{
          value: 8,
          isPositive: false
        }}
      />
      <StatCard
        title="Available Books"
        value={stats.availableBooks}
        icon={<RotateCcw className="h-5 w-5" />}
      />
    </div>
  ) : null;

  // Library circulation and inventory overview
  const libraryOverview = stats ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Circulation Statistics</h3>
          <TrendingUp className="h-5 w-5 text-blue-500" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Books in Circulation</span>
              <span className="text-sm font-medium">{typeof stats.booksBorrowed === 'number' ? stats.booksBorrowed : 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ 
                  width: `${(stats.borrowedBooks / stats.totalBooks) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Math.round((stats.borrowedBooks / stats.totalBooks) * 100)}% of total inventory
            </p>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Available for Borrowing</span>
              <span className="text-sm font-medium">{stats.availableBooks}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ 
                  width: `${(stats.availableBooks / stats.totalBooks) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center mt-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{Math.round((stats.borrowedBooks / stats.totalBooks) * 100)}%</div>
              <p className="text-xs text-gray-600">Circulation Rate</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {Math.round(((stats.totalBooks - stats.overdueBooks) / stats.totalBooks) * 100)}%
              </div>
              <p className="text-xs text-gray-600">Return Rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overdue Management</h3>
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Critical Overdue (&gt;30 days)</p>
              <p className="text-sm text-gray-600">Requires immediate action</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-red-600">{Math.floor(stats.overdueBooks * 0.2)}</p>
              <p className="text-xs text-gray-500">books</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Moderately Overdue (15-30 days)</p>
              <p className="text-sm text-gray-600">Follow-up needed</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-yellow-600">{Math.floor(stats.overdueBooks * 0.4)}</p>
              <p className="text-xs text-gray-500">books</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Recently Overdue (&lt;15 days)</p>
              <p className="text-sm text-gray-600">Send reminders</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-orange-600">{Math.floor(stats.overdueBooks * 0.4)}</p>
              <p className="text-xs text-gray-500">books</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Popular books and library analytics
  const libraryAnalytics = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Popular Categories</h3>
          <BookOpen className="h-5 w-5 text-purple-500" />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Fiction</span>
            <span className="text-sm font-medium">35%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Science</span>
            <span className="text-sm font-medium">22%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">History</span>
            <span className="text-sm font-medium">18%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Biography</span>
            <span className="text-sm font-medium">15%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Other</span>
            <span className="text-sm font-medium">10%</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Daily Activity</h3>
          <Calendar className="h-5 w-5 text-green-500" />
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">24</div>
            <p className="text-sm text-gray-600">Books borrowed today</p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Returns today:</span>
            <span className="font-medium">18 books</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">New registrations:</span>
            <span className="font-medium">3 members</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Reservations:</span>
            <span className="font-medium">7 pending</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Library Hours</h3>
          <Clock className="h-5 w-5 text-orange-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center p-2 bg-green-50 rounded">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium">Currently Open</p>
              <p className="text-xs text-gray-500">8:00 AM - 6:00 PM</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monday - Friday:</span>
              <span>8:00 AM - 6:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Saturday:</span>
              <span>9:00 AM - 4:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sunday:</span>
              <span>Closed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Most borrowed books section
  const popularBooks = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Most Borrowed Books This Month</h3>
        <Search className="h-5 w-5 text-blue-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="w-12 h-16 bg-blue-100 rounded mr-3 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">To Kill a Mockingbird</p>
            <p className="text-sm text-gray-600">Harper Lee</p>
            <p className="text-xs text-blue-600">Borrowed 15 times</p>
          </div>
        </div>
        <div className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="w-12 h-16 bg-green-100 rounded mr-3 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">1984</p>
            <p className="text-sm text-gray-600">George Orwell</p>
            <p className="text-xs text-green-600">Borrowed 12 times</p>
          </div>
        </div>
        <div className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="w-12 h-16 bg-purple-100 rounded mr-3 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">The Great Gatsby</p>
            <p className="text-sm text-gray-600">F. Scott Fitzgerald</p>
            <p className="text-xs text-purple-600">Borrowed 10 times</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <BaseDashboard
      title="Librarian Dashboard"
      description="Manage library resources and track book circulation"
      stats={statsGrid}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
    >
      {libraryOverview}
      {libraryAnalytics}
      {popularBooks}
    </BaseDashboard>
  );
};

export default LibrarianDashboard;