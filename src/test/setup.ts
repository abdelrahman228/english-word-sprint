import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Isolate localStorage before each test so real user data is NEVER touched
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  writable: true
});

beforeEach(() => {
  window.localStorage.clear();
});
