// Tests for PerformanceMonitor class
const PerformanceMonitor = require('../../services/performance-monitor.js');

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    // Reset performance.now mock
    performance.now.mockClear();
    performance.now.mockReturnValue(1000);
  });

  describe('measureOperation', () => {
    it('should measure operation timing', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      performance.now
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(1500); // end

      const result = await monitor.measureOperation('test', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should handle operation errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      performance.now
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(1500); // end

      await expect(monitor.measureOperation('test', mockFn)).rejects.toThrow('Test error');
    });

    it('should record operation metrics', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      performance.now
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(1500); // end

      await monitor.measureOperation('test', mockFn);

      const stats = monitor.getOperationStats('test');
      expect(stats.count).toBe(1);
      expect(stats.averageDuration).toBe(500);
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return performance summary', () => {
      const summary = monitor.getPerformanceSummary();

      expect(summary).toHaveProperty('uptime');
      expect(summary).toHaveProperty('currentMemory');
      expect(summary).toHaveProperty('memoryDelta');
      expect(summary).toHaveProperty('activeOperations');
      expect(summary).toHaveProperty('totalOperations');
      expect(summary).toHaveProperty('operationTypes');
      expect(summary).toHaveProperty('averageOperationTime');
      expect(summary).toHaveProperty('successRate');
    });
  });

  describe('getOperationStats', () => {
    it('should return operation statistics', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      performance.now
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(1500); // end

      await monitor.measureOperation('test', mockFn);

      const stats = monitor.getOperationStats('test');
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('totalDuration');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('minDuration');
      expect(stats).toHaveProperty('maxDuration');
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('failureCount');
    });

    it('should return null for non-existent operation', () => {
      const stats = monitor.getOperationStats('nonexistent');
      expect(stats).toBeNull();
    });
  });

  describe('getRecentOperations', () => {
    it('should return recent operations', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      performance.now
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(1500); // end

      await monitor.measureOperation('test', mockFn);

      const recent = monitor.getRecentOperations(10);
      expect(recent).toHaveLength(1);
      expect(recent[0]).toHaveProperty('name', 'test');
      expect(recent[0]).toHaveProperty('duration');
      expect(recent[0]).toHaveProperty('success');
    });
  });

  describe('getSlowestOperations', () => {
    it('should return slowest operations', async () => {
      const mockFn1 = jest.fn().mockResolvedValue('result1');
      const mockFn2 = jest.fn().mockResolvedValue('result2');
      
      performance.now
        .mockReturnValueOnce(1000) // start 1
        .mockReturnValueOnce(2000) // end 1
        .mockReturnValueOnce(2000) // start 2
        .mockReturnValueOnce(2500); // end 2

      await monitor.measureOperation('slow', mockFn1);
      await monitor.measureOperation('fast', mockFn2);

      const slowest = monitor.getSlowestOperations(10);
      expect(slowest).toHaveLength(2);
      expect(slowest[0].name).toBe('slow'); // Should be first (slowest)
      expect(slowest[1].name).toBe('fast');
    });
  });

  describe('checkPerformanceAlerts', () => {
    it('should check for performance alerts', () => {
      const alerts = monitor.checkPerformanceAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      performance.now
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(1500); // end

      await monitor.measureOperation('test', mockFn);
      expect(monitor.getOperationStats('test')).not.toBeNull();

      monitor.clearMetrics();
      expect(monitor.getOperationStats('test')).toBeNull();
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics data', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      performance.now
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(1500); // end

      await monitor.measureOperation('test', mockFn);

      const exportData = monitor.exportMetrics();
      expect(exportData).toHaveProperty('summary');
      expect(exportData).toHaveProperty('operationStats');
      expect(exportData).toHaveProperty('recentOperations');
      expect(exportData).toHaveProperty('slowestOperations');
      expect(exportData).toHaveProperty('exportTime');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(monitor.formatDuration(0)).toBe('0s');
      expect(monitor.formatDuration(5000)).toBe('5s');
      expect(monitor.formatDuration(65000)).toBe('1m 5s');
      expect(monitor.formatDuration(3665000)).toBe('1h 1m 5s');
    });
  });
});
