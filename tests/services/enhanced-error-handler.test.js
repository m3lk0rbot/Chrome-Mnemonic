const { EnhancedError, EnhancedErrorHandler } = require('../../services/enhanced-error-handler.js');

describe('EnhancedErrorHandler', () => {
  test('classifies rate limit errors', () => {
    const err = new Error('429 Too Many Requests: rate limit');
    const classified = EnhancedErrorHandler.classify(err);
    expect(classified.type).toBe('RATE_LIMIT');
  });

  test('classifies network errors', () => {
    const err = new Error('NetworkError: Failed to fetch');
    const classified = EnhancedErrorHandler.classify(err);
    expect(classified.type).toBe('NETWORK_ERROR');
  });

  test('classifies timeout errors', () => {
    const err = new Error('Operation timed out');
    const classified = EnhancedErrorHandler.classify(err);
    expect(classified.type).toBe('TIMEOUT');
  });

  test('classifies validation errors', () => {
    const err = new Error('Invalid input');
    const classified = EnhancedErrorHandler.classify(err);
    expect(classified.type).toBe('VALIDATION');
  });

  test('classifies AI unavailable errors', () => {
    const err = new Error('AI unavailable on this device');
    const classified = EnhancedErrorHandler.classify(err);
    expect(classified.type).toBe('AI_UNAVAILABLE');
  });

  test('shouldRetry logic', () => {
    expect(EnhancedErrorHandler.shouldRetry(new EnhancedError('x', 'RATE_LIMIT'))).toBe(true);
    expect(EnhancedErrorHandler.shouldRetry(new EnhancedError('x', 'NETWORK_ERROR'))).toBe(true);
    expect(EnhancedErrorHandler.shouldRetry(new EnhancedError('x', 'TIMEOUT'))).toBe(true);
    expect(EnhancedErrorHandler.shouldRetry(new EnhancedError('x', 'VALIDATION'))).toBe(false);
  });

  test('backoffDelayMs provides increasing delays with jitter', () => {
    const e = new EnhancedError('x', 'RATE_LIMIT');
    const d1 = EnhancedErrorHandler.backoffDelayMs(e, 1);
    const d2 = EnhancedErrorHandler.backoffDelayMs(e, 2);
    expect(d2).toBeGreaterThanOrEqual(d1);
  });
});


