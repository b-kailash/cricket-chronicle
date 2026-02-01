import '@testing-library/jest-dom';

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

// Mock navigator.onLine
Object.defineProperty(window.navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock Service Worker
global.navigator.serviceWorker = {
  register: jest.fn().mockResolvedValue({}),
  ready: Promise.resolve({} as ServiceWorkerRegistration),
} as any;
