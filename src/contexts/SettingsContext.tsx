import React, { ReactNode } from 'react';
import { useSettings } from '../hooks/useSettings';
import { SettingsContext } from './SettingsContextDefinition';

interface SettingsProviderProps {
  children: ReactNode;
}

/**
 * Settings provider component that wraps the app and provides settings context
 * Manages theme, font size, and other application-wide settings
 */
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const settings = useSettings();

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
};