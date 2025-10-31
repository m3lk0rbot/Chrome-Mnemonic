// Enhanced Error Handler - centralized error classification and handling

class EnhancedError extends Error {
  constructor(message, type = 'UNKNOWN', metadata = {}) {
    super(message);
    this.name = 'EnhancedError';
    this.type = type; // e.g., RATE_LIMIT, NETWORK_ERROR, TIMEOUT, VALIDATION, AI_UNAVAILABLE
    this.metadata = metadata;
    this.isEnhanced = true;
  }
}

class EnhancedErrorHandler {
  static Types = Object.freeze({
    RATE_LIMIT: 'RATE_LIMIT',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    VALIDATION: 'VALIDATION',
    AI_UNAVAILABLE: 'AI_UNAVAILABLE',
    UNKNOWN: 'UNKNOWN'
  });

  static classify(error) {
    if (!error) {
      return new EnhancedError('Unknown error', this.Types.UNKNOWN);
    }
    if (error.isEnhanced) return error;

    const message = (error && error.message) ? error.message : String(error);

    if (/rate limit|too many requests|429/i.test(message)) {
      return new EnhancedError(message, this.Types.RATE_LIMIT);
    }
    if (/network|fetch failed|failed to fetch|net::ERR/i.test(message)) {
      return new EnhancedError(message, this.Types.NETWORK_ERROR);
    }
    if (/timeout|timed out|took too long/i.test(message)) {
      return new EnhancedError(message, this.Types.TIMEOUT);
    }
    if (/invalid|missing|required|malformed/i.test(message)) {
      return new EnhancedError(message, this.Types.VALIDATION);
    }
    if (/ai.*(unavailable|disabled|not available)/i.test(message)) {
      return new EnhancedError(message, this.Types.AI_UNAVAILABLE);
    }

    return new EnhancedError(message, this.Types.UNKNOWN);
  }

  static shouldRetry(enhancedError) {
    const type = enhancedError.type || this.Types.UNKNOWN;
    return type === this.Types.NETWORK_ERROR || type === this.Types.TIMEOUT || type === this.Types.RATE_LIMIT;
  }

  static backoffDelayMs(enhancedError, attempt = 1, baseMs = 500) {
    const jitter = Math.floor(Math.random() * 150);
    if (enhancedError.type === this.Types.RATE_LIMIT) {
      return Math.min(10000, baseMs * Math.pow(2, attempt)) + jitter;
    }
    if (enhancedError.type === this.Types.NETWORK_ERROR || enhancedError.type === this.Types.TIMEOUT) {
      return Math.min(5000, baseMs * Math.pow(2, attempt)) + jitter;
    }
    return 0;
  }

  static log(enhancedError, context = {}) {
    try {
      console.error('[EnhancedError]', {
        type: enhancedError.type,
        message: enhancedError.message,
        metadata: enhancedError.metadata,
        context
      });
    } catch {}
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnhancedError, EnhancedErrorHandler };
} else {
  window.EnhancedError = EnhancedError;
  window.EnhancedErrorHandler = EnhancedErrorHandler;
}


