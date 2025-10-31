// Tests for HistoryService class
const HistoryService = require('../../services/history-service.js');

describe('HistoryService', () => {
  let historyService;

  beforeEach(() => {
    historyService = new HistoryService();
    
    // Reset mocks
    chrome.history.search.mockClear();
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(historyService.historyData).toEqual([]);
      expect(historyService.historyCache).toBeInstanceOf(Map);
      expect(historyService.cacheExpiry).toBe(5 * 60 * 1000);
    });
  });

  describe('loadHistory', () => {
    it('should load history with chunking', async () => {
      const mockHistory = [
        { url: 'https://example.com/1', title: 'Page 1', lastVisitTime: Date.now() },
        { url: 'https://example.com/2', title: 'Page 2', lastVisitTime: Date.now() }
      ];
      
      chrome.history.search.mockResolvedValue(mockHistory);
      
      const result = await historyService.loadHistory();
      
      expect(Array.isArray(result)).toBe(true);
      expect(chrome.history.search).toHaveBeenCalled();
    });

    it('should handle Chrome API errors', async () => {
      chrome.history.search.mockRejectedValue(new Error('Chrome API error'));
      
      const result = await historyService.loadHistory();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return cached history when valid', async () => {
      const mockHistory = [
        { url: 'https://example.com/1', title: 'Page 1' }
      ];
      
      historyService.historyCache.set('history_data', {
        data: mockHistory,
        timestamp: Date.now()
      });
      
      const result = await historyService.getHistory();
      
      expect(result).toEqual(mockHistory);
      expect(chrome.history.search).not.toHaveBeenCalled();
    });

    it('should load fresh history when cache expired', async () => {
      const expiredCache = {
        data: [{ url: 'https://example.com/1', title: 'Page 1' }],
        timestamp: Date.now() - 10 * 60 * 1000 // 10 minutes ago
      };
      
      historyService.historyCache.set('history_data', expiredCache);
      
      const mockHistory = [
        { url: 'https://example.com/2', title: 'Page 2' }
      ];
      
      chrome.history.search.mockResolvedValue(mockHistory);
      
      const result = await historyService.getHistory();
      
      expect(result).toEqual(mockHistory);
      expect(chrome.history.search).toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      const mockHistory = [
        { url: 'https://example.com/1', title: 'Page 1' }
      ];
      
      chrome.history.search.mockResolvedValue(mockHistory);
      
      const result = await historyService.getHistory(true);
      
      expect(result).toEqual(mockHistory);
      expect(chrome.history.search).toHaveBeenCalled();
    });
  });

  describe('groupHistoryByDay', () => {
    it('should group history by day', () => {
      const mockHistory = [
        { 
          url: 'https://example.com/1', 
          title: 'Page 1', 
          lastVisitTime: new Date('2024-01-01T10:00:00Z').getTime() 
        },
        { 
          url: 'https://example.com/2', 
          title: 'Page 2', 
          lastVisitTime: new Date('2024-01-01T15:00:00Z').getTime() 
        },
        { 
          url: 'https://example.com/3', 
          title: 'Page 3', 
          lastVisitTime: new Date('2024-01-02T10:00:00Z').getTime() 
        }
      ];
      
      historyService.historyData = mockHistory;
      
      const result = historyService.groupHistoryByDay();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Two different days
    });

    it('should handle empty history', () => {
      historyService.historyData = [];
      
      const result = historyService.groupHistoryByDay();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getRecentItems', () => {
    it('should return recent items', () => {
      const mockHistory = [
        { 
          url: 'https://example.com/1', 
          title: 'Page 1', 
          lastVisitTime: Date.now() - 1000 
        },
        { 
          url: 'https://example.com/2', 
          title: 'Page 2', 
          lastVisitTime: Date.now() - 2000 
        },
        { 
          url: 'https://example.com/3', 
          title: 'Page 3', 
          lastVisitTime: Date.now() - 3000 
        }
      ];
      
      historyService.historyData = mockHistory;
      
      const result = historyService.getRecentItems(2);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Page 1'); // Most recent first
    });
  });

  describe('getBrowsingSessions', () => {
    it('should return browsing sessions', () => {
      const mockHistory = [
        { 
          url: 'https://example.com/1', 
          title: 'Page 1', 
          lastVisitTime: Date.now() - 1000 
        },
        { 
          url: 'https://example.com/2', 
          title: 'Page 2', 
          lastVisitTime: Date.now() - 2000 
        }
      ];
      
      historyService.historyData = mockHistory;
      
      const result = historyService.getBrowsingSessions();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('startTime');
      expect(result[0]).toHaveProperty('endTime');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('duration');
    });
  });

  describe('getHistoryStats', () => {
    it('should return history statistics', () => {
      const mockHistory = [
        { 
          url: 'https://example.com/1', 
          title: 'Page 1', 
          lastVisitTime: Date.now() - 1000 
        },
        { 
          url: 'https://example.com/2', 
          title: 'Page 2', 
          lastVisitTime: Date.now() - 2000 
        }
      ];
      
      historyService.historyData = mockHistory;
      
      const stats = historyService.getHistoryStats();
      
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('uniqueDomains');
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('averageSessionDuration');
      expect(stats).toHaveProperty('mostVisitedDomain');
    });
  });

  describe('searchHistory', () => {
    it('should search history by query', () => {
      const mockHistory = [
        { 
          url: 'https://example.com/1', 
          title: 'JavaScript Tutorial', 
          lastVisitTime: Date.now() - 1000 
        },
        { 
          url: 'https://example.com/2', 
          title: 'Python Guide', 
          lastVisitTime: Date.now() - 2000 
        }
      ];
      
      historyService.historyData = mockHistory;
      
      const result = historyService.searchHistory('JavaScript');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].title).toContain('JavaScript');
    });

    it('should handle empty search query', () => {
      const mockHistory = [
        { url: 'https://example.com/1', title: 'Page 1' }
      ];
      
      historyService.historyData = mockHistory;
      
      const result = historyService.searchHistory('');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('getHistoryByDomain', () => {
    it('should return history for specific domain', () => {
      const mockHistory = [
        { 
          url: 'https://example.com/1', 
          title: 'Page 1', 
          lastVisitTime: Date.now() - 1000 
        },
        { 
          url: 'https://other.com/1', 
          title: 'Other Page', 
          lastVisitTime: Date.now() - 2000 
        }
      ];
      
      historyService.historyData = mockHistory;
      
      const result = historyService.getHistoryByDomain('example.com');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].url).toContain('example.com');
    });
  });
});
