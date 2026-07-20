import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
// Removed unused import: useLocation
import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./hooks/redux";
import { getCurrentUser, selectIsAuthenticated, selectAuthLoading } from "./store/slices/authSlice";
import { createFaviconFromImage } from "./utils/faviconUtils";
import { fetchPublicSettings, getSettingValue, Setting } from "./services/settingsService";
import { useInactivityLogout } from "./hooks/useInactivityLogout";
import { BrandingProvider } from './contexts/BrandingContext';
import { Toaster } from "sonner";
import { SettingsProvider } from './contexts/SettingsContext';
import { useSettingsContext } from './utils/settingsUtils';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from "./components/ProtectedRoute";
import DraggableDebugWindow from "./components/DraggableDebugWindow";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Enrollments from "./pages/Enrollments";
import EnrollmentForm from "./pages/EnrollmentForm";
import EnrollmentDetails from "./pages/EnrollmentDetails";
import Students from "./pages/Students";
import StudentForm from "./pages/StudentForm";
import StudentDetails from "./pages/StudentDetails";
import Payments from "./pages/Payments";
import PaymentForm from "./pages/PaymentForm";
import PaymentDetails from "./pages/PaymentDetails";
import Schedules from "./pages/Schedules";
import ScheduleForm from "./pages/ScheduleForm";
import ScheduleDetails from "./pages/ScheduleDetails";
import ScheduleClassList from "./pages/ScheduleClassList";
import Timetable from "./pages/Timetable";

import Books from "./pages/Books";
import BookForm from "./pages/BookForm";
import BookDetails from "./pages/BookDetails";
import BorrowRecords from "./pages/BorrowRecords";
import BorrowForm from "./pages/BorrowForm";
import LibraryStatistics from "./pages/LibraryStatistics";
import LibraryManagementDashboard from "./pages/LibraryManagementDashboard";
import UnderMaintenance from "./pages/UnderMaintenance";
import GradeLevels from "./pages/GradeLevels";
import GradeLevelForm from "./pages/GradeLevelForm";
import Sections from "./pages/Sections";
import UserManagement from "./pages/UserManagement";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";
import DepartmentManagement from "./pages/DepartmentManagement";
import Employees from "./pages/Employees";
import EmployeeForm from "./pages/EmployeeForm";
import EmployeeDetails from "./pages/EmployeeDetails";
import Positions from "./pages/Positions";
import Reports from "./pages/Reports";
import PdfGeneration from "./pages/PdfGeneration";
import Settings from "./pages/Settings";
import AcademicYears from "./pages/AcademicYears";
import ActivityLogs from "./pages/ActivityLogs";
import Courses from "./pages/Courses";
import CourseForm from "./pages/CourseForm";
import CourseDetails from "./pages/CourseDetails";
import CourseSectionManagement from "./pages/CourseSectionManagement";
import CourseSectionForm from "./pages/CourseSectionForm";
import Subjects from "./pages/Subjects";
import SubjectForm from "./pages/SubjectForm";
import SubjectDetails from "./pages/SubjectDetails";
import DocumentRequirements from "./pages/DocumentRequirements";
import DocumentRequirementForm from "./pages/DocumentRequirementForm";
import DocumentRequirementDetails from "./pages/DocumentRequirementDetails";
import DocumentCategories from "./pages/DocumentCategories";
import DocumentCategoryForm from "./pages/DocumentCategoryForm";
import DocumentCategoryDetails from "./pages/DocumentCategoryDetails";
import DocumentsDashboard from "./pages/DocumentsDashboard";
import { DocumentationPage, DocumentationIndex } from "./components/documentation";
import PublicPreListing from "./pages/PublicPreListing";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import NotFound from "./pages/NotFound";

// Debug components for route tracking
const RouteLogger = () => {
  return null;
};

const EnvironmentWatermark: React.FC = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const apiBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '') as string;

  const isLocal =
    import.meta.env.DEV ||
    (hostname === 'localhost' || hostname === '127.0.0.1');

  const isUat =
    !isLocal &&
    (hostname.includes('uat') || apiBase.includes('api-uat'));

  if (!isLocal && !isUat) return null;

  const label = isLocal ? 'Local Environment' : 'UAT Environment';
  const badgeClass = isLocal ? 'bg-red-600/90' : 'bg-amber-500/90';

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-end justify-center opacity-70">
      <div className={`pointer-events-none mb-6 px-5 py-2 rounded-full ${badgeClass} text-white text-xs font-semibold tracking-[0.2em] uppercase shadow-lg`}>
        {label}
      </div>
    </div>
  );
};

