import api, { resolveAssetUrl } from '../lib/api';

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  category: string;
  editable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsResponse {
  settings: Setting[];
}

// Cache for public settings to prevent multiple simultaneous requests
let publicSettingsCache: Setting[] | null = null;
let publicSettingsPromise: Promise<Setting[]> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch public settings (no authentication required)
 * Implements caching and request deduplication to prevent ERR_ABORTED errors
 */
export const fetchPublicSettings = async (): Promise<Setting[]> => {
  const now = Date.now();
  if (publicSettingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return publicSettingsCache;
  }
  if (publicSettingsPromise) {
    return publicSettingsPromise;
  }
  const DEFAULTS: Setting[] = [
    { id: 0, key: 'school_name', value: 'Benedict College', description: '', category: 'general', editable: false, createdAt: '', updatedAt: '' },
    { id: 0, key: 'school_motto', value: 'Excellence in Education', description: '', category: 'general', editable: false, createdAt: '', updatedAt: '' },
    { id: 0, key: 'school_logo', value: '', description: '', category: 'appearance', editable: false, createdAt: '', updatedAt: '' },
  ];
  const tryFetch = async () => {
    const maxAttempts = 3;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const response = await api.get('/settings/public', { timeout: 8000 });
        const data: SettingsResponse = response.data;
        publicSettingsCache = data.settings;
        cacheTimestamp = Date.now();
        return data.settings;
      } catch (_err) {
        attempt += 1;
        if (attempt >= maxAttempts) {
          publicSettingsCache = DEFAULTS;
          cacheTimestamp = Date.now();
          return DEFAULTS;
        }
        await new Promise(r => setTimeout(r, 500 * attempt || 500));
      }
    }
    return DEFAULTS;
  };
  publicSettingsPromise = (async () => {
    try {
      const result = await tryFetch();
      return result;
    } finally {
      publicSettingsPromise = null;
    }
  })();
  return publicSettingsPromise;
};

/**
 * Clear the public settings cache (useful for testing or forced refresh)
 */
export const clearPublicSettingsCache = (): void => {
  publicSettingsCache = null;
  publicSettingsPromise = null;
  cacheTimestamp = 0;
  console.log('🗑️ Public settings cache cleared');
};

/**
 * Get a specific setting value by key
 */
export const getSettingValue = (settings: Setting[] | undefined, key: string, defaultValue: string = ''): string => {
  if (!settings || !Array.isArray(settings)) {
    return defaultValue;
  }
  const setting = settings.find(s => s.key === key);
  return setting ? setting.value : defaultValue;
};

/**
 * Fetch all settings (requires authentication)
 * Note: Authorization header is automatically added by axios interceptor
 */
export const fetchAllSettings = async (token: string): Promise<Setting[]> => {
  try {
    // Verify token exists before making request
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Authorization header is automatically added by axios interceptor from localStorage
    const response = await api.get('/settings');
    
    const data: SettingsResponse = response.data;
    return data.settings;
  } catch (error) {
    console.error('Error fetching all settings:', error);
    throw error;
  }
};

/**
 * Fetch admin settings (requires admin authentication)
 * Note: Authorization header is automatically added by axios interceptor
 */
export const fetchAdminSettings = async (token: string): Promise<Setting[]> => {
  try {
    // Verify token exists before making request
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Authorization header is automatically added by axios interceptor from localStorage
    const response = await api.get('/settings/admin');
    
    const data = response.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    throw error;
  }
};

/**
 * Update a setting value (requires authentication)
 * Note: Authorization header is automatically added by axios interceptor
 */
export const updateSetting = async (token: string, key: string, value: string): Promise<Setting> => {
  try {
    // Verify token exists before making request
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Authorization header is automatically added by axios interceptor from localStorage
    const response = await api.put(`/settings/${key}`, { value });
    
    const data = response.data;
    return data.data;
  } catch (error) {
    console.error('Error updating setting:', error);
    throw error;
  }
};

/**
 * Create a new setting (requires admin authentication)
 * Note: Authorization header is automatically added by axios interceptor
 */
