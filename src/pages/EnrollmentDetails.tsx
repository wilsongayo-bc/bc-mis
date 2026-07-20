import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Edit,
  Trash2,
  User,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Mail,
  AlertCircle,
  CheckCircle,
  MoreHorizontal
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import {
  fetchEnrollmentById,
  selectCurrentEnrollment,
  selectEnrollmentLoading,
  selectEnrollmentError
} from '../store/slices/enrollmentSlice';
import {
  fetchDepartments,
  selectDepartments
} from '../store/slices/departmentSlice';
import { useSettingsContext } from '../utils/settingsUtils';
import { toast } from 'sonner';
import api from '../lib/api';

const EnrollmentDetails: React.FC = () => {
  // Dweezil's Code - Cache buster debug log
  console.log('🎯🎯🎯 ENROLLMENT DETAILS COMPONENT LOADED - CACHE CLEARED v2.0 🎯🎯🎯');
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const enrollment = useAppSelector(selectCurrentEnrollment);
  const loading = useAppSelector(selectEnrollmentLoading);
  const error = useAppSelector(selectEnrollmentError);
  const departments = useAppSelector(selectDepartments);
  const { theme } = useSettingsContext();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Dweezil's Code - Add state for subject selection and editing
  const [availableSubjects, setAvailableSubjects] = useState<Array<{
    id: string;
    name: string;
    code: string;
    department?: { name: string };
    units?: number;
  }>>([]);

  const formatCurrency = (value: number | string | undefined | null) => {
    if (value === null || value === undefined) {
      return '—';
    }

    const numericValue = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(numericValue)) {
      return '—';
    }

    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue);
  };

  useEffect(() => {
    console.log('🔄 EnrollmentDetails useEffect - Dispatching fetchDepartments and fetchEnrollmentById');
    console.log('🔄 EnrollmentDetails useEffect - ID from params:', id);
    dispatch(fetchDepartments({}));
    if (id) {
      console.log('✅ EnrollmentDetails useEffect - ID exists, fetching enrollment:', id);
      dispatch(fetchEnrollmentById(id));
    } else {
      console.warn('⚠️ EnrollmentDetails useEffect - No ID found in params');
    }
  }, [dispatch, id]);

  // Dweezil's Code - Load available subjects when enrollment is loaded
  useEffect(() => {
    if (enrollment && enrollment.student) {
      console.log('📋 Enrollment loaded:', enrollment);
      console.log('📋 Selected subjects from enrollment:', enrollment.selectedSubjects);
      
      // Set initial selected subjects
      if (enrollment.selectedSubjects && enrollment.selectedSubjects.length > 0) {
        console.log('✅ Setting selected subjects:', enrollment.selectedSubjects);
      } else {
        console.log('⚠️ No selected subjects in enrollment');
      }
      
      // Load available subjects for the student's year level
      console.log('🔍 Loading available subjects for student:', enrollment.student.id);
      loadAvailableSubjects(enrollment.student.id);
    }
  }, [enrollment]);

  const loadAvailableSubjects = async (studentId: string) => {
    try {
      console.log('📡 Fetching subjects from API for student:', studentId);
      const response = await api.get(`/subjects/student/${studentId}/available`);
      console.log('✅ Subjects loaded:', response.data.data);
      setAvailableSubjects(response.data.data || []);
    } catch (error) {
      console.error('❌ Error loading subjects:', error);
      toast.error('Failed to load available subjects');
    }
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log('Delete enrollment:', id);
    setShowDeleteModal(false);
    navigate('/enrollments');
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      } flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <header className={`${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white dark:bg-gray-800 border-gray-200'
        } shadow-sm border-b`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link to="/enrollments" className={`${
                  theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                } mr-4`}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <h1 className={`text-xl font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Enrollment Details</h1>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className={`${
            theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
          } border rounded-md p-4`}>
            <div className="flex">
              <AlertCircle className={`h-5 w-5 ${
                theme === 'dark' ? 'text-red-400' : 'text-red-400'
              } mr-3 mt-0.5`} />
              <div>
                <h3 className={`text-sm font-medium ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-800'
                }`}>Error</h3>
                <div className={`mt-2 text-sm ${
                  theme === 'dark' ? 'text-red-200' : 'text-red-700'
                }`}>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className={`min-h-screen ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <header className={`${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white dark:bg-gray-800 border-gray-200'
        } shadow-sm border-b`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link to="/enrollments" className={`${
                  theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                } mr-4`}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <h1 className={`text-xl font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Enrollment Details</h1>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className={`mt-2 text-sm font-medium ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Enrollment not found</h3>
            <p className={`mt-1 text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>The enrollment you're looking for doesn't exist.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/enrollments')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-3">
            <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {enrollment.student?.user?.firstName} {enrollment.student?.user?.lastName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enrollment Details • {enrollment.id}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to={`/enrollments/${id}/edit`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showDropdown && (
              <div className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg ${
                theme === 'dark'
                  ? 'bg-gray-800 ring-gray-700'
                  : 'bg-white ring-black ring-opacity-5'
              } ring-1 z-50 border border-gray-200 dark:border-gray-700`}>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowDeleteModal(true);
                      setShowDropdown(false);
                    }}
                    className={`flex items-center w-full px-4 py-2 text-sm ${
                      theme === 'dark'
                        ? 'text-red-400 hover:bg-red-900/20'
                        : 'text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    Delete Enrollment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Notifications */}
          <div className="space-y-4">
            {enrollment.submittedByStudent && enrollment.studentSubmissionDate && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      Student Submitted Enrollment
                    </p>
                    <p className="text-xs mt-1 text-blue-700 dark:text-blue-300">
                      Submitted on {new Date(enrollment.studentSubmissionDate).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {enrollment.student?.registrationStatus === 'REGISTERED' && enrollment.status === 'PENDING' && (
              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Pending enrollment request from registered student
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Student & Course Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Student Profile</h3>
              </div>
              <div className="p-6">
                {enrollment.student ? (
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        {enrollment.student.user.firstName} {enrollment.student.user.lastName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {enrollment.student.studentId}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email Address</label>
                    <div className="flex items-center mt-1 text-sm text-gray-900 dark:text-white font-medium">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {enrollment.student?.user?.email}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Year Level</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                      {typeof enrollment.student?.gradeLevel === 'string' ? enrollment.student.gradeLevel : enrollment.student?.gradeLevel?.name || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Course Details</h3>
              </div>
              <div className="p-6">
                {enrollment.course ? (
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        {enrollment.course.courseCode}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {enrollment.course.name}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Credits</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                      {enrollment.course?.credits || '0'} Units
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                      {departments.find(d => d.id === enrollment.course?.departmentId)?.name || 'TBA'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Subjects Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Selected Subjects</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {enrollment.selectedSubjects?.length || 0} Total
              </span>
            </div>
            <div className="overflow-x-auto">
              {enrollment.selectedSubjects && enrollment.selectedSubjects.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Code</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Subject Name</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {availableSubjects
                      .filter(s => enrollment.selectedSubjects?.includes(s.id))
                      .map((subject) => (
                        <tr key={subject.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">{subject.code}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{subject.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">{subject.units}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No subjects selected yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column (1/3) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Enrollment Status</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Current Status</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  enrollment.status === 'ENROLLED'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : enrollment.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {enrollment.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Registration</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  enrollment.student?.registrationStatus === 'REGISTERED'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {enrollment.student?.registrationStatus?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Semester</span>
                  <span className="font-bold text-gray-900 dark:text-white">{enrollment.courseSection?.semester || enrollment.semester || 'TBA'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Enrollment Date</span>
                  <span className="font-bold text-gray-900 dark:text-white">{new Date(enrollment.enrollmentDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Assessment Summary */}
          {(typeof enrollment.totalAssessed === 'number' || enrollment.assessmentDetails) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Financial Summary</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Assessed</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(enrollment.totalAssessed ?? enrollment.assessmentDetails?.totalAssessed ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Paid</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(enrollment.totalPaid ?? 0)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Balance</span>
                    <span className="text-lg font-black text-red-600 dark:text-red-400">
                      {formatCurrency(enrollment.balance ?? 0)}
                    </span>
                  </div>
                </div>
                
                {enrollment.assessmentDetails && (
                  <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
                      <span>Tuition Fee</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(enrollment.assessmentDetails.tuition ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500">
                      <span>Misc Fee</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{formatCurrency(enrollment.assessmentDetails.miscellaneousFee ?? 0)}</span>
                    </div>
                    {enrollment.assessmentDetails.discountAmount > 0 && (
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-green-600">
                        <span>Discount</span>
                        <span className="font-bold">-{formatCurrency(enrollment.assessmentDetails.discountAmount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Activity Log</h3>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  <li className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                    <div className="relative flex space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center ring-4 ring-white dark:ring-gray-800">
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Enrollment created</p>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{new Date(enrollment.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </li>
                  <li className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 ${
                        enrollment.status === 'ENROLLED' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-yellow-100 dark:bg-yellow-900/40'
                      }`}>
                        <CheckCircle className={`h-4 w-4 ${enrollment.status === 'ENROLLED' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current status updated</p>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{new Date(enrollment.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Enrollment</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete this enrollment for <span className="font-bold text-gray-900 dark:text-white">{enrollment.student?.user?.firstName} {enrollment.student?.user?.lastName}</span>? This action is permanent.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrollmentDetails;
