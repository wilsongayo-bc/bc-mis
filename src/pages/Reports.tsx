import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Users, 
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  GraduationCap,
  BookOpen,
  CreditCard,
  ChevronDown,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { DashboardChart, ComplianceChart, FinancialChart, AcademicChart } from '../components/charts';
import { exportToPDF, exportToExcel, exportToCSV, prepareTableDataForExport, formatDateForExport, ExportData } from '../utils/exportUtils';
import { useAuth } from '../hooks/useAuth';
import { getReportPermissions, canAccessReportTab, getAccessibleTabs } from '../utils/reportPermissions';
import { UserRole } from '../utils/roleHierarchy';
import { useSchoolSettings } from '../hooks/useSchoolSettings';
import api from '../lib/api';
import TeacherLoadPreviewModal from '../components/reports/TeacherLoadPreviewModal';

interface DashboardData {
  overview: {
    totalStudents: number;
    totalEnrollments: number;
    totalRevenue: number;
    pendingPayments: number;
    complianceRate: number;
    recentEnrollments: number;
  };
  charts: {
    studentsByGrade: Array<{ name: string; value: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
  };
}

interface ComplianceData extends Record<string, unknown> {
  id: string;
  studentName: string;
  gradeLevel: string;
  submittedDocuments: number;
  requiredDocuments: number;
  missingDocuments: number;
  complianceRate: number;
  complianceStatus: string;
  lastUpdated: string;
}

interface ExpirationData extends Record<string, unknown> {
  id: string;
  studentName: string;
  gradeLevel: string;
  documentType: string;
  expirationDate: string;
  daysUntilExpiration: number;
  urgencyLevel: string;
  status: string;
}

interface TeacherLoadSchedule {
  subjectCode: string;
  subjectDescription: string;
  time: string;
  days: string;
  courseAndYear: string;
  block: string;
  units: number;
  room: string;
  noOfStudents: number;
}

interface TeacherLoadData {
  teacherName: string;
  designation: string;
  schedules: TeacherLoadSchedule[];
  totalUnits: number;
  academicYear: string;
  semester: string;
}

// Dweezil's Code - Enrollment report interfaces
interface EnrollmentReportData extends Record<string, unknown> {
  id: string;
  studentId: string;
  studentName: string;
  gradeLevel: string;
  courseName: string;
  courseCode: string;
  section: string;
  semester: string;
  academicYear: string;
  status: string;
  enrollmentDate: string;
  totalAssessed: number;
  totalPaid: number;
  balance: number;
  downpaymentRequired: number;
  createdAt: string;
}

interface EnrollmentReportSummary {
  totalEnrollments: number;
  enrolledCount: number;
  pendingCount: number;
  verifiedCount: number;
  completedCount: number;
  droppedCount: number;
  totalAssessed: number;
  totalPaid: number;
  totalBalance: number;
}

const Reports: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { schoolLogo } = useSchoolSettings();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  const [expirationData, setExpirationData] = useState<ExpirationData[]>([]);
  const [teacherLoadData, setTeacherLoadData] = useState<TeacherLoadData[]>([]);
  const [teachers, setTeachers] = useState<{id: string, user: {id: string, firstName: string, lastName: string}}[]>([]);
  const [courses, setCourses] = useState<{id: string, name: string, courseCode: string}[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedAY, setSelectedAY] = useState<string>('2026-2027');
  const [selectedSemester, setSelectedSemester] = useState<string>('First Semester');
  const [preparedBy, setPreparedBy] = useState<string>('');
  const [_approvedBy, _setApprovedBy] = useState<string>('MA. OLGA DC. ALVAREZ, PhD, Dev.Ed.D');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Dweezil's Code - Enrollment report state
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentReportData[]>([]);
  const [enrollmentSummary, setEnrollmentSummary] = useState<EnrollmentReportSummary | null>(null);
  const [enrollmentFilters, setEnrollmentFilters] = useState({
    status: 'all',
    courseId: '',
    semester: '',
    academicYear: '',
    gradeLevelId: '',
    search: ''
  });
  const [gradeLevels, setGradeLevels] = useState<{id: string, name: string}[]>([]);

