import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  FileCheck
} from 'lucide-react';
import { useSettingsContext } from '../utils/settingsUtils';
import { resolveApiBaseUrl } from '../lib/api';

interface DashboardStats {
  totalRequirements: number;
  totalCategories: number;
  pendingVerifications: number;
  verifiedDocuments: number;
  submissionRate: number;
}

interface RecentSubmission {
  id: string;
  studentName: string;
  documentName: string;
  submittedAt: string;
  status: string;
}

// Dweezil's Code
const DocumentsDashboard: React.FC = () => {
  const { theme } = useSettingsContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalRequirements: 0,
    totalCategories: 0,
    pendingVerifications: 0,
    verifiedDocuments: 0,
    submissionRate: 0
  });
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Dweezil's Code
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const API_BASE_URL = resolveApiBaseUrl();
        const token = localStorage.getItem('token');

        // Fetch requirements
        const requirementsRes = await fetch(`${API_BASE_URL}/document-requirements`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Fetch categories
        const categoriesRes = await fetch(`${API_BASE_URL}/document-categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Fetch recent submissions
        const submissionsRes = await fetch(`${API_BASE_URL}/student-documents?limit=10&sortBy=submittedAt&sortOrder=DESC`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (requirementsRes.ok && categoriesRes.ok && submissionsRes.ok) {
          const requirementsData = await requirementsRes.json();
          const categoriesData = await categoriesRes.json();
          const submissionsData = await submissionsRes.json();

          const requirements = requirementsData.data || [];
          const categories = categoriesData.data || [];
          const submissions = submissionsData.data || [];

          // Calculate stats
          const pending = submissions.filter((s: RecentSubmission) => s.status === 'pending' || s.status === 'submitted').length;
          const verified = submissions.filter((s: RecentSubmission) => s.status === 'verified' || s.status === 'approved').length;
          const submissionRate = submissions.length > 0 ? (verified / submissions.length) * 100 : 0;

          setStats({
            totalRequirements: requirements.length,
            totalCategories: categories.length,
            pendingVerifications: pending,
            verifiedDocuments: verified,
            submissionRate: Math.round(submissionRate)
          });

          setRecentSubmissions(submissions.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Dweezil's Code
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: FileCheck },
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <FileText className="h-8 w-8 text-blue-600" />
            Documents Dashboard
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Overview of document requirements, submissions, and verifications
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Requirements */}
          <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Requirements
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalRequirements}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Categories */}
          <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Categories
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalCategories}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FolderOpen className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Pending Verifications */}
          <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Pending Verifications
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.pendingVerifications}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Verified Documents */}
          <div className={`rounded-lg shadow-sm border p-6 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Verified Documents
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.verifiedDocuments}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Submissions */}
          <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <Users className="h-5 w-5 text-blue-600" />
                Recent Submissions
              </h2>
            </div>
            <div className="p-6">
              {recentSubmissions.length === 0 ? (
                <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No recent submissions
                </p>
              ) : (
                <div className="space-y-4">
                  {recentSubmissions.map((submission) => (
                    <div key={submission.id} className={`flex items-center justify-between p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex-1">
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {submission.studentName}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {submission.documentName}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        {getStatusBadge(submission.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submission Rate */}
          <div className={`rounded-lg shadow-sm border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className={`text-lg font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Verification Rate
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className={`text-6xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {stats.submissionRate}%
                  </div>
                  <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Documents Verified
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/document-requirements"
            className={`p-6 rounded-lg shadow-sm border flex items-center gap-4 transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            <FileCheck className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Manage Requirements
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                View and edit document requirements
              </p>
            </div>
          </Link>

          <Link
            to="/document-categories"
            className={`p-6 rounded-lg shadow-sm border flex items-center gap-4 transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            <FolderOpen className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Manage Categories
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Organize document categories
              </p>
            </div>
          </Link>

          <Link
            to="/students"
            className={`p-6 rounded-lg shadow-sm border flex items-center gap-4 transition-colors ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            <Users className="h-8 w-8 text-green-600" />
            <div>
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                View Students
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Check student document submissions
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DocumentsDashboard;
