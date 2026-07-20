import React, { useState, useEffect } from 'react';
import BaseDashboard, { StatCard } from './BaseDashboard';
import { 
  DashboardService, 
  StaffStats, 
  QuickAction, 
  UserRole,
  RecentActivity 
} from '../../services/dashboardService';
import { 
  Users as _Users, 
  Calendar, 
  CheckSquare, 
  Phone,
  Clock,
  FileText,
  Bell,
  Activity
} from 'lucide-react';

/**
 * Staff Dashboard Component
 * 
 * Provides staff-specific overview including:
 * - General administrative statistics
 * - Task and schedule management
 * - Staff quick actions
 * - Recent staff activities
 */
const StaffDashboard: React.FC = () => {
  const [stats, setStats] = useState<StaffStats | null>(null);
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
          DashboardService.getDashboardStats(UserRole.STAFF),
          DashboardService.getQuickActions(UserRole.STAFF),
          DashboardService.getRecentActivities(UserRole.STAFF)
        ]);

        setStats(statsData as StaffStats);
        setQuickActions(actionsData);
        setRecentActivities(activitiesData);
      } catch (err) {
        console.error('Error fetching Staff dashboard data:', err);
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
          <p className="mt-4 text-gray-600">Loading Staff Dashboard...</p>
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
        title="Assigned Tasks"
        value={typeof stats.assignedTasks === 'number' ? stats.assignedTasks : 0}
        icon={<CheckSquare className="h-5 w-5" />}
      />
      <StatCard
        title="Completed Tasks"
        value={typeof stats.completedTasks === 'number' ? stats.completedTasks : 0}
        icon={<Activity className="h-5 w-5" />}
        trend={{
          value: 10,
          isPositive: true
        }}
      />
      <StatCard
        title="Pending Requests"
        value={typeof stats.pendingRequests === 'number' ? stats.pendingRequests : 0}
        icon={<FileText className="h-5 w-5" />}
      />
      <StatCard
        title="Today's Appointments"
        value={typeof stats.todayAppointments === 'number' ? stats.todayAppointments : 0}
        icon={<Calendar className="h-5 w-5" />}
      />
    </div>
  ) : null;

  // Task management and schedule overview
  const workOverview = stats ? (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Progress</h3>
          <CheckSquare className="h-5 w-5 text-blue-500" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Completed Tasks</span>
              <span className="text-sm font-medium">{typeof stats.completedTasks === 'number' ? stats.completedTasks : 0} / {typeof stats.assignedTasks === 'number' ? stats.assignedTasks : 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ 
                  width: `${(stats.announcements / stats.totalStaff) * 10}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Math.round((stats.announcements / stats.totalStaff) * 10)}% completion rate
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{stats.activeCourses}</div>
              <p className="text-xs text-gray-600">Active Courses</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{stats.totalStaff}</div>
              <p className="text-xs text-gray-600">Total Staff</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">{stats.announcements}</div>
              <p className="text-xs text-gray-600">Announcements</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Schedule</h3>
          <Clock className="h-5 w-5 text-purple-500" />
        </div>
        <div className="space-y-3">
          {/* Mock schedule data - in real implementation, this would come from the API */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Staff Meeting</p>
              <p className="text-sm text-gray-600">Weekly team sync</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-blue-600">9:00 AM</p>
              <p className="text-xs text-gray-500">Conference Room</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Parent Consultation</p>
              <p className="text-sm text-gray-600">Student progress review</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">11:00 AM</p>
              <p className="text-xs text-gray-500">Office 205</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Document Review</p>
              <p className="text-sm text-gray-600">Policy updates</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-purple-600">2:00 PM</p>
              <p className="text-xs text-gray-500">Admin Office</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // Communication and notifications overview
  const communicationOverview = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Communications</h3>
          <Phone className="h-5 w-5 text-green-500" />
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">8</div>
            <p className="text-sm text-gray-600">Calls handled today</p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Emails sent:</span>
            <span className="font-medium">12</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Messages replied:</span>
            <span className="font-medium">15</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Avg. response time:</span>
            <span className="font-medium">2.5 hours</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
          <Bell className="h-5 w-5 text-orange-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center p-2 bg-red-50 rounded">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium">Urgent: Document Review</p>
              <p className="text-xs text-gray-500">Due in 2 hours</p>
            </div>
          </div>
          <div className="flex items-center p-2 bg-yellow-50 rounded">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium">Meeting Reminder</p>
              <p className="text-xs text-gray-500">In 30 minutes</p>
            </div>
          </div>
          <div className="flex items-center p-2 bg-blue-50 rounded">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            <div>
              <p className="text-sm font-medium">New Message</p>
              <p className="text-xs text-gray-500">From parent</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Work Hours</h3>
          <Clock className="h-5 w-5 text-blue-500" />
        </div>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">7.5</div>
            <p className="text-sm text-gray-600">Hours worked today</p>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">This week:</span>
            <span className="font-medium">37.5 hours</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Break time:</span>
            <span className="font-medium">1 hour</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '94%' }}></div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">94% of weekly target</p>
        </div>
      </div>
    </div>
  );

  // Recent requests and documents
  const recentWork = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Requests</h3>
          <FileText className="h-5 w-5 text-purple-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Student Record Update</p>
              <p className="text-sm text-gray-600">Grade 10 - John Smith</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Transcript Request</p>
              <p className="text-sm text-gray-600">Alumni - Sarah Johnson</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-yellow-600">In Progress</p>
              <p className="text-xs text-gray-500">Started today</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Schedule Change</p>
              <p className="text-sm text-gray-600">Teacher - Prof. Davis</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-blue-600">Pending</p>
              <p className="text-xs text-gray-500">Received 1 hour ago</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Status</h3>
          <Activity className="h-5 w-5 text-green-500" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Monthly Reports</p>
              <p className="text-sm text-gray-600">February 2024</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">Submitted</p>
              <p className="text-xs text-gray-500">On time</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Policy Updates</p>
              <p className="text-sm text-gray-600">Student handbook</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-blue-600">Reviewed</p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Attendance Records</p>
              <p className="text-sm text-gray-600">Weekly summary</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-yellow-600">Due Tomorrow</p>
              <p className="text-xs text-gray-500">In progress</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <BaseDashboard
      title="Staff Dashboard"
      description="Manage your daily tasks and administrative responsibilities"
      stats={statsGrid}
      quickActions={quickActions}
      recentActivities={recentActivities}
      isLoading={isLoading}
    >
      {workOverview}
      {communicationOverview}
      {recentWork}
    </BaseDashboard>
  );
};

export default StaffDashboard;