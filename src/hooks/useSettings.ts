import { useState, useEffect, useCallback } from 'react';

// Theme types
export type Theme = 'light' | 'dark';

// Font size types
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

// Font size mapping to Tailwind classes
export const fontSizeMap: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
  'extra-large': 'text-xl',
};

// Font size mapping for specific elements
export const fontSizeMapDetailed: Record<FontSize, {
  text: string;
  heading: string;
  subheading: string;
  caption: string;
}> = {
  small: {
    text: 'text-sm',
    heading: 'text-xl',
    subheading: 'text-lg',
    caption: 'text-xs',
  },
  medium: {
    text: 'text-base',
    heading: 'text-2xl',
    subheading: 'text-xl',
    caption: 'text-sm',
  },
  large: {
    text: 'text-lg',
    heading: 'text-3xl',
    subheading: 'text-2xl',
    caption: 'text-base',
  },
  'extra-large': {
    text: 'text-xl',
    heading: 'text-4xl',
    subheading: 'text-3xl',
    caption: 'text-lg',
  },
};

interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
  toggleTheme: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetSettings: () => void;
}

export interface UseSettingsReturn extends SettingsState, SettingsActions {
  isLoading: boolean;
}

const STORAGE_KEYS = {
  theme: 'school-mis-theme',
  fontSize: 'school-mis-font-size',
} as const;

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'light',
  fontSize: 'small',
};

const FONT_SIZE_ORDER: FontSize[] = ['small', 'medium', 'large', 'extra-large'];

/**
 * Custom hook for managing application settings including theme and font size
 * Provides localStorage persistence and automatic DOM updates
 */
export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Apply theme to DOM
  const applyThemeToDOM = useCallback((theme: Theme) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Apply font size to DOM
  const applyFontSizeToDOM = useCallback((fontSize: FontSize) => {
    const root = document.documentElement;
    // Remove existing font size classes
    FONT_SIZE_ORDER.forEach(size => {
      root.classList.remove(`font-size-${size}`);
    });
    // Add new font size class
    root.classList.add(`font-size-${fontSize}`);
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) as Theme;
      const savedFontSize = localStorage.getItem(STORAGE_KEYS.fontSize) as FontSize;

      const loadedSettings: SettingsState = {
        theme: savedTheme && ['light', 'dark'].includes(savedTheme) ? savedTheme : DEFAULT_SETTINGS.theme,
        fontSize: savedFontSize && FONT_SIZE_ORDER.includes(savedFontSize) ? savedFontSize : DEFAULT_SETTINGS.fontSize,
      };

      setSettings(loadedSettings);
      applyThemeToDOM(loadedSettings.theme);
      applyFontSizeToDOM(loadedSettings.fontSize);
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
      applyThemeToDOM(DEFAULT_SETTINGS.theme);
      applyFontSizeToDOM(DEFAULT_SETTINGS.fontSize);
    } finally {
      setIsLoading(false);
    }
  }, [applyThemeToDOM, applyFontSizeToDOM]);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: SettingsState) => {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, newSettings.theme);
      localStorage.setItem(STORAGE_KEYS.fontSize, newSettings.fontSize);
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  }, []);

  // Set theme
  const setTheme = useCallback((theme: Theme) => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    applyThemeToDOM(theme);
    saveSettings(newSettings);
  }, [settings, applyThemeToDOM, saveSettings]);

  // Set font size
  const setFontSize = useCallback((fontSize: FontSize) => {
    const newSettings = { ...settings, fontSize };
    setSettings(newSettings);
    applyFontSizeToDOM(fontSize);
    saveSettings(newSettings);
  }, [settings, applyFontSizeToDOM, saveSettings]);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(settings.theme === 'light' ? 'dark' : 'light');
  }, [settings.theme, setTheme]);

  // Increase font size
  const increaseFontSize = useCallback(() => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(settings.fontSize);
    if (currentIndex < FONT_SIZE_ORDER.length - 1) {
      setFontSize(FONT_SIZE_ORDER[currentIndex + 1]);
    }
  }, [settings.fontSize, setFontSize]);

  // Decrease font size
  const decreaseFontSize = useCallback(() => {
    const currentIndex = FONT_SIZE_ORDER.indexOf(settings.fontSize);
    if (currentIndex > 0) {
      setFontSize(FONT_SIZE_ORDER[currentIndex - 1]);
    }
  }, [settings.fontSize, setFontSize]);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    applyThemeToDOM(DEFAULT_SETTINGS.theme);
    applyFontSizeToDOM(DEFAULT_SETTINGS.fontSize);
    saveSettings(DEFAULT_SETTINGS);
  }, [applyThemeToDOM, applyFontSizeToDOM, saveSettings]);

  return {
    ...settings,
    isLoading,
    setTheme,
    setFontSize,
    toggleTheme,
    increaseFontSize,
    decreaseFontSize,
    resetSettings,
  };
};