// Conversation Feature - Handles AI chat interface and conversations
class ConversationFeature {
  constructor(aiService, historyService) {
    this.aiService = aiService;
    this.historyService = historyService;
    this.conversationHistory = [];
    this.isTyping = false;
  }

  // Initialize conversation system
  async initializeConversationSystem() {
    try {
      const stored = await chrome.storage.local.get('conversationHistory');
      this.conversationHistory = stored.conversationHistory || [];
      console.log('Conversation system initialized');
      return true;
    } catch (error) {
      console.warn('Failed to initialize conversation system:', error);
      return false;
    }
  }

  // Start a conversation
  async startConversation(userMessage) {
    try {
      const response = await this.generateConversationResponse(userMessage);
      
      // Add to conversation history
      this.conversationHistory.push({
        type: 'user',
        message: userMessage,
        timestamp: Date.now()
      });
      
      this.conversationHistory.push({
        type: 'assistant',
        message: response,
        timestamp: Date.now()
      });

      // Store conversation history
      await chrome.storage.local.set({ conversationHistory: this.conversationHistory });
      
      return response;
    } catch (error) {
      console.warn('Conversation failed:', error);
      return 'I apologize, but I encountered an error. Please try again.';
    }
  }

  // Generate conversation response
  async generateConversationResponse(userMessage) {
    if (!this.aiService.aiAvailable || typeof LanguageModel === 'undefined') {
      return this.generateFallbackConversationResponse(userMessage);
    }

    try {
      const recentHistory = this.historyService.getRecentItems(20);
      const historyContext = recentHistory.map(item => 
        `${item.title} - ${new URL(item.url).hostname}`
      ).join('\n');

      const prompt = `You are Chrome Mnemonic, an AI assistant that helps users understand their browsing patterns and history. 

User's recent browsing history:
${historyContext}

User message: "${userMessage}"

Provide a helpful, conversational response about their browsing patterns, suggest related content, or answer questions about their web activity. Be friendly and insightful.`;

      return await this.aiService.withAISession('LanguageModel', {
        expectedInputs: [{ type: 'text' }]
      }, async (model) => {
        return await model.prompt(prompt, {
          outputLanguage: 'en'
        });
      });
    } catch (error) {
      console.warn('AI conversation failed:', error);
      return this.generateFallbackConversationResponse(userMessage);
    }
  }

