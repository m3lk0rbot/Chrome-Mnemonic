// Tests for ClusteringFeature class
const ClusteringFeature = require('../../features/clustering.js');

// Mock dependencies
const mockAIService = {
  aiAvailable: true,
  withAISession: jest.fn()
};

const mockHistoryService = {
  getHistory: jest.fn(),
  groupHistoryByDay: jest.fn()
};

describe('ClusteringFeature', () => {
  let clusteringFeature;

  beforeEach(() => {
    clusteringFeature = new ClusteringFeature(mockAIService, mockHistoryService);
    
    // Reset mocks
    mockAIService.withAISession.mockClear();
    mockHistoryService.getHistory.mockClear();
    mockHistoryService.groupHistoryByDay.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(clusteringFeature.aiService).toBe(mockAIService);
      expect(clusteringFeature.historyService).toBe(mockHistoryService);
    });
  });

  describe('computeAIClustersEnhanced', () => {
    it('should fallback to basic clustering when AI unavailable', async () => {
      mockAIService.aiAvailable = false;
      mockHistoryService.getHistory.mockResolvedValue([
        { url: 'https://example.com/page1', title: 'Page 1' },
        { url: 'https://example.com/page2', title: 'Page 2' }
      ]);

      const result = await clusteringFeature.computeAIClustersEnhanced();

      expect(Array.isArray(result)).toBe(true);
      expect(mockHistoryService.getHistory).toHaveBeenCalled();
    });

    it('should use AI clustering when available', async () => {
      mockAIService.aiAvailable = true;
      mockAIService.withAISession.mockResolvedValue([
        { name: 'AI Cluster', items: [] }
      ]);

      const result = await clusteringFeature.computeAIClustersEnhanced();

      expect(Array.isArray(result)).toBe(true);
      expect(mockAIService.withAISession).toHaveBeenCalled();
    });

    it('should handle AI errors gracefully', async () => {
      mockAIService.aiAvailable = true;
      mockAIService.withAISession.mockRejectedValue(new Error('AI Error'));
      mockHistoryService.getHistory.mockResolvedValue([
        { url: 'https://example.com/page1', title: 'Page 1' }
      ]);

      const result = await clusteringFeature.computeAIClustersEnhanced();

      expect(Array.isArray(result)).toBe(true);
      expect(mockHistoryService.getHistory).toHaveBeenCalled();
    });
  });

  describe('computeBasicClusters', () => {
    it('should create basic clusters from history', async () => {
      const mockHistory = [
        { url: 'https://google.com/search', title: 'Google Search' },
        { url: 'https://github.com/repo', title: 'GitHub Repo' },
        { url: 'https://stackoverflow.com/question', title: 'Stack Overflow' }
      ];

      mockHistoryService.getHistory.mockResolvedValue(mockHistory);

      const result = await clusteringFeature.computeBasicClusters();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('items');
    });

    it('should handle empty history', async () => {
      mockHistoryService.getHistory.mockResolvedValue([]);

      const result = await clusteringFeature.computeBasicClusters();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('displayEnhancedClusters', () => {
    it('should display clusters in UI', async () => {
      const mockClusters = [
        { name: 'Test Cluster', items: [] }
      ];

      // Mock DOM elements
      const mockContainer = { innerHTML: '' };
      document.getElementById = jest.fn().mockReturnValue(mockContainer);

      await clusteringFeature.displayEnhancedClusters();

      expect(document.getElementById).toHaveBeenCalled();
    });

    it('should handle missing container gracefully', async () => {
      document.getElementById = jest.fn().mockReturnValue(null);

      await expect(clusteringFeature.displayEnhancedClusters()).resolves.not.toThrow();
    });
  });

  describe('createClusterHTML', () => {
    it('should create HTML for cluster', () => {
      const cluster = {
        name: 'Test Cluster',
        description: 'Test Description',
        confidence: 0.8,
        items: [
          { title: 'Item 1', url: 'https://example.com/1' },
          { title: 'Item 2', url: 'https://example.com/2' }
        ]
      };

      const html = clusteringFeature.createClusterHTML(cluster);

      expect(html).toContain('Test Cluster');
      expect(html).toContain('Test Description');
      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
    });

    it('should handle empty cluster', () => {
      const cluster = {
        name: 'Empty Cluster',
        description: '',
        confidence: 0,
        items: []
      };

      const html = clusteringFeature.createClusterHTML(cluster);

      expect(html).toContain('Empty Cluster');
      expect(html).not.toContain('Item');
    });
  });

  describe('groupByDomain', () => {
    it('should group items by domain', () => {
      const items = [
        { url: 'https://google.com/search', title: 'Google Search' },
        { url: 'https://google.com/maps', title: 'Google Maps' },
        { url: 'https://github.com/repo', title: 'GitHub Repo' }
      ];

      const grouped = clusteringFeature.groupByDomain(items);

      expect(grouped).toHaveProperty('google.com');
      expect(grouped).toHaveProperty('github.com');
      expect(grouped['google.com']).toHaveLength(2);
      expect(grouped['github.com']).toHaveLength(1);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'This is a test about JavaScript programming and web development';
      const keywords = clusteringFeature.extractKeywords(text);

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const keywords = clusteringFeature.extractKeywords('');
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBe(0);
    });
  });
});
