// Cache Manager - Intelligent caching system with TTL, invalidation, and storage management
class CacheManager {
  constructor() {
    this.cachePrefix = 'chrome_mnemonic_cache_';
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.compressionThreshold = 1024; // 1KB
  }

  // Get cached data with TTL check
  async getCachedData(key, ttlMinutes = null, fetchFn = null) {
    try {
      const cacheKey = this.cachePrefix + key;
      const cached = await chrome.storage.local.get(cacheKey);
      
      if (cached[cacheKey]) {
        const cacheData = cached[cacheKey];
        const ttl = ttlMinutes ? ttlMinutes * 60000 : this.defaultTTL;
        
        // Check if cache is still valid
        if (Date.now() - cacheData.timestamp < ttl) {
          console.log(`📦 Cache hit: ${key} (age: ${Math.round((Date.now() - cacheData.timestamp) / 1000)}s)`);
          
          // Decompress if needed
          const data = cacheData.compressed ? this.decompress(cacheData.data) : cacheData.data;
          
          // Update access time for LRU
          await this.updateAccessTime(key, cacheData);
          
          return data;
        } else {
          console.log(`⏰ Cache expired: ${key} (age: ${Math.round((Date.now() - cacheData.timestamp) / 1000)}s)`);
          await this.removeFromCache(key);
        }
      }
      
      // Cache miss - fetch fresh data if function provided
      if (fetchFn) {
        console.log(`🔄 Cache miss: ${key}, fetching fresh data`);
        const freshData = await fetchFn();
        await this.setCachedData(key, freshData, ttlMinutes);
        return freshData;
      }
      
      return null;
    } catch (error) {
      console.warn(`Cache get error for ${key}:`, error);
      return fetchFn ? await fetchFn() : null;
    }
  }

  // Set cached data with TTL
  async setCachedData(key, data, ttlMinutes = null) {
    try {
      const cacheKey = this.cachePrefix + key;
      const ttl = ttlMinutes ? ttlMinutes * 60000 : this.defaultTTL;
      
      // Compress data if it's large enough (guard against undefined/null)
      const dataString = (() => {
        try { return JSON.stringify(data) || ''; } catch { return ''; }
      })();
      const shouldCompress = dataString.length > this.compressionThreshold;
      const processedData = shouldCompress ? this.compress(data) : data;
      
      const cacheData = {
        data: processedData,
        compressed: shouldCompress,
        timestamp: Date.now(),
        accessTime: Date.now(),
        size: (() => { try { return JSON.stringify(processedData).length; } catch { return 0; } })(),
        ttl: ttl,
        key: key
      };
      
      await chrome.storage.local.set({ [cacheKey]: cacheData });
      
      // Check cache size and clean up if needed
      await this.cleanupCache();
      
      console.log(`💾 Cached: ${key} (${shouldCompress ? 'compressed' : 'uncompressed'}, ${cacheData.size} bytes)`);
      return true;
    } catch (error) {
      console.warn(`Cache set error for ${key}:`, error);
      return false;
    }
  }

  // Update access time for LRU
  async updateAccessTime(key, cacheData) {
    try {
      const cacheKey = this.cachePrefix + key;
      cacheData.accessTime = Date.now();
      await chrome.storage.local.set({ [cacheKey]: cacheData });
    } catch (error) {
      console.warn(`Cache access time update error for ${key}:`, error);
    }
  }

  // Remove specific cache entry
  async removeFromCache(key) {
    try {
      const cacheKey = this.cachePrefix + key;
      await chrome.storage.local.remove(cacheKey);
      console.log(`🗑️ Removed from cache: ${key}`);
    } catch (error) {
      console.warn(`Cache remove error for ${key}:`, error);
    }
  }

  // Clear all cache entries
  async clearCache() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheKeys = Object.keys(allData).filter(key => key.startsWith(this.cachePrefix));
      
      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
        console.log(`🗑️ Cleared ${cacheKeys.length} cache entries`);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  // Cleanup expired and oversized cache
  async cleanupCache() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheEntries = Object.entries(allData)
        .filter(([key]) => key.startsWith(this.cachePrefix))
        .map(([key, value]) => ({ key, ...value }));

      // Remove expired entries
      const now = Date.now();
      const expiredEntries = cacheEntries.filter(entry => 
        now - entry.timestamp > entry.ttl
      );

