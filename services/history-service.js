// History Service - Handles browsing history data and operations
class HistoryService {
  constructor() {
    this.historyData = [];
    this.historyCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.cacheManager = new CacheManager();
    this.worker = null;
    // Allow more time for heavy computations on large histories
    this.workerTimeoutMs = 15000;
  }

  // Load browsing history from Chrome API with chunking
  async loadHistory() {
    try {
      console.log('Loading browsing history...');
      
      // Get history from Chrome API - optimized for speed
      const maxResults = 1000; // Reduced for faster initial load
      const startTime = Date.now() - (14 * 24 * 60 * 60 * 1000); // Last 14 days (reduced from 30)

      const allHistory = await chrome.history.search({
        text: '',
        maxResults: maxResults,
        startTime: startTime
      });

      // Filter and process history data with error handling
      this.historyData = allHistory
        .filter(item => {
          try {
            return item && item.url && !item.url.startsWith('chrome://') && !item.url.startsWith('chrome-extension://');
          } catch (filterError) {
            console.warn('Error filtering history item:', filterError);
            return false;
          }
        })
        .map(item => {
          try {
            return {
              id: item.id,
              url: item.url,
              title: item.title || 'Untitled',
              lastVisitTime: item.lastVisitTime,
              visitCount: item.visitCount || 1,
              typedCount: item.typedCount || 0
            };
          } catch (mapError) {
            console.warn('Error mapping history item:', mapError);
            return null;
          }
        })
        .filter(item => item !== null) // Remove null items
        .sort((a, b) => b.lastVisitTime - a.lastVisitTime);

      console.log(`Loaded ${this.historyData.length} history items`);
      return this.historyData;
    } catch (error) {
      console.error('Failed to load history:', error);
      this.historyData = [];
      return [];
    }
  }

  // Get cached history or load fresh
  async getHistory(forceRefresh = false) {
    try {
      if (forceRefresh) {
        // Force refresh - bypass cache
        console.log('Force refreshing history data');
        const data = await this.loadHistory();
        // IMPORTANT: Always update this.historyData
        this.historyData = Array.isArray(data) ? data : [];
        await this.cacheManager.setCachedData('browsing_history', this.historyData, 5);
        return this.historyData;
      }

      // Use cache manager for intelligent caching
      const data = await this.cacheManager.getCachedData('browsing_history', 5, async () => {
        console.log('Loading fresh history data');
        const freshData = await this.loadHistory();
        
        if (Array.isArray(freshData)) {
          return freshData;
        } else {
          console.warn('Invalid history data received, returning empty array');
          return [];
        }
      });
      
      // IMPORTANT: Always update this.historyData regardless of cache or fresh load
      this.historyData = Array.isArray(data) ? data : [];
      return this.historyData;
    } catch (error) {
      console.error('Failed to get history:', error);
      this.historyData = [];
      return [];
    }
  }

  // Group history by day
  groupHistoryByDay() {
    try {
      if (!Array.isArray(this.historyData)) {
        console.warn('History data is not an array, returning empty grouping');
        return [];
      }

      return this.runInWorker('groupByDay', { historyData: this.historyData })
        .catch(err => {
          console.warn('Worker failed for groupByDay, falling back to main thread:', err);
          return this.groupHistoryByDayFallback();
        });
    } catch (error) {
      console.error('Failed to group history by day:', error);
      return [];
    }
  }

  // Fallback implementation when worker is unavailable
  groupHistoryByDayFallback() {
    if (!Array.isArray(this.historyData)) return [];
    const grouped = {};
    this.historyData.forEach((item) => {
      if (!item || !item.lastVisitTime) return;
      const date = new Date(item.lastVisitTime);
      if (isNaN(date.getTime())) return;
      const dayKey = date.toDateString();
      if (!grouped[dayKey]) grouped[dayKey] = { date, items: [], count: 0 };
      grouped[dayKey].items.push(item);
      grouped[dayKey].count++;
    });
    return Object.values(grouped).sort((a, b) => b.date - a.date);
  }

  // Get recent history items
  getRecentItems(limit = 25) {
    return this.historyData.slice(0, limit);
  }

