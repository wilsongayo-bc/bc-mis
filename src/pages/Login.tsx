import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { loginUser, clearError, selectAuth as _selectAuth, selectIsAuthenticated, selectAuthLoading, selectAuthError, setCredentials, clear2FAState } from '../store/slices/authSlice';
import { useSchoolSettings } from '../hooks/useSchoolSettings';
import { useSettingsContext } from '../utils/settingsUtils';
import Logo from '../components/Logo';
import { TwoFactorModal } from '../components/TwoFactorModal';
import { sendVerificationCode, verify2FA } from '../services/twoFactorService';

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(_selectAuth);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const { schoolName, loading: settingsLoading } = useSchoolSettings();
  const { theme } = useSettingsContext();
  
  const [formData, setFormData] = useState({
    loginType: 'AUTO' as 'AUTO' | 'EMAIL_OR_USERNAME' | 'STUDENT_ID' | 'EMPLOYEE_ID',
    login: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const sendingCodeRef = useRef(false); // Prevent double sends in React Strict Mode

  // Clear error when component mounts only if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(clearError());
    }
  }, [dispatch, isAuthenticated]);

  // Handle 2FA requirement
  useEffect(() => {
    const handle2FARequired = async () => {
      // Prevent double execution using ref - check and set atomically
      if (auth.requiresTwoFactor && auth.twoFactorUserId && !sendingCodeRef.current) {
        // Set ref immediately to prevent race conditions
        sendingCodeRef.current = true;
        setTwoFactorModalOpen(true);
        
        try {
          await sendVerificationCode(auth.twoFactorUserId);
          console.log('✅ Verification code sent successfully');
        } catch (error) {
          console.error('❌ Failed to send verification code:', error);
          // Reset ref on error so user can retry
          sendingCodeRef.current = false;
          setTwoFactorModalOpen(false);
          dispatch(clearError());
        }
      }
    };
    handle2FARequired();
  }, [auth.requiresTwoFactor, auth.twoFactorUserId, dispatch]);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.login.trim()) {
      errors.login =
        formData.loginType === 'STUDENT_ID'
          ? 'Student ID is required'
          : formData.loginType === 'EMPLOYEE_ID'
            ? 'Employee ID is required'
            : 'Username or email is required';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Only clear global error if user starts typing after a validation error
    // Don't clear login errors (like "Account is deactivated") until form submission
    if (error && validationErrors[name]) {
      dispatch(clearError());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Clear any previous errors and reset 2FA state for new login attempt
    dispatch(clearError());
    sendingCodeRef.current = false; // Reset ref for new login attempt
    
    try {
      await dispatch(loginUser(formData)).unwrap();
    } catch (loginError) {
      // Error is handled by Redux slice
      console.error('Login failed:', loginError);
    }
  };

  const handle2FAVerify = async (code: string) => {
    if (!auth.twoFactorUserId) {
      throw new Error('No user ID for 2FA verification');
    }

    const response = await verify2FA(auth.twoFactorUserId, code);
    
    if (response.success && response.data) {
      dispatch(setCredentials({
        user: response.data.user,
        token: response.data.token
      }));
      localStorage.setItem('token', response.data.token);
    }
  };

  const handle2FAComplete = () => {
    setTwoFactorModalOpen(false);
    dispatch(clear2FAState());
  };

  const handle2FAClose = () => {
    setTwoFactorModalOpen(false);
    sendingCodeRef.current = false; // Reset ref to allow retry
    dispatch(clear2FAState());
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <div className="max-w-md w-full space-y-8">
        <div className={`rounded-2xl shadow-xl p-8 transition-colors duration-200 ${
          theme === 'dark' 
            ? 'bg-gray-800 border border-gray-700' 
            : 'bg-white'
        }`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex justify-center">
              <Logo 
                  size="xl" 
                  className="h-28 w-28" 
                  fallbackText={schoolName || 'School'}
                />
            </div>
            <h2 className={`text-3xl font-bold transition-colors duration-200 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>Welcome Back</h2>
            <p className={`mt-2 transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Sign in to your {settingsLoading ? 'School MIS' : schoolName} account
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className={`mb-6 p-4 border rounded-lg flex items-center space-x-3 transition-colors duration-200 ${
              theme === 'dark' 
                ? 'bg-red-900/20 border-red-800 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <AlertCircle className={`h-5 w-5 flex-shrink-0 ${
                theme === 'dark' ? 'text-red-400' : 'text-red-500'
              }`} />
              <p className="text-sm whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Login Field */}
            <div>
              <label htmlFor="loginType" className={`block text-sm font-medium mb-2 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Login Using
              </label>
              <select
                id="loginType"
                name="loginType"
                value={formData.loginType}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 text-white'
                    : 'border-gray-300 bg-white'
                }`}
                disabled={isLoading}
              >
                <option value="AUTO">Username / Email</option>
                <option value="STUDENT_ID">Student ID</option>
                <option value="EMPLOYEE_ID">Employee ID</option>
              </select>

              <label htmlFor="login" className={`block text-sm font-medium mt-4 mb-2 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {formData.loginType === 'STUDENT_ID'
                  ? 'Student ID'
                  : formData.loginType === 'EMPLOYEE_ID'
                    ? 'Employee ID'
                    : 'Username or Email'}
              </label>
              <input
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                value={formData.login}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  validationErrors.login 
                    ? (theme === 'dark' ? 'border-red-500 bg-red-900/20' : 'border-red-300 bg-red-50')
                    : (theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white')
                }`}
                placeholder={
                  formData.loginType === 'STUDENT_ID'
                    ? 'Enter your student ID'
                    : formData.loginType === 'EMPLOYEE_ID'
                      ? 'Enter your employee ID'
                      : 'Enter your username or email'
                }
                disabled={isLoading}
              />
              {validationErrors.login && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.login}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-2 transition-colors duration-200 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    validationErrors.password 
                      ? (theme === 'dark' ? 'border-red-500 bg-red-900/20' : 'border-red-300 bg-red-50')
                      : (theme === 'dark' ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white')
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
                    theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300 hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-offset-gray-800'
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-offset-2'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          {/* <div className={`mt-8 p-4 rounded-lg transition-colors duration-200 ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <h3 className={`text-sm font-medium mb-2 transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Demo Credentials:</h3>
            <div className={`text-xs space-y-1 transition-colors duration-200 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <p><strong>SUPERADMIN:</strong> superadmin@school.edu / SuperAdmin123!</p>
              <p><strong>Admin:</strong> admin@school.edu / Admin123!</p>
              <p><strong>Teacher:</strong> teacher@school.edu / Teacher123!</p>
              <p><strong>Student:</strong> student@school.edu / Student123!</p>
            </div>
          </div> */}
        </div>

        {/* Footer */}
        <div className={`text-center text-sm transition-colors duration-200 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <p>&copy; 2025 Benedict College. All rights reserved.</p>
        </div>
      </div>

      {/* Two-Factor Authentication Modal */}
      <TwoFactorModal
        isOpen={twoFactorModalOpen}
        onClose={handle2FAClose}
        mode="verify"
        onVerify={handle2FAVerify}
        onComplete={handle2FAComplete}
      />
    </div>
  );
};

export default Login;
