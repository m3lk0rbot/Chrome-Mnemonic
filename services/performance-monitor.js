// Performance Monitor - Tracks operation timing, memory usage, and system metrics
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.operationHistory = [];
    this.maxHistorySize = 1000;
    this.startTime = Date.now();
    this.memoryBaseline = this.getMemoryUsage();
  }

  // Measure operation performance
  static async measure(operationName, fn, options = {}) {
    const monitor = PerformanceMonitor.getInstance();
    return monitor.measureOperation(operationName, fn, options);
  }

  // Get singleton instance
  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Measure operation with detailed tracking
  async measureOperation(operationName, fn, options = {}) {
    const start = performance.now();
    const startMemory = this.getMemoryUsage();
    const startTime = Date.now();
    
    let result;
    let error = null;
    let success = true;

    try {
      // Add to active operations
      this.addActiveOperation(operationName, startTime);
      
      // Execute the operation
      result = await fn();
      
      // Record success
      this.recordOperation(operationName, {
        duration: performance.now() - start,
        memoryDelta: this.getMemoryUsage() - startMemory,
        success: true,
        timestamp: startTime,
        ...options
      });
      
    } catch (err) {
      error = err;
      success = false;
      
      // Record failure
      this.recordOperation(operationName, {
        duration: performance.now() - start,
        memoryDelta: this.getMemoryUsage() - startMemory,
        success: false,
        error: err.message,
        timestamp: startTime,
        ...options
      });
      
      console.warn(`Operation ${operationName} failed:`, err);
    } finally {
      // Remove from active operations
      this.removeActiveOperation(operationName, startTime);
    }

    // Log performance
    const duration = performance.now() - start;
    const memoryDelta = this.getMemoryUsage() - startMemory;
    
    console.log(`📊 ${operationName}: ${duration.toFixed(2)}ms (${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(2)}MB)`);
    
    if (error) {
      throw error;
    }
    
    return result;
  }

  // Record operation metrics
  recordOperation(operationName, metrics) {
    // Add to history
    this.operationHistory.push({
      name: operationName,
      ...metrics,
      timestamp: Date.now()
    });

    // Trim history if too large
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
    }

    // Update aggregated metrics
    this.updateAggregatedMetrics(operationName, metrics);
  }

  // Update aggregated metrics for operation type
  updateAggregatedMetrics(operationName, metrics) {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        successCount: 0,
        failureCount: 0,
        totalMemoryDelta: 0,
        averageMemoryDelta: 0,
        lastExecuted: 0
      });
    }

    const aggregated = this.metrics.get(operationName);
    aggregated.count++;
    aggregated.totalDuration += metrics.duration;
    aggregated.averageDuration = aggregated.totalDuration / aggregated.count;
    aggregated.minDuration = Math.min(aggregated.minDuration, metrics.duration);
    aggregated.maxDuration = Math.max(aggregated.maxDuration, metrics.duration);
    aggregated.totalMemoryDelta += metrics.memoryDelta;
    aggregated.averageMemoryDelta = aggregated.totalMemoryDelta / aggregated.count;
    aggregated.lastExecuted = metrics.timestamp;

    if (metrics.success) {
      aggregated.successCount++;
    } else {
      aggregated.failureCount++;
    }
  }

  // Track active operations
  addActiveOperation(operationName, startTime) {
    if (!this.activeOperations) {
      this.activeOperations = new Map();
    }
    this.activeOperations.set(`${operationName}_${startTime}`, {
      name: operationName,
      startTime: startTime,
      startMemory: this.getMemoryUsage()
    });
  }

  // Remove active operation
  removeActiveOperation(operationName, startTime) {
    if (this.activeOperations) {
      this.activeOperations.delete(`${operationName}_${startTime}`);
    }
  }

  // Get current memory usage
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  // Get performance summary
  getPerformanceSummary() {
    const uptime = Date.now() - this.startTime;
    const currentMemory = this.getMemoryUsage();
    const memoryDelta = currentMemory - this.memoryBaseline;
    const activeOps = this.activeOperations ? this.activeOperations.size : 0;

    return {
      uptime: uptime,
      uptimeFormatted: this.formatDuration(uptime),
      currentMemory: currentMemory.toFixed(2),
      memoryDelta: memoryDelta.toFixed(2),
      activeOperations: activeOps,
      totalOperations: this.operationHistory.length,
      operationTypes: this.metrics.size,
      averageOperationTime: this.getAverageOperationTime(),
      slowestOperation: this.getSlowestOperation(),
      mostFrequentOperation: this.getMostFrequentOperation(),
      successRate: this.getOverallSuccessRate()
    };
  }

  // Get operation statistics
  getOperationStats(operationName) {
    return this.metrics.get(operationName) || null;
  }

  // Get all operation statistics
  getAllOperationStats() {
    const stats = {};
    this.metrics.forEach((value, key) => {
      stats[key] = { ...value };
    });
    return stats;
  }

  // Get recent operations
  getRecentOperations(limit = 20) {
    return this.operationHistory.slice(-limit).reverse();
  }

  // Get slowest operations
  getSlowestOperations(limit = 10) {
    return this.operationHistory
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Get operations by time range
  getOperationsByTimeRange(startTime, endTime) {
    return this.operationHistory.filter(op => 
      op.timestamp >= startTime && op.timestamp <= endTime
    );
  }

  // Helper methods
  getAverageOperationTime() {
    if (this.operationHistory.length === 0) return 0;
    const total = this.operationHistory.reduce((sum, op) => sum + op.duration, 0);
    return (total / this.operationHistory.length).toFixed(2);
  }

  getSlowestOperation() {
    if (this.operationHistory.length === 0) return null;
    return this.operationHistory.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );
  }

  getMostFrequentOperation() {
    if (this.metrics.size === 0) return null;
    let mostFrequent = null;
    let maxCount = 0;
    
    this.metrics.forEach((stats, name) => {
      if (stats.count > maxCount) {
        maxCount = stats.count;
        mostFrequent = { name, ...stats };
      }
    });
    
    return mostFrequent;
  }

  getOverallSuccessRate() {
    if (this.operationHistory.length === 0) return 0;
    const successCount = this.operationHistory.filter(op => op.success).length;
    return ((successCount / this.operationHistory.length) * 100).toFixed(1);
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
    this.operationHistory = [];
    this.memoryBaseline = this.getMemoryUsage();
    this.startTime = Date.now();
  }

  // Export metrics for analysis
  exportMetrics() {
    return {
      summary: this.getPerformanceSummary(),
      operationStats: this.getAllOperationStats(),
      recentOperations: this.getRecentOperations(50),
      slowestOperations: this.getSlowestOperations(20),
      exportTime: Date.now()
    };
  }

  // Performance alerts
  checkPerformanceAlerts() {
    const alerts = [];
    const summary = this.getPerformanceSummary();
    
    // Memory usage alert
    if (summary.memoryDelta > 50) {
      alerts.push({
        type: 'memory',
        message: `High memory usage: +${summary.memoryDelta}MB`,
        severity: 'warning'
      });
    }
    
    // Success rate alert
    if (summary.successRate < 90) {
      alerts.push({
        type: 'success_rate',
        message: `Low success rate: ${summary.successRate}%`,
        severity: 'error'
      });
    }
    
    // Active operations alert
    if (summary.activeOperations > 10) {
      alerts.push({
        type: 'active_operations',
        message: `High concurrent operations: ${summary.activeOperations}`,
        severity: 'warning'
      });
    }
    
    return alerts;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
} else {
  window.PerformanceMonitor = PerformanceMonitor;
}
