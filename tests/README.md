# Chrome Mnemonic Test Suite

This directory contains comprehensive unit tests for the Chrome Mnemonic extension.

## Test Structure

```
tests/
├── setup.js                    # Jest setup and mocks
├── README.md                   # This file
├── utils/
│   └── url-utils.test.js       # URLUtils class tests
├── services/
│   ├── ai-service.test.js      # AIService class tests
│   ├── cache-manager.test.js   # CacheManager class tests
│   ├── history-service.test.js # HistoryService class tests
│   └── performance-monitor.test.js # PerformanceMonitor class tests
└── features/
    ├── clustering.test.js      # ClusteringFeature class tests
    └── conversation.test.js    # ConversationFeature class tests
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- url-utils.test.js
```

## Test Coverage

The test suite covers:

### Core Utilities
- **URLUtils**: URL parsing, validation, categorization, normalization
- **PerformanceMonitor**: Operation timing, memory tracking, alerts
- **CacheManager**: Data caching, compression, TTL management

### Services
- **AIService**: AI API interactions, session management, fallbacks
- **HistoryService**: History loading, chunking, grouping, statistics
- **SearchService**: Search detection, universal monitoring

### Features
- **ClusteringFeature**: AI-powered clustering, basic fallbacks
- **ConversationFeature**: Chat interface, message handling, history
- **QualityAnalysisFeature**: Content quality scoring, insights

## Mocking

The test suite uses comprehensive mocks for:

- **Chrome APIs**: `chrome.runtime`, `chrome.storage`, `chrome.tabs`, `chrome.history`
- **DOM APIs**: `document`, `window`, `URL`, `Blob`
- **Performance APIs**: `performance.now`, `performance.memory`
- **Timing APIs**: `setTimeout`, `setInterval`, `Date.now`

## Test Patterns

### Async Testing
```javascript
it('should handle async operations', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

### Mock Verification
```javascript
it('should call Chrome API', async () => {
  await service.loadData();
  expect(chrome.storage.local.get).toHaveBeenCalled();
});
```

### Error Handling
```javascript
it('should handle errors gracefully', async () => {
  chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
  const result = await service.loadData();
  expect(result).toBeNull();
});
```

## Coverage Goals

- **Statements**: > 90%
- **Branches**: > 85%
- **Functions**: > 90%
- **Lines**: > 90%

## Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch pushes
- Scheduled nightly runs

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Mode
```bash
npm test -- --detectOpenHandles
```

### Single Test File
```bash
npm test -- --testNamePattern="URLUtils"
```

## Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.js`
3. Import the module under test
4. Mock dependencies in `beforeEach`
5. Write descriptive test cases
6. Update this README if needed

## Best Practices

- **Isolation**: Each test should be independent
- **Mocking**: Mock external dependencies
- **Assertions**: Use specific matchers
- **Naming**: Use descriptive test names
- **Coverage**: Aim for high coverage
- **Performance**: Keep tests fast
