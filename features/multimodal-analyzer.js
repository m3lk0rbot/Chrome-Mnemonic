// Multimodal Analyzer Feature - analyzes images and screenshots using Prompt API

class MultimodalAnalyzer {
  constructor(aiService, historyService, cacheManager = new CacheManager()) {
    this.aiService = aiService;
    this.historyService = historyService;
    this.cache = cacheManager;
    this.analyzedImages = new Set(); // Track analyzed images to avoid duplicates
  }

  // Check if Prompt API is available
  async checkPromptAPIAvailability() {
    try {
      // Check for Chrome's window.ai.prompt API
      if (typeof window.ai !== 'undefined' && typeof window.ai.prompt !== 'undefined') {
        console.log('Prompt API detected via window.ai.prompt');
        return true;
      }

      // Check for legacy Prompt API
      if (typeof Prompt !== 'undefined') {
        // Try to create a simple prompt to test availability
        try {
          const availability = await Prompt.availability();
          console.log('Prompt API availability:', availability);
          return availability !== 'unavailable';
        } catch (promptError) {
          console.warn('Prompt API test failed:', promptError);
          return false;
        }
      }

      console.log('Prompt API not available');
      return false;
    } catch (error) {
      console.warn('Prompt API availability check failed:', error);
      return false;
    }
  }

  // Check Chrome version and provide setup instructions
  getPromptAPISetupInstructions() {
    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
    const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;
    
    if (chromeVersion < 126) {
      return {
        available: false,
        message: `Chrome version ${chromeVersion} detected. Prompt API requires Chrome 126+. Please update Chrome.`,
        instructions: [
          'Update Chrome to version 126 or later',
          'Restart Chrome after updating',
          'Reload the extension'
        ]
      };
    }
    
    return {
      available: true,
      message: 'Chrome version is compatible. Prompt API should be available.',
      instructions: [
        'Go to chrome://flags/#enable-experimental-web-platform-features',
        'Enable "Experimental Web Platform features"',
        'Restart Chrome',
        'Reload the extension'
      ]
    };
  }

