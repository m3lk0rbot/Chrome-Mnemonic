// Search Service - Handles search functionality and notifications
class SearchService {
  constructor(aiService, historyService) {
    this.aiService = aiService;
    this.historyService = historyService;
    this.searchPatterns = {};
    this.universalSearches = [];
  }

  // Initialize search patterns for universal search detection
  async initializeSearchPatterns() {
    try {
      this.searchPatterns = {
        // Google Search
        'google.com': {
          name: 'Google Search',
          urlPattern: /google\.com\/search/,
          queryParam: 'q'
        },
        // Bing Search
        'bing.com': {
          name: 'Bing Search',
          urlPattern: /bing\.com\/search/,
          queryParam: 'q'
        },
        // DuckDuckGo Search
        'duckduckgo.com': {
          name: 'DuckDuckGo Search',
          urlPattern: /duckduckgo\.com/,
          queryParam: 'q'
        },
        // YouTube Search
        'youtube.com': {
          name: 'YouTube Search',
          urlPattern: /youtube\.com\/results/,
          queryParam: 'search_query'
        },
        // AI Websites
        'chatgpt.com': {
          name: 'ChatGPT',
          urlPattern: /chatgpt\.com/,
          queryParam: 'message'
        },
        'claude.ai': {
          name: 'Claude',
          urlPattern: /claude\.ai/,
          queryParam: 'message'
        },
        'cursor.sh': {
          name: 'Cursor',
          urlPattern: /cursor\.sh/,
          queryParam: 'query'
        },
        'perplexity.ai': {
          name: 'Perplexity',
          urlPattern: /perplexity\.ai/,
          queryParam: 'q'
        },
        'poe.com': {
          name: 'Poe',
          urlPattern: /poe\.com/,
          queryParam: 'message'
        },
        // Stack Overflow
        'stackoverflow.com': {
          name: 'Stack Overflow',
          urlPattern: /stackoverflow\.com\/search/,
          queryParam: 'q'
        },
        // GitHub
        'github.com': {
          name: 'GitHub',
          urlPattern: /github\.com\/search/,
          queryParam: 'q'
        },
        // Reddit
        'reddit.com': {
          name: 'Reddit',
          urlPattern: /reddit\.com\/search/,
          queryParam: 'q'
        }
      };

      await chrome.storage.local.set({
        searchPatterns: this.searchPatterns,
        universalSearchNotificationsEnabled: true,
        lastSearchCheck: Date.now()
      });

      console.log('Search patterns initialized');
      return true;
    } catch (error) {
      console.warn('Failed to initialize search patterns:', error);
      return false;
    }
  }

