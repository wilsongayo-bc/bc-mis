import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchLibraryStatistics,
  selectLibraryStatistics,
  selectLibraryLoading,
  selectLibraryError
} from '../store/slices/librarySlice';
import { selectUser } from '../store/slices/authSlice';

const LibraryStatistics: React.FC = () => {
  const dispatch = useAppDispatch();
  const statistics = useAppSelector(selectLibraryStatistics);
  const loading = useAppSelector(selectLibraryLoading);
  const error = useAppSelector(selectLibraryError);
  const user = useAppSelector(selectUser);

  useEffect(() => {
    dispatch(fetchLibraryStatistics());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchLibraryStatistics());
  };

  const canViewStatistics = user?.role === 'ADMIN' || user?.role === 'TEACHER' || user?.role === 'LIBRARIAN';

  if (!canViewStatistics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You don't have permission to view library statistics.</p>
          <Link
            to="/books"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Books</span>
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !statistics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading library statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Statistics</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Statistics Available</h3>
          <p className="text-gray-600 dark:text-gray-400">Library statistics are not available at the moment.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Books',
      value: statistics.totalBooks.toLocaleString(),
      icon: BookOpen,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Available Books',
      value: statistics.availableBooks.toLocaleString(),
      icon: BookOpen,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Borrowed Books',
      value: statistics.borrowedBooks.toLocaleString(),
      icon: Users,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      title: 'Overdue Books',
      value: statistics.overdueBooks.toLocaleString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      title: 'Active Borrowers',
      value: statistics.activeBorrowers.toLocaleString(),
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Total Borrowings',
      value: statistics.totalBorrowings.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    }
  ];

  const utilizationRate = statistics.totalBooks > 0 
    ? ((statistics.borrowedBooks / statistics.totalBooks) * 100).toFixed(1)
    : '0';

  const overdueRate = statistics.borrowedBooks > 0
    ? ((statistics.overdueBooks / statistics.borrowedBooks) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/books"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Library Statistics</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Overview of library usage and performance</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Utilization Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Library Utilization</h3>
              <PieChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Books in Use</span>
                  <span className="font-medium">{utilizationRate}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${utilizationRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Available</p>
                  <p className="font-semibold text-green-600">{statistics.availableBooks}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Borrowed</p>
                  <p className="font-semibold text-blue-600">{statistics.borrowedBooks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Overdue Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overdue Analysis</h3>
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Overdue Rate</span>
                  <span className="font-medium">{overdueRate}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${overdueRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">On Time</p>
                  <p className="font-semibold text-green-600">
                    {statistics.borrowedBooks - statistics.overdueBooks}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Overdue</p>
                  <p className="font-semibold text-red-600">{statistics.overdueBooks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Categories */}
        {statistics.popularCategories && statistics.popularCategories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Popular Categories</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {statistics.popularCategories.slice(0, 5).map((category, index) => {
                const maxCount = Math.max(...statistics.popularCategories!.map(c => c.count));
                const percentage = (category.count / maxCount) * 100;
                
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-24 text-sm font-medium text-gray-900 dark:text-white truncate">
                      {category.category}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Books borrowed</span>
                        <span className="font-medium">{category.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Summary</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {statistics.totalBorrowings}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Borrowings</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {statistics.activeBorrowers}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Borrowers</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Currently borrowing</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {statistics.totalBooks}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Collection</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Books in library</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/books"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
          >
            <BookOpen className="h-4 w-4" />
            <span>Manage Books</span>
          </Link>
          <Link
            to="/borrow-records"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>View Borrowings</span>
          </Link>
          {statistics.overdueBooks > 0 && (
            <Link
              to="/borrow-records?status=overdue"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center space-x-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>View Overdue ({statistics.overdueBooks})</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryStatistics;