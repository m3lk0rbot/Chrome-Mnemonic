// Tests for URLUtils class
const URLUtils = require('../../utils/url-utils.js');

describe('URLUtils', () => {
  describe('getDomain', () => {
    it('should extract domain from valid URL', () => {
      expect(URLUtils.getDomain('https://www.google.com/search?q=test')).toBe('google.com');
      expect(URLUtils.getDomain('https://example.com/path')).toBe('example.com');
      expect(URLUtils.getDomain('http://subdomain.example.com')).toBe('subdomain.example.com');
    });

    it('should handle URLs without www prefix', () => {
      expect(URLUtils.getDomain('https://google.com')).toBe('google.com');
      expect(URLUtils.getDomain('https://github.com/user/repo')).toBe('github.com');
    });

    it('should return invalid-url for invalid input', () => {
      expect(URLUtils.getDomain('')).toBe('invalid-url');
      expect(URLUtils.getDomain(null)).toBe('invalid-url');
      expect(URLUtils.getDomain('not-a-url')).toBe('invalid-url');
    });
  });

  describe('isValidURL', () => {
    it('should return true for valid URLs', () => {
      expect(URLUtils.isValidURL('https://example.com')).toBe(true);
      expect(URLUtils.isValidURL('http://localhost:3000')).toBe(true);
      expect(URLUtils.isValidURL('https://subdomain.example.com/path?query=value')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(URLUtils.isValidURL('')).toBe(false);
      expect(URLUtils.isValidURL(null)).toBe(false);
      expect(URLUtils.isValidURL('not-a-url')).toBe(false);
      expect(URLUtils.isValidURL('ftp://invalid')).toBe(false);
    });
  });

  describe('extractSearchQuery', () => {
    it('should extract search query from URL', () => {
      expect(URLUtils.extractSearchQuery('https://google.com/search?q=test', 'q')).toBe('test');
      expect(URLUtils.extractSearchQuery('https://bing.com/search?query=hello', 'query')).toBe('hello');
    });

    it('should return empty string for missing parameter', () => {
      expect(URLUtils.extractSearchQuery('https://google.com/search', 'q')).toBe('');
      expect(URLUtils.extractSearchQuery('https://google.com/search?other=value', 'q')).toBe('');
    });

    it('should handle invalid URLs', () => {
      expect(URLUtils.extractSearchQuery('invalid-url', 'q')).toBe('');
    });
  });

  describe('isSearchEngineURL', () => {
    it('should identify search engine URLs', () => {
      expect(URLUtils.isSearchEngineURL('https://google.com/search')).toBe(true);
      expect(URLUtils.isSearchEngineURL('https://bing.com/search')).toBe(true);
      expect(URLUtils.isSearchEngineURL('https://duckduckgo.com')).toBe(true);
    });

    it('should return false for non-search engine URLs', () => {
      expect(URLUtils.isSearchEngineURL('https://example.com')).toBe(false);
      expect(URLUtils.isSearchEngineURL('https://github.com')).toBe(false);
    });
  });

  describe('isSocialMediaURL', () => {
    it('should identify social media URLs', () => {
      expect(URLUtils.isSocialMediaURL('https://facebook.com')).toBe(true);
      expect(URLUtils.isSocialMediaURL('https://twitter.com/user')).toBe(true);
      expect(URLUtils.isSocialMediaURL('https://youtube.com/watch')).toBe(true);
    });

    it('should return false for non-social media URLs', () => {
      expect(URLUtils.isSocialMediaURL('https://example.com')).toBe(false);
      expect(URLUtils.isSocialMediaURL('https://google.com')).toBe(false);
    });
  });

  describe('getURLCategory', () => {
    it('should categorize URLs correctly', () => {
      expect(URLUtils.getURLCategory('https://google.com/search')).toBe('search');
      expect(URLUtils.getURLCategory('https://facebook.com')).toBe('social');
      expect(URLUtils.getURLCategory('https://cnn.com/news')).toBe('news');
      expect(URLUtils.getURLCategory('https://example.com')).toBe('other');
    });
  });

  describe('normalizeURL', () => {
    it('should remove tracking parameters', () => {
      const url = 'https://example.com/page?utm_source=google&utm_campaign=test&other=value';
      const normalized = URLUtils.normalizeURL(url);
      expect(normalized).not.toContain('utm_source');
      expect(normalized).not.toContain('utm_campaign');
      expect(normalized).toContain('other=value');
    });

    it('should remove trailing slash', () => {
      expect(URLUtils.normalizeURL('https://example.com/')).toBe('https://example.com');
      expect(URLUtils.normalizeURL('https://example.com/path/')).toBe('https://example.com/path');
    });
  });

  describe('areSimilarURLs', () => {
    it('should identify similar URLs', () => {
      expect(URLUtils.areSimilarURLs('https://example.com/page', 'https://example.com/page')).toBe(true);
      expect(URLUtils.areSimilarURLs('https://example.com/page?q=1', 'https://example.com/page?q=2')).toBe(true);
    });

    it('should return false for different URLs', () => {
      expect(URLUtils.areSimilarURLs('https://example.com/page1', 'https://example.com/page2')).toBe(false);
      expect(URLUtils.areSimilarURLs('https://example.com/page', 'https://other.com/page')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extensions', () => {
      expect(URLUtils.getFileExtension('https://example.com/file.pdf')).toBe('pdf');
      expect(URLUtils.getFileExtension('https://example.com/image.jpg')).toBe('jpg');
      expect(URLUtils.getFileExtension('https://example.com/document.docx')).toBe('docx');
    });

    it('should return empty string for no extension', () => {
      expect(URLUtils.getFileExtension('https://example.com/page')).toBe('');
      expect(URLUtils.getFileExtension('https://example.com/')).toBe('');
    });
  });

  describe('isFileDownload', () => {
    it('should identify file download URLs', () => {
      expect(URLUtils.isFileDownload('https://example.com/file.pdf')).toBe(true);
      expect(URLUtils.isFileDownload('https://example.com/image.jpg')).toBe(true);
      expect(URLUtils.isFileDownload('https://example.com/archive.zip')).toBe(true);
    });

    it('should return false for non-file URLs', () => {
      expect(URLUtils.isFileDownload('https://example.com/page')).toBe(false);
      expect(URLUtils.isFileDownload('https://example.com/')).toBe(false);
    });
  });

  describe('getURLStats', () => {
    it('should return comprehensive URL statistics', () => {
      const stats = URLUtils.getURLStats('https://www.google.com/search?q=test');
      
      expect(stats.isValid).toBe(true);
      expect(stats.domain).toBe('google.com');
      expect(stats.category).toBe('search');
      expect(stats.isSearch).toBe(true);
      expect(stats.isSocial).toBe(false);
      expect(stats.isNews).toBe(false);
      expect(stats.isFile).toBe(false);
      expect(stats.extension).toBe('');
      expect(stats.normalized).toContain('google.com');
    });

    it('should handle invalid URLs', () => {
      const stats = URLUtils.getURLStats('invalid-url');
      
      expect(stats.isValid).toBe(false);
      expect(stats.domain).toBe('invalid');
      expect(stats.category).toBe('invalid');
    });
  });
});
