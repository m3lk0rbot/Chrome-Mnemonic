/**
 * Basic AI Service - Non-AI features for stable operation
 * Provides basic clustering, summarization, and analysis without external AI
 */

class BasicAIService {
  constructor() {
    this.initialized = false;
    this.name = 'BasicAIService';

    // Add stub monitoring services for compatibility
    this.performanceMonitor = null;
    this.requestQueue = null;
    this.rateLimiter = null;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing Basic AI Service (No AI mode)');
    this.initialized = true;
  }

  // Basic text summarization using simple text extraction
  async summarizeText(text, maxLength = 200) {
    if (!text || typeof text !== 'string') {
      return 'No content available';
    }

    // Remove HTML tags and extra whitespace
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (cleanText.length <= maxLength) {
      return cleanText;
    }

    // Find sentences and extract key ones
    const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return cleanText.substring(0, maxLength) + '...';
    }

    // Simple scoring based on word frequency and position
    const words = cleanText.toLowerCase().split(/\s+/);
    const wordFreq = {};
    words.forEach(word => {
      if (word.length > 3) { // Only count meaningful words
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const scoredSentences = sentences.map((sentence, index) => {
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const score = sentenceWords.reduce((acc, word) => {
        return acc + (wordFreq[word] || 0);
      }, 0) + (index < 3 ? 10 : 0); // Boost first few sentences
      
      return { sentence: sentence.trim(), score };
    });

    // Sort by score and take top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summary = '';
    for (const { sentence } of scoredSentences) {
      if (summary.length + sentence.length + 1 <= maxLength) {
        summary += (summary ? '. ' : '') + sentence;
      } else {
        break;
      }
    }

    return summary + (summary.length < cleanText.length ? '...' : '');
  }

  // Basic clustering based on URL patterns and domains
  async clusterHistory(historyItems) {
    if (!Array.isArray(historyItems) || historyItems.length === 0) {
      return [];
    }

    const clusters = [];
    const domainGroups = {};
    const keywordGroups = {};

    // Group by domain
    historyItems.forEach(item => {
      try {
        const url = new URL(item.url);
        const domain = url.hostname.replace('www.', '');
        const baseDomain = domain.split('.').slice(-2).join('.');
        
        if (!domainGroups[baseDomain]) {
          domainGroups[baseDomain] = [];
        }
        domainGroups[baseDomain].push(item);
      } catch (e) {
        // Invalid URL, skip
      }
    });

    // Create domain-based clusters
    Object.entries(domainGroups).forEach(([domain, items]) => {
      if (items.length >= 2) {
        const cluster = {
          name: this.getDomainDisplayName(domain),
          description: `${items.length} visits to ${domain}`,
          items: items,
          itemCount: items.length,
          confidence: Math.min(items.length / 10, 1), // Higher confidence for more visits
          type: 'domain',
          domain: domain,
          lastVisit: Math.max(...items.map(i => i.lastVisitTime || 0))
        };
        clusters.push(cluster);
      }
    });

    // Group by common keywords in titles
    const titleWords = {};
    historyItems.forEach(item => {
      if (item.title) {
        const words = item.title.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 3);
        
        words.forEach(word => {
          if (!titleWords[word]) {
            titleWords[word] = [];
          }
          titleWords[word].push(item);
        });
      }
    });

    // Create keyword-based clusters
    Object.entries(titleWords).forEach(([keyword, items]) => {
      if (items.length >= 3) {
        const uniqueItems = [...new Set(items.map(i => i.url))].map(url => 
          items.find(i => i.url === url)
        );
        
        if (uniqueItems.length >= 3) {
          const cluster = {
            name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Related`,
            description: `${uniqueItems.length} pages about ${keyword}`,
            items: uniqueItems,
            itemCount: uniqueItems.length,
            confidence: Math.min(uniqueItems.length / 15, 1),
            type: 'keyword',
            keyword: keyword,
            lastVisit: Math.max(...uniqueItems.map(i => i.lastVisitTime || 0))
          };
          clusters.push(cluster);
        }
      }
    });

    // Sort by confidence and recency
    return clusters.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff;
      return b.lastVisit - a.lastVisit;
    });
  }

  // Get display name for domain
  getDomainDisplayName(domain) {
    const domainMap = {
      'google.com': 'Google Services',
      'youtube.com': 'YouTube',
      'github.com': 'GitHub',
      'stackoverflow.com': 'Stack Overflow',
      'reddit.com': 'Reddit',
      'twitter.com': 'Twitter',
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      'linkedin.com': 'LinkedIn',
      'amazon.com': 'Amazon',
      'netflix.com': 'Netflix',
      'spotify.com': 'Spotify'
    };

    return domainMap[domain] || domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  // Basic intent classification based on URL patterns
  classifyIntent(url, title) {
    const urlLower = url.toLowerCase();
    const titleLower = (title || '').toLowerCase();

    // Learning/Education
    if (urlLower.includes('course') || urlLower.includes('tutorial') || 
        urlLower.includes('learn') || urlLower.includes('education') ||
        titleLower.includes('tutorial') || titleLower.includes('course')) {
      return 'learning';
    }

    // Work/Productivity
    if (urlLower.includes('github.com') || urlLower.includes('stackoverflow.com') ||
        urlLower.includes('docs.') || urlLower.includes('documentation') ||
        titleLower.includes('documentation') || titleLower.includes('api')) {
      return 'work';
    }

    // Entertainment
    if (urlLower.includes('youtube.com') || urlLower.includes('netflix.com') ||
        urlLower.includes('spotify.com') || urlLower.includes('twitch.tv') ||
        titleLower.includes('video') || titleLower.includes('music')) {
      return 'entertainment';
    }

    // Shopping
    if (urlLower.includes('amazon.com') || urlLower.includes('shop') ||
        urlLower.includes('buy') || titleLower.includes('price')) {
      return 'shopping';
    }

    // News/Information
    if (urlLower.includes('news') || urlLower.includes('article') ||
        titleLower.includes('news') || titleLower.includes('article')) {
      return 'news';
    }

    // Social
    if (urlLower.includes('reddit.com') || urlLower.includes('twitter.com') ||
        urlLower.includes('facebook.com') || urlLower.includes('instagram.com')) {
      return 'social';
    }

    return 'general';
  }

  // Basic quality scoring based on simple metrics
  scoreContent(url, title, visitCount, lastVisit) {
    let score = 0.5; // Base score

    // URL quality indicators
    if (url.includes('https://')) score += 0.1;
    if (url.includes('www.')) score += 0.05;
    
    // Title quality
    if (title && title.length > 10) score += 0.1;
    if (title && title.length > 30) score += 0.05;
    
    // Visit frequency
    if (visitCount > 1) score += 0.1;
    if (visitCount > 5) score += 0.1;
    
    // Recency
    const daysSinceVisit = (Date.now() - lastVisit) / (1000 * 60 * 60 * 24);
    if (daysSinceVisit < 7) score += 0.1;
    if (daysSinceVisit < 1) score += 0.05;

    return Math.min(Math.max(score, 0), 1);
  }

  // Get service status
  getStatus() {
    return {
      available: true,
      name: 'Basic AI Service',
      description: 'Non-AI features for stable operation',
      features: [
        'Basic clustering',
        'Simple summarization', 
        'Intent classification',
        'Quality scoring',
        'Domain grouping'
      ]
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BasicAIService;
} else if (typeof window !== 'undefined') {
  window.BasicAIService = BasicAIService;
}
