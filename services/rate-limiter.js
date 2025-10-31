// Rate Limiter - Prevents API abuse and manages concurrent operations
class RateLimiter {
  constructor() {
    this.queues = new Map(); // API type -> queue
    this.activeRequests = new Map(); // API type -> count
    this.lastRequestTime = new Map(); // API type -> timestamp
    this.requestHistory = new Map(); // API type -> array of timestamps
    
    // Rate limiting configuration
    this.config = {
      'LanguageModel': { maxConcurrent: 2, minInterval: 1000, maxPerMinute: 30 },
      'Summarizer': { maxConcurrent: 2, minInterval: 1500, maxPerMinute: 20 },
      'Writer': { maxConcurrent: 2, minInterval: 1000, maxPerMinute: 25 },
      'Rewriter': { maxConcurrent: 1, minInterval: 2000, maxPerMinute: 15 },
      'Proofreader': { maxConcurrent: 1, minInterval: 2000, maxPerMinute: 10 },
      'Translator': { maxConcurrent: 2, minInterval: 1000, maxPerMinute: 20 }
    };
  }

  // Check if request is allowed
  canMakeRequest(apiType) {
    const config = this.config[apiType];
    if (!config) return true; // No limits for unknown APIs

    const now = Date.now();
    const activeCount = this.activeRequests.get(apiType) || 0;
    const lastRequest = this.lastRequestTime.get(apiType) || 0;
    const requestHistory = this.requestHistory.get(apiType) || [];

    // Check concurrent limit
    if (activeCount >= config.maxConcurrent) {
      return false;
    }

    // Check minimum interval
    if (now - lastRequest < config.minInterval) {
      return false;
    }

    // Check rate limit (requests per minute)
    const oneMinuteAgo = now - 60000;
    const recentRequests = requestHistory.filter(time => time > oneMinuteAgo);
    if (recentRequests.length >= config.maxPerMinute) {
      return false;
    }

    return true;
  }

  // Get wait time until next request is allowed
  getWaitTime(apiType) {
    const config = this.config[apiType];
    if (!config) return 0;

    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(apiType) || 0;
    const requestHistory = this.requestHistory.get(apiType) || [];

    // Check minimum interval
    const intervalWait = Math.max(0, config.minInterval - (now - lastRequest));

    // Check rate limit
    const oneMinuteAgo = now - 60000;
    const recentRequests = requestHistory.filter(time => time > oneMinuteAgo);
    const rateLimitWait = recentRequests.length >= config.maxPerMinute ? 
      (recentRequests[0] + 60000) - now : 0;

    return Math.max(intervalWait, rateLimitWait);
  }

  // Queue a request
  async queueRequest(apiType, requestFunction) {
    return new Promise((resolve, reject) => {
      const queue = this.getQueue(apiType);
      
      queue.push({
        requestFunction,
        resolve,
        reject,
        timestamp: Date.now()
      });

      this.processQueue(apiType);
    });
  }

  // Get or create queue for API type
  getQueue(apiType) {
    if (!this.queues.has(apiType)) {
      this.queues.set(apiType, []);
    }
    return this.queues.get(apiType);
  }

  // Process queue for specific API type
  async processQueue(apiType) {
    const queue = this.getQueue(apiType);
    const config = this.config[apiType];
    
    if (!config || queue.length === 0) return;

    const activeCount = this.activeRequests.get(apiType) || 0;
    const availableSlots = config.maxConcurrent - activeCount;

    // Process available slots
    for (let i = 0; i < Math.min(availableSlots, queue.length); i++) {
      const request = queue.shift();
      this.executeRequest(apiType, request);
    }
  }

  // Execute a request
  async executeRequest(apiType, request) {
    const now = Date.now();
    
    // Update tracking
    this.activeRequests.set(apiType, (this.activeRequests.get(apiType) || 0) + 1);
    this.lastRequestTime.set(apiType, now);
    
    // Add to request history
    const history = this.requestHistory.get(apiType) || [];
    history.push(now);
    this.requestHistory.set(apiType, history);

    try {
      // Wait for minimum interval if needed
      const waitTime = this.getWaitTime(apiType);
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }

      // Execute the request
      const result = await request.requestFunction();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      // Update active count
      this.activeRequests.set(apiType, Math.max(0, (this.activeRequests.get(apiType) || 0) - 1));
      
      // Process next in queue
      setTimeout(() => this.processQueue(apiType), 100);
    }
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get rate limiter status
  getStatus(apiType) {
    const config = this.config[apiType];
    if (!config) return null;

    const activeCount = this.activeRequests.get(apiType) || 0;
    const queueLength = this.getQueue(apiType).length;
    const waitTime = this.getWaitTime(apiType);

    return {
      apiType,
      activeRequests: activeCount,
      maxConcurrent: config.maxConcurrent,
      queueLength,
      waitTime,
      canMakeRequest: this.canMakeRequest(apiType)
    };
  }

  // Get all statuses
  getAllStatuses() {
    const statuses = {};
    Object.keys(this.config).forEach(apiType => {
      statuses[apiType] = this.getStatus(apiType);
    });
    return statuses;
  }

  // Clear old request history
  cleanupHistory() {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // Keep 1 hour of history

    this.requestHistory.forEach((history, apiType) => {
      const filteredHistory = history.filter(time => time > oneHourAgo);
      this.requestHistory.set(apiType, filteredHistory);
    });
  }

  // Reset rate limiter
  reset() {
    this.queues.clear();
    this.activeRequests.clear();
    this.lastRequestTime.clear();
    this.requestHistory.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RateLimiter;
} else {
  window.RateLimiter = RateLimiter;
}
