import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'word_sprint_theme';
export const LIGHT_THEME_COLOR = '#f8f7ff';
export const DARK_THEME_COLOR = '#0f0d1b';

/**
 * Safely retrieve the stored theme preference from localStorage.
 * Returns null if missing, corrupted, or access throws.
 */
export function getStoredTheme(): Theme | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const val = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'dark') {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Safely save the theme preference to localStorage.
 */
export function saveStoredTheme(theme: Theme): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme to localStorage', e);
  }
}

/**
 * Check system prefers-color-scheme media query.
 */
export function getSystemTheme(): Theme {
  try {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // safe fallback
  }
  return 'light';
}

/**
 * Resolve the initial theme: stored preference if valid, else system preference.
 */
export function getInitialTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  return getSystemTheme();
}

/**
 * Apply theme to document element and update color-scheme & theme-color meta tags.
 */
export function applyThemeToDOM(theme: Theme): void {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;

  try {
    // <meta name="color-scheme">
    let metaScheme = document.querySelector('meta[name="color-scheme"]');
    if (!metaScheme) {
      metaScheme = document.createElement('meta');
      metaScheme.setAttribute('name', 'color-scheme');
      document.head.appendChild(metaScheme);
    }
    metaScheme.setAttribute('content', theme);

    // <meta name="theme-color">
    let metaColor = document.querySelector('meta[name="theme-color"]');
    if (!metaColor) {
      metaColor = document.createElement('meta');
      metaColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaColor);
    }
    metaColor.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  } catch (e) {
    console.error('Failed to update theme meta tags', e);
  }
}

export interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  const applyAndSaveTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    saveStoredTheme(newTheme);
    applyThemeToDOM(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    applyAndSaveTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, applyAndSaveTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      applyAndSaveTheme(newTheme);
    },
    [applyAndSaveTheme]
  );

  // Sync DOM with current theme
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Listen to system preference changes if no manual preference is stored
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      if (!getStoredTheme()) {
        const nextTheme: Theme = e.matches ? 'dark' : 'light';
        setThemeState(nextTheme);
        applyThemeToDOM(nextTheme);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if ((mediaQuery as unknown as { addListener?: (fn: (e: MediaQueryListEvent) => void) => void }).addListener) {
      (mediaQuery as unknown as { addListener: (fn: (e: MediaQueryListEvent) => void) => void }).addListener(handleChange);
      return () => {
        (mediaQuery as unknown as { removeListener: (fn: (e: MediaQueryListEvent) => void) => void }).removeListener(handleChange);
      };
    }
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme
  };
}