const NavigateWithLogging: React.FC<{ to: string; reason: string }> = ({ to, reason: _reason }) => {
  return <Navigate to={to} replace />;
};

export default function App() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const [brandingSettings, setBrandingSettings] = React.useState<Setting[] | null>(null);
  const [sessionTimeout, setSessionTimeout] = React.useState<number>(30);

  // Fetch session timeout from settings
  useEffect(() => {
    const fetchSessionTimeout = async () => {
      try {
        const settings = await fetchPublicSettings();
        const timeoutValue = getSettingValue(settings, 'session_timeout');
        if (timeoutValue) {
          setSessionTimeout(parseInt(timeoutValue, 10));
        }
      } catch (error) {
        console.error('Failed to fetch session timeout:', error);
      }
    };
    fetchSessionTimeout();
  }, []);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const token = localStorage.getItem('token');
    console.log('🔍 App.tsx useEffect - Debug Info:', {
      hasToken: !!token,
      isAuthenticated,
      isLoading,
      timestamp: new Date().toISOString()
    });

    // Always dispatch getCurrentUser if token exists, regardless of current auth state
    // This ensures proper session restoration on page refresh
    if (token) {
      console.log('🚀 Dispatching getCurrentUser() - token exists, restoring session');
      dispatch(getCurrentUser());
    } else {
      console.log('❌ No token found in localStorage');
    }

    // Branding boot: fetch public settings once and update favicon
    (async () => {
      try {
        const settings = await fetchPublicSettings();
        setBrandingSettings(settings);
        const logoUrl = getSettingValue(settings, 'school_logo');
        if (logoUrl) {
          await createFaviconFromImage(logoUrl);
        }
      } catch {
        // Silent fallback — default favicon remains
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]); // Remove isAuthenticated from dependencies to prevent re-runs

  // Show loading screen while checking authentication
  if (isLoading) {
    console.log('🔄 App.tsx: Still loading authentication, showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('🚀 App.tsx: Authentication complete, rendering routes. isAuthenticated:', isAuthenticated);

  // Layout component for authenticated pages
  const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme } = useSettingsContext();

    // Enable inactivity logout for authenticated users
    useInactivityLogout(sessionTimeout);

    return (
      <div className={`flex h-screen transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <BrandingProvider initialSettings={brandingSettings ?? undefined}>
          <Router>
            <EnvironmentWatermark />
            <DraggableDebugWindow />
            <RouteLogger />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/pre-listing" element={<PublicPreListing />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Dashboard />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Employee Management - ADMIN Only */}
              <Route
                path="/employees"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <AuthenticatedLayout>
                      <Employees />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <AuthenticatedLayout>
                      <EmployeeForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/:id"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <AuthenticatedLayout>
                      <EmployeeDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <AuthenticatedLayout>
                      <EmployeeForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Teachers Management - Filtered view of Employees */}
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <Employees initialRole="TEACHER" title="Teachers" hideRoleFilter={true} />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* User Management - ADMIN and SUPERADMIN */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <UserManagement />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* User Management (alternative path) - ADMIN and SUPERADMIN */}
              <Route
                path="/user-management"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <UserManagement />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* User Profile - Specific user profile (role-based access) */}
              <Route
                path="/users/:id/profile"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <UserProfile />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Current User Profile - Own profile */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <UserProfile />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Edit Profile - Own profile editing */}
              <Route
                path="/profile/edit"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <EditProfile />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Edit User Profile - Admin editing other users */}
              <Route
                path="/users/:id/edit"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <EditProfile />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Department Management - ADMIN and SUPERADMIN */}
              <Route
                path="/departments"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <DepartmentManagement />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Position Management - ADMIN and SUPERADMIN */}
              <Route
                path="/positions"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <Positions />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/students"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <Students />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <StudentForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students/:id"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <StudentDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <StudentForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/courses"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Courses />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <CourseForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:id"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <CourseDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <CourseForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:id/sections"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <CourseSectionManagement />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:id/sections/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <CourseSectionForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/:courseId/sections/:sectionId/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <CourseSectionForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/subjects"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      {(() => {
                        console.log('🎯 ROUTING: Subjects route matched, rendering Subjects component');
                        return <Subjects />;
                      })()}
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subjects/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <SubjectForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subjects/:id"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <SubjectDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subjects/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <SubjectForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Document Management - ADMIN and REGISTRAR */}
              <Route
                path="/documents"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentsDashboard />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-requirements"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentRequirements />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-requirements/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentRequirementForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-requirements/:id"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentRequirementDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-requirements/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentRequirementForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-categories"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentCategories />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-categories/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentCategoryForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-categories/:id"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentCategoryDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document-categories/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <DocumentCategoryForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/enrollments"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR', 'STUDENT']}>
                    <AuthenticatedLayout>
                      <Enrollments />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enrollments/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <EnrollmentForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enrollments/:id"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <EnrollmentDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enrollments/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <EnrollmentForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/payments"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR', 'FINANCE']}>
                    <AuthenticatedLayout>
                      <Payments />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR', 'FINANCE']}>
                    <AuthenticatedLayout>
                      <PaymentForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments/:id"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR', 'FINANCE']}>
                    <AuthenticatedLayout>
                      <PaymentDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR', 'FINANCE']}>
                    <AuthenticatedLayout>
                      <PaymentForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/books"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <Books />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/books/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'LIBRARIAN']}>
                    <AuthenticatedLayout>
                      <BookForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/books/:id"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <BookDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/books/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'LIBRARIAN']}>
                    <AuthenticatedLayout>
                      <BookForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/borrow-records"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <BorrowRecords />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/borrow-records/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'LIBRARIAN']}>
                    <AuthenticatedLayout>
                      <BorrowForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library-statistics"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'LIBRARIAN']}>
                    <AuthenticatedLayout>
                      <LibraryStatistics />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Library Management Dashboard */}
              <Route
                path="/library-management"
                element={
                  <ProtectedRoute requiredRoles={['LIBRARIAN', 'ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <LibraryManagementDashboard />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Under Maintenance Pages */}
              <Route
                path="/library-management/borrowing"
                element={
                  <ProtectedRoute requiredRoles={['LIBRARIAN', 'ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <UnderMaintenance title="Borrowing Management" message="This feature is currently under development." />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library-management/reports"
                element={
                  <ProtectedRoute requiredRoles={['LIBRARIAN', 'ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <UnderMaintenance title="Library Reports" message="This feature is currently under development." />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/library-management/overdue"
                element={
                  <ProtectedRoute requiredRoles={['LIBRARIAN', 'ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <UnderMaintenance title="Overdue Management" message="This feature is currently under development." />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Grade Levels Management */}
              <Route
                path="/grade-levels"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <GradeLevels />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grade-levels/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <GradeLevelForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grade-levels/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <GradeLevelForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/schedules"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR', 'STUDENT']}>
                    <AuthenticatedLayout>
                      <Schedules />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedules/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <ScheduleForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedules/:id"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <ScheduleDetails />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedules/:id/class-list"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <ScheduleClassList />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedules/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR']}>
                    <AuthenticatedLayout>
                      <ScheduleForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/timetable"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'REGISTRAR', 'STUDENT']}>
                    <AuthenticatedLayout>
                      <Timetable />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'TEACHER', 'FINANCE']}>
                    <AuthenticatedLayout>
                      <Reports />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pdf-generation"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN', 'REGISTRAR', 'TEACHER']}>
                    <AuthenticatedLayout>
                      <PdfGeneration />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports-admin"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <AuthenticatedLayout>
                      <div className="p-8 text-center">
                        <h1 className="text-2xl font-bold mb-4">Reports</h1>
                        <p className="text-gray-600">Coming Soon...</p>
                      </div>
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />


              {/* Settings - Admin and SuperAdmin only */}
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      {(() => {

                        return <Settings />;
                      })()}
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Activity Logs - Admin and SuperAdmin only */}
              <Route
                path="/activity-logs"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <ActivityLogs />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Academic Years - Admin and SuperAdmin only */}
              <Route
                path="/academic-years"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <AcademicYears />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Sections Management - Admin and SuperAdmin only */}
              <Route
                path="/settings/sections"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <Sections />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/sections/new"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <CourseSectionForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/sections/:sectionId/edit"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'SUPERADMIN']}>
                    <AuthenticatedLayout>
                      <CourseSectionForm />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Documentation Routes - All authenticated users */}
              <Route
                path="/documentation"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <DocumentationIndex />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documentation/:category"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <DocumentationPage />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documentation/:category/:slug"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <DocumentationPage />
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="/" element={
                <NavigateWithLogging to="/dashboard" reason="root redirect" />
              } />

              {/* 404 Not Found - Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster position="top-right" richColors />
        </BrandingProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
