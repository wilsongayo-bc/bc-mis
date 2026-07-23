import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { BrandingContext } from './BrandingContextDefinition';
import { fetchPublicSettings, getSettingValue, Setting } from '../services/settingsService';
import { resolveAssetUrl } from '../lib/api';

interface BrandingProviderProps {
  children: ReactNode;
  initialSettings?: Setting[];
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children, initialSettings }) => {
  const [settings, setSettings] = useState<Setting[]>(initialSettings || []);
  const [loading, setLoading] = useState<boolean>(!initialSettings);
  const [error, setError] = useState<string | null>(null);

  const derive = useCallback((s: Setting[]) => {
    const rawLogoUrl = getSettingValue(s, 'school_logo', '') || '';
    return {
      logoUrl: rawLogoUrl ? resolveAssetUrl(rawLogoUrl) : null,
      schoolName: getSettingValue(s, 'school_name', 'Benedict College'),
      schoolMotto: getSettingValue(s, 'school_motto', 'Excellence in Education'),
    };
  }, []);

  const derived = useMemo(() => derive(settings), [settings, derive]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const s = await fetchPublicSettings();
      setSettings(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialSettings) {
      refresh();
    }
  }, [initialSettings, refresh]);

  return (
    <BrandingContext.Provider value={{ ...derived, loading, error, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
};
