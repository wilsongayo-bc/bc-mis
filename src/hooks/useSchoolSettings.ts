import { useState, useEffect, useCallback } from 'react';
import { fetchPublicSettings, getSettingValue, Setting } from '../services/settingsService';

export interface SchoolSettings {
  settings: Setting[];
  schoolName: string;
  schoolMotto: string;
  schoolLogo: string;
  schoolEmail: string;
  schoolAddress: string;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch and manage school settings
 * Fetches public settings that don't require authentication
 */
export const useSchoolSettings = (): SchoolSettings => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const publicSettings = await fetchPublicSettings();
        setSettings(publicSettings);
      } catch (err) {
        console.error('Failed to load school settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return {
    settings,
    schoolName: getSettingValue(settings, 'school_name', 'Benedict College'),
    schoolMotto: getSettingValue(settings, 'school_motto', 'Excellence in Education'),
    schoolLogo: getSettingValue(settings, 'school_logo', ''),
    schoolEmail: getSettingValue(settings, 'school_email', ''),
    schoolAddress: getSettingValue(settings, 'school_address', ''),
    loading,
    error,
  };
};

/**
 * Hook for authenticated settings management (for admin users)
 */
export const useAdminSettings = (token: string | null) => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  


  const refreshSettings = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { fetchAdminSettings } = await import('../services/settingsService');
      const allSettings = await fetchAdminSettings(token);
      setSettings(allSettings);
    } catch (err) {
      console.error('❌ refreshSettings error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateSettingValue = async (key: string, value: string) => {
    if (!token) throw new Error('Authentication required');
    
    try {
      const { updateSetting } = await import('../services/settingsService');
      const updatedSetting = await updateSetting(token, key, value);
      
      // Update local state
      setSettings(prev => {
        if (!prev || !Array.isArray(prev)) {
          return [updatedSetting];
        }
        return prev.map(setting => 
          setting.key === key ? updatedSetting : setting
        );
      });
      
      return updatedSetting;
    } catch (err) {
      console.error('Failed to update setting:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (token) {
      refreshSettings();
    }
  }, [token, refreshSettings]);

  return {
    settings: settings || [],
    loading,
    error,
    refreshSettings,
    updateSettingValue,
    schoolName: getSettingValue(settings, 'school_name', 'Benedict College'),
    schoolMotto: getSettingValue(settings, 'school_motto', 'Excellence in Education'),
  };
};