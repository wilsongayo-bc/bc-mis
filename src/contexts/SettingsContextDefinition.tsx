import { createContext } from 'react';
import { UseSettingsReturn } from '../hooks/useSettings';

// Create the settings context
export const SettingsContext = createContext<UseSettingsReturn | undefined>(undefined);