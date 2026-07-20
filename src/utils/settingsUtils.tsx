import React, { useContext } from 'react';
import { UseSettingsReturn } from '../hooks/useSettings';
import { SettingsProvider } from '../contexts/SettingsContext';
import { SettingsContext } from '../contexts/SettingsContextDefinition';

/**
 * Hook to access settings context
 * Must be used within a SettingsProvider
 */
export const useSettingsContext = (): UseSettingsReturn => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};

/**
 * HOC to wrap components with settings context
 */
export const withSettings = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <SettingsProvider>
        <Component {...props} />
      </SettingsProvider>
    );
  };

  WrappedComponent.displayName = `withSettings(${Component.displayName || Component.name})`;
  return WrappedComponent;
};