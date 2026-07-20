import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { fetchUserProfile } from '../services/userService';
import { BackendUserProfile } from '../types/userProfile.types';
import { toast } from 'sonner';

import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  Shield, 
  Building, 
  GraduationCap, 
  Briefcase,
  ArrowLeft,
  Edit,
  Settings,
  Activity,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Avatar from '../components/Avatar';
import { getRegistrationStatusBadge, getEnrollmentStatusBadge } from '../utils/statusBadges';
import api from '../lib/api';

interface SubjectSummary {
  id: string;
  code: string;
  name: string;
  units?: number;
}

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, token } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if this is the current user's own profile
  const isOwnProfile = location.pathname === '/profile';
  const targetUserId = isOwnProfile ? currentUser?.id : id;
  
  const [profile, setProfile] = useState<BackendUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSubjectSummaries, setSelectedSubjectSummaries] = useState<SubjectSummary[]>([]);
  const [isLoadingSelectedSubjects, setIsLoadingSelectedSubjects] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationCooldownSeconds, setVerificationCooldownSeconds] = useState(0);

  useEffect(() => {
    if (verificationCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setVerificationCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [verificationCooldownSeconds]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token || !targetUserId) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const profileData = await fetchUserProfile(token, targetUserId);
        setProfile(profileData);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token, targetUserId, refreshKey]);

  useEffect(() => {
    const loadSelectedSubjects = async () => {
      const studentId = profile?.student?.id;
      const enrollment = profile?.student?.enrollments?.[0];
      const selectedSubjectIds: string[] = Array.isArray(enrollment?.selectedSubjects)
        ? enrollment.selectedSubjects.filter((value: unknown): value is string => typeof value === 'string')
        : [];

      if (!studentId || !enrollment || selectedSubjectIds.length === 0) {
        setSelectedSubjectSummaries([]);
        return;
      }

      try {
        setIsLoadingSelectedSubjects(true);
        const courseId = (enrollment as unknown as { course?: { id?: string } | null })?.course?.id;
        const response = await api.get(`/subjects/student/${studentId}/available`, {
          params: {
            courseId: courseId || undefined,
            yearLevel: enrollment.courseSection?.yearLevel || undefined
          }
        });

        const subjects: SubjectSummary[] = Array.isArray(response.data?.data) ? response.data.data : [];
        const subjectById = new Map(subjects.map(subject => [subject.id, subject]));
        const resolved = selectedSubjectIds
          .map(id => subjectById.get(id) || null)
          .filter((value): value is SubjectSummary => value !== null);

        setSelectedSubjectSummaries(resolved);
      } catch (_error) {
        setSelectedSubjectSummaries([]);
      } finally {
        setIsLoadingSelectedSubjects(false);
      }
    };

    loadSelectedSubjects();
  }, [profile?.student?.id, profile?.student?.enrollments]);

  const canEditProfile = () => {
    if (!currentUser || !profile) return false;
    
    // Users can edit their own profile
    if (isOwnProfile || currentUser.id === profile.id) return true;
    
    // Admins can edit profiles based on role hierarchy
    if (currentUser.role === 'SUPERADMIN') return true;
    if (currentUser.role === 'ADMIN' && profile.role !== 'SUPERADMIN') return true;
    if (currentUser.role === 'TEACHER' && ['STUDENT'].includes(profile.role)) return true;
    
    return false;
  };

  const handleSendVerificationEmail = async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    if (verificationCooldownSeconds > 0) return;

    try {
      setIsSendingVerification(true);
      await api.post('/me/email-verification/send');
      toast.success('Verification email sent');
      setVerificationCooldownSeconds(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleAvatarUpdate = () => {
    // Refresh the profile data after avatar update
    setRefreshKey(prev => prev + 1);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Not set';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return 'Never';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    const colors = {
      SUPERADMIN: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
      MANAGER: 'bg-blue-100 text-blue-800',
      TEACHER: 'bg-green-100 text-green-800',
      STUDENT: 'bg-yellow-100 text-yellow-800',
      REGISTRAR: 'bg-indigo-100 text-indigo-800',
      FINANCE: 'bg-pink-100 text-pink-800',
      LIBRARIAN: 'bg-teal-100 text-teal-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-700 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="animate-pulse">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Profile</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Profile Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">The requested user profile could not be found.</p>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(isOwnProfile ? '/dashboard' : '/users')}
              className="inline-flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white dark:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isOwnProfile ? 'Dashboard' : 'User Management'}
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {isOwnProfile ? 'My Profile' : 'User Profile'}
            </span>
          </div>
          
          {canEditProfile() && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Navigate to appropriate edit route based on whether it's own profile
                  if (isOwnProfile || currentUser?.id === profile.id) {
                    navigate('/profile/edit');
                  } else {
                    // For admin editing other users, we'll need to implement this later
                    navigate(`/users/${profile.id}/edit`);
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </button>
              {currentUser?.id === profile.id && (
                <button
                  onClick={() => navigate('/settings')}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start space-x-6">
            <Avatar
              user={{
                id: profile.id,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                username: profile.username || '',
                position: profile.position || '',
                role: profile.role as 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'REGISTRAR' | 'FINANCE' | 'LIBRARIAN',
                isActive: profile.isActive,
                isEmailVerified: profile.isEmailVerified,
                status: profile.isActive ? 'active' : 'inactive',
                createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
                updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : profile.updatedAt,
                avatarUrl: profile.avatarUrl
              }}
              size="xl"
              showUpload={canEditProfile()}
              onAvatarUpdate={handleAvatarUpdate}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {profile.fullName}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(profile.role)}`}>
                  {profile.role}
                </span>
                <div className="flex items-center">
                  {profile.isActive ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`ml-1 text-sm ${profile.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {profile.email}
                </div>
                {profile.username && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    @{profile.username}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {formatDate(profile.createdAt)}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Last login {formatDateTime(profile.lastLogin)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <p className="text-gray-900 dark:text-white dark:text-white">{profile.fullName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                  <p className="text-gray-900 dark:text-white dark:text-white">{profile.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                  <p className="text-gray-900 dark:text-white dark:text-white">{profile.lastName}</p>
                </div>
              </div>
              
              {profile.middleInitial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Middle Initial</label>
                  <p className="text-gray-900 dark:text-white dark:text-white">{profile.middleInitial}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <p className="text-gray-900 dark:text-white dark:text-white">{profile.email}</p>
                {isOwnProfile && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {profile.isEmailVerified ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                        Email verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                        Email not verified
                      </span>
                    )}

                    {!profile.isEmailVerified && (
                      <button
                        type="button"
                        onClick={handleSendVerificationEmail}
                        disabled={isSendingVerification || verificationCooldownSeconds > 0}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verificationCooldownSeconds > 0
                          ? `Resend in ${verificationCooldownSeconds}s`
                          : isSendingVerification
                            ? 'Sending...'
                            : 'Send verification email'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {profile.username && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <p className="text-gray-900 dark:text-white dark:text-white">@{profile.username}</p>
                </div>
              )}
            </div>
          </div>

          {/* Role & Position */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Role &amp; Position
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(profile.role)}`}>
                  {profile.role}
                </span>
              </div>
              
              {profile.position && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                  <p className="text-gray-900 dark:text-white flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    {profile.position}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Status</label>
                <div className="flex items-center">
                  {profile.isActive ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 mr-2" />
                  )}
                  <span className={profile.isActive ? 'text-green-600' : 'text-red-600'}>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Information */}
          {profile.student && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2" />
                Student Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student ID</label>
                  <p className="text-gray-900 dark:text-white font-mono">{profile.student.studentId}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enrollment Date</label>
                  <p className="text-gray-900 dark:text-white dark:text-white">{formatDate(profile.student.enrollmentDate)}</p>
                </div>
                
                {profile.student.graduationDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Graduation Date</label>
                    <p className="text-gray-900 dark:text-white dark:text-white">{formatDate(profile.student.graduationDate)}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Status</label>
                  <div className="mt-1">
                    {getRegistrationStatusBadge(profile.student.registrationStatus || profile.student.status)}
                  </div>
                </div>
                
                {/* Dweezil's Code - Show enrollment status if student has enrollments */}
                {profile.student.enrollments && profile.student.enrollments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enrollment Status</label>
                    <div className="mt-1">
                      {getEnrollmentStatusBadge(profile.student.enrollments[0].status)}
                    </div>
                  </div>
                )}
                
                {/* Dweezil's Code - Show enrolled course */}
                {profile.student.enrollments && profile.student.enrollments.length > 0 && profile.student.enrollments[0].course && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enrolled Course</label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profile.student.enrollments[0].course.courseCode} - {profile.student.enrollments[0].course.name}
                    </p>
                    {profile.student.enrollments[0].courseSection && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Section: {profile.student.enrollments[0].courseSection.sectionName} • Year {profile.student.enrollments[0].courseSection.yearLevel}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Dweezil's Code - Show selected subjects */}
                {profile.student.enrollments && profile.student.enrollments.length > 0 && profile.student.enrollments[0].selectedSubjects && profile.student.enrollments[0].selectedSubjects.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Subjects</label>
                    {isLoadingSelectedSubjects ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400">Loading selected subjects...</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="max-h-56 overflow-auto pr-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedSubjectSummaries.length > 0
                              ? selectedSubjectSummaries.map(subject => (
                                  <div
                                    key={subject.id}
                                    className="flex items-start gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-sm text-gray-900 dark:text-white truncate">
                                        {subject.code ? `${subject.code} — ` : ''}
                                        {subject.name}
                                      </div>
                                      {typeof subject.units === 'number' && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                          {subject.units} unit{subject.units === 1 ? '' : 's'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              : profile.student.enrollments[0].selectedSubjects.map((subjectId: string) => (
                                  <div
                                    key={subjectId}
                                    className="flex items-start gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-gray-900 dark:text-white truncate">
                                      {subjectId}
                                    </div>
                                  </div>
                                ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Total: {profile.student.enrollments[0].selectedSubjects.length} subjects
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employee Information */}
          {profile.employee && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Briefcase className="w-5 h-5 mr-2" />
                Employee Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID</label>
                  <p className="text-gray-900 dark:text-white font-mono">{profile.employee.employeeId}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hire Date</label>
                  <p className="text-gray-900 dark:text-white dark:text-white">{formatDate(profile.employee.hireDate)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <p className="text-gray-900 dark:text-white dark:text-white">{profile.employee.status}</p>
                </div>
                
                {profile.employee.salary && canEditProfile() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary</label>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      ${profile.employee.salary.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Account Activity
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Created</label>
                <p className="text-gray-900 dark:text-white dark:text-white">{formatDateTime(profile.createdAt)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Updated</label>
                <p className="text-gray-900 dark:text-white dark:text-white">{formatDateTime(profile.updatedAt)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Login</label>
                <p className="text-gray-900 dark:text-white dark:text-white">{formatDateTime(profile.lastLogin)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