  // Generate fallback conversation response
  async generateFallbackConversationResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('top') || message.includes('most') || message.includes('popular')) {
      return this.generateTopicsResponse();
    } else if (message.includes('learn') || message.includes('study') || message.includes('education')) {
      return this.generateLearningPatternsResponse();
    } else if (message.includes('explore') || message.includes('discover') || message.includes('find')) {
      return this.generateExplorationResponse();
    } else if (message.includes('recent') || message.includes('today') || message.includes('yesterday')) {
      return this.generateRecentActivityResponse();
    } else {
      return await this.generateIntelligentFallbackResponse(userMessage);
    }
  }

  // Generate topics response
  generateTopicsResponse() {
    const topDomains = this.historyService.getTopDomains(5);
    const domainList = topDomains.map(d => `${d.domain} (${d.count} visits)`).join(', ');
    
    return `Based on your browsing history, your top visited sites are: ${domainList}. You seem to spend most of your time on these platforms. Would you like me to analyze any specific patterns or suggest related content?`;
  }

  // Generate learning patterns response
  generateLearningPatternsResponse() {
    const learningSites = this.historyService.getHistoryByDomain('github').length + 
                         this.historyService.getHistoryByDomain('stackoverflow').length +
                         this.historyService.getHistoryByDomain('docs').length;
    
    if (learningSites > 0) {
      return `I can see you've been actively learning! You've visited ${learningSites} educational/technical sites recently. This suggests you're in a learning phase, possibly working on a project or skill development. What specific topic are you exploring?`;
    } else {
      return `I don't see many learning-focused sites in your recent history. Are you looking to start learning something new? I can help you find resources based on your interests!`;
    }
  }

  // Generate exploration response
  generateExplorationResponse() {
    const recentItems = this.historyService.getRecentItems(10);
    const uniqueDomains = new Set(recentItems.map(item => {
      try {
        return new URL(item.url).hostname;
      } catch {
        return '';
      }
    })).size;
    
    return `You've been quite exploratory lately! In your recent browsing, you've visited ${uniqueDomains} different domains. This shows you're actively discovering new content. What kind of topics are you most interested in exploring further?`;
  }

  // Generate recent activity response
  generateRecentActivityResponse() {
    const recentItems = this.historyService.getRecentItems(5);
    const activityList = recentItems.map(item => item.title).join(', ');
    
    return `Your recent activity includes: ${activityList}. You seem to be focused on these topics lately. Is there anything specific about your recent browsing patterns you'd like to understand better?`;
  }

  // Generate intelligent fallback response
  async generateIntelligentFallbackResponse(userMessage) {
    // getHistoryStats may return a Promise (worker-based) so await it
    let historyStats;
    try {
      historyStats = await this.historyService.getHistoryStats();
    } catch (e) {
      console.warn('Failed to get historyStats:', e);
      historyStats = this.historyService.getHistoryStatsFallback ? this.historyService.getHistoryStatsFallback() : { totalItems: 0, uniqueDomains: 0 };
    }

    const topDomains = this.historyService.getTopDomains(3) || [];

    // Strong defaults to avoid "undefined" showing in UI
    const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const totalItems = safeNumber(historyStats?.totalItems ?? this.historyService.historyData?.length);
    const uniqueDomains = safeNumber(historyStats?.uniqueDomains ?? new Set((this.historyService.historyData || []).map(i => {
      try { return new URL(i.url).hostname; } catch { return null; }
    }).filter(Boolean)).size);

    return `I can see you've been quite active online with ${totalItems} pages visited across ${uniqueDomains} different sites. Your top domains are ${topDomains.map(d => d.domain).join(', ')}. 

While I can't provide AI-powered insights right now, I can help you understand your browsing patterns. What would you like to know about your web activity?`;
  }

  // Display conversation interface
  displayConversationInterface() {
    const conversationContainer = document.getElementById('conversationInterface');
    if (!conversationContainer) return;

    const modeLabel = (window.chromeMnemonic && window.chromeMnemonic.aiMode === 'no-ai') ? 'NO AI' : 'CHROME LOCAL AI';
    const conversationHtml = `
      <div class="conversation-container">
        <div class="conversation-header">
          <h3>💬 Chat with Chrome Mnemonic</h3>
          <p>Ask me about your browsing patterns, get insights, or explore your web activity!</p>
          <div class="multimodal-badge">
            <span class="badge-icon">⚙️</span>
            <span class="badge-text">Mode: ${modeLabel}</span>
          </div>
          <div class="multimodal-badge">
            <span class="badge-icon">📸</span>
            <span class="badge-text">Multimodal AI Ready</span>
          </div>
        </div>

        <div class="conversation-messages" id="conversationMessages">
          ${this.renderConversationHistory()}
        </div>

        <div class="conversation-input">
          <div class="input-group">
            <input type="text" id="conversationInput" placeholder="Ask me about your browsing patterns..." />
            <button id="captureScreenshotBtn" class="screenshot-btn" title="Capture current tab screenshot">📸</button>
            <button id="deleteChatsBtn" title="Delete all chats" class="btn-secondary" style="background:#ef4444; color:#fff;">🗑️</button>
            <button id="sendMessageBtn">Send</button>
          </div>
          <div id="screenshotPreview" class="screenshot-preview" style="display: none;">
            <img id="screenshotImage" />
            <button id="removeScreenshotBtn" class="remove-screenshot">✕</button>
          </div>
          <div class="typing-indicator" id="typingIndicator" style="display: none;">
            <span>Chrome Mnemonic is typing...</span>
          </div>
        </div>

        <div class="conversation-suggestions">
          <h4>Try asking:</h4>
          <div class="suggestion-chips">
            <button class="suggestion-chip" data-query="What are my top visited sites?">Top sites</button>
            <button class="suggestion-chip" data-query="What am I learning about?">Learning patterns</button>
            <button class="suggestion-chip" data-query="Show me recent activity">Recent activity</button>
            <button class="suggestion-chip" data-query="What topics interest me?">My interests</button>
            <button class="suggestion-chip" data-query="Analyze this page with screenshot">📸 Analyze page</button>
          </div>
        </div>
      </div>
    `;

    conversationContainer.innerHTML = conversationHtml;
    this.attachConversationEventListeners();
  }

  // Render conversation history
  renderConversationHistory() {
    if (this.conversationHistory.length === 0) {
      return `
        <div class="welcome-message">
          <div class="message assistant-message">
            <div class="message-content">
              <p>👋 Hi! I'm Chrome Mnemonic, your AI browsing assistant. I can help you understand your web activity patterns, suggest related content, and answer questions about your browsing history.</p>
              <p>Try asking me about your top sites, learning patterns, or recent activity!</p>
            </div>
          </div>
        </div>
      `;
    }

    return this.conversationHistory.map(msg => `
      <div class="message ${msg.type}-message">
        <div class="message-content">
          <p>${msg.message}</p>
          <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    `).join('');
  }

  // Clear conversation history and refresh UI
  async clearConversationHistory() {
    try {
      this.conversationHistory = [];
      await chrome.storage.local.set({ conversationHistory: this.conversationHistory });
      const messagesContainer = document.getElementById('conversationMessages');
      if (messagesContainer) {
        messagesContainer.innerHTML = this.renderConversationHistory();
      }
    } catch (error) {
      console.warn('Failed to clear conversation history:', error);
    }
  }

  // Attach conversation event listeners
  attachConversationEventListeners() {
    const input = document.getElementById('conversationInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    const captureBtn = document.getElementById('captureScreenshotBtn');
    const deleteBtn = document.getElementById('deleteChatsBtn');
    const removeScreenshotBtn = document.getElementById('removeScreenshotBtn');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');

    // Send message on button click
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendConversationMessage());
    }

    // Capture screenshot
    if (captureBtn) {
      captureBtn.addEventListener('click', () => this.captureCurrentTab());
    }

    // Delete chats
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        await this.clearConversationHistory();
        // Replace messages with welcome message
        const messagesContainer = document.getElementById('conversationMessages');
        if (messagesContainer) {
          messagesContainer.innerHTML = this.renderConversationHistory();
        }
      });
    }

    // Remove screenshot
    if (removeScreenshotBtn) {
      removeScreenshotBtn.addEventListener('click', () => this.removeScreenshot());
    }

    // Send message on Enter key
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendConversationMessage();
        }
      });
    }

    // Handle suggestion chips
    suggestionChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        if (input) {
          input.value = query;
          if (query.includes('screenshot')) {
            this.captureCurrentTab().then(() => this.sendConversationMessage());
          } else {
            this.sendConversationMessage();
          }
        }
      });
    });
  }

  // Send conversation message
  async sendConversationMessage() {
    const input = document.getElementById('conversationInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Clear input
    input.value = '';

    // Get screenshot if available
    const screenshot = this.currentScreenshot;

    // Add user message to conversation
    this.addMessageToConversation('user', message, screenshot);

    // Clear screenshot after sending
    if (screenshot) {
      this.removeScreenshot();
    }

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Generate response with multimodal support
      const response = screenshot
        ? await this.generateMultimodalResponse(message, screenshot)
        : await this.generateConversationResponse(message);

      // Store in history
      this.conversationHistory.push({
        type: 'assistant',
        message: response,
        timestamp: Date.now()
      });

      await chrome.storage.local.set({ conversationHistory: this.conversationHistory });

      // Hide typing indicator
      this.hideTypingIndicator();

      // Add assistant response
      this.addMessageToConversation('assistant', response);

    } catch (error) {
      console.warn('Conversation error:', error);
      this.hideTypingIndicator();
      this.addMessageToConversation('assistant', 'I apologize, but I encountered an error. Please try again.');
    }
  }

  // Add message to conversation display
  addMessageToConversation(type, message, screenshot = null) {
    const messagesContainer = document.getElementById('conversationMessages');
    if (!messagesContainer) return;

    // Store in history
    const historyEntry = {
      type,
      message,
      timestamp: Date.now()
    };

    if (screenshot) {
      historyEntry.screenshot = {
        tabTitle: screenshot.tabTitle,
        tabUrl: screenshot.tabUrl
      };
    }

    this.conversationHistory.push(historyEntry);

    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message`;

    let screenshotHtml = '';
    if (screenshot && type === 'user') {
      screenshotHtml = `
        <div class="message-screenshot">
          <img src="${screenshot.dataUrl}" alt="Screenshot" style="max-width: 200px; border-radius: 8px; margin-top: 8px;" />
          <div class="screenshot-info" style="font-size: 11px; color: #64748b; margin-top: 4px;">
            📸 ${screenshot.tabTitle}
          </div>
        </div>
      `;
    }

    messageElement.innerHTML = `
      <div class="message-content">
        <p>${message}</p>
        ${screenshotHtml}
        <span class="message-time">${new Date().toLocaleTimeString()}</span>
      </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Show typing indicator
  showTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.style.display = 'block';
    }
  }

  // Hide typing indicator
  hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Capture current tab screenshot
  async captureCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        console.warn('No active tab found');
        return;
      }

      // Capture visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 80
      });

      // Store screenshot temporarily
      this.currentScreenshot = {
        dataUrl,
        tabTitle: tab.title,
        tabUrl: tab.url,
        timestamp: Date.now()
      };

      // Show preview
      const preview = document.getElementById('screenshotPreview');
      const image = document.getElementById('screenshotImage');

      if (preview && image) {
        image.src = dataUrl;
        preview.style.display = 'block';
      }

      console.log('Screenshot captured successfully');
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      alert('Failed to capture screenshot. Please ensure you have granted the necessary permissions.');
    }
  }

  // Remove screenshot
  removeScreenshot() {
    this.currentScreenshot = null;
    const preview = document.getElementById('screenshotPreview');
    const image = document.getElementById('screenshotImage');

    if (preview) {
      preview.style.display = 'none';
    }
    if (image) {
      image.src = '';
    }
  }

  // Enhanced conversation response with multimodal support
  async generateMultimodalResponse(userMessage, screenshot) {
    if (!this.aiService.aiAvailable || typeof LanguageModel === 'undefined') {
      return this.generateFallbackMultimodalResponse(userMessage, screenshot);
    }

    try {
      const recentHistory = this.historyService.getRecentItems(20);
      const historyContext = recentHistory.map(item =>
        `${item.title} - ${new URL(item.url).hostname}`
      ).join('\n');

      let prompt = `You are Chrome Mnemonic, an AI assistant with multimodal capabilities. You can analyze both text and images.

User's recent browsing history:
${historyContext}

`;

      if (screenshot) {
        prompt += `The user has shared a screenshot of the page: "${screenshot.tabTitle}" (${screenshot.tabUrl})

Analyze the screenshot and provide insights about:
1. What the page appears to be about
2. Key visual elements or content visible
3. How it relates to their browsing patterns
4. Any recommendations based on the content

`;
      }

      prompt += `User message: "${userMessage}"

Provide a helpful, conversational response.`;

      // Use Prompt API with multimodal input if screenshot exists
      if (screenshot && screenshot.dataUrl) {
        // Convert data URL to blob for multimodal input
        const response = await fetch(screenshot.dataUrl);
        const blob = await response.blob();

        return await this.aiService.withAISession('LanguageModel', {
          expectedInputs: [
            { type: 'text' },
            { type: 'image', mimeType: 'image/png' }
          ]
        }, async (model) => {
          return await model.prompt(prompt, {
            images: [blob],
            outputLanguage: 'en'
          });
        });
      } else {
        // Text-only response
        return await this.aiService.withAISession('LanguageModel', {
          expectedInputs: [{ type: 'text' }]
        }, async (model) => {
          return await model.prompt(prompt, {
            outputLanguage: 'en'
          });
        });
      }
    } catch (error) {
      console.warn('Multimodal AI conversation failed:', error);
      return this.generateFallbackMultimodalResponse(userMessage, screenshot);
    }
  }

  // Fallback multimodal response
  async generateFallbackMultimodalResponse(userMessage, screenshot) {
    if (screenshot) {
      const intelligent = await this.generateIntelligentFallbackResponse(userMessage);
      return `📸 I can see you've shared a screenshot of "${screenshot.tabTitle}". While I can't analyze the image directly without AI capabilities, I can tell you that you were viewing ${new URL(screenshot.tabUrl).hostname}.

Based on your browsing history, ${intelligent}`;
    }
    return await this.generateFallbackConversationResponse(userMessage);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConversationFeature;
} else {
  window.ConversationFeature = ConversationFeature;
}
