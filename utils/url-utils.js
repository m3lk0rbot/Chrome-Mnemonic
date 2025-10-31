// URL Utils - Centralized URL processing utilities
// Reduces code duplication across services

class URLUtils {
  /**
   * Extract domain from URL, removing 'www.' prefix
   * @param {string} url - The URL to process
   * @returns {string} - The domain name or 'invalid-url' if invalid
   */
  static getDomain(url) {
    try {
      if (!url || typeof url !== 'string') {
        return 'invalid-url';
      }
      
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      console.warn('URLUtils.getDomain: Invalid URL:', url, error);
      return 'invalid-url';
    }
  }

  /**
   * Check if a URL is valid
   * @param {string} url - The URL to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  static isValidURL(url) {
    try {
      if (!url || typeof url !== 'string') {
        return false;
      }
      
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract search query from URL parameters
   * @param {string} url - The URL to extract query from
   * @param {string} paramName - The parameter name (default: 'q')
   * @returns {string} - The search query or empty string
   */
  static extractSearchQuery(url, paramName = 'q') {
    try {
      if (!this.isValidURL(url)) {
        return '';
      }
      
      const urlObj = new URL(url);
      return urlObj.searchParams.get(paramName) || '';
    } catch (error) {
      console.warn('URLUtils.extractSearchQuery: Error extracting query:', error);
      return '';
    }
  }

  /**
   * Check if URL is a search engine URL
   * @param {string} url - The URL to check
   * @returns {boolean} - True if it's a search engine URL
   */
  static isSearchEngineURL(url) {
    try {
      if (!this.isValidURL(url)) {
        return false;
      }
      
      const domain = this.getDomain(url);
      const searchEngines = [
        'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
        'baidu.com', 'yandex.com', 'ask.com', 'aol.com'
      ];
      
      return searchEngines.includes(domain);
    } catch (error) {
      console.warn('URLUtils.isSearchEngineURL: Error checking URL:', error);
      return false;
    }
  }

  /**
   * Check if URL is a social media URL
   * @param {string} url - The URL to check
   * @returns {boolean} - True if it's a social media URL
   */
  static isSocialMediaURL(url) {
    try {
      if (!this.isValidURL(url)) {
        return false;
      }
      
      const domain = this.getDomain(url);
      const socialMedia = [
        'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com',
        'youtube.com', 'tiktok.com', 'snapchat.com', 'pinterest.com',
        'reddit.com', 'discord.com', 'telegram.org', 'whatsapp.com'
      ];
      
      return socialMedia.includes(domain);
    } catch (error) {
      console.warn('URLUtils.isSocialMediaURL: Error checking URL:', error);
      return false;
    }
  }

  /**
   * Check if URL is a news/media URL
   * @param {string} url - The URL to check
   * @returns {boolean} - True if it's a news/media URL
   */
  static isNewsMediaURL(url) {
    try {
      if (!this.isValidURL(url)) {
        return false;
      }
      
      const domain = this.getDomain(url);
      const newsMedia = [
        'cnn.com', 'bbc.com', 'nytimes.com', 'washingtonpost.com',
        'reuters.com', 'ap.org', 'npr.org', 'wsj.com',
        'bloomberg.com', 'forbes.com', 'techcrunch.com', 'wired.com'
      ];
      
      return newsMedia.includes(domain);
    } catch (error) {
      console.warn('URLUtils.isNewsMediaURL: Error checking URL:', error);
      return false;
    }
  }

  /**
   * Get URL category based on domain
   * @param {string} url - The URL to categorize
   * @returns {string} - The category ('search', 'social', 'news', 'other')
   */
  static getURLCategory(url) {
    try {
      if (!this.isValidURL(url)) {
        return 'invalid';
      }
      
      if (this.isSearchEngineURL(url)) {
        return 'search';
      } else if (this.isSocialMediaURL(url)) {
        return 'social';
      } else if (this.isNewsMediaURL(url)) {
        return 'news';
      } else {
        return 'other';
      }
    } catch (error) {
      console.warn('URLUtils.getURLCategory: Error categorizing URL:', error);
      return 'other';
    }
  }