  // Dweezil's Code - Financial report state
  const [financialData, setFinancialData] = useState<{
    summary: {
      totalPayments: number;
      totalRevenue: number;
      pendingRevenue: number;
      overdueRevenue: number;
      collectionRate: number;
    };
    revenueByType: Array<{ type: string; amount: number; count: number }>;
    revenueByMethod: Array<{ method: string; amount: number; count: number }>;
  } | null>(null);
  const [financialFilters, setFinancialFilters] = useState({
    startDate: '',
    endDate: ''
  });

  // Get user permissions
  const userRole = user?.role as UserRole;
  const permissions = userRole ? getReportPermissions(userRole) : null;
  const accessibleTabs = useMemo(() => userRole ? getAccessibleTabs(userRole) : [], [userRole]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses');
        if (response.data && response.data.data) {
          setCourses(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }
    };

    if (activeTab === 'teacher-load') {
      fetchCourses();
    }
  }, [activeTab]);

  // Set prepared by
  useEffect(() => {
    if (user) {
      setPreparedBy(`${user.firstName} ${user.lastName}`.toUpperCase());
    }
  }, [user]);

  // Check authentication and redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setError('You must be logged in to access reports.');
      return;
    }

    if (!userRole || accessibleTabs.length === 0) {
      setError('You do not have permission to access any reports.');
      return;
    }

    // Set default tab to first accessible tab
    if (!canAccessReportTab(userRole, activeTab)) {
      setActiveTab(accessibleTabs[0]);
    }
  }, [isAuthenticated, userRole, accessibleTabs, activeTab]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Dweezil's Code
  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setDashboardData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Dweezil's Code
  // Fetch compliance data
  const fetchComplianceData = useCallback(async () => {
    try {
      const response = await api.get('/reports/student-compliance', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setComplianceData(response.data.data || response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  // Dweezil's Code
  // Fetch expiration data
  const fetchExpirationData = useCallback(async () => {
    try {
      const response = await api.get('/reports/document-expiration', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setExpirationData(response.data.data || response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  // Dweezil's Code
  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    try {
      const response = await api.get('/employees/role/teachers'); 
      const teachersData = response.data.data || response.data || [];
      setTeachers(teachersData);
      return teachersData;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  // Dweezil's Code
  // Fetch teacher load report
  const fetchTeacherLoadReport = useCallback(async (teacherIdOverride?: string) => {
    try {
      setLoading(true);
      const response = await api.get('/reports/teacher-load', {
        params: {
          teacherId: teacherIdOverride || selectedTeacherId,
          academicYear: selectedAY,
          semester: selectedSemester,
          courseId: selectedCourseId
        }
      });
      setTeacherLoadData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherId, selectedAY, selectedSemester, selectedCourseId]);

  // Dweezil's Code - Fetch enrollment report data
  const fetchEnrollmentReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/enrollments', {
        params: {
          status: enrollmentFilters.status !== 'all' ? enrollmentFilters.status : undefined,
          courseId: enrollmentFilters.courseId || undefined,
          semester: enrollmentFilters.semester || undefined,
          academicYear: enrollmentFilters.academicYear || undefined,
          gradeLevelId: enrollmentFilters.gradeLevelId || undefined,
          search: enrollmentFilters.search || undefined,
          limit: 1000 // Get all records for report
        }
      });
      setEnrollmentData(response.data.data || []);
      setEnrollmentSummary(response.data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [enrollmentFilters]);

  // Dweezil's Code - Fetch grade levels for filter
  const fetchGradeLevels = useCallback(async () => {
    try {
      const response = await api.get('/grade-levels');
      setGradeLevels(response.data.data || response.data || []);
    } catch (err) {
      console.error('Failed to fetch grade levels:', err);
    }
  }, []);

  // Dweezil's Code - Fetch financial report data
  const fetchFinancialReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/payments/reports', {
        params: {
          startDate: financialFilters.startDate || undefined,
          endDate: financialFilters.endDate || undefined
        }
      });
      setFinancialData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [financialFilters]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'compliance') {
      fetchComplianceData();
    } else if (activeTab === 'expiration') {
      fetchExpirationData();
    } else if (activeTab === 'enrollments') {
      // Dweezil's Code - Fetch enrollment report data
      fetchGradeLevels();
      fetchEnrollmentReport();
    } else if (activeTab === 'financial') {
      // Dweezil's Code - Fetch financial report data
      fetchFinancialReport();
    } else if (activeTab === 'teacher-load') {
      const initTeacherLoad = async () => {
        const loadedTeachers = await fetchTeachers();
        
        if (userRole === 'TEACHER' && user) {
          // Find the teacher record for the current user
          const currentTeacher = loadedTeachers.find((t: {
            id: string;
            user: { id: string };
          }) => t.user.id === user.id);
          if (currentTeacher) {
            setSelectedTeacherId(currentTeacher.id);
            fetchTeacherLoadReport(currentTeacher.id);
          } else {
            // Fallback if teacher record not found
            fetchTeacherLoadReport();
          }
        } else {
          fetchTeacherLoadReport();
        }
      };
      
      initTeacherLoad();
    }
    // Dweezil's Code - Added missing dependencies to useEffect
  }, [activeTab, fetchTeacherLoadReport, fetchEnrollmentReport, fetchGradeLevels, user, userRole]);

  // Chart configurations
  const studentsChartData = {
    labels: dashboardData?.charts.studentsByGrade.map(item => item.name) || [],
    datasets: [
      {
        data: dashboardData?.charts.studentsByGrade.map(item => item.value) || [],
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#06B6D4'
        ],
        borderWidth: 0,
      },
    ],
  };

  const revenueChartData = {
    labels: dashboardData?.charts.monthlyRevenue.map(item => item.month) || [],
    datasets: [
      {
        label: 'Revenue',
        data: dashboardData?.charts.monthlyRevenue.map(item => item.revenue) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const _chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'enrollments', label: 'Enrollment Report', icon: Users }, // Dweezil's Code - Add enrollment report tab
    { id: 'compliance', label: 'Document Compliance', icon: CheckCircle },
    { id: 'expiration', label: 'Document Expiration', icon: AlertTriangle },
    { id: 'academic', label: 'Academic Performance', icon: GraduationCap },
    { id: 'teacher-load', label: 'Teacher Load', icon: BookOpen },
    { id: 'financial', label: 'Financial Reports', icon: DollarSign }
  ];

  // Filter tabs based on user permissions
  const tabs = allTabs.filter(tab => accessibleTabs.includes(tab.id));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Dweezil's Code - Helper function for enrollment status badge
  const getEnrollmentStatusColor = (status: string) => {
    switch (status) {
      case 'ENROLLED': return 'text-green-600 bg-green-100';
      case 'PENDING': return 'text-yellow-600 bg-yellow-100';
      case 'VERIFIED': return 'text-blue-600 bg-blue-100';
      case 'COMPLETED': return 'text-purple-600 bg-purple-100';
      case 'DROPPED': return 'text-red-600 bg-red-100';
      case 'FAILED': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Helper function to mask sensitive data
  const _maskSensitiveData = (value: string | number): string => {
    if (!permissions?.canViewSensitiveData) {
      if (typeof value === 'string' && value.includes('@')) {
        // Mask email addresses
        const [username, domain] = value.split('@');
        return `${username.substring(0, 2)}***@${domain}`;
      }
      if (typeof value === 'number' || (typeof value === 'string' && value.match(/^\d+$/))) {
        // Mask numeric values (like revenue, payments)
        return '***';
      }
    }
    return value.toString();
  };

  // Export functions
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    // Check export permissions
    if (!permissions?.canExportReports) {
      setError('You do not have permission to export reports.');
      return;
    }

    let exportData: ExportData;
    
    switch (activeTab) {
      case 'dashboard':
        if (!dashboardData) return;
        exportData = {
          title: 'Dashboard Overview Report',
          headers: ['Metric', 'Value'],
          data: [
            ['Total Students', dashboardData.overview.totalStudents.toString()],
            ['Total Enrollments', dashboardData.overview.totalEnrollments.toString()],
            ['Total Revenue', `$${dashboardData.overview.totalRevenue.toLocaleString()}`],
            ['Pending Payments', `$${dashboardData.overview.pendingPayments.toLocaleString()}`],
            ['Compliance Rate', `${dashboardData.overview.complianceRate.toFixed(1)}%`],
            ['Recent Enrollments', dashboardData.overview.recentEnrollments.toString()]
          ],
          metadata: {
            generatedAt: formatDateForExport(new Date()),
            totalRecords: 6,
            filters: 'Dashboard Overview'
          }
        };
        break;
        
      case 'compliance':
        exportData = {
          title: 'Document Compliance Report',
          headers: ['Student Name', 'Grade Level', 'Submitted Documents', 'Required Documents', 'Compliance Rate', 'Status', 'Last Updated'],
          data: prepareTableDataForExport(complianceData, ['studentName', 'gradeLevel', 'submittedDocuments', 'requiredDocuments', 'complianceRate', 'complianceStatus', 'lastUpdated']),
          metadata: {
            generatedAt: formatDateForExport(new Date()),
            totalRecords: complianceData.length,
            filters: 'All Students'
          }
        };
        break;
        
      case 'expiration':
        exportData = {
          title: 'Document Expiration Report',
          headers: ['Student Name', 'Grade Level', 'Document Type', 'Expiration Date', 'Days Until Expiration', 'Urgency Level', 'Status'],
          data: prepareTableDataForExport(expirationData, ['studentName', 'gradeLevel', 'documentType', 'expirationDate', 'daysUntilExpiration', 'urgencyLevel', 'status']),
          metadata: {
            generatedAt: formatDateForExport(new Date()),
            totalRecords: expirationData.length,
            filters: 'All Documents'
          }
        };
        break;

      // Dweezil's Code - Enrollment report export
      case 'enrollments':
        exportData = {
          title: 'Enrollment Report',
          headers: ['Student ID', 'Student Name', 'Grade Level', 'Course', 'Section', 'Semester', 'Academic Year', 'Status', 'Enrollment Date', 'Total Assessed', 'Total Paid', 'Balance'],
          data: prepareTableDataForExport(enrollmentData, ['studentId', 'studentName', 'gradeLevel', 'courseName', 'section', 'semester', 'academicYear', 'status', 'enrollmentDate', 'totalAssessed', 'totalPaid', 'balance']),
          metadata: {
            generatedAt: formatDateForExport(new Date()),
            totalRecords: enrollmentData.length,
            filters: `Status: ${enrollmentFilters.status}, Course: ${enrollmentFilters.courseId || 'All'}, Semester: ${enrollmentFilters.semester || 'All'}`
          }
        };
        break;
        
      case 'academic':
        exportData = {
          title: 'Academic Performance Report',
          headers: ['Metric', 'Value'],
          data: [
            ['Average GPA', '3.45'],
            ['Attendance Rate', '92.5%'],
            ['Top Performers', '45'],
            ['At Risk Students', '12']
          ],
          metadata: {
            generatedAt: formatDateForExport(new Date()),
            totalRecords: 4,
            filters: 'Academic Overview'
          }
        };
        break;

      case 'teacher-load': {
        const teacherLoadRows: (string | number | null)[][] = [];
        teacherLoadData.forEach(teacher => {
          teacher.schedules.forEach(schedule => {
            teacherLoadRows.push([
              teacher.teacherName,
              teacher.designation,
              schedule.subjectCode,
              schedule.subjectDescription,
              schedule.time,
              schedule.days,
              schedule.courseAndYear,
              schedule.block,
              schedule.units.toString(),
              schedule.room,
              schedule.noOfStudents.toString()
            ]);
          });
        });

        exportData = {
          title: 'Teacher Subject Load Report',
          headers: ['Teacher', 'Designation', 'Subject Code', 'Description', 'Time', 'Days', 'Course & Year', 'Block', 'Units', 'Room', 'Students'],
          data: teacherLoadRows,
          metadata: {
            generatedAt: formatDateForExport(new Date()),
            totalRecords: teacherLoadRows.length,
            filters: `AY: ${selectedAY}, Sem: ${selectedSemester}${selectedCourseId ? `, Course: ${courses.find(c => c.id === selectedCourseId)?.name}` : ''}`
          }
        };
        break;
      }
        
      // Dweezil's Code - Financial report export with actual data
      case 'financial': {
        if (!financialData) {
          setError('No financial data available. Please wait for data to load.');
          return;
        }

        const formatCurrency = (amount: number) => `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Prepare summary data
        const summaryData: (string | number)[][] = [
          ['Total Payments', financialData.summary.totalPayments.toString()],
          ['Total Revenue', formatCurrency(financialData.summary.totalRevenue)],
          ['Pending Revenue', formatCurrency(financialData.summary.pendingRevenue)],
          ['Overdue Revenue', formatCurrency(financialData.summary.overdueRevenue)],
          ['Collection Rate', `${financialData.summary.collectionRate.toFixed(2)}%`],
          [],
          ['Revenue by Payment Type', ''],
        ];

        // Add revenue by type
        financialData.revenueByType.forEach(item => {
          if (item.amount > 0) {
            summaryData.push([
              `  ${item.type}`,
              `${formatCurrency(item.amount)} (${item.count} transactions)`
            ]);
          }
        });

        summaryData.push([], ['Revenue by Payment Method', '']);

        // Add revenue by method
        financialData.revenueByMethod.forEach(item => {
          if (item.amount > 0) {
            summaryData.push([
              `  ${item.method.replace('_', ' ')}`,
              `${formatCurrency(item.amount)} (${item.count} transactions)`
            ]);
          }
        });

        exportData = {
          title: 'Financial Report',
          headers: ['Metric', 'Value'],
          data: summaryData,
          metadata: {
            generatedAt: formatDateForExport(new Date()),
            totalRecords: financialData.summary.totalPayments,
            filters: financialFilters.startDate && financialFilters.endDate 
              ? `Date Range: ${financialFilters.startDate} to ${financialFilters.endDate}`
              : 'All Time'
          }
        };
        break;
      }
        
      default:
        return;
    }
    
    switch (format) {
      case 'pdf':
        exportToPDF(exportData);
        break;
      case 'excel':
        exportToExcel(exportData);
        break;
      case 'csv':
        exportToCSV(exportData);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-700 dark:bg-gray-900 dark:bg-gray-900 print:bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none ${showPreview ? 'print:hidden' : ''}`}>
        {/* Header */}
        <div className="mb-8 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Comprehensive reporting and analytics for your educational institution
              </p>
              {user && (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Logged in as:</span>
                  <span className="text-sm font-medium text-blue-600">{user.firstName} {user.lastName}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {userRole}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {activeTab === 'teacher-load' && (
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Preview & Print
                </button>
              )}
              <button
                onClick={() => {
                  if (activeTab === 'dashboard') fetchDashboardData();
                  else if (activeTab === 'compliance') fetchComplianceData();
                  else if (activeTab === 'expiration') fetchExpirationData();
                  else if (activeTab === 'enrollments') fetchEnrollmentReport(); // Dweezil's Code
                  else if (activeTab === 'teacher-load') {
                    fetchTeachers();
                    fetchTeacherLoadReport();
                  }
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              {permissions?.canExportReports && (
                <div className="relative export-menu-container">
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
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
                        onClick={() => {
                          handleExport('pdf');
                          setShowExportMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export as PDF
                      </button>
                      <button
                        onClick={() => {
                          handleExport('excel');
                          setShowExportMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export as Excel
                      </button>
                      <button
                        onClick={() => {
                          handleExport('csv');
                          setShowExportMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export as CSV
                      </button>
                    </div>
                  </div>
                )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">Error</p>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8 print:hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.overview.totalStudents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Enrollments</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.overview.totalEnrollments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {permissions?.canViewSensitiveData 
                        ? `$${dashboardData.overview.totalRevenue.toLocaleString()}`
                        : '$***'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliance Rate</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.overview.complianceRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Students by Grade Level</h3>
                <div className="h-64">
                  <DashboardChart 
                    type="doughnut" 
                    data={studentsChartData} 
                    title="Students by Grade Level"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue Trend</h3>
                <div className="h-64">
                  <DashboardChart 
                    type="line" 
                    data={revenueChartData} 
                    title="Monthly Revenue Trend"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dweezil's Code - Enrollment Report Tab */}
        {activeTab === 'enrollments' && (
          <div className="space-y-8">
            {/* Summary Cards */}
            {enrollmentSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Enrollments</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{enrollmentSummary.totalEnrollments}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Enrolled</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{enrollmentSummary.enrolledCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{enrollmentSummary.pendingCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Balance</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ₱{enrollmentSummary.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={enrollmentFilters.status}
                    onChange={(e) => setEnrollmentFilters({ ...enrollmentFilters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="ENROLLED">Enrolled</option>
                    <option value="PENDING">Pending</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DROPPED">Dropped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course
                  </label>
                  <select
                    value={enrollmentFilters.courseId}
                    onChange={(e) => setEnrollmentFilters({ ...enrollmentFilters, courseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Grade Level
                  </label>
                  <select
                    value={enrollmentFilters.gradeLevelId}
                    onChange={(e) => setEnrollmentFilters({ ...enrollmentFilters, gradeLevelId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Grade Levels</option>
                    {gradeLevels.map(level => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester
                  </label>
                  <select
                    value={enrollmentFilters.semester}
                    onChange={(e) => setEnrollmentFilters({ ...enrollmentFilters, semester: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Semesters</option>
                    <option value="First Semester">First Semester</option>
                    <option value="Second Semester">Second Semester</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 2026-2027"
                    value={enrollmentFilters.academicYear}
                    onChange={(e) => setEnrollmentFilters({ ...enrollmentFilters, academicYear: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Student name, ID, course..."
                    value={enrollmentFilters.search}
                    onChange={(e) => setEnrollmentFilters({ ...enrollmentFilters, search: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={fetchEnrollmentReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            {/* Enrollment Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enrollment Records</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {enrollmentData.length} of {enrollmentSummary?.totalEnrollments || 0} enrollments
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Grade Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Section
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total Assessed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {enrollmentData.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {enrollment.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {enrollment.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {enrollment.gradeLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {enrollment.courseName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {enrollment.section}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {enrollment.semester}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEnrollmentStatusColor(enrollment.status)}`}>
                            {enrollment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          ₱{enrollment.totalAssessed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          ₱{enrollment.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {enrollmentData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No enrollment records found matching the filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-8">
            {/* Compliance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compliance Overview</h3>
                <div className="h-64">
                  <ComplianceChart 
                    data={complianceData.map(student => ({
                      studentId: student.id,
                      studentName: student.studentName,
                      submittedDocuments: student.submittedDocuments,
                      totalDocuments: student.requiredDocuments,
                      compliancePercentage: student.complianceRate
                    }))}
                    type="doughnut"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Individual Compliance Rates</h3>
                <div className="h-64">
                  <ComplianceChart 
                    data={complianceData.slice(0, 10).map(student => ({
                      studentId: student.id,
                      studentName: student.studentName,
                      submittedDocuments: student.submittedDocuments,
                      totalDocuments: student.requiredDocuments,
                      compliancePercentage: student.complianceRate
                    }))}
                    type="bar"
                  />
                </div>
              </div>
            </div>

            {/* Compliance Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Compliance Report</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track student document submission compliance</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Grade Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Documents
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Compliance Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {complianceData.map((student) => (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {student.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {student.gradeLevel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {student.submittedDocuments}/{student.requiredDocuments}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {student.complianceRate}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(student.complianceStatus)}`}>
                            {student.complianceStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Document Expiration Tab */}
        {activeTab === 'expiration' && (
          <div className="space-y-8">
            {/* Expiration Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">Expired</p>
                    <p className="text-2xl font-bold text-red-900">
                      {expirationData.filter(doc => doc.daysUntilExpiration < 0).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Expiring Soon</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {expirationData.filter(doc => doc.daysUntilExpiration >= 0 && doc.daysUntilExpiration <= 30).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Valid</p>
                    <p className="text-2xl font-bold text-green-900">
                      {expirationData.filter(doc => doc.daysUntilExpiration > 30).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiration Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expiration Status Overview</h3>
                <div className="h-64">
                  <DashboardChart 
                    type="doughnut" 
                    data={{
                      labels: ['Expired', 'Expiring Soon (≤30 days)', 'Valid (>30 days)'],
                      datasets: [{
                        data: [
                          expirationData.filter(doc => doc.daysUntilExpiration < 0).length,
                          expirationData.filter(doc => doc.daysUntilExpiration >= 0 && doc.daysUntilExpiration <= 30).length,
                          expirationData.filter(doc => doc.daysUntilExpiration > 30).length
                        ],
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                      }]
                    }}
                    title="Document Status Distribution"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents by Type</h3>
                <div className="h-64">
                  <DashboardChart 
                    type="bar" 
                    data={{
                      labels: [...new Set(expirationData.map(doc => doc.documentType))],
                      datasets: [{
                        label: 'Document Count',
                        data: [...new Set(expirationData.map(doc => doc.documentType))].map(type => 
                          expirationData.filter(doc => doc.documentType === type).length
                        ),
                        backgroundColor: '#3b82f6',
                        borderColor: '#1d4ed8',
                        borderWidth: 1
                      }]
                    }}
                    title="Documents by Type"
                  />
                </div>
              </div>
            </div>

            {/* Expiration Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Expiration Report</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitor documents approaching expiration</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Document Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Expiration Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Days Until Expiration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Urgency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {expirationData.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {doc.studentName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {doc.documentType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(doc.expirationDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {doc.daysUntilExpiration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(doc.urgencyLevel)}`}>
                            {doc.urgencyLevel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Academic Performance Tab */}
        {activeTab === 'academic' && (
          <div className="space-y-8">
            {/* Academic Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center">
                  <GraduationCap className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Average GPA</p>
                    <p className="text-2xl font-bold text-blue-900">3.45</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Attendance Rate</p>
                    <p className="text-2xl font-bold text-green-900">92.5%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-purple-600">Top Performers</p>
                    <p className="text-2xl font-bold text-purple-900">45</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-orange-600">At Risk</p>
                    <p className="text-2xl font-bold text-orange-900">12</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grade Distribution</h3>
                <div className="h-64">
                  <AcademicChart 
                    data={[
                      { grade: 'A', count: 45, percentage: 25 },
                      { grade: 'B', count: 68, percentage: 38 },
                      { grade: 'C', count: 42, percentage: 23 },
                      { grade: 'D', count: 18, percentage: 10 },
                      { grade: 'F', count: 7, percentage: 4 }
                    ]}
                    type="grade-distribution"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Attendance Trend</h3>
                <div className="h-64">
                  <AcademicChart 
                    data={[
                      { month: 'Jan', attendanceRate: 94, totalStudents: 180 },
                      { month: 'Feb', attendanceRate: 92, totalStudents: 182 },
                      { month: 'Mar', attendanceRate: 89, totalStudents: 185 },
                      { month: 'Apr', attendanceRate: 91, totalStudents: 188 },
                      { month: 'May', attendanceRate: 93, totalStudents: 190 },
                      { month: 'Jun', attendanceRate: 95, totalStudents: 192 }
                    ]}
                    type="attendance-trend"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subject Performance</h3>
                <div className="h-64">
                  <AcademicChart 
                    data={[
                      { subject: 'Mathematics', averageGrade: 82, passRate: 85 },
                      { subject: 'Science', averageGrade: 87, passRate: 90 },
                      { subject: 'English', averageGrade: 91, passRate: 95 },
                      { subject: 'History', averageGrade: 85, passRate: 88 },
                      { subject: 'Physical Education', averageGrade: 93, passRate: 98 }
                    ]}
                    type="subject-performance"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teacher Load Tab */}
        {activeTab === 'teacher-load' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Academic Year
                  </label>
                  <select
                    value={selectedAY}
                    onChange={(e) => setSelectedAY(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Semester
                  </label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  >
                    <option value="First Semester">First Semester</option>
                    <option value="Second Semester">Second Semester</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                  >
                    <option value="">All Courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                         {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Teacher
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    disabled={userRole === 'TEACHER'}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {userRole !== 'TEACHER' && <option value="all">All Teachers</option>}
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.user.lastName}, {teacher.user.firstName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => fetchTeacherLoadReport()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Report
                </button>
              </div>
            </div>

            {/* Report Content */}
            {teacherLoadData.map((data, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 print:shadow-none print:border-none print:break-after-page print:w-full print:p-4">
                <div className="mb-6 text-center border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h1 className="text-xl font-bold uppercase text-gray-900 dark:text-white mb-1">COLEGIO DE ALICIA</h1>
                  {selectedCourseId && (
                    <h2 className="text-lg font-bold uppercase text-gray-900 dark:text-white mb-1">
                      {courses.find(c => c.id === selectedCourseId)?.name}
                    </h2>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">TEACHER'S SUBJECT LOAD</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {data.semester}, A.Y. {data.academicYear}
                  </p>
                </div>
                
                <div className="mb-6 flex justify-between items-end">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Instructor</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{data.teacherName}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Designation</p>
                     <p className="text-lg font-bold text-gray-900 dark:text-white">{data.designation}</p>
                  </div>
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Subject Code</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Description</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Time</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Days</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Course & Year</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Block</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Units</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Room</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">No. of Students</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {data.schedules.map((schedule, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">{schedule.subjectCode}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">{schedule.subjectDescription}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">{schedule.time}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">{schedule.days}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">{schedule.courseAndYear}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">{schedule.block}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">{schedule.units}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center border-r border-gray-200 dark:border-gray-600">{schedule.room}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">{schedule.noOfStudents}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 dark:bg-gray-700 font-bold">
                        <td colSpan={6} className="px-4 py-3 text-right text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">TOTAL UNITS</td>
                        <td className="px-4 py-3 text-center text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">{data.totalUnits}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Financial Reports Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-8">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-900">₱2.4M</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-600">Collected</p>
                    <p className="text-2xl font-bold text-blue-900">₱2.1M</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-900">₱280K</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-600">Overdue</p>
                    <p className="text-2xl font-bold text-red-900">₱45K</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
                <div className="h-64">
                  <FinancialChart 
                    data={[
                      { month: 'Jan', revenue: 380000, target: 400000 },
                      { month: 'Feb', revenue: 420000, target: 400000 },
                      { month: 'Mar', revenue: 390000, target: 400000 },
                      { month: 'Apr', revenue: 450000, target: 400000 },
                      { month: 'May', revenue: 410000, target: 400000 },
                      { month: 'Jun', revenue: 480000, target: 400000 }
                    ]}
                    type="revenue-trend"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status</h3>
                <div className="h-64">
                  <FinancialChart 
                    data={[
                      { status: 'Paid', amount: 2100000, count: 1850 },
                      { status: 'Pending', amount: 280000, count: 125 },
                      { status: 'Overdue', amount: 45000, count: 25 }
                    ]}
                    type="payment-status"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Comparison</h3>
                <div className="h-64">
                  <FinancialChart 
                    data={[
                      { month: 'Jan', thisYear: 380000, lastYear: 350000 },
                      { month: 'Feb', thisYear: 420000, lastYear: 380000 },
                      { month: 'Mar', thisYear: 390000, lastYear: 370000 },
                      { month: 'Apr', thisYear: 450000, lastYear: 400000 },
                      { month: 'May', thisYear: 410000, lastYear: 390000 },
                      { month: 'Jun', thisYear: 480000, lastYear: 420000 }
                    ]}
                    type="monthly-comparison"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Reports Tab */}
        {activeTab === 'custom' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="max-w-md mx-auto">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Custom Report Builder</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced custom report builder with drag-and-drop interface is currently under development.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Teacher Load Preview Modal */}
      <TeacherLoadPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        data={teacherLoadData}
        preparedBy={preparedBy}
        approvedBy={_approvedBy}
        courseName={selectedCourseId ? (courses.find(c => c.id === selectedCourseId)?.name || '') : ''}
        academicYear={selectedAY}
        semester={selectedSemester}
        logoUrl={schoolLogo}
      />
    </div>
  );
};

export default Reports;
