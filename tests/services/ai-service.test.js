// Tests for AIService class
const AIService = require('../../services/ai-service.js');

describe('AIService', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AIService();
    
    // Reset mocks
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(aiService.rateLimiter).toBeDefined();
      expect(aiService.requestQueue).toBeDefined();
      expect(aiService.performanceMonitor).toBeDefined();
      expect(aiService.aiSessionManager).toBeDefined();
    });
  });

  describe('checkAIAvailability', () => {
    it('should check AI availability', async () => {
      const result = await aiService.checkAIAvailability();
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('withAISession', () => {
    it('should execute function with AI session', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      
      const result = await aiService.withAISession(mockFn);
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should handle function errors', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(aiService.withAISession(mockFn)).rejects.toThrow('Test error');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary when AI available', async () => {
      aiService.aiAvailable = true;
      aiService.withAISession = jest.fn().mockResolvedValue('AI Summary');
      
      const result = await aiService.generateSummary('Test content');
      
      expect(result).toBe('AI Summary');
      expect(aiService.withAISession).toHaveBeenCalled();
    });

    it('should return fallback summary when AI unavailable', async () => {
      aiService.aiAvailable = false;
      
      const result = await aiService.generateSummary('Test content');
      
      expect(result).toContain('Summary');
      expect(typeof result).toBe('string');
    });
  });

  describe('analyzeContentQuality', () => {
    it('should analyze content quality', async () => {
      const result = await aiService.analyzeContentQuality('Test content');
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('suggestions');
    });
  });

  describe('classifyBrowsingIntent', () => {
    it('should classify browsing intent', async () => {
      const result = await aiService.classifyBrowsingIntent('Test content');
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('analyzeTemporalPatterns', () => {
    it('should analyze temporal patterns', async () => {
      const mockHistory = [
        { url: 'https://example.com/1', lastVisitTime: Date.now() - 1000 }
      ];
      
      const result = await aiService.analyzeTemporalPatterns(mockHistory);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('insights');
    });
  });

  describe('detectMultilingualContent', () => {
    it('should detect multilingual content', async () => {
      const result = await aiService.detectMultilingualContent('Test content');
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('primaryLanguage');
    });
  });

  describe('refineSummary', () => {
    it('should refine summary', async () => {
      const result = await aiService.refineSummary('Original summary', 'Additional context');
      
      expect(typeof result).toBe('string');
    });
  });

  describe('generateInsights', () => {
    it('should generate insights', async () => {
      const mockData = { content: 'Test content' };
      
      const result = await aiService.generateInsights(mockData);
      
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
    });
  });

  describe('getAIServiceStats', () => {
    it('should return AI service statistics', () => {
      const stats = aiService.getAIServiceStats();
      
      expect(typeof stats).toBe('object');
      expect(stats).toHaveProperty('aiAvailable');
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successRate');
    });
  });

  describe('cleanup', () => {
    it('should cleanup AI sessions', async () => {
      await aiService.cleanup();
      
      expect(aiService.aiSessionManager.destroyAllSessions).toHaveBeenCalled();
    });
  });
});
