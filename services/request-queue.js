// AI Request Queue - Advanced queueing system with priority handling and retry logic
class AIRequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.delay = 1000; // Base rate limiting delay
    this.maxRetries = 3;
    this.retryDelay = 2000; // Delay between retries
    this.priorityLevels = {
      'critical': 1,
      'high': 2,
      'normal': 3,
      'low': 4
    };
    this.activeRequests = new Map();
    this.requestHistory = [];
    this.maxHistorySize = 500;
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  // Add request to queue with priority
  async add(requestFn, options = {}) {
    const {
      priority = 'normal',
      retries = this.maxRetries,
      timeout = 10000,
      apiType = 'unknown',
      description = 'Unknown operation'
    } = options;

    return new Promise((resolve, reject) => {
      const request = {
        id: this.generateRequestId(),
        requestFn,
        resolve,
        reject,
        priority: this.priorityLevels[priority] || this.priorityLevels.normal,
        priorityName: priority,
        retries,
        maxRetries: retries,
        timeout,
        apiType,
        description,
        createdAt: Date.now(),
        attempts: 0,
        status: 'queued'
      };

      // Add to queue and sort by priority
      this.queue.push(request);
      this.queue.sort((a, b) => a.priority - b.priority);

      // Record in history
      this.recordRequest(request, 'queued');

      // Start processing if not already running
      if (!this.processing) {
        this.process();
      }

      console.log(`📋 Queued ${description} (${priority} priority, ${this.queue.length} in queue)`);
    });
  }

  // Process the queue
  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      await this.executeRequest(request);
      
      // Rate limiting delay
      if (this.queue.length > 0) {
        await this.sleep(this.delay);
      }
    }

    this.processing = false;
  }

  // Execute individual request
  async executeRequest(request) {
    const startTime = Date.now();
    request.status = 'processing';
    request.attempts++;
    request.startedAt = startTime;

    // Add to active requests
    this.activeRequests.set(request.id, request);

    // Record attempt
    this.recordRequest(request, 'processing');

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), request.timeout);
      });

      // Execute request with performance monitoring
      const result = await this.performanceMonitor.measureOperation(
        `${request.apiType}_${request.description}`,
        () => Promise.race([request.requestFn(), timeoutPromise]),
        {
          requestId: request.id,
          priority: request.priorityName,
          attempt: request.attempts
        }
      );

      // Success
      request.status = 'completed';
      request.completedAt = Date.now();
      request.duration = request.completedAt - request.startedAt;

      this.recordRequest(request, 'completed');
      this.activeRequests.delete(request.id);

      console.log(`✅ Completed ${request.description} in ${request.duration}ms`);
      request.resolve(result);

    } catch (error) {
      request.status = 'failed';
      request.lastError = error.message;
      request.completedAt = Date.now();
      request.duration = request.completedAt - request.startedAt;

      this.recordRequest(request, 'failed');

      // Check if we should retry
      if (request.attempts < request.maxRetries) {
        console.log(`⚠️ Retrying ${request.description} (attempt ${request.attempts}/${request.maxRetries}): ${error.message}`);
        
        // Add back to queue with retry delay
        setTimeout(() => {
          this.queue.unshift(request); // Add to front for retry
          this.process();
        }, this.retryDelay * request.attempts); // Exponential backoff

      } else {
        // Max retries exceeded
        console.error(`❌ Failed ${request.description} after ${request.attempts} attempts: ${error.message}`);
        this.activeRequests.delete(request.id);
        request.reject(error);
      }
    }
  }

  // Record request in history
  recordRequest(request, status) {
    const record = {
      id: request.id,
      description: request.description,
      apiType: request.apiType,
      priority: request.priorityName,
      status: status,
      timestamp: Date.now(),
      attempt: request.attempts,
      duration: request.duration || 0,
      error: request.lastError || null
    };

    this.requestHistory.push(record);

    // Trim history if too large
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  // Generate unique request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get queue status
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      activeRequests: this.activeRequests.size,
      totalProcessed: this.requestHistory.length,
      successRate: this.getSuccessRate(),
      averageProcessingTime: this.getAverageProcessingTime(),
      queueByPriority: this.getQueueByPriority(),
      recentRequests: this.getRecentRequests(10)
    };
  }

  // Get success rate
  getSuccessRate() {
    if (this.requestHistory.length === 0) return 0;
    const successCount = this.requestHistory.filter(req => req.status === 'completed').length;
    return ((successCount / this.requestHistory.length) * 100).toFixed(1);
  }

  // Get average processing time
  getAverageProcessingTime() {
    const completedRequests = this.requestHistory.filter(req => req.status === 'completed' && req.duration > 0);
    if (completedRequests.length === 0) return 0;
    
    const totalTime = completedRequests.reduce((sum, req) => sum + req.duration, 0);
    return (totalTime / completedRequests.length).toFixed(2);
  }

  // Get queue breakdown by priority
  getQueueByPriority() {
    const breakdown = {};
    this.queue.forEach(request => {
      const priority = request.priorityName;
      breakdown[priority] = (breakdown[priority] || 0) + 1;
    });
    return breakdown;
  }

  // Get recent requests
  getRecentRequests(limit = 20) {
    return this.requestHistory.slice(-limit).reverse();
  }

  // Get requests by status
  getRequestsByStatus(status) {
    return this.requestHistory.filter(req => req.status === status);
  }

  // Get failed requests
  getFailedRequests() {
    return this.requestHistory.filter(req => req.status === 'failed');
  }

  // Clear queue
  clearQueue() {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log('🗑️ Request queue cleared');
  }

  // Clear history
  clearHistory() {
    this.requestHistory = [];
    console.log('🗑️ Request history cleared');
  }

  // Pause processing
  pause() {
    this.processing = false;
    console.log('⏸️ Request processing paused');
  }

  // Resume processing
  resume() {
    if (!this.processing && this.queue.length > 0) {
      this.process();
      console.log('▶️ Request processing resumed');
    }
  }

  // Update delay
  setDelay(newDelay) {
    this.delay = newDelay;
    console.log(`⏱️ Request delay updated to ${newDelay}ms`);
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const status = this.getStatus();
    const alerts = this.checkPerformanceAlerts();
    
    return {
      ...status,
      alerts,
      timestamp: Date.now()
    };
  }

  // Check for performance alerts
  checkPerformanceAlerts() {
    const alerts = [];
    const status = this.getStatus();
    
    // Queue length alert
    if (status.queueLength > 20) {
      alerts.push({
        type: 'queue_length',
        message: `Large queue: ${status.queueLength} requests pending`,
        severity: 'warning'
      });
    }
    
    // Success rate alert
    if (status.successRate < 85) {
      alerts.push({
        type: 'success_rate',
        message: `Low success rate: ${status.successRate}%`,
        severity: 'error'
      });
    }
    
    // Processing time alert
    if (status.averageProcessingTime > 10000) {
      alerts.push({
        type: 'processing_time',
        message: `Slow processing: ${status.averageProcessingTime}ms average`,
        severity: 'warning'
      });
    }
    
    return alerts;
  }

  // Export queue data
  exportData() {
    return {
      status: this.getStatus(),
      history: this.requestHistory,
      activeRequests: Array.from(this.activeRequests.values()),
      exportTime: Date.now()
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIRequestQueue;
} else {
  window.AIRequestQueue = AIRequestQueue;
}