  /**
   * Normalize URL for comparison
   * @param {string} url - The URL to normalize
   * @returns {string} - The normalized URL
   */
  static normalizeURL(url) {
    try {
      if (!this.isValidURL(url)) {
        return url;
      }
      
      const urlObj = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'campaign'
      ];
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      // Remove trailing slash and normalize
      let normalized = urlObj.toString();
      if (normalized.endsWith('/') && normalized.length > 1) {
        normalized = normalized.slice(0, -1);
      }
      
      return normalized;
    } catch (error) {
      console.warn('URLUtils.normalizeURL: Error normalizing URL:', error);
      return url;
    }
  }

  /**
   * Check if two URLs are similar (same domain and path)
   * @param {string} url1 - First URL
   * @param {string} url2 - Second URL
   * @returns {boolean} - True if URLs are similar
   */
  static areSimilarURLs(url1, url2) {
    try {
      if (!this.isValidURL(url1) || !this.isValidURL(url2)) {
        return false;
      }
      
      const domain1 = this.getDomain(url1);
      const domain2 = this.getDomain(url2);
      
      if (domain1 !== domain2) {
        return false;
      }
      
      const urlObj1 = new URL(url1);
      const urlObj2 = new URL(url2);
      
      // Compare pathname (ignore query parameters and hash)
      return urlObj1.pathname === urlObj2.pathname;
    } catch (error) {
      console.warn('URLUtils.areSimilarURLs: Error comparing URLs:', error);
      return false;
    }
  }

  /**
   * Extract file extension from URL
   * @param {string} url - The URL to extract extension from
   * @returns {string} - The file extension or empty string
   */
  static getFileExtension(url) {
    try {
      if (!this.isValidURL(url)) {
        return '';
      }
      
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastDot = pathname.lastIndexOf('.');
      
      if (lastDot === -1 || lastDot === pathname.length - 1) {
        return '';
      }
      
      return pathname.substring(lastDot + 1).toLowerCase();
    } catch (error) {
      console.warn('URLUtils.getFileExtension: Error extracting extension:', error);
      return '';
    }
  }

  /**
   * Check if URL is a file download
   * @param {string} url - The URL to check
   * @returns {boolean} - True if it's a file download URL
   */
  static isFileDownload(url) {
    try {
      if (!this.isValidURL(url)) {
        return false;
      }
      
      const extension = this.getFileExtension(url);
      const fileExtensions = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'zip', 'rar', '7z', 'tar', 'gz',
        'mp3', 'mp4', 'avi', 'mov', 'wmv',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'
      ];
      
      return fileExtensions.includes(extension);
    } catch (error) {
      console.warn('URLUtils.isFileDownload: Error checking file download:', error);
      return false;
    }
  }

  /**
   * Get appropriate icon for URL based on domain/category
   * @param {string} url - The URL to get icon for
   * @returns {string} - The emoji icon
   */
  static getURLIcon(url) {
    try {
      if (!this.isValidURL(url)) {
        return '🌐';
      }

      const domain = this.getDomain(url);

      // Specific domain icons
      if (domain.includes('github')) return '🐙';
      if (domain.includes('stackoverflow')) return '📚';
      if (domain.includes('youtube')) return '🎥';
      if (domain.includes('netflix')) return '🎬';
      if (domain.includes('spotify')) return '🎵';
      if (domain.includes('amazon')) return '🛒';
      if (domain.includes('twitter') || domain.includes('x.com')) return '🐦';
      if (domain.includes('facebook')) return '📘';
      if (domain.includes('instagram')) return '📷';
      if (domain.includes('linkedin')) return '💼';
      if (domain.includes('reddit')) return '🤖';
      if (domain.includes('discord')) return '💬';
      if (domain.includes('gmail') || domain.includes('outlook')) return '📧';
      if (domain.includes('docs.google')) return '📄';
      if (domain.includes('drive.google')) return '📁';
      if (domain.includes('wikipedia')) return '📖';
      if (domain.includes('medium')) return '📝';
      if (domain.includes('dev.to')) return '👨‍💻';
      if (domain.includes('codepen')) return '🖊️';
      if (domain.includes('figma')) return '🎨';
      if (domain.includes('notion')) return '📋';
      if (domain.includes('slack')) return '💬';
      if (domain.includes('trello')) return '📊';
      if (domain.includes('jira')) return '🎯';

      // Category-based icons
      if (this.isSearchEngineURL(url)) return '🔍';
      if (this.isSocialMediaURL(url)) return '👥';
      if (this.isNewsMediaURL(url)) return '📰';
      if (this.isFileDownload(url)) return '📥';

      // Extension-based icons
      const ext = this.getFileExtension(url);
      if (['pdf'].includes(ext)) return '📕';
      if (['doc', 'docx'].includes(ext)) return '📄';
      if (['xls', 'xlsx'].includes(ext)) return '📊';
      if (['ppt', 'pptx'].includes(ext)) return '📽️';
      if (['zip', 'rar', '7z'].includes(ext)) return '📦';
      if (['mp3', 'wav'].includes(ext)) return '🎵';
      if (['mp4', 'avi', 'mov'].includes(ext)) return '🎬';
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';

      // Default icon
      return '🌐';
    } catch (error) {
      console.warn('URLUtils.getURLIcon: Error getting icon:', error);
      return '🌐';
    }
  }

  /**
   * Get URL statistics
   * @param {string} url - The URL to analyze
   * @returns {Object} - URL statistics
   */
  static getURLStats(url) {
    try {
      if (!this.isValidURL(url)) {
        return {
          isValid: false,
          domain: 'invalid',
          category: 'invalid',
          isSearch: false,
          isSocial: false,
          isNews: false,
          isFile: false,
          extension: '',
          normalized: url
        };
      }
      
      return {
        isValid: true,
        domain: this.getDomain(url),
        category: this.getURLCategory(url),
        isSearch: this.isSearchEngineURL(url),
        isSocial: this.isSocialMediaURL(url),
        isNews: this.isNewsMediaURL(url),
        isFile: this.isFileDownload(url),
        extension: this.getFileExtension(url),
        normalized: this.normalizeURL(url)
      };
    } catch (error) {
      console.warn('URLUtils.getURLStats: Error getting URL stats:', error);
      return {
        isValid: false,
        domain: 'error',
        category: 'error',
        isSearch: false,
        isSocial: false,
        isNews: false,
        isFile: false,
        extension: '',
        normalized: url
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLUtils;
} else {
  window.URLUtils = URLUtils;
}