  // Search history by query
  searchHistory(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    return this.historyData.filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.url.toLowerCase().includes(searchTerm)
    );
  }

  // Get history by domain
  getHistoryByDomain(domain) {
    return this.historyData.filter(item => {
      try {
        const itemDomain = new URL(item.url).hostname;
        return itemDomain.includes(domain);
      } catch {
        return false;
      }
    });
  }

  // Get top domains
  getTopDomains(limit = 10) {
    const domainCounts = {};
    
    this.historyData.forEach(item => {
      try {
        const domain = new URL(item.url).hostname.replace('www.', '');
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch {
        // Skip invalid URLs
      }
    });

    return Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count }));
  }

  // Get browsing sessions (grouped by time gaps)
  getBrowsingSessions(maxGapMinutes = 30) {
    if (this.historyData.length === 0) return [];
    return this.runInWorker('buildSessions', { historyData: this.historyData, maxGapMinutes })
      .catch(err => {
        console.warn('Worker failed for buildSessions, falling back to main thread:', err);
        return this.getBrowsingSessionsFallback(maxGapMinutes);
      });
  }

  getBrowsingSessionsFallback(maxGapMinutes = 30) {
    if (this.historyData.length === 0) return [];
    const sessions = [];
    let currentSession = [this.historyData[0]];
    for (let i = 1; i < this.historyData.length; i++) {
      const current = this.historyData[i];
      const previous = this.historyData[i - 1];
      const timeDiff = previous.lastVisitTime - current.lastVisitTime;
      const gapMinutes = timeDiff / (1000 * 60);
      if (gapMinutes <= maxGapMinutes) {
        currentSession.push(current);
      } else {
        if (currentSession.length > 0) {
          sessions.push({
            startTime: currentSession[currentSession.length - 1].lastVisitTime,
            endTime: currentSession[0].lastVisitTime,
            duration: currentSession[0].lastVisitTime - currentSession[currentSession.length - 1].lastVisitTime,
            items: currentSession,
            count: currentSession.length
          });
        }
        currentSession = [current];
      }
    }
    if (currentSession.length > 0) {
      sessions.push({
        startTime: currentSession[currentSession.length - 1].lastVisitTime,
        endTime: currentSession[0].lastVisitTime,
        duration: currentSession[0].lastVisitTime - currentSession[currentSession.length - 1].lastVisitTime,
        items: currentSession,
        count: currentSession.length
      });
    }
    return sessions;
  }

  // Get history statistics
  getHistoryStats() {
    try {
      return this.runInWorker('buildStats', { historyData: this.historyData })
        .catch(err => {
          console.warn('Worker failed for buildStats, falling back to main thread:', err);
          return this.getHistoryStatsFallback();
        });
    } catch {
      return this.getHistoryStatsFallback();
    }
  }

  getHistoryStatsFallback() {
    const totalItems = this.historyData.length;
    const uniqueDomains = new Set();
    const totalVisits = this.historyData.reduce((sum, item) => sum + (item.visitCount || 1), 0);
    for (let i = 0; i < this.historyData.length; i++) {
      const item = this.historyData[i];
      try {
        const domain = new URL(item.url).hostname.replace('www.', '');
        uniqueDomains.add(domain);
      } catch {}
    }
    const sessions = this.getBrowsingSessionsFallback();
    const totalSessionTime = sessions.reduce((sum, session) => sum + session.duration, 0);
    return {
      totalItems,
      uniqueDomains: uniqueDomains.size,
      totalVisits,
      totalSessions: sessions.length,
      averageSessionDuration: sessions.length > 0 ? totalSessionTime / sessions.length : 0,
      averageItemsPerSession: sessions.length > 0 ? totalItems / sessions.length : 0
    };
  }

  // Internal: run a computation in the history worker with timeout
  runInWorker(action, payload) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.worker) {
          // Chrome extensions can load workers via relative path from extension root
          this.worker = new Worker('workers/history-worker.js');
        }
        const timeoutId = setTimeout(() => {
          try { this.worker.terminate(); } catch {}
          this.worker = null;
          reject(new Error('Worker timeout'));
        }, this.workerTimeoutMs);
        this.worker.onmessage = (e) => {
          clearTimeout(timeoutId);
          const { success, result, error } = e.data || {};
          if (success) {
            resolve(result);
          } else {
            reject(new Error(error || 'Worker error'));
          }
        };
        this.worker.onerror = (err) => {
          clearTimeout(timeoutId);
          try { this.worker.terminate(); } catch {}
          this.worker = null;
          reject(err);
        };
        this.worker.postMessage({ action, payload });
      } catch (err) {
        reject(err);
      }
    });
  }

  // Clear cache
  clearCache() {
    this.historyCache.clear();
  }

  // Get today's key for caching
  todayKey() {
    return `summary_${new Date().toDateString().replace(/\s/g, '_')}`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HistoryService;
} else {
  window.HistoryService = HistoryService;
}
