// Tests for CacheManager class
const CacheManager = require('../../services/cache-manager.js');

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
    // Clear Chrome storage mock
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
    chrome.storage.local.remove.mockClear();
  });

  describe('getCachedData', () => {
    it('should return cached data when valid', async () => {
      const mockData = { data: 'test', timestamp: Date.now() - 1000 };
      chrome.storage.local.get.mockResolvedValue({ 'chrome_mnemonic_cache_test': mockData });

      const result = await cacheManager.getCachedData('test', 5, null);
      expect(result).toBe('test');
    });

    it('should call fetchFn when cache is expired', async () => {
      const expiredData = { data: 'old', timestamp: Date.now() - 10 * 60 * 1000 };
      chrome.storage.local.get.mockResolvedValue({ 'chrome_mnemonic_cache_test': expiredData });
      
      const fetchFn = jest.fn().mockResolvedValue('fresh data');
      const result = await cacheManager.getCachedData('test', 5, fetchFn);
      
      expect(fetchFn).toHaveBeenCalled();
      expect(result).toBe('fresh data');
    });

    it('should call fetchFn when no cache exists', async () => {
      chrome.storage.local.get.mockResolvedValue({});
      
      const fetchFn = jest.fn().mockResolvedValue('new data');
      const result = await cacheManager.getCachedData('test', 5, fetchFn);
      
      expect(fetchFn).toHaveBeenCalled();
      expect(result).toBe('new data');
    });
  });

  describe('setCachedData', () => {
    it('should store data in cache', async () => {
      chrome.storage.local.set.mockResolvedValue();
      
      const result = await cacheManager.setCachedData('test', 'data', 5);
      
      expect(chrome.storage.local.set).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));
      
      const result = await cacheManager.setCachedData('test', 'data', 5);
      
      expect(result).toBe(false);
    });
  });

  describe('removeFromCache', () => {
    it('should remove data from cache', async () => {
      chrome.storage.local.remove.mockResolvedValue();
      
      await cacheManager.removeFromCache('test');
      
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('chrome_mnemonic_cache_test');
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', async () => {
      const mockData = {
        'chrome_mnemonic_cache_key1': { data: 'test1' },
        'chrome_mnemonic_cache_key2': { data: 'test2' },
        'other_key': { data: 'other' }
      };
      
      chrome.storage.local.get.mockResolvedValue(mockData);
      chrome.storage.local.remove.mockResolvedValue();
      
      await cacheManager.clearCache();
      
      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        'chrome_mnemonic_cache_key1',
        'chrome_mnemonic_cache_key2'
      ]);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockData = {
        'chrome_mnemonic_cache_key1': { 
          data: 'test1', 
          size: 100, 
          compressed: false,
          timestamp: Date.now() - 1000,
          ttl: 300000
        },
        'chrome_mnemonic_cache_key2': { 
          data: 'test2', 
          size: 200, 
          compressed: true,
          timestamp: Date.now() - 2000,
          ttl: 300000
        }
      };
      
      chrome.storage.local.get.mockResolvedValue(mockData);
      
      const stats = await cacheManager.getCacheStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBe(300);
      expect(stats.compressedEntries).toBe(1);
      expect(stats.expiredEntries).toBe(0);
    });
  });

  describe('compression', () => {
    it('should compress large data', () => {
      const largeData = 'x'.repeat(2000);
      const compressed = cacheManager.compress(largeData);
      
      expect(compressed.length).toBeLessThan(largeData.length);
    });

    it('should decompress data correctly', () => {
      const originalData = { test: 'data', number: 123 };
      const compressed = cacheManager.compress(originalData);
      const decompressed = cacheManager.decompress(compressed);
      
      expect(decompressed).toEqual(originalData);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(cacheManager.formatBytes(0)).toBe('0 Bytes');
      expect(cacheManager.formatBytes(1024)).toBe('1 KB');
      expect(cacheManager.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(cacheManager.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });
});