export const createSetting = async (
  token: string, 
  key: string, 
  value: string, 
  description?: string, 
  category: string = 'general'
): Promise<Setting> => {
  try {
    // Verify token exists before making request
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Authorization header is automatically added by axios interceptor from localStorage
    const response = await api.post('/settings', { key, value, description, category });
    
    const data = response.data;
    return data.data;
  } catch (error) {
    console.error('Error creating setting:', error);
    throw error;
  }
};

/**
 * Upload school logo (requires admin authentication)
 * Note: Authorization header is automatically added by axios interceptor
 */
export const uploadLogo = async (token: string, file: File): Promise<{ logoUrl: string }> => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please use JPEG, PNG, or SVG files.');
  }

  // Validate file size (2MB limit)
  const maxSize = 2 * 1024 * 1024; // 2MB in bytes
  if (file.size > maxSize) {
    throw new Error('File too large. Please use a file smaller than 2MB.');
  }

  // Verify token exists before making request
  if (!token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const formData = new FormData();
  formData.append('logo', file);

  console.log('FormData created:', {
    hasFile: formData.has('logo'),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  });

  try {
    // Authorization header is automatically added by axios interceptor from localStorage
    // Don't set Content-Type - let axios detect FormData and set it automatically with boundary
    const response = await api.post('/settings/logo', formData);
    
    // Extract logoUrl from response.data.data
    const logoUrl = response.data.data?.logoUrl || response.data.logoUrl;
    if (!logoUrl || typeof logoUrl !== 'string') {
      throw new Error('Invalid logo URL returned by server.');
    }
    const resolvedLogoUrl = resolveAssetUrl(logoUrl);
    
    // Add cache-busting parameter to force browser to reload the image
    const cacheBustedUrl = resolvedLogoUrl.includes('?') 
      ? `${resolvedLogoUrl}&t=${Date.now()}` 
      : `${resolvedLogoUrl}?t=${Date.now()}`;
    
    return { logoUrl: cacheBustedUrl };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection and try again.');
    }
    console.error('Error uploading logo:', error);
    throw error;
  }
};

/**
 * Remove school logo (requires admin authentication)
 * Note: Authorization header is automatically added by axios interceptor
 */
export const removeLogo = async (token: string): Promise<void> => {
  try {
    // Verify token exists before making request
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Authorization header is automatically added by axios interceptor from localStorage
    await api.delete('/settings/logo');
  } catch (error) {
    console.error('Error removing logo:', error);
    throw error;
  }
};

/**
 * Fetch password requirements (public endpoint)
 */
export const fetchPasswordRequirements = async (): Promise<{
  minLength: number;
  requireSpecialChars: boolean;
  message: string;
}> => {
  try {
    const response = await api.get('/settings/password-requirements');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching password requirements:', error);
    // Return defaults if fetch fails
    return {
      minLength: 8,
      requireSpecialChars: true,
      message: 'Password must be at least 8 characters and contain at least one special character (!@#$%^&*)'
    };
  }
};

/**
 * Fetch current academic year setting (public endpoint)
 */
export const fetchAcademicYear = async (): Promise<{ key: string; value: string; description: string }> => {
  try {
    const response = await api.get('/settings/academic-year');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      // Return default if not found
      return {
        key: 'academic_year',
        value: '2024-2025',
        description: 'Current academic year'
      };
    }
  } catch (error) {
    console.error('Error fetching academic year:', error);
    // Return default on error
    return {
      key: 'academic_year',
      value: '2024-2025',
      description: 'Current academic year'
    };
  }
};

/**
 * Update academic year setting (requires admin authentication)
 * Note: Authorization header is automatically added by axios interceptor
 */
export const updateAcademicYear = async (token: string, academicYear: string): Promise<{ key: string; value: string; description: string }> => {
  try {
    // Verify token exists before making request
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // Authorization header is automatically added by axios interceptor from localStorage
    const response = await api.put('/settings/academic-year', { value: academicYear });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to update academic year');
    }
  } catch (error: unknown) {
    console.error('Error updating academic year:', error);
    const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (error as Error)?.message || 'Failed to update academic year';
    throw new Error(errorMessage);
  }
};