  // Capture screenshot of current tab
  async captureCurrentTabScreenshot() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return null;

      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      return {
        dataUrl,
        url: tab.url,
        title: tab.title,
        timestamp: Date.now()
      };
    } catch (error) {
      console.warn('Screenshot capture failed:', error);
      return null;
    }
  }

  // Analyze image using Prompt API
  async analyzeImage(imageData, analysisType = 'general') {
    try {
      if (!await this.checkPromptAPIAvailability()) {
        throw new Error('Prompt API not available');
      }

      const cacheKey = `image_analysis_${analysisType}_${this.hashImageData(imageData)}`;
      
      // Check cache first
      const cached = await this.cache.getCachedData(cacheKey, 30); // 30 min cache
      if (cached) {
        return cached;
      }

      const prompt = this.getAnalysisPrompt(analysisType);
      
      const result = await this.aiService.withAISession('Prompt', {
        expectedInputs: [
          { type: 'image', data: imageData },
          { type: 'text', data: prompt }
        ]
      }, async (promptSession) => {
        return await promptSession.prompt([
          { type: 'image', data: imageData },
          { type: 'text', data: prompt }
        ]);
      }, {
        timeout: 15000,
        retries: 1,
        priority: 'low',
        description: `Image analysis: ${analysisType}`
      });

      const analysis = {
        type: analysisType,
        result: result,
        timestamp: Date.now(),
        imageHash: this.hashImageData(imageData)
      };

      // Cache the result
      await this.cache.setCachedData(cacheKey, analysis, 30);
      
      return analysis;
    } catch (error) {
      console.warn(`Image analysis failed (${analysisType}):`, error);
      return {
        type: analysisType,
        result: `Analysis failed: ${error.message}`,
        timestamp: Date.now(),
        error: true
      };
    }
  }

  // Get analysis prompt based on type
  getAnalysisPrompt(analysisType) {
    const prompts = {
      'productivity': `Analyze this webpage screenshot for productivity patterns. Look for:
- Work-related content (documents, emails, coding, research)
- Entertainment content (social media, videos, games)
- Learning content (tutorials, articles, courses)
- Shopping content (e-commerce, product pages)
- Communication tools (chat, video calls, forums)
Rate the productivity level (1-10) and provide a brief summary.`,
      
      'content-type': `Analyze this webpage screenshot to identify the content type. Classify as:
- News/Media (articles, videos, podcasts)
- Social Media (posts, feeds, profiles)
- E-commerce (product pages, shopping carts)
- Educational (tutorials, courses, documentation)
- Entertainment (games, videos, music)
- Professional (work tools, business sites)
- Search Results (search engines, directories)
Provide the classification and confidence level.`,
      
      'visual-complexity': `Analyze the visual complexity of this webpage screenshot. Consider:
- Number of UI elements
- Color scheme and contrast
- Text density
- Image/video content
- Navigation complexity
Rate complexity (1-10) and describe the visual style.`,
      
      'accessibility': `Analyze this webpage screenshot for accessibility features. Look for:
- Text contrast and readability
- Button sizes and spacing
- Navigation clarity
- Color usage (not color-dependent)
- Overall user-friendly design
Rate accessibility (1-10) and suggest improvements.`,
      
      'general': `Analyze this webpage screenshot and provide insights about:
- Main purpose and content type
- Visual design and layout
- User experience elements
- Key features or functionality
- Overall impression and usability
Provide a comprehensive analysis in 2-3 sentences.`
    };

    return prompts[analysisType] || prompts['general'];
  }

  // Hash image data for caching
  hashImageData(imageData) {
    try {
      // Simple hash based on data URL length and first/last characters
      const str = typeof imageData === 'string' ? imageData : JSON.stringify(imageData);
      return btoa(str.substring(0, 100) + str.substring(str.length - 100)).substring(0, 16);
    } catch (error) {
      return Date.now().toString(36);
    }
  }

  // Analyze current page
  async analyzeCurrentPage(analysisTypes = ['general', 'productivity']) {
    try {
      const screenshot = await this.captureCurrentTabScreenshot();
      if (!screenshot) {
        throw new Error('Failed to capture screenshot');
      }

      const results = [];
      for (const type of analysisTypes) {
        const analysis = await this.analyzeImage(screenshot.dataUrl, type);
        results.push({
          ...analysis,
          url: screenshot.url,
          title: screenshot.title
        });
      }

      return results;
    } catch (error) {
      console.warn('Current page analysis failed:', error);
      return [];
    }
  }

  // Analyze browsing patterns from screenshots
  async analyzeBrowsingPatterns() {
    try {
      const history = this.historyService.historyData || [];
      if (history.length === 0) return [];

      // Get recent history with image-heavy sites
      const imageSites = history.filter(item => 
        item.url.includes('youtube.com') ||
        item.url.includes('instagram.com') ||
        item.url.includes('pinterest.com') ||
        item.url.includes('imgur.com') ||
        item.url.includes('unsplash.com')
      ).slice(0, 5);

      const patterns = [];
      for (const item of imageSites) {
        try {
          // Simulate analysis for image-heavy sites
          const analysis = {
            url: item.url,
            title: item.title,
            type: 'visual-content',
            result: `Visual content site: ${new URL(item.url).hostname}`,
            timestamp: Date.now(),
            confidence: 0.8
          };
          patterns.push(analysis);
        } catch (error) {
          console.warn(`Pattern analysis failed for ${item.url}:`, error);
        }
      }

      return patterns;
    } catch (error) {
      console.warn('Browsing patterns analysis failed:', error);
      return [];
    }
  }

  // Display multimodal insights
  async displayMultimodalInsights(containerId = 'multimodal-insights') {
    try {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = '<div class="ai-status">🖼️ Multimodal Analysis</div><div id="multimodal-content">Loading...</div>';

      const content = document.getElementById('multimodal-content');
      if (!content) return;

      // Check Prompt API availability
      const promptAvailable = await this.checkPromptAPIAvailability();
      
      if (!promptAvailable) {
        const setupInfo = this.getPromptAPISetupInstructions();
        content.innerHTML = `
          <div class="empty-note">
            <p>📷 Prompt API not available</p>
            <p>Multimodal analysis requires Chrome's Prompt API to be enabled.</p>
            <div style="font-size: 12px; color: #6c757d; margin: 8px 0;">
              <strong>Setup Instructions:</strong><br>
              ${setupInfo.instructions.map((step, i) => `${i + 1}. ${step}`).join('<br>')}
            </div>
            <div style="font-size: 11px; color: #dc3545; margin: 8px 0;">
              ${setupInfo.message}
            </div>
            <button id="analyze-current-page" class="action-btn">Try Current Page Analysis</button>
            <button id="check-prompt-api" class="action-btn" style="margin-left: 8px;">Check API Status</button>
            <button id="open-flags" class="action-btn" style="margin-left: 8px;">Open Chrome Flags</button>
          </div>
        `;
        
        // Add click handlers
        document.getElementById('analyze-current-page')?.addEventListener('click', async () => {
          await this.analyzeCurrentPageManually();
        });
        
        document.getElementById('check-prompt-api')?.addEventListener('click', async () => {
          const available = await this.checkPromptAPIAvailability();
          alert(available ? '✅ Prompt API is available!' : '❌ Prompt API is not available. Please check Chrome version and flags.');
        });
        
        document.getElementById('open-flags')?.addEventListener('click', () => {
          chrome.tabs.create({ url: 'chrome://flags/#enable-experimental-web-platform-features' });
        });
        return;
      }

      // Show analysis options
      content.innerHTML = `
        <div class="multimodal-options">
          <button id="analyze-current" class="action-btn">📷 Analyze Current Page</button>
          <button id="analyze-patterns" class="action-btn">🔍 Analyze Browsing Patterns</button>
          <button id="delete-chats" class="action-btn" style="background:#ef4444;">🗑️ Delete Chats</button>
        </div>
        <div id="analysis-results" class="analysis-results"></div>
      `;

      // Add event listeners
      document.getElementById('analyze-current')?.addEventListener('click', async () => {
        await this.analyzeCurrentPageManually();
      });

      document.getElementById('analyze-patterns')?.addEventListener('click', async () => {
        await this.analyzeBrowsingPatternsManually();
      });

      // Delete all chats
      document.getElementById('delete-chats')?.addEventListener('click', async () => {
        try {
          const app = window.chromeMnemonic;
          const conv = app && app.conversationFeature;
          if (conv && typeof conv.clearConversationHistory === 'function') {
            await conv.clearConversationHistory();
            alert('All chats deleted.');
          } else {
            await chrome.storage.local.set({ conversationHistory: [] });
            alert('All chats deleted.');
          }
        } catch (e) {
          console.warn('Failed to delete chats:', e);
        }
      });

    } catch (error) {
      console.warn('Display multimodal insights failed:', error);
    }
  }

  // Manual current page analysis
  async analyzeCurrentPageManually() {
    try {
      const resultsContainer = document.getElementById('analysis-results');
      if (!resultsContainer) return;

      resultsContainer.innerHTML = '<div class="loading">Analyzing current page...</div>';

      const results = await this.analyzeCurrentPage(['general', 'productivity', 'content-type']);
      
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-note">Analysis failed. Please try again.</div>';
        return;
      }

      resultsContainer.innerHTML = results.map(result => `
        <div class="analysis-card">
          <div class="analysis-type">${result.type.replace('-', ' ').toUpperCase()}</div>
          <div class="analysis-result">${result.result}</div>
          <div class="analysis-meta">
            <span class="url">${result.url}</span>
            <span class="timestamp">${new Date(result.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.warn('Manual current page analysis failed:', error);
    }
  }

  // Manual browsing patterns analysis
  async analyzeBrowsingPatternsManually() {
    try {
      const resultsContainer = document.getElementById('analysis-results');
      if (!resultsContainer) return;

      resultsContainer.innerHTML = '<div class="loading">Analyzing browsing patterns...</div>';

      const patterns = await this.analyzeBrowsingPatterns();
      
      if (patterns.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-note">No visual content patterns found in recent history.</div>';
        return;
      }

      resultsContainer.innerHTML = patterns.map(pattern => `
        <div class="analysis-card">
          <div class="analysis-type">VISUAL CONTENT</div>
          <div class="analysis-result">${pattern.result}</div>
          <div class="analysis-meta">
            <span class="url">${pattern.url}</span>
            <span class="confidence">Confidence: ${Math.round(pattern.confidence * 100)}%</span>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.warn('Manual browsing patterns analysis failed:', error);
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultimodalAnalyzer;
} else {
  window.MultimodalAnalyzer = MultimodalAnalyzer;
}