      if (expiredEntries.length > 0) {
        const expiredKeys = expiredEntries.map(entry => entry.key);
        await chrome.storage.local.remove(expiredKeys);
        console.log(`🧹 Cleaned up ${expiredEntries.length} expired cache entries`);
      }

      // Check total cache size
      const totalSize = cacheEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
      
      if (totalSize > this.maxCacheSize) {
        // Remove least recently used entries
        const sortedEntries = cacheEntries
          .filter(entry => !expiredKeys.includes(entry.key))
          .sort((a, b) => a.accessTime - b.accessTime);

        let removedSize = 0;
        const keysToRemove = [];
        
        for (const entry of sortedEntries) {
          keysToRemove.push(entry.key);
          removedSize += entry.size || 0;
          
          if (totalSize - removedSize <= this.maxCacheSize * 0.8) {
            break; // Remove until we're at 80% of max size
          }
        }

        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
          console.log(`🧹 Cleaned up ${keysToRemove.length} LRU cache entries (${removedSize} bytes)`);
        }
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    try {
      const allData = await chrome.storage.local.get();
      const cacheEntries = Object.entries(allData)
        .filter(([key]) => key.startsWith(this.cachePrefix))
        .map(([key, value]) => ({ key: key.replace(this.cachePrefix, ''), ...value }));

      const now = Date.now();
      const totalSize = cacheEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
      const expiredCount = cacheEntries.filter(entry => 
        now - entry.timestamp > entry.ttl
      ).length;
      const compressedCount = cacheEntries.filter(entry => entry.compressed).length;

      return {
        totalEntries: cacheEntries.length,
        totalSize: totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        expiredEntries: expiredCount,
        compressedEntries: compressedCount,
        compressionRatio: compressedCount / cacheEntries.length * 100,
        oldestEntry: cacheEntries.length > 0 ? 
          Math.min(...cacheEntries.map(entry => entry.timestamp)) : null,
        newestEntry: cacheEntries.length > 0 ? 
          Math.max(...cacheEntries.map(entry => entry.timestamp)) : null
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return null;
    }
  }

  // Compress data using simple JSON compression
  compress(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simple compression: remove unnecessary whitespace
      return jsonString.replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.warn('Compression error:', error);
      return data;
    }
  }

  // Decompress data
  decompress(compressedData) {
    try {
      return JSON.parse(compressedData);
    } catch (error) {
      console.warn('Decompression error:', error);
      return compressedData;
    }
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cache with automatic invalidation
  async cacheWithInvalidation(key, fetchFn, invalidateKeys = []) {
    try {
      // Check if any invalidation keys have been updated
      const invalidationData = await chrome.storage.local.get(
        invalidateKeys.map(k => this.cachePrefix + 'invalidate_' + k)
      );
      
      const lastInvalidation = Math.max(
        ...Object.values(invalidationData).map(data => data?.timestamp || 0)
      );
      
      const cached = await this.getCachedData(key);
      if (cached && cached.timestamp > lastInvalidation) {
        return cached;
      }
      
      // Fetch fresh data
      const freshData = await fetchFn();
      await this.setCachedData(key, freshData);
      return freshData;
    } catch (error) {
      console.warn(`Cache with invalidation error for ${key}:`, error);
      return await fetchFn();
    }
  }

  // Invalidate cache entries
  async invalidateCache(invalidateKeys) {
    try {
      const timestamp = Date.now();
      const invalidationData = {};
      
      invalidateKeys.forEach(key => {
        invalidationData[this.cachePrefix + 'invalidate_' + key] = { timestamp };
      });
      
      await chrome.storage.local.set(invalidationData);
      console.log(`🔄 Invalidated cache for keys: ${invalidateKeys.join(', ')}`);
    } catch (error) {
      console.warn('Cache invalidation error:', error);
    }
  }

  // Preload cache with multiple operations
  async preloadCache(operations) {
    try {
      const results = await Promise.allSettled(
        operations.map(async ({ key, fetchFn, ttlMinutes }) => {
          return await this.getCachedData(key, ttlMinutes, fetchFn);
        })
      );
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      console.log(`🚀 Preloaded ${successful}/${operations.length} cache entries`);
      
      return results;
    } catch (error) {
      console.warn('Cache preload error:', error);
      return [];
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
} else {
  window.CacheManager = CacheManager;
}
