// Jest setup file for Chrome Mnemonic tests
// Mock Chrome APIs and global objects

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    },
    onActivated: {
      addListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn()
  },
  history: {
    search: jest.fn()
  }
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024 // 50MB
  }
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock DOM methods
global.document = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn()
};

global.window = {
  addEventListener: jest.fn(),
  postMessage: jest.fn(),
  location: {
    href: 'https://example.com',
    hostname: 'example.com'
  }
};

// Mock URL constructor
global.URL = class URL {
  constructor(url) {
    this.href = url;
    this.hostname = new URL(url).hostname;
    this.pathname = new URL(url).pathname;
    this.searchParams = new URL(url).searchParams;
  }
};

// Mock setTimeout and setInterval
global.setTimeout = jest.fn((callback, delay) => {
  callback();
  return 1;
});

global.setInterval = jest.fn((callback, delay) => {
  callback();
  return 1;
});

// Mock clearTimeout and clearInterval
global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Mock Blob and URL.createObjectURL
global.Blob = class Blob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
  }
};

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock Math.random for consistent testing
Math.random = jest.fn(() => 0.5);

// Mock Date.now for consistent timestamps
Date.now = jest.fn(() => 1640995200000); // 2022-01-01 00:00:00 UTC
