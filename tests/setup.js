/**
 * Test setup file for Vitest
 * Configures global mocks and test environment
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock browser APIs that are not available in jsdom
global.AudioContext = vi.fn(() => ({
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn()
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  destination: {},
  state: 'running',
  resume: vi.fn().mockResolvedValue(),
  close: vi.fn().mockResolvedValue()
}));

global.navigator.mediaDevices = {
  getUserMedia: vi.fn(() =>
    Promise.resolve({
      getTracks: () => [
        {
          stop: vi.fn(),
          kind: 'audio',
          enabled: true
        }
      ],
      getAudioTracks: () => [
        {
          stop: vi.fn(),
          kind: 'audio',
          enabled: true
        }
      ]
    })
  )
};

global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive',
  mimeType: 'audio/webm'
}));

global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 0,
  ended: false,
  volume: 1,
  muted: false
}));

global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload && this.onload();
    }, 10);
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Use real fetch for integration tests (Node.js 18+ has native fetch)
// Only mock fetch if it doesn't exist
if (typeof global.fetch === 'undefined') {
  global.fetch = vi.fn();
}

// Mock performance API
global.performance.now = vi.fn(() => Date.now());

// Mock MutationObserver
global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.sessionStorage = sessionStorageMock;

// Setup console mocks to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = vi.fn((...args) => {
  // Only show actual errors, not expected test errors
  if (
    !args[0]?.toString().includes('Warning:') &&
    !args[0]?.toString().includes('Error: Not implemented:')
  ) {
    originalConsoleError(...args);
  }
});

console.warn = vi.fn((...args) => {
  // Only show actual warnings, not expected test warnings
  if (!args[0]?.toString().includes('Warning:')) {
    originalConsoleWarn(...args);
  }
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();

  // Reset fetch mock only if it's a mock
  if (global.fetch && global.fetch.mockReset) {
    global.fetch.mockReset();
  }

  // Reset localStorage
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();

  // Reset sessionStorage
  sessionStorageMock.getItem.mockReset();
  sessionStorageMock.setItem.mockReset();
  sessionStorageMock.removeItem.mockReset();
  sessionStorageMock.clear.mockReset();
});
