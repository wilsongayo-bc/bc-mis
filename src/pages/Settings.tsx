import React, { useState, useEffect, useContext } from 'react';
import { Moon, Sun, Type, RotateCcw, Palette, Shield, Building2, Upload, Clock, Key, Smartphone, Save, Calendar } from 'lucide-react';
import { useSettingsContext } from '../utils/settingsUtils';
import { Theme, FontSize } from '../hooks/useSettings';
import { useSchoolSettings, useAdminSettings } from '../hooks/useSchoolSettings';
import { useAppSelector } from '../hooks/redux';
import { selectAuth } from '../store/slices/authSlice';
import AuthDebugInfo from '../components/AuthDebugInfo';
import { CustomModal } from '../components/CustomModal';
import { uploadLogo, getSettingValue } from '../services/settingsService';
import { useAcademicYear } from '../hooks/useAcademicYear';
import { BrandingContext } from '../contexts/BrandingContextDefinition';

const Settings: React.FC = () => {
  const { theme, setTheme, fontSize, setFontSize, resetSettings: resetSettingsHook } = useSettingsContext();
  const { user, token } = useAppSelector(selectAuth);
  const branding = useContext(BrandingContext);
  const { schoolName: publicSchoolName, schoolMotto: publicSchoolMotto } = useSchoolSettings();
  const { settings: adminSettings, loading: adminLoading, error: adminError, updateSettingValue } = useAdminSettings(token);
  const {
    academicYear,
    loading: academicYearLoading
  } = useAcademicYear();

  // Local state for form inputs
  const [localSchoolName, setLocalSchoolName] = useState('');
  const [localSchoolMotto, setLocalSchoolMotto] = useState('');
  const [localSchoolAddress, setLocalSchoolAddress] = useState('');
  const [localSchoolPhone, setLocalSchoolPhone] = useState('');
  const [localSchoolEmail, setLocalSchoolEmail] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState('');



  // Authentication configuration state
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [authConfigSaving, setAuthConfigSaving] = useState(false);

  // Track if form has been initialized to prevent overriding user input
  const [formInitialized, setFormInitialized] = useState(false);

  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Initialize form values from adminSettings only once when data first loads
  useEffect(() => {
    if (adminSettings && adminSettings.length > 0 && !formInitialized) {
      const schoolName = getSettingValue(adminSettings, 'school_name') || '';
      const schoolMotto = getSettingValue(adminSettings, 'school_motto') || '';
      const schoolAddress = getSettingValue(adminSettings, 'school_address') || '';
      const schoolPhone = getSettingValue(adminSettings, 'school_phone') || '';
      const schoolEmail = getSettingValue(adminSettings, 'school_email') || '';
      const logoUrl = getSettingValue(adminSettings, 'school_logo') || '';

      // Load authentication configuration
      const savedSessionTimeout = getSettingValue(adminSettings, 'session_timeout');
      const savedMinPasswordLength = getSettingValue(adminSettings, 'min_password_length');
      const savedRequireSpecialChars = getSettingValue(adminSettings, 'require_special_chars');
      const savedTwoFactorEnabled = getSettingValue(adminSettings, 'two_factor_enabled');

      setLocalSchoolName(schoolName);
      setLocalSchoolMotto(schoolMotto);
      setLocalSchoolAddress(schoolAddress);
      setLocalSchoolPhone(schoolPhone);
      setLocalSchoolEmail(schoolEmail);
      setCurrentLogoUrl(logoUrl);

      // Set auth config with defaults if not found
      setSessionTimeout(savedSessionTimeout ? Number(savedSessionTimeout) : 30);
      setMinPasswordLength(savedMinPasswordLength ? Number(savedMinPasswordLength) : 8);
      setRequireSpecialChars(savedRequireSpecialChars ? savedRequireSpecialChars === 'true' : true);
      setTwoFactorEnabled(savedTwoFactorEnabled ? savedTwoFactorEnabled === 'true' : false);

      setFormInitialized(true);
    }
  }, [adminSettings, formInitialized]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        setModalState({
          isOpen: true,
          title: 'Invalid File Type',
          message: 'Invalid file type. Please use JPEG, PNG, or SVG files.',
          type: 'error'
        });
        event.target.value = '';
        return;
      }

      // Validate file size (2MB)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        setModalState({
          isOpen: true,
          title: 'File Too Large',
          message: 'File too large. Please use a file smaller than 2MB.',
          type: 'error'
        });
        event.target.value = '';
        return;
      }

      setLogoFile(file);
      console.log('File selected:', file.name, file.type, file.size);
    }
  };

  const handleLogoUploadSubmit = async () => {
    if (!logoFile || !token) {
      console.error('Missing logoFile or token:', { hasFile: !!logoFile, hasToken: !!token });
      return;
    }

    setLogoUploading(true);
    try {
      console.log('Starting logo upload:', logoFile.name, logoFile.type, logoFile.size);
      const response = await uploadLogo(token, logoFile);
      console.log('Upload response:', response);
      console.log('New logo URL:', response.logoUrl);

      // Update the logo URL to show the new logo immediately
      setCurrentLogoUrl(response.logoUrl);
      console.log('Logo URL state updated to:', response.logoUrl);

      // Refresh branding context so the new logo appears everywhere (including login page)
      if (branding?.refresh) {
        await branding.refresh();
        console.log('Branding context refreshed');
      }

      setLogoFile(null);

      // Reset file input
      const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // No success modal - just show the new logo
    } catch (error) {
      console.error('Error uploading logo:', error);
      console.error('Logo upload failed:', error instanceof Error ? error.message : 'Unknown error');

      // Show user-friendly error message
      let errorMessage = 'Failed to upload logo. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('file type')) {
          errorMessage = 'Invalid file type. Please use JPEG, PNG, or SVG files.';
        } else if (error.message.includes('file size')) {
          errorMessage = 'File too large. Please use a file smaller than 2MB.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication required. Please log in again.';
        } else {
          errorMessage = error.message;
        }
      }

      setModalState({
        isOpen: true,
        title: 'Upload Failed',
        message: errorMessage,
        type: 'error'
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSchoolInfoSave = async () => {
    if (!token) {
      setModalState({
        isOpen: true,
        title: 'Authentication Required',
        message: 'Authentication required. Please log in again.',
        type: 'error'
      });
      return;
    }

    // Check if user has admin privileges
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      setModalState({
        isOpen: true,
        title: 'Access Denied',
        message: 'Admin privileges required to update school information.',
        type: 'error'
      });
      return;
    }

    try {
      await Promise.all([
        updateSettingValue('school_name', localSchoolName),
        updateSettingValue('school_motto', localSchoolMotto),
        updateSettingValue('school_address', localSchoolAddress),
        updateSettingValue('school_phone', localSchoolPhone),
        updateSettingValue('school_email', localSchoolEmail)
      ]);
      setModalState({
        isOpen: true,
        title: 'Success',
        message: 'School information saved successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to save school information:', error);
      setModalState({
        isOpen: true,
        title: 'Save Failed',
        message: 'Failed to save school information. Please try again.',
        type: 'error'
      });
    }
  };

  const handleAuthConfigSave = async () => {
    if (!token) {
      setModalState({
        isOpen: true,
        title: 'Authentication Required',
        message: 'Authentication required. Please log in again.',
        type: 'error'
      });
      return;
    }

    // Check if user has admin privileges
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      setModalState({
        isOpen: true,
        title: 'Access Denied',
        message: 'Admin privileges required to update authentication settings.',
        type: 'error'
      });
      return;
    }

    try {
      setAuthConfigSaving(true);
      await Promise.all([
        updateSettingValue('session_timeout', sessionTimeout.toString()),
        updateSettingValue('min_password_length', minPasswordLength.toString()),
        updateSettingValue('require_special_chars', requireSpecialChars.toString()),
        updateSettingValue('two_factor_enabled', twoFactorEnabled.toString())
      ]);
      setModalState({
        isOpen: true,
        title: 'Success',
        message: 'Authentication configuration saved successfully!',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to save authentication configuration:', error);
      setModalState({
        isOpen: true,
        title: 'Save Failed',
        message: 'Failed to save authentication configuration. Please try again.',
        type: 'error'
      });
    } finally {
      setAuthConfigSaving(false);
    }
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> }
  ];

  const fontSizeOptions: FontSize[] = ['small', 'medium', 'large', 'extra-large'];
  const fontSizeLabels: Record<FontSize, string> = {
    'small': 'Small',
    'medium': 'Medium',
    'large': 'Large',
    'extra-large': 'Extra Large'
  };

  const increaseFontSize = () => {
    const currentIndex = fontSizeOptions.indexOf(fontSize);
    if (currentIndex < fontSizeOptions.length - 1) {
      setFontSize(fontSizeOptions[currentIndex + 1]);
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = fontSizeOptions.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(fontSizeOptions[currentIndex - 1]);
    }
  };

  const resetSettings = async () => {
    // Reset theme and font size using the hook's reset function
    resetSettingsHook();

    // Reset authentication configuration to defaults and persist to backend
    const defaultAuthSettings = {
      session_timeout: 30,
      min_password_length: 8,
      require_special_chars: true,
      two_factor_enabled: false
    };

    setSessionTimeout(defaultAuthSettings.session_timeout);
    setMinPasswordLength(defaultAuthSettings.min_password_length);
    setRequireSpecialChars(defaultAuthSettings.require_special_chars);
    setTwoFactorEnabled(defaultAuthSettings.two_factor_enabled);

    // Reset School Information to default values
    const defaultSchoolInfo = {
      school_name: 'Octanity',
      school_motto: "Designing a website isn't just about looks, it's about creating an experience.",
      school_phone: '+63-909-186-6515',
      school_email: 'octanityorg@gmail.com',
      school_address: 'Cebu City, Philippines',
      school_logo: '/Octanity Icon.png'
    };

    setLocalSchoolName(defaultSchoolInfo.school_name);
    setLocalSchoolMotto(defaultSchoolInfo.school_motto);
    setLocalSchoolPhone(defaultSchoolInfo.school_phone);
    setLocalSchoolEmail(defaultSchoolInfo.school_email);
    setLocalSchoolAddress(defaultSchoolInfo.school_address);
    setCurrentLogoUrl(defaultSchoolInfo.school_logo);

    // Persist to backend if user has admin privileges
    if (token && user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN')) {
      try {
        await Promise.all([
          updateSettingValue('session_timeout', defaultAuthSettings.session_timeout.toString()),
          updateSettingValue('min_password_length', defaultAuthSettings.min_password_length.toString()),
          updateSettingValue('require_special_chars', defaultAuthSettings.require_special_chars.toString()),
          updateSettingValue('two_factor_enabled', defaultAuthSettings.two_factor_enabled.toString()),
          updateSettingValue('school_name', defaultSchoolInfo.school_name),
          updateSettingValue('school_motto', defaultSchoolInfo.school_motto),
          updateSettingValue('school_phone', defaultSchoolInfo.school_phone),
          updateSettingValue('school_email', defaultSchoolInfo.school_email),
          updateSettingValue('school_address', defaultSchoolInfo.school_address),
          updateSettingValue('school_logo', defaultSchoolInfo.school_logo)
        ]);

        // Refresh branding context so the reset logo appears everywhere
        if (branding?.refresh) {
          await branding.refresh();
        }

        console.log('✅ Settings reset to defaults and persisted to backend');
        setModalState({
          isOpen: true,
          title: 'Settings Reset',
          message: 'All settings including school information have been reset to their default values.',
          type: 'success'
        });
      } catch (error) {
        console.error('Failed to persist reset settings:', error);
        setModalState({
          isOpen: true,
          title: 'Reset Warning',
          message: 'Settings were reset locally but failed to save to the server. Changes may not persist.',
          type: 'error'
        });
      }
    } else {
      console.log('Settings reset to defaults (local only - no admin privileges)');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Palette className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Customize your application preferences, school information, and authentication settings
        </p>
      </div>

      {/* Authentication Debug Info - Only for SUPERADMIN */}
      {user?.role === 'SUPERADMIN' && (
        <AuthDebugInfo />
      )}

      {/* Appearance Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center mb-6">
          <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Appearance
          </h2>
        </div>

          <div className="space-y-6">
            {/* Theme Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme
              </label>
              <div className="flex flex-wrap gap-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex items-center px-4 py-3 rounded-lg border-2 transition-all duration-200 ${theme === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    {option.icon}
                    <span className="ml-2">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Font Size
              </label>
              <div className="flex flex-col space-y-4">
                {/* Font Size Buttons */}
                <div className="flex flex-wrap gap-2">
                  {fontSizeOptions.map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${fontSize === size
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {fontSizeLabels[size]}
                    </button>
                  ))}
                </div>

                {/* Font Size Controls */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={decreaseFontSize}
                    disabled={fontSize === 'small'}
                    className="flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Type className="h-4 w-4 mr-1" />
                    <span className="text-sm">A-</span>
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-0 flex-1 text-center">
                    Current: {fontSizeLabels[fontSize]}
                  </span>
                  <button
                    onClick={increaseFontSize}
                    disabled={fontSize === 'extra-large'}
                    className="flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <Type className="h-4 w-4 mr-1" />
                    <span className="text-lg">A+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Configuration Section */}
        {user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Authentication Configuration
                </h2>
              </div>
              <button
                onClick={handleAuthConfigSave}
                disabled={authConfigSaving || !token}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
                {authConfigSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="space-y-6">
              {/* Session Timeout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Users will be automatically logged out after this period of inactivity
                </p>
              </div>

              {/* Password Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Key className="h-4 w-4 inline mr-1" />
                  Password Requirements
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Minimum Password Length
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="32"
                      value={minPasswordLength}
                      onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requireSpecialChars"
                      checked={requireSpecialChars}
                      onChange={(e) => setRequireSpecialChars(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requireSpecialChars" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Require special characters (!@#$%^&*)
                    </label>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Smartphone className="h-4 w-4 inline mr-1" />
                      Two-Factor Authentication (System-wide)
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      When enabled, all users will be required to enter a verification code sent to their registered email address during login
                    </p>
                  </div>
                  <button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>

                {twoFactorEnabled && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      ✓ Two-Factor Authentication is Active
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      All users will receive a 6-digit verification code to their registered email address when logging in
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-800 p-6">
            <div className="flex items-center mb-2">
              <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
                Authentication Configuration
              </h2>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300">
              Admin privileges required to view and modify authentication settings.
            </p>
          </div>
        )}

        {/* Academic Year Configuration Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Academic Year Configuration
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Academic Year
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  {academicYearLoading ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {academicYear || '2024-2025'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The current academic year is managed in the Academic Years section. This is used as the default academic year for all transactions.
              </p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                Academic Year Usage
              </h4>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <li>• Used as default in enrollment forms</li>
                <li>• Applied to course scheduling</li>
                <li>• Used in PDF reports and documents</li>
                <li>• Applied to grade recording</li>
                <li>• Used in academic transcripts</li>
              </ul>
            </div>
          </div>
        </div>

        {/* School Information Section */}
        {user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  School Information
                </h2>
              </div>
              <button
                onClick={handleSchoolInfoSave}
                disabled={adminLoading || !token}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>

            {adminError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">Error: {adminError}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* School Name and Motto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    School Name
                  </label>
                  <input
                    type="text"
                    value={localSchoolName}
                    onChange={(e) => setLocalSchoolName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                    placeholder="Enter school name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    School Motto
                  </label>
                  <input
                    type="text"
                    value={localSchoolMotto}
                    onChange={(e) => setLocalSchoolMotto(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                    placeholder="Enter school motto"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Upload className="h-4 w-4 inline mr-1" />
                  School Logo
                </label>
                <div className="space-y-3">
                  {currentLogoUrl && (
                    <div className="flex items-center gap-4">
                      <img
                        src={currentLogoUrl}
                        alt="Current school logo"
                        className="h-16 w-16 object-contain border border-gray-300 dark:border-gray-600 rounded-lg"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Current logo</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose New Logo
                    </label>
                    {logoFile && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {logoFile.name}
                        </span>
                        <button
                          onClick={handleLogoUploadSubmit}
                          disabled={logoUploading}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm rounded transition-colors"
                        >
                          {logoUploading ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Recommended: PNG or JPG, max 2MB, 200x200px
                </p>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={localSchoolPhone}
                    onChange={(e) => setLocalSchoolPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={localSchoolEmail}
                    onChange={(e) => setLocalSchoolEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                    placeholder="info@school.edu"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  School Address
                </label>
                <textarea
                  value={localSchoolAddress}
                  onChange={(e) => setLocalSchoolAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200"
                  placeholder="Enter complete school address"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-800 p-6">
            <div className="flex items-center mb-2">
              <Building2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
                School Information
              </h2>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300">
              Admin privileges required to view and modify school information.
            </p>
          </div>
        )}

        {/* Preview Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Preview
          </h2>
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sample Heading
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              This is a sample paragraph to demonstrate how the current font size and theme settings affect the text appearance. You can see how different font sizes impact readability. The current font size is set to {fontSizeLabels[fontSize]}.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  console.log('Primary button clicked');
                  setModalState({
                    isOpen: true,
                    title: 'Primary Button',
                    message: `This is a demonstration of the primary button style with current settings applied. Current theme: ${theme}, Font size: ${fontSizeLabels[fontSize]}`
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                Primary Button
              </button>
              <button
                onClick={() => {
                  console.log('Secondary button clicked');
                  setModalState({
                    isOpen: true,
                    title: 'Secondary Button',
                    message: 'This is a demonstration of the secondary button style with current settings applied.'
                  });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
              >
                Secondary Button
              </button>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 Tip: The font size setting affects all text throughout the application. Try changing it to see the difference!
              </p>
            </div>
          </div>
        </div>

        {/* Custom Modal */}
        <CustomModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
        />

        {/* Reset Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                Reset Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Restore all settings to their default values
              </p>
            </div>
            <button
              onClick={resetSettings}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
          </div>
        </div>

        {/* Current Settings Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
            Current Settings Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Appearance Settings */}
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Appearance
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>Theme: <span className="font-medium capitalize">{theme}</span></p>
                <p>Font Size: <span className="font-medium">{fontSizeLabels[fontSize]}</span></p>
              </div>
            </div>

            {/* Authentication Settings */}
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Authentication
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>Session Timeout: <span className="font-medium">{sessionTimeout} min</span></p>
                <p>Min Password Length: <span className="font-medium">{minPasswordLength}</span></p>
                <p>Special Characters: <span className="font-medium">{requireSpecialChars ? 'Required' : 'Optional'}</span></p>
                <p>Two-Factor Auth: <span className="font-medium">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span></p>
              </div>
            </div>

            {/* School Information */}
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                School Information
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>Name: <span className="font-medium">{localSchoolName || publicSchoolName || 'Not set'}</span></p>
                <p>Motto: <span className="font-medium">{localSchoolMotto || publicSchoolMotto || 'Not set'}</span></p>
                <p>Logo: <span className="font-medium">{logoFile ? logoFile.name : 'Not uploaded'}</span></p>
                <p>Phone: <span className="font-medium">{localSchoolPhone || 'Not set'}</span></p>
                <p>Email: <span className="font-medium">{localSchoolEmail || 'Not set'}</span></p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default Settings;