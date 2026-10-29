import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  useTheme,
  getStoredTheme,
  saveStoredTheme,
  getSystemTheme,
  getInitialTheme,
  applyThemeToDOM,
  THEME_STORAGE_KEY,
  LIGHT_THEME_COLOR,
  DARK_THEME_COLOR
} from '../hooks/useTheme';

describe('Theme hook, ThemeToggle component & Storage (Phase 2)', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;

    // Clean existing meta tags
    document.querySelectorAll('meta[name="color-scheme"], meta[name="theme-color"]').forEach(el => el.remove());

    // Default mock: system prefers light mode
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Default follows system
  describe('Default follows system preference', () => {
    it('defaults to light when system prefers light mode and no storage exists', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      expect(getStoredTheme()).toBeNull();
      expect(getSystemTheme()).toBe('light');
      expect(getInitialTheme()).toBe('light');

      applyThemeToDOM('light');
      expect(document.documentElement.dataset.theme).toBe('light');

      const metaScheme = document.querySelector('meta[name="color-scheme"]');
      expect(metaScheme?.getAttribute('content')).toBe('light');

      const metaColor = document.querySelector('meta[name="theme-color"]');
      expect(metaColor?.getAttribute('content')).toBe(LIGHT_THEME_COLOR);
    });

    it('defaults to dark when system prefers dark mode and no storage exists', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      expect(getStoredTheme()).toBeNull();
      expect(getSystemTheme()).toBe('dark');
      expect(getInitialTheme()).toBe('dark');

      applyThemeToDOM('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');

      const metaScheme = document.querySelector('meta[name="color-scheme"]');
      expect(metaScheme?.getAttribute('content')).toBe('dark');

      const metaColor = document.querySelector('meta[name="theme-color"]');
      expect(metaColor?.getAttribute('content')).toBe(DARK_THEME_COLOR);
    });
  });

  // 2. Toggling saves and applies data-theme
  describe('Toggling saves and applies data-theme', () => {
    it('toggles theme, saves to word_sprint_theme key, and updates DOM attributes', () => {
      const TestComponent = () => {
        const { theme, isDark, toggleTheme } = useTheme();
        return (
          <div>
            <span data-testid="current-theme">{theme}</span>
            <span data-testid="is-dark">{isDark ? 'yes' : 'no'}</span>
            <button onClick={toggleTheme}>Toggle</button>
          </div>
        );
      };

      render(<TestComponent />);

      // Starts light
      expect(screen.getByTestId('current-theme').textContent).toBe('light');
      expect(screen.getByTestId('is-dark').textContent).toBe('no');
      expect(document.documentElement.dataset.theme).toBe('light');

      // Click toggle -> switches to dark
      fireEvent.click(screen.getByText('Toggle'));

      expect(screen.getByTestId('current-theme').textContent).toBe('dark');
      expect(screen.getByTestId('is-dark').textContent).toBe('yes');
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

      const metaScheme = document.querySelector('meta[name="color-scheme"]');
      expect(metaScheme?.getAttribute('content')).toBe('dark');

      const metaColor = document.querySelector('meta[name="theme-color"]');
      expect(metaColor?.getAttribute('content')).toBe(DARK_THEME_COLOR);

      // Click toggle again -> switches back to light
      fireEvent.click(screen.getByText('Toggle'));

      expect(screen.getByTestId('current-theme').textContent).toBe('light');
      expect(screen.getByTestId('is-dark').textContent).toBe('no');
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
      expect(metaScheme?.getAttribute('content')).toBe('light');
      expect(metaColor?.getAttribute('content')).toBe(LIGHT_THEME_COLOR);
    });

    it('does not touch or overwrite existing word_sprint_settings in localStorage', () => {
      const initialSettings = JSON.stringify({ duration: 90, difficulty: 'advanced' });
      window.localStorage.setItem('word_sprint_settings', initialSettings);

      saveStoredTheme('dark');

      expect(window.localStorage.getItem('word_sprint_settings')).toBe(initialSettings);
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
  });

  // 3. Corrupted storage does not crash
  describe('Corrupted storage handling', () => {
    it('safely falls back when localStorage contains invalid theme string', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'corrupted_neon_theme');

      expect(getStoredTheme()).toBeNull();
      expect(getInitialTheme()).toBe('light'); // system preference is light
    });

    it('safely falls back when localStorage contains malformed JSON or empty string', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, '{"bad":');
      expect(getStoredTheme()).toBeNull();

      window.localStorage.setItem(THEME_STORAGE_KEY, '');
      expect(getStoredTheme()).toBeNull();
    });

    it('does not crash when localStorage.getItem throws an exception', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied by browser security');
      });

      expect(() => getStoredTheme()).not.toThrow();
      expect(getStoredTheme()).toBeNull();
      expect(() => getInitialTheme()).not.toThrow();
      expect(getInitialTheme()).toBe('light');
    });

    it('does not crash when localStorage.setItem throws an exception', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveStoredTheme('dark')).not.toThrow();
    });
  });

  // 4. ThemeToggle component
  describe('ThemeToggle component rendering and accessibility', () => {
    it('renders with accessible label, aria-pressed attribute, and 44px touch target', () => {
      render(<ThemeToggle />);

      const button = screen.getByTestId('theme-toggle');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('theme-toggle-btn');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
      expect(button).toHaveAttribute('title', 'Switch to dark mode');
      expect(button).toHaveAttribute('aria-pressed', 'false');

      // Click to toggle to dark mode
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
      expect(button).toHaveAttribute('title', 'Switch to light mode');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });
});