  // Start universal search monitoring
  startUniversalSearchMonitoring() {
    // Content script is now automatically injected via manifest.json
    // Monitor tab updates for search pattern detection
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        await this.checkForSearchInHistory(tab);
      }
    });

    // Periodic check for new searches from history
    setInterval(() => {
      this.checkForRecentSearchesFromHistory();
    }, 30000); // Check every 30 seconds
    
    console.log('Universal search monitoring started via content script');
  }

  // Check for search patterns in current tab
  async checkForSearchInHistory(tab) {
    try {
      const domain = URLUtils.getDomain(tab.url);

      // Check if this URL matches any search pattern
      for (const [patternDomain, pattern] of Object.entries(this.searchPatterns)) {
        if (domain.includes(patternDomain) && pattern.urlPattern.test(tab.url)) {
          console.log(`Detected search on ${pattern.name}: ${tab.url}`);

          // Extract search query from URL
          const searchQuery = this.extractSearchQueryFromURL(tab.url, pattern.queryParam);
          if (searchQuery && searchQuery.length > 3) {
            await this.handleSearchDetection({
              query: searchQuery,
              website: pattern.name,
              domain: domain,
              timestamp: Date.now(),
              url: tab.url
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error checking for search in history:', error);
    }
  }

  // Extract search query from URL
  extractSearchQueryFromURL(url, queryParam) {
    try {
      return URLUtils.extractSearchQuery(url, queryParam);
    } catch (error) {
      console.warn('Failed to extract search query:', error);
      return '';
    }
  }

  // Note: Universal search monitoring is now handled by content-script.js
  // This method is kept for compatibility but no longer used

  // Handle search detection
  async handleSearchDetection(searchData) {
    try {
      // Store the search
      await this.storeUniversalSearch(searchData);

      // Check for similar searches
      const similarSearches = await this.findSimilarSearches(searchData.query);

      if (similarSearches.length > 0) {
        // Show notification on current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await this.showSearchNotificationOnTab(searchData, similarSearches, tabs[0]);
        }
      }
    } catch (error) {
      console.warn('Error handling search detection:', error);
    }
  }

  // Store universal search
  async storeUniversalSearch(searchData) {
    try {
      const stored = await chrome.storage.local.get('universalSearches');
      const searches = stored.universalSearches || [];

      searches.push({
        ...searchData,
        id: Date.now() + Math.random(),
        storedAt: Date.now()
      });

      // Keep only last 1000 searches
      if (searches.length > 1000) {
        searches.splice(0, searches.length - 1000);
      }

      await chrome.storage.local.set({ universalSearches: searches });
      this.universalSearches = searches;
    } catch (error) {
      console.warn('Failed to store universal search:', error);
    }
  }

  // Find similar searches
  async findSimilarSearches(query) {
    try {
      const stored = await chrome.storage.local.get('universalSearches');
      const searches = stored.universalSearches || [];

      const similarSearches = [];
      const queryWords = query.toLowerCase().split(/\s+/);

      for (const search of searches) {
        if (search.query === query) continue; // Skip exact same query

        const searchWords = search.query.toLowerCase().split(/\s+/);
        const commonWords = queryWords.filter(word =>
          searchWords.some(searchWord =>
            searchWord.includes(word) || word.includes(searchWord)
          )
        );

        // Calculate similarity score
        const similarity = commonWords.length / Math.max(queryWords.length, searchWords.length);

        if (similarity > 0.3) { // 30% similarity threshold
          similarSearches.push({
            ...search,
            similarity: similarity
          });
        }
      }

      // Sort by similarity and recency
      return similarSearches
        .sort((a, b) => b.similarity - a.similarity || b.timestamp - a.timestamp)
        .slice(0, 5); // Top 5 similar searches
    } catch (error) {
      console.warn('Failed to find similar searches:', error);
      return [];
    }
  }

  // Check for recent searches from history
  async checkForRecentSearchesFromHistory() {
    try {
      const stored = await chrome.storage.local.get(['universalSearches', 'lastSearchCheck']);
      const searches = stored.universalSearches || [];
      const lastCheck = stored.lastSearchCheck || 0;

      // Get recent searches (last 5 minutes)
      const recentSearches = searches.filter(search =>
        search.timestamp > lastCheck &&
        search.timestamp > Date.now() - (5 * 60 * 1000)
      );

      if (recentSearches.length > 0) {
        for (const search of recentSearches) {
          const similarSearches = await this.findSimilarSearches(search.query);
          if (similarSearches.length > 0) {
            // Show notification on current active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
              await this.showSearchNotificationOnTab(search, similarSearches, tabs[0]);
            }
          }
        }
      }

      await chrome.storage.local.set({ lastSearchCheck: Date.now() });
    } catch (error) {
      console.warn('Error checking for recent searches from history:', error);
    }
  }

  // Show search notification on specific tab
  async showSearchNotificationOnTab(currentSearch, similarSearches, tab) {
    try {
      const notificationId = `search-notification-${Date.now()}`;
      
      // Create notification HTML
      const notificationHtml = this.createSearchNotificationHTML(currentSearch, similarSearches, notificationId);
      
      // Inject notification into the specific tab using a simpler approach
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.injectNotificationIntoPage,
        args: [notificationHtml, notificationId, similarSearches.length]
      });
      
    } catch (error) {
      console.warn('Failed to show search notification on tab:', error);
    }
  }

  // Create notification HTML
  createSearchNotificationHTML(currentSearch, similarSearches, notificationId) {
    const mostRecent = similarSearches[0];
    const timeAgo = this.getTimeAgo(mostRecent.timestamp);

    return `
      <div style="padding: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
          ">
            <span style="color: white; font-size: 16px;">🧠</span>
          </div>
          <div>
            <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
              Similar Search Found!
            </div>
            <div style="font-size: 12px; color: #6c757d;">
              You searched for this on ${mostRecent.website}
            </div>
          </div>
          <button onclick="this.closest('[id=\\'${notificationId}\\']').remove()" style="
            background: none;
            border: none;
            font-size: 18px;
            color: #6c757d;
            cursor: pointer;
            margin-left: auto;
            padding: 4px;
          ">×</button>
        </div>

        <div style="margin-bottom: 12px;">
          <div style="font-weight: 500; color: #2c3e50; margin-bottom: 4px;">
            "${mostRecent.query}"
          </div>
          <div style="font-size: 12px; color: #6c757d;">
            ${timeAgo} • ${mostRecent.website}
          </div>
        </div>

        <div style="margin-bottom: 12px;">
          <button id="view-more-${notificationId}" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            width: 100%;
          ">
            View More (${similarSearches.length} similar searches)
          </button>
        </div>

        <div id="expanded-content-${notificationId}" style="display: none; max-height: 200px; overflow-y: auto;">
          ${similarSearches.map(search => `
            <div style="
              padding: 8px;
              margin: 4px 0;
              background: #f8f9fa;
              border-radius: 6px;
              border-left: 3px solid #667eea;
            ">
              <div style="font-weight: 500; color: #2c3e50; margin-bottom: 2px;">
                "${search.query}"
              </div>
              <div style="font-size: 11px; color: #6c757d;">
                ${this.getTimeAgo(search.timestamp)} • ${search.website}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Inject notification into page
  injectNotificationIntoPage(html, notificationId, similarSearchesCount) {
    // Create notification element
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.innerHTML = html;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      max-height: 400px;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      overflow: hidden;
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 10000);
    
    // Add click handlers
    const viewMoreBtn = document.getElementById(`view-more-${notificationId}`);
    const expandedContent = document.getElementById(`expanded-content-${notificationId}`);
    
    if (viewMoreBtn && expandedContent) {
      viewMoreBtn.addEventListener('click', () => {
        if (expandedContent.style.display === 'none') {
          expandedContent.style.display = 'block';
          viewMoreBtn.textContent = 'Show Less';
        } else {
          expandedContent.style.display = 'none';
          viewMoreBtn.textContent = `View More (${similarSearchesCount} similar searches)`;
        }
      });
    }
  }

  // Get time ago string
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  // Test notification function
  async testNotification() {
    try {
      console.log('Testing notification...');
      
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const testSearch = {
          query: 'react tutorial',
          website: 'Google Search',
          domain: 'google.com',
          timestamp: Date.now() - (2 * 24 * 60 * 60 * 1000), // 2 days ago
          url: 'https://google.com/search?q=react+tutorial'
        };
        
        const testSimilarSearches = [
          {
            query: 'react guide',
            website: 'YouTube',
            domain: 'youtube.com',
            timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000), // 1 day ago
            url: 'https://youtube.com/results?search_query=react+guide',
            similarity: 0.8
          }
        ];
        
        await this.showSearchNotificationOnTab(testSearch, testSimilarSearches, tabs[0]);
        console.log('Test notification sent!');
      }
    } catch (error) {
      console.warn('Test notification failed:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchService;
} else {
  window.SearchService = SearchService;
}
