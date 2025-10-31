// Chrome Mnemonic - Main UI Controller
// This is now a lightweight controller that orchestrates the modular services and features

class ChromeMnemonic {
  constructor() {
    this.currentTab = 'summary';
    this.currentAgent = 'Local basic';
    this.aiMode = null; // 'no-ai', 'chrome-ai', 'gemini-ai'
    this.basicAIService = null;
    
    // Initialize services
    this.loadingManager = new LoadingManager();
    this.cacheManager = new CacheManager();
    this.aiImpactTracker = new AIImpactTracker();
    this.hybridAIService = new HybridAIService();
    this.aiService = this.hybridAIService; // Use hybrid service as main AI service

    // Make AI impact tracker globally accessible for tracking
    window.aiImpactTracker = this.aiImpactTracker;

    this.historyService = new HistoryService();
    this.searchService = new SearchService(this.aiService, this.historyService);
    
    // Initialize responsive design
    this.initializeResponsiveDesign();
    
    // Control rapid tab switching to prevent overlapping heavy work
    this.tabDebounceTimer = null;
    
    // Initialize features
    this.clusteringFeature = new ClusteringFeature(this.aiService, this.historyService);
    this.conversationFeature = new ConversationFeature(this.aiService, this.historyService);
    this.qualityAnalysisFeature = new QualityAnalysisFeature(this.aiService, this.historyService);
    this.proactiveAssistantFeature = new ProactiveAssistantFeature(this.aiService, this.historyService, this.cacheManager);
    this.multimodalAnalyzer = new MultimodalAnalyzer(this.aiService, this.historyService, this.cacheManager);
    
    // Make loading manager globally accessible
    window.loadingManager = this.loadingManager;

    // Monitor offline/online status
    this.initializeOfflineMonitor();

    this.initialize();
  }

  // Initialize offline monitoring
  initializeOfflineMonitor() {
    const updateOfflineIndicator = () => {
      const indicator = document.getElementById('offlineIndicator');
      if (!indicator) return;

      if (!navigator.onLine) {
        indicator.style.display = 'flex';
        console.log('🔌 Offline mode detected - Chrome AI still working');

        // Track offline operation
        if (this.aiImpactTracker && this.aiMode === 'chrome-ai') {
          // Note: We don't track here, but this shows the system is offline-capable
        }
      } else {
        indicator.style.display = 'none';
      }
    };

    // Check initially
    updateOfflineIndicator();

    // Listen for online/offline events
    window.addEventListener('online', updateOfflineIndicator);
    window.addEventListener('offline', updateOfflineIndicator);
  }

  async initialize() {
    // Always show AI mode selection modal on every load
    this.showAIModeModal();
    return; // Don't initialize until mode is selected

    const progress = this.loadingManager.showProgress('initialization', [
      'Checking AI availability',
      'Loading browsing history',
      'Initializing search notifications',
      'Setting up user interface',
      'Loading priority features'
    ]);

    try {
      console.log('Initializing Chrome Mnemonic...');
      
      // Initialize with selected mode
      await this.initializeWithMode(savedMode);
      
      // Check AI availability with error handling
      try {
        progress.nextStep('Checking AI availability');
        console.log('AI service initialized');
      } catch (aiError) {
        console.warn('AI service initialization failed:', aiError);
        // Continue without AI features
      }
      
      // Load history data with error handling
      try {
        progress.nextStep('Loading browsing history');
        await this.historyService.getHistory();
        console.log('History data loaded');
      } catch (historyError) {
        console.error('Failed to load history:', historyError);
        this.showError('Failed to load browsing history. Please try again.');
        progress.complete();
        return;
      }
      
      // Initialize search notifications with error handling
      try {
        progress.nextStep('Initializing search notifications');
        await this.searchService.initializeSearchPatterns();
        this.searchService.startUniversalSearchMonitoring();
        console.log('Search notifications initialized');
      } catch (searchError) {
        console.warn('Search notifications initialization failed:', searchError);
        // Continue without search notifications
      }
      
      // Setup UI with error handling
      try {
        progress.nextStep('Setting up user interface');
        this.initializeTabs();
        this.attachEventListeners();
        this.resetTabState(); // Always start fresh
        console.log('UI initialized');
      } catch (uiError) {
        console.error('UI initialization failed:', uiError);
        this.showError('Failed to initialize user interface');
        progress.complete();
        return;
      }
      
      // Load priority features first with error handling
      try {
        progress.nextStep('Loading priority features');
        await this.loadPriorityFeatures();
        console.log('Priority features loaded');
      } catch (priorityError) {
        console.warn('Priority features loading failed:', priorityError);
        // Show basic UI even if priority features fail
        this.displayBasicContent();
      }
      
      // Initialize the default tab content (always start with Summary)
      try {
        this.currentTab = 'summary'; // Force summary tab
        await this.loadTabContent('summary');
      } catch (tabError) {
        console.warn('Failed to load initial tab content:', tabError);
        this.displayBasicContent();
      }
      
      // Load secondary features in background (non-blocking)
      try {
        this.loadSecondaryFeatures();
        console.log('Secondary features loading scheduled');
      } catch (secondaryError) {
        console.warn('Secondary features scheduling failed:', secondaryError);
        // Continue without secondary features
      }
      
      // Setup cleanup
      try {
        window.addEventListener('beforeunload', () => {
          this.cleanup();
        });
      } catch (cleanupError) {
        console.warn('Cleanup setup failed:', cleanupError);
      }
      
      progress.complete();
      console.log('Chrome Mnemonic initialized successfully');
    } catch (error) {
      console.error('Chrome Mnemonic initialization error:', error);
      this.showError(`Failed to initialize Chrome Mnemonic: ${error.message}`);
      progress.complete();
    }
  }

  // Show AI mode selection modal
  async showAIModeModal() {
    const modal = document.getElementById('aiModeModal');
    if (!modal) return;

    modal.style.display = 'flex';
    
    // Add event listeners
    this.attachAIModeListeners();

    // Ensure settings are loaded so we can gate Gemini availability
    try {
      if (this.hybridAIService && typeof this.hybridAIService.initialize === 'function') {
        await this.hybridAIService.initialize();
      }
    } catch (_) {}

    // Update availability (disable Gemini if no key)
    this.updateAIModeAvailability();
    
    // Set default selection
    const noAIOption = document.getElementById('mode-no-ai');
    if (noAIOption) {
      noAIOption.checked = true;
      this.updateAIModeSelection('no-ai');
    }
  }

  // Disable/enable AI mode options based on configuration
  updateAIModeAvailability() {
    try {
      const config = this.hybridAIService.getConfiguration();
      const geminiOption = document.querySelector('.ai-mode-option[data-mode="gemini-ai"]');
      const geminiRadio = document.getElementById('mode-gemini-ai');

      if (geminiOption && geminiRadio) {
        if (!config.hasApiKey) {
          geminiOption.classList.add('disabled');
          geminiOption.style.opacity = '0.5';
          geminiOption.style.pointerEvents = 'none';
          geminiRadio.disabled = true;
        } else {
          geminiOption.classList.remove('disabled');
          geminiOption.style.opacity = '';
          geminiOption.style.pointerEvents = '';
          geminiRadio.disabled = false;
        }
      }
    } catch (_) {}
  }

  // Hide AI mode selection modal
  hideAIModeModal() {
    const modal = document.getElementById('aiModeModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Attach AI mode modal event listeners
  attachAIModeListeners() {
    // Radio button changes
    const radioButtons = document.querySelectorAll('input[name="aiMode"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.updateAIModeSelection(e.target.value);
      });
    });

    // Option clicks
    const options = document.querySelectorAll('.ai-mode-option');
    options.forEach(option => {
      option.addEventListener('click', () => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          this.updateAIModeSelection(radio.value);
        }
      });
    });

    // Continue button
    const continueBtn = document.getElementById('aiModeContinue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => this.handleAIModeContinue());
    }

    // Settings button
    const settingsBtn = document.getElementById('aiModeSettings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleAIModeSettings());
    }

    // Close button
    const closeBtn = document.getElementById('aiModeClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideAIModeModal());
    }
  }

  // Update AI mode selection visual state
  updateAIModeSelection(mode) {
    const options = document.querySelectorAll('.ai-mode-option');
    options.forEach(option => {
      option.classList.remove('selected');
      const radio = option.querySelector('input[type="radio"]');
      if (radio && radio.value === mode) {
        option.classList.add('selected');
      }
    });
  }

  // Handle AI mode continue
  async handleAIModeContinue() {
    const selectedMode = document.querySelector('input[name="aiMode"]:checked');
    if (!selectedMode) return;

    const mode = selectedMode.value;
    
    // Prevent selecting Gemini without a saved key
    if (mode === 'gemini-ai') {
      const config = this.hybridAIService.getConfiguration();
      if (!config.hasApiKey) {
        alert('Please enter and save your Gemini API key in Settings first.');
        return;
      }
    }
    
    // Don't save AI mode preference - show modal on every load
    // await this.saveAIMode(mode);
    
    // Hide modal
    this.hideAIModeModal();
    
    // Initialize with selected mode
    await this.initializeWithMode(mode);
    
    // Start the main initialization (skip the modal check)
    await this.initializeWithSelectedMode(mode);
  }

  // Handle AI mode settings
  handleAIModeSettings() {
    // Switch to settings tab
    this.switchTab('settings');
    this.hideAIModeModal();
  }

  // Save AI mode preference
  async saveAIMode(mode) {
    try {
      await chrome.storage.local.set({ aiMode: mode });
      console.log(`AI mode saved: ${mode}`);
    } catch (error) {
      console.error('Failed to save AI mode:', error);
    }
  }

  // Get saved AI mode preference
  async getAIMode() {
    try {
      const result = await chrome.storage.local.get(['aiMode']);
      return result.aiMode || null;
    } catch (error) {
      console.error('Failed to get AI mode:', error);
      return null;
    }
  }

  // Initialize with specific AI mode
  async initializeWithMode(mode) {
    this.aiMode = mode;
    
    if (mode === 'no-ai') {
      // Initialize basic AI service
      this.basicAIService = new BasicAIService();
      await this.basicAIService.initialize();
      this.aiService = this.basicAIService;
      console.log('🔧 Using Basic AI Service (No AI mode)');
    } else {
      // Initialize full AI services (this loads settings including API key)
      await this.hybridAIService.initialize();
      
      // Configure hybrid service based on mode
      if (mode === 'gemini-ai') {
        // Check if API key exists before enabling Gemini
        const config = this.hybridAIService.getConfiguration();
        if (config.hasApiKey) {
          await this.hybridAIService.setUseGemini(true);
          console.log('🌐 Using Gemini API mode');
        } else {
          console.warn('⚠️ Gemini mode selected but no API key found. Falling back to Chrome AI.');
          await this.hybridAIService.setUseGemini(false);
          mode = 'chrome-ai'; // Fallback to Chrome AI
          this.aiMode = 'chrome-ai';
        }
      } else {
        await this.hybridAIService.setUseGemini(false);
        console.log('💻 Using Chrome AI mode');
      }
      
      this.aiService = this.hybridAIService;
    }
  }

  // Initialize with selected mode (skips modal check)
  async initializeWithSelectedMode(mode) {
    const progress = this.loadingManager.showProgress('initialization', [
      'Checking AI availability',
      'Loading browsing history',
      'Initializing search notifications',
      'Setting up user interface',
      'Loading priority features'
    ]);

    try {
      console.log('Initializing Chrome Mnemonic...');
      
      // Initialize with selected mode
      await this.initializeWithMode(mode);
      
      // Check AI availability with error handling
      try {
        progress.nextStep('Checking AI availability');
        console.log('AI service initialized');
      } catch (aiError) {
        console.warn('AI service initialization failed:', aiError);
        // Continue without AI features
      }
      
      // Load history data with error handling
      try {
        progress.nextStep('Loading browsing history');
        await this.historyService.getHistory();
        console.log('History data loaded');
      } catch (historyError) {
        console.error('Failed to load history:', historyError);
        this.showError('Failed to load browsing history. Please try again.');
        progress.complete();
        return;
      }
      
      // Initialize search notifications with error handling
      try {
        progress.nextStep('Initializing search notifications');
        await this.searchService.initializeSearchPatterns();
        this.searchService.startUniversalSearchMonitoring();
        console.log('Search notifications initialized');
      } catch (searchError) {
        console.warn('Search notifications initialization failed:', searchError);
        // Continue without search notifications
      }
      
      // Setup UI with error handling
      try {
        progress.nextStep('Setting up user interface');
        this.initializeTabs();
        this.attachEventListeners();
        console.log('UI initialized');
      } catch (uiError) {
        console.warn('UI initialization failed:', uiError);
        // Continue with basic UI
      }
      
      // Load priority features
      try {
        progress.nextStep('Loading priority features');
        await this.loadPriorityFeatures();
        console.log('Priority features loaded');
      } catch (priorityError) {
        console.warn('Priority features loading failed:', priorityError);
        // Continue without priority features
      }
      
      // Setup cleanup handlers
      try {
        this.setupCleanupHandlers();
        console.log('Cleanup handlers setup');
      } catch (cleanupError) {
        console.warn('Cleanup setup failed:', cleanupError);
      }
      
      progress.complete();
      console.log('Chrome Mnemonic initialized successfully');
    } catch (error) {
      console.error('Chrome Mnemonic initialization error:', error);
      this.showError(`Failed to initialize Chrome Mnemonic: ${error.message}`);
      progress.complete();
    }
  }

  // Get AI mode display name
  getAIModeDisplayName() {
    const modeNames = {
      'no-ai': '🚫 No AI Mode',
      'chrome-ai': '💻 Chrome AI Mode', 
      'gemini-ai': '🌐 Gemini API Mode'
    };
    return modeNames[this.aiMode] || 'Not selected';
  }

  // Get AI mode description
  getAIModeDescription() {
    const descriptions = {
      'no-ai': 'Fast, lightweight mode with basic clustering and simple summaries. Always works, no external dependencies.',
      'chrome-ai': 'On-device AI processing using Chrome\'s built-in AI APIs. Requires Canary Chrome, may be unstable.',
      'gemini-ai': 'Cloud-based AI processing using Google Gemini API. Most reliable, requires API key.'
    };
    return descriptions[this.aiMode] || 'Select an AI mode to see description';
  }

  // Load priority features (fast, essential)
  async loadPriorityFeatures() {
    try {
      console.log('Loading priority features...');
      
      // Priority 1: Essential UI elements
      try {
        await this.conversationFeature.displayConversationInterface();
        console.log('✓ Conversation interface loaded');
      } catch (conversationError) {
        console.warn('Conversation interface failed:', conversationError);
      }
      
      // Priority 2: Basic AI features
      if (this.aiService.aiAvailable) {
        try {
          await this.conversationFeature.initializeConversationSystem();
          console.log('✓ Basic AI features loaded');
        } catch (aiError) {
          console.warn('AI features failed:', aiError);
        }
      }
      
      // Priority 3: Core analysis (handled by tab system)
      console.log('✓ Core content will be loaded by tab system');
      
      console.log('Priority features loaded successfully');
    } catch (error) {
      console.warn('Priority features loading failed:', error);
      // Show basic content as fallback
      this.displayBasicContent();
    }
  }

  // Display basic content as fallback
  displayBasicContent() {
    try {
      const content = document.getElementById('content');
      if (!content) return;

      // Hide loading state
      const loadingState = document.getElementById('loadingState');
      if (loadingState) {
        loadingState.style.display = 'none';
      }

      const basicHtml = `
        <div class="ai-status">⚠️ Basic Mode - Some features may be limited</div>
        <div class="sessions-container">
          <div class="session-card">
            <div class="session-title">Chrome Mnemonic</div>
            <div class="session-summary">Your AI-powered browsing assistant is running in basic mode. Some advanced features may be unavailable.</div>
            <div class="session-meta">Try refreshing the extension or check the console for details.</div>
          </div>
        </div>
      `;

      content.innerHTML = basicHtml;
    } catch (error) {
      console.error('Failed to display basic content:', error);
    }
  }

  // Load secondary features in background (reduced load)
  loadSecondaryFeatures() {
    setTimeout(async () => {
      try {
        console.log('Loading secondary features in background (lightweight mode)...');
        
        // Only load essential secondary features with longer delays
        setTimeout(async () => {
          try {
            // Only initialize, don't run heavy operations
            await this.qualityAnalysisFeature.initializeProofreaderAPI();
            console.log('✓ Quality analysis initialized');
          } catch (error) {
            console.warn('Quality analysis initialization failed:', error);
          }
        }, 10000); // Increased delay
        
        setTimeout(async () => {
          try {
            // Only display basic clusters, no heavy analysis
            await this.clusteringFeature.displayEnhancedClusters();
            console.log('✓ Basic clustering loaded');
          } catch (error) {
            console.warn('Clustering failed:', error);
          }
        }, 20000); // Increased delay
        
        console.log('Secondary features loading scheduled (lightweight mode)');
      } catch (error) {
        console.warn('Secondary features loading failed:', error);
      }
    }, 2000); // Increased initial delay
  }

  // Hide all content areas
  hideAllContentAreas() {
    const contentAreas = [
      'summary-content',
      'sessions-content', 
      'clusters-content',
      'recent-content',
      'metrics-content',
      'settings-content',
      'conversationInterface',
      'contentQualityInsights',
      'intentInsights',
      'temporalInsights',
      'multilingualInsights',
      'multimodalInsights'
    ];
    
    contentAreas.forEach(areaId => {
      const area = document.getElementById(areaId);
      if (area) {
        area.style.display = 'none';
      }
    });
  }

  // Display summary content (preserves tabs)
  async displaySummaryContent() {
    try {
      // Ensure history is loaded
      try {
        if (!Array.isArray(this.historyService.historyData) || this.historyService.historyData.length === 0) {
          const loadedHistory = await this.historyService.getHistory();
          // IMPORTANT: Update historyData after loading
          if (Array.isArray(loadedHistory) && loadedHistory.length > 0) {
            this.historyService.historyData = loadedHistory;
          }
        }
      } catch (e) { 
        console.warn('Failed to load history for summary:', e); 
      }

      // Hide loading state
      const loadingState = document.getElementById('loadingState');
      if (loadingState) {
        loadingState.style.display = 'none';
      }

      // Show AI status
      let memoryStatus = '';
      try {
        if (this.aiService && this.aiService.aiSessionManager && typeof this.aiService.aiSessionManager.getSessionCount === 'function') {
          const sessionCount = this.aiService.aiSessionManager.getSessionCount();
          memoryStatus = sessionCount > 0 ? ` • Active Sessions: ${sessionCount}` : '';
        }
      } catch (e) {
        console.warn('Failed to get session count:', e);
      }
      
      // Get provider status - handle all modes
      let providerStatus = '💻 On-device (Chrome AI)';
      if (this.aiMode === 'no-ai') {
        providerStatus = '🔧 Basic Mode';
      } else if (this.hybridAIService) {
        try {
          const config = this.hybridAIService.getConfiguration();
          providerStatus = config.activeProvider === 'Gemini' ? '🌐 Cloud (Gemini)' : '💻 On-device (Chrome AI)';
        } catch (e) {
          console.warn('Failed to get hybrid AI config:', e);
          // Use default status
          providerStatus = this.aiMode === 'gemini-ai' ? '🌐 Cloud (Gemini)' : '💻 On-device (Chrome AI)';
        }
      }
      
      // Create collapsible AI agents list
      let aiAgentsList = '';
      try {
        aiAgentsList = this.createAIAgentsList(providerStatus, memoryStatus);
      } catch (e) {
        console.warn('Failed to create AI agents list:', e);
        aiAgentsList = '';
      }
      
      // Simplified AI status without the verbose message
      let aiStatus = '';
      if (this.aiMode === 'no-ai') {
        aiStatus = `<div class="ai-status">🔧 Basic Mode • Fast, lightweight, always works${memoryStatus}</div>`;
      } else if (this.aiService) {
        aiStatus = this.aiService.aiAvailable ? 
          `<div class="ai-status">✅ ${providerStatus} • ${this.aiService.aiAvailabilityNote || 'AI Available'}${memoryStatus}</div>` : 
          `<div class="ai-status">⚠️ ${providerStatus} • ${this.aiService.aiAvailabilityNote || 'Initializing...'}${memoryStatus}</div>`;
      } else {
        // Fallback if aiService not yet initialized
        aiStatus = `<div class="ai-status">⏳ ${providerStatus} • Initializing...${memoryStatus}</div>`;
      }

      // Group history by day (async via Web Worker)
      let groupedHistory = [];
      try {
        groupedHistory = await this.historyService.groupHistoryByDay();
      } catch (e) {
        console.warn('Failed to group history:', e);
      }
      
      let sessionsHtml = '';
      // Add basic content for No AI mode
      if (this.aiMode === 'no-ai') {
        sessionsHtml = `
          <div class="basic-mode-info">
            <h3>🔧 Basic Mode Active</h3>
            <p>You're using the lightweight, no-AI mode. This provides basic functionality without external dependencies.</p>
            <div class="basic-features">
              <div class="feature-item">✅ Basic history grouping</div>
              <div class="feature-item">✅ Simple clustering</div>
              <div class="feature-item">✅ Fast loading</div>
              <div class="feature-item">✅ Always stable</div>
            </div>
          </div>
        `;
      }

      (Array.isArray(groupedHistory) ? groupedHistory : []).slice(0, 5).forEach(day => {
        const timeAgo = this.getTimeAgo(day.date);
        sessionsHtml += `
          <div class="history-group">
            <div class="history-group-header">
              <div class="history-group-title">${day.date.toDateString()}</div>
              <div class="history-group-time">${timeAgo}</div>
              <div class="history-group-menu">⋮</div>
            </div>
            ${day.items.slice(0, 3).map(item => {
              const icon = URLUtils.getURLIcon(item.url);
              const domain = (() => { try { return new URL(item.url).hostname; } catch { return item.url; } })();
              return `
                <a class="history-item" href="${item.url}" target="_blank" rel="noopener noreferrer">
                  <div class="history-item-icon">${icon}</div>
                  <div class="history-item-content">
                    <div class="history-item-title">${item.title}</div>
                    <div class="history-item-url">
                      <span class="url-icon">${icon}</span>
                      <span class="url-text">${domain}</span>
                    </div>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        `;
      });

      // Hide other content areas and show summary
      this.hideAllContentAreas();
      
      const summaryContent = document.getElementById('summary-content');
      if (summaryContent) {
        summaryContent.style.display = 'block';
        summaryContent.innerHTML = `
          ${aiAgentsList}
          ${aiStatus}
          <div id="suggestions-panel" class="suggestions-container"></div>
          <div class="sessions-container">
            ${sessionsHtml || '<div class="empty-note">No history data available. Start browsing to see your history here.</div>'}
          </div>
        `;
      } else {
        // Fallback to main content area
        const content = document.getElementById('content');
        if (content) {
          content.innerHTML = `
            ${aiAgentsList}
            ${aiStatus}
            <div id="suggestions-panel" class="suggestions-container"></div>
            <div class="sessions-container">
              ${sessionsHtml || '<div class="empty-note">No history data available. Start browsing to see your history here.</div>'}
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('displaySummaryContent error:', error);
      // Always show something, even on error
      const summaryContent = document.getElementById('summary-content');
      const content = document.getElementById('content');
      const target = summaryContent || content;
      if (target) {
        target.style.display = 'block';
        target.innerHTML = `
          <div class="ai-status">⚠️ Error Loading Content</div>
          <div class="error">Failed to load summary: ${error.message}</div>
          <div style="margin-top: 12px;">
            <button onclick="location.reload()" class="action-btn">Reload Extension</button>
          </div>
        `;
      }
    }
    
    // Show the conversation interface
    const conversationContainer = document.getElementById('conversationInterface');
    if (conversationContainer) {
      conversationContainer.style.display = 'block';
      this.conversationFeature.displayConversationInterface();
    }

    // Add event listener for AI agents toggle
    setTimeout(() => {
      const toggle = document.getElementById('ai-agents-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => this.toggleAIAgents());
      }
    }, 100);

    // Display proactive suggestions panel
    if (this.proactiveAssistantFeature && typeof this.proactiveAssistantFeature.displaySuggestions === 'function') {
      try {
        await this.proactiveAssistantFeature.displaySuggestions('suggestions-panel');
      } catch (e) {
        console.warn('Failed to render suggestions:', e);
      }
    }

    // Display multimodal insights only if Prompt API is available
    if (this.multimodalAnalyzer && typeof this.multimodalAnalyzer.displayMultimodalInsights === 'function') {
      try {
        const promptAvailable = await this.multimodalAnalyzer.checkPromptAPIAvailability?.();
        if (promptAvailable) {
          const multimodalContainer = document.getElementById('multimodalInsights');
          if (multimodalContainer) {
            multimodalContainer.style.display = 'block';
            await this.multimodalAnalyzer.displayMultimodalInsights('multimodalInsights');
          }
        }
      } catch (e) {
        console.warn('Failed to render multimodal insights:', e);
      }
    }
  }

  // Display settings tab
  async displaySettingsTab() {
    try {
      this.hideAllContentAreas();
      const settingsContent = document.getElementById('settings-content');
      if (settingsContent) {
        settingsContent.style.display = 'block';
      }

      // Get configuration based on current AI mode
      let config, availability;
      let geminiKeyValue = '';
      if (this.aiMode === 'no-ai') {
        config = { useGemini: false, activeProvider: 'Basic' };
        availability = { chrome: false, gemini: false };
      } else {
        config = this.hybridAIService.getConfiguration();
        availability = await this.hybridAIService.checkAIAvailability();
        // Get actual Gemini key value for display
        try {
          const stored = await chrome.storage.local.get('geminiApiKey');
          geminiKeyValue = stored.geminiApiKey || '';
          // If user is in gemini-ai mode but config doesn't reflect it, update config
          if (this.aiMode === 'gemini-ai' && !config.useGemini && geminiKeyValue) {
            config.useGemini = true;
          }
        } catch {}
      }

      settingsContent.innerHTML = `
        <div class="settings-section">
          <div class="settings-title">🤖 AI Mode</div>
          <div class="ai-mode-display">
            <div class="current-mode">
              <span class="mode-label">Current Mode:</span>
              <span class="mode-value" id="currentAIMode">${this.getAIModeDisplayName()}</span>
            </div>
            <button id="changeAIMode" class="btn-secondary">Change Mode</button>
          </div>
          <div class="ai-mode-description" id="aiModeDescription">
            ${this.getAIModeDescription()}
          </div>
        </div>
        
        <div class="settings-section">
          <div class="settings-title">🔧 AI Configuration</div>
          ${this.aiMode === 'no-ai' ? `
            <div class="settings-description">
              You're currently using Basic Mode. Switch to an AI mode above to access advanced features.
            </div>
            <div class="basic-mode-notice">
              <div class="notice-icon">🔧</div>
              <div class="notice-text">
                <strong>Basic Mode Active</strong><br>
                This mode provides basic functionality without AI features. It's fast, stable, and always works.
              </div>
            </div>
          ` : `
            <div class="settings-description">
              Choose your AI provider. Chrome AI runs on-device for privacy, while Gemini API provides cloud-based processing.
            </div>
            
            <div class="ai-provider-option ${!config.useGemini ? 'selected' : ''}" data-provider="chrome">
              <input type="radio" name="ai-provider" value="chrome" ${!config.useGemini ? 'checked' : ''}>
              <div class="ai-provider-info">
                <div class="ai-provider-name">
                  <span class="status-indicator ${availability.chrome ? 'status-online' : 'status-offline'}"></span>
                  Chrome AI (On-device)
                </div>
                <div class="ai-provider-description">
                  Free, private, runs locally on your device. No internet required after initial setup.
                </div>
              </div>
            </div>
            
            <div class="ai-provider-option ${config.useGemini ? 'selected' : ''}" data-provider="gemini">
              <input type="radio" name="ai-provider" value="gemini" ${config.useGemini ? 'checked' : ''}>
              <div class="ai-provider-info">
                <div class="ai-provider-name">
                  <span class="status-indicator ${availability.gemini ? 'status-online' : 'status-offline'}"></span>
                  Gemini API (Cloud)
                </div>
                <div class="ai-provider-description">
                  Google's advanced AI model. Requires API key and internet connection. More powerful but uses your API quota.
                </div>
              </div>
            </div>
          `}
          
          <div id="gemini-config" style="display: ${config.useGemini || geminiKeyValue ? 'block' : 'none'};">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <input type="password" id="gemini-api-key" class="api-key-input" 
                     placeholder="Enter your Gemini API key..." 
                     value="${geminiKeyValue || ''}"
                     style="flex: 1;">
              <button id="toggle-key-visibility" style="padding: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer;">👁️</button>
            </div>
            <div style="font-size: 12px; color: #6c757d; margin-top: 8px;">
              ${geminiKeyValue ? `<strong>Current key:</strong> ${geminiKeyValue.substring(0, 20)}...<br>` : ''}
              Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a><br>
              <strong>API Version:</strong> Use v1beta API (models/gemini-1.5-flash)
            </div>
          </div>
          
          <div class="settings-actions">
            <button id="save-ai-settings" class="btn-primary">Save Settings</button>
            <button id="test-connection" class="btn-secondary">Test Connection</button>
            <button id="delete-gemini-key" class="btn-secondary" style="background: #ef4444;">Delete Key</button>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="settings-title">📊 Current Status</div>
          <div style="font-size: 14px; color: #495057;">
            <div><strong>Active Provider:</strong> ${config.activeProvider}</div>
            <div><strong>Chrome AI:</strong> ${availability.chrome ? '✅ Available' : '❌ Unavailable'}</div>
            <div><strong>Gemini API:</strong> ${availability.gemini ? '✅ Available' : '❌ Unavailable'}</div>
          </div>
        </div>

        ${await this.renderAIImpactSection()}
      `;

      // Add event listeners
      this.attachSettingsEventListeners();
      
      // Ensure gemini-config is visible if Gemini is selected or key exists
      if (config.useGemini || geminiKeyValue) {
        const geminiConfig = document.getElementById('gemini-config');
        if (geminiConfig) {
          geminiConfig.style.display = 'block';
        }
      }
    } catch (error) {
      console.warn('Failed to display settings tab:', error);
    }
  }

  // Attach settings event listeners
  attachSettingsEventListeners() {
    // AI provider selection
    document.querySelectorAll('.ai-provider-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.ai-provider-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        option.querySelector('input[type="radio"]').checked = true;
        
        const provider = option.dataset.provider;
        const geminiConfig = document.getElementById('gemini-config');
        if (geminiConfig) {
          geminiConfig.style.display = provider === 'gemini' ? 'block' : 'none';
        }
      });
    });

    // Toggle key visibility
    document.getElementById('toggle-key-visibility')?.addEventListener('click', () => {
      const input = document.getElementById('gemini-api-key');
      const toggle = document.getElementById('toggle-key-visibility');
      if (input && toggle) {
        if (input.type === 'password') {
          input.type = 'text';
          toggle.textContent = '🙈';
        } else {
          input.type = 'password';
          toggle.textContent = '👁️';
        }
      }
    });

    // Save settings
    document.getElementById('save-ai-settings')?.addEventListener('click', async () => {
      try {
        const selectedEl = document.querySelector('input[name="ai-provider"]:checked');
        const selectedProvider = selectedEl ? selectedEl.value : (this.aiMode === 'gemini-ai' ? 'gemini' : 'chrome');
        const apiKeyInput = document.getElementById('gemini-api-key');
        const newApiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        
        // Get existing key if new key is empty
        let apiKey = newApiKey;
        if (selectedProvider === 'gemini' && !newApiKey) {
          // Check if we have an existing saved key
          const config = this.hybridAIService.getConfiguration();
          if (config.hasApiKey && this.hybridAIService.geminiApiKey) {
            apiKey = this.hybridAIService.geminiApiKey; // Use existing key
            console.log('Using existing saved API key');
          } else {
            alert('Please enter your Gemini API key');
            return;
          }
        }

        await this.hybridAIService.saveSettings(selectedProvider === 'gemini', apiKey);

        // Re-initialize services based on new provider without full reload
        if (selectedProvider === 'gemini') {
          await this.initializeWithMode('gemini-ai');
        } else {
          await this.initializeWithMode('chrome-ai');
        }

        alert('Settings saved successfully!');
        
        // Refresh the settings display
        await this.displaySettingsTab();
      } catch (error) {
        console.warn('Failed to save settings:', error);
        alert('Failed to save settings: ' + error.message);
      }
    });

    // Test connection
    document.getElementById('test-connection')?.addEventListener('click', async () => {
      try {
        const selectedEl = document.querySelector('input[name="ai-provider"]:checked');
        const selectedProvider = selectedEl ? selectedEl.value : (this.aiMode === 'gemini-ai' ? 'gemini' : 'chrome');
        const apiKeyInput = document.getElementById('gemini-api-key');
        const apiKey = apiKeyInput ? apiKeyInput.value : '';
        
        if (selectedProvider === 'gemini') {
          if (!apiKey) {
            alert('Please enter your Gemini API key first');
            return;
          }
          
          const result = await this.hybridAIService.validateGeminiApiKey(apiKey);
          if (result.valid) {
            alert('✅ Connection successful! Your API key is valid.');
          } else {
            alert('❌ Connection failed: ' + result.message);
          }
        } else {
          const availability = await this.hybridAIService.checkAIAvailability();
          if (availability.chrome) {
            alert('✅ Chrome AI is available and working!');
          } else {
            alert('❌ Chrome AI is not available. Please check your Chrome version and AI settings.');
          }
        }
      } catch (error) {
        console.warn('Connection test failed:', error);
        alert('❌ Connection test failed: ' + error.message);
      }
    });

    // Delete Gemini API key
    document.getElementById('delete-gemini-key')?.addEventListener('click', async () => {
      try {
        await this.hybridAIService.saveSettings(false, '');
        alert('Gemini API key deleted. Gemini mode disabled.');
        // Refresh UI
        await this.displaySettingsTab();
        // Update modal availability if open
        this.updateAIModeAvailability();
      } catch (error) {
        console.warn('Failed to delete Gemini key:', error);
        alert('Failed to delete key: ' + error.message);
      }
    });

    // Change AI mode
    document.getElementById('changeAIMode')?.addEventListener('click', () => {
      this.showAIModeModal();
    });

    // Export AI Impact Report
    document.getElementById('exportAIImpact')?.addEventListener('click', () => {
      this.exportAIImpactReport();
    });

    // Reset AI Impact Stats
    document.getElementById('resetAIImpact')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all AI impact statistics? This cannot be undone.')) {
        await this.aiImpactTracker.resetStats();
        alert('✅ AI Impact statistics have been reset.');
        this.displaySettingsTab(); // Refresh the display
      }
    });
  }

  // Export AI Impact Report
  exportAIImpactReport() {
    try {
      const stats = this.aiImpactTracker.exportStats();
      const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chrome-mnemonic-ai-impact-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('AI Impact report exported successfully');
    } catch (error) {
      console.warn('Failed to export AI impact report:', error);
      alert('Failed to export report. Please try again.');
    }
  }

  // Display main content (legacy method - clears everything)
  async displayContent() {
    const content = document.getElementById('content');
    if (!content) return;

    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
      loadingState.style.display = 'none';
    }

    // Show AI status
    let memoryStatus = '';
    if (this.aiService && this.aiService.aiSessionManager && typeof this.aiService.aiSessionManager.getSessionCount === 'function') {
      const sessionCount = this.aiService.aiSessionManager.getSessionCount();
      memoryStatus = sessionCount > 0 ? ` • Active Sessions: ${sessionCount}` : '';
    }
    
    const config = this.hybridAIService.getConfiguration();
    const providerStatus = config.activeProvider === 'Gemini' ? '🌐 Cloud (Gemini)' : '💻 On-device (Chrome AI)';
    
    const aiStatus = this.aiService.aiAvailable ? 
      `<div class="ai-status">✅ Agent: ${providerStatus} • Status: ${this.aiService.aiAvailabilityNote} • Quality Analysis: Enabled • Content Quality Scoring: Enabled • Multilingual Support: Enabled • Intent Classification: Enabled • Temporal Analysis: Enabled • Semantic Embeddings: Enabled • Pattern Analysis: Enabled${memoryStatus}</div>` : 
      `<div class="ai-status">⚠️ Agent: Local basic • On-device AI unavailable (status: ${this.aiService.aiAvailabilityNote}) • Quality Analysis: Disabled • Content Quality Scoring: Disabled • Multilingual Support: Disabled • Intent Classification: Disabled • Temporal Analysis: Disabled • Semantic Embeddings: Disabled • Pattern Analysis: Disabled${memoryStatus}</div>`;

    // Group history by day (async via Web Worker)
    const groupedHistory = await this.historyService.groupHistoryByDay();
    
    let sessionsHtml = '';
    (Array.isArray(groupedHistory) ? groupedHistory : []).slice(0, 5).forEach(day => {
      sessionsHtml += `
        <div class="session-card">
          <div class="session-title">${day.date.toDateString()}</div>
          <div class="session-summary">${day.count} pages visited</div>
          <div class="session-meta">${day.items.slice(0, 3).map(item => item.title).join(', ')}${day.items.length > 3 ? '...' : ''}</div>
        </div>
      `;
    });

    content.innerHTML = `
      ${aiStatus}
      <div class="sessions-container">
        ${sessionsHtml}
      </div>
    `;
    
    // Show the conversation interface
    const conversationContainer = document.getElementById('conversationInterface');
    if (conversationContainer) {
      conversationContainer.style.display = 'block';
      this.conversationFeature.displayConversationInterface();
    }
  }

  // Initialize tabs
  initializeTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    console.log(`Found ${tabs.length} tabs:`, Array.from(tabs).map(t => t.id));
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.id.replace('tab-', '');
        console.log(`Switching to tab: ${tabId}`);
        this.switchTab(tabId);
      });
    });

    // Always start with Summary tab (no saved state)
    this.resetTabState();
    
    // Add header button functionality
    this.attachHeaderButtonListeners();
  }

  // Reset tab state to always start with Summary
  resetTabState() {
    // Reset all tabs to inactive state
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.style.background = '#fff';
      tab.style.borderColor = '#e1e5e9';
    });
    
    // Set summary tab as active
    const summaryTab = document.getElementById('tab-summary');
    if (summaryTab) {
      summaryTab.style.background = '#667eea';
      summaryTab.style.color = 'white';
      summaryTab.style.borderColor = '#667eea';
    }
    
    // Reset current tab
    this.currentTab = 'summary';
  }

  // Get time ago string (like Chrome history)
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  // Create collapsible AI agents list
  createAIAgentsList(providerStatus, memoryStatus) {
    const aiAgents = [
      { name: 'Language Model', icon: '🤖', available: this.aiService.aiAvailable },
      { name: 'Summarizer', icon: '📝', available: this.aiService.aiAvailable },
      { name: 'Writer', icon: '✍️', available: this.aiService.aiAvailable },
      { name: 'Rewriter', icon: '🔄', available: this.aiService.aiAvailable },
      { name: 'Proofreader', icon: '✅', available: this.aiService.aiAvailable },
      { name: 'Prompt API', icon: '🎯', available: typeof window.ai !== 'undefined' && typeof window.ai.prompt !== 'undefined' },
      { name: 'Quality Analysis', icon: '📊', available: this.aiService.aiAvailable },
      { name: 'Intent Classification', icon: '🧠', available: this.aiService.aiAvailable },
      { name: 'Temporal Analysis', icon: '⏰', available: this.aiService.aiAvailable },
      { name: 'Semantic Embeddings', icon: '🔗', available: this.aiService.aiAvailable }
    ];

    const agentsHtml = aiAgents.map(agent => `
      <div class="ai-agent-item">
        <div class="ai-agent-icon">${agent.icon}</div>
        <div class="ai-agent-name">${agent.name}</div>
        <div class="ai-agent-status ${agent.available ? 'available' : 'unavailable'}">
          ${agent.available ? 'Available' : 'Unavailable'}
        </div>
      </div>
    `).join('');

    return `
      <div class="ai-agents-section">
        <div class="ai-agents-header" id="ai-agents-toggle">
          <div class="ai-agents-title">
            <span>🤖</span>
            Active AI Agents (${aiAgents.filter(a => a.available).length}/${aiAgents.length})
          </div>
          <div class="ai-agents-toggle">▼</div>
        </div>
        <div class="ai-agents-content">
          ${agentsHtml}
        </div>
      </div>
    `;
  }

  // Toggle AI agents list
  toggleAIAgents() {
    const content = document.querySelector('.ai-agents-content');
    const toggle = document.querySelector('.ai-agents-toggle');
    
    if (content && toggle) {
      content.classList.toggle('show');
      toggle.classList.toggle('expanded');
    }
  }

  // Initialize responsive design
  initializeResponsiveDesign() {
    // CSS handles responsive design automatically
    // No need for JavaScript resize handling
    this.updatePanelSize();
  }

  // Update panel size based on browser window size
  updatePanelSize() {
    // Remove dynamic width setting - let CSS handle responsive design
    // This prevents the inline style from overriding CSS
    const body = document.body;
    if (!body) return;

    // Only set min/max constraints, let CSS handle the actual width
    body.style.minWidth = '250px';
    body.style.maxWidth = '700px';
    
    // Remove any existing width style to let CSS take over
    body.style.width = '';
    
    console.log(`Panel using CSS responsive design (window: ${window.innerWidth}x${window.innerHeight})`);
  }

  // Attach header button listeners
  attachHeaderButtonListeners() {
    // Pin button
    const pinBtn = document.querySelector('.header-btn[title="Pin panel"]');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        this.togglePin();
      });
    }

    // Open in new tab button
    const openBtn = document.querySelector('.header-btn[title="Open in new tab"]');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.openInNewTab();
      });
    }

    // Close button
    const closeBtn = document.querySelector('.header-btn[title="Close"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePanel();
      });
    }
  }

  // Toggle pin state
  togglePin() {
    const pinBtn = document.querySelector('.header-btn[title="Pin panel"]');
    if (pinBtn) {
      const isPinned = pinBtn.style.background === 'rgb(26, 115, 232)';
      if (isPinned) {
        pinBtn.style.background = '';
        pinBtn.style.color = '#5f6368';
        console.log('Panel unpinned');
      } else {
        pinBtn.style.background = '#1a73e8';
        pinBtn.style.color = 'white';
        console.log('Panel pinned');
      }
    }
  }

  // Open in new tab
  openInNewTab() {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    console.log('Opening in new tab');
  }

  // Close panel
  closePanel() {
    // Try to close the side panel if available
    if (chrome.sidePanel) {
      chrome.sidePanel.close();
    } else {
      // Fallback: close the current tab
      chrome.tabs.getCurrent((tab) => {
        if (tab) {
          chrome.tabs.remove(tab.id);
        }
      });
    }
    console.log('Closing panel');
  }

  // Handle suggestion actions
  openSuggestion(suggestionId) {
    console.log(`Opening suggestion: ${suggestionId}`);
    
    // Get the suggestion card to find the action
    const suggestionCard = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (!suggestionCard) return;
    
    // Try to find the suggestion data from the proactive assistant
    if (this.proactiveAssistantFeature && this.proactiveAssistantFeature.lastSuggestions) {
      const idx = parseInt(suggestionId.replace('suggestion-', ''));
      const suggestion = this.proactiveAssistantFeature.lastSuggestions[idx];
      
      if (suggestion && suggestion.action) {
        if (typeof suggestion.action === 'string' && suggestion.action.startsWith('http')) {
          window.open(suggestion.action, '_blank');
        } else if (suggestion.action === 'sessions' || suggestionId === 'last-session') {
          this.switchTab('sessions');
        }
      }
    } else if (suggestionId === 'last-session') {
      // Fallback for last session
      this.switchTab('sessions');
    }
  }

  dismissSuggestion(suggestionId) {
    console.log(`Dismissing suggestion: ${suggestionId}`);
    // Hide the suggestion
    const suggestionCard = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (suggestionCard) {
      suggestionCard.style.display = 'none';
    }
  }

  // Switch tab
  switchTab(tabId) {
    console.log(`Switching to tab: ${tabId}`);
    this.currentTab = tabId;
    
    // Debounce to avoid stacking loads when user clicks quickly
    if (this.tabDebounceTimer) {
      clearTimeout(this.tabDebounceTimer);
      this.tabDebounceTimer = null;
    }

    // Update tab buttons - try multiple selectors
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.style.background = '#fff';
      btn.style.color = '#495057';
    });
    
    // Try to find tab button by ID or data attribute
    let activeTab = document.getElementById(`tab-${tabId}`);
    if (!activeTab) {
      // Try finding by data attribute
      activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    }
    if (!activeTab) {
      // Try finding by class
      activeTab = document.querySelector(`.tab-btn[data-id="${tabId}"]`);
    }
    
    if (activeTab) {
      activeTab.style.background = '#667eea';
      activeTab.style.color = 'white';
      console.log(`Activated tab: ${tabId}`);
    } else {
      console.warn(`Tab button not found: tab-${tabId} (this is okay if switching from search)`);
    }
    
    // Save tab state
    chrome.storage.local.set({ 'ui:lastTab': tabId });
    
    // Load tab content after a tiny delay; cancels prior queued loads
    this.tabDebounceTimer = setTimeout(() => this.loadTabContent(tabId), 120);
  }

  // Load tab content with loading states and caching
  async loadTabContent(tabId) {
    const content = document.getElementById('content');
    if (!content) {
      console.warn('Content element not found, waiting...');
      // Wait a bit and retry
      setTimeout(() => this.loadTabContent(tabId), 100);
      return;
    }

    const operationId = `load_${tabId}`;
    
    try {
      // Show loading state
      this.loadingManager.showLoading(operationId, `Loading ${tabId}...`, {
        showProgress: true,
        allowCancel: false,
        timeout: 30000
      });
      
      // Do NOT cache rendered UI; fetch fresh each time to avoid cross-tab bleed
      switch (tabId) {
        case 'summary':
          try {
            await this.displaySummaryContent();
          } catch (error) {
            console.warn('Failed to display summary:', error);
            this.showError(`Failed to load summary: ${error.message}`);
          }
          break;
        case 'clusters':
          // Hide other content areas
          this.hideAllContentAreas();
          // Show clusters and load immediately
          const clustersContent = document.getElementById('clusters-content');
          if (clustersContent) {
            clustersContent.style.display = 'block';
            clustersContent.innerHTML = `
              <div class="ai-status">🧠 Clusters</div>
              <div id="enhancedClusters"></div>
            `;
            try {
              // Ensure history is loaded before clustering
              if (!Array.isArray(this.historyService.historyData) || this.historyService.historyData.length === 0) {
                const loadedHistory = await this.historyService.getHistory();
                // IMPORTANT: Update historyData after loading
                if (Array.isArray(loadedHistory) && loadedHistory.length > 0) {
                  this.historyService.historyData = loadedHistory;
                }
              }
              await this.clusteringFeature.displayEnhancedClusters();
            } catch (error) {
              console.warn('Cluster loading failed:', error);
              const target = document.getElementById('enhancedClusters');
              if (target) {
                target.innerHTML = `<div class="error">Failed to load clusters: ${error.message}</div>`;
              } else {
                // Fallback if target doesn't exist
                if (clustersContent) {
                  clustersContent.innerHTML = `<div class="error">Failed to load clusters: ${error.message}</div>`;
                }
              }
            }
          } else {
            console.warn('clusters-content element not found');
            this.showError('Clusters content area not found');
          }
          break;
        case 'sessions':
          await this.displaySmartSessions();
          break;
        case 'recent':
          await this.displayRecentHistory();
          break;
        case 'metrics':
          await this.displayPerformanceMetrics();
          break;
        case 'settings':
          await this.displaySettingsTab();
          break;
        default:
          break;
      }

      // Update progress
      this.loadingManager.updateProgress(operationId, 100, 'Content loaded');

      // Hide loading state
      this.loadingManager.hideLoading(operationId, 'completed');

    } catch (error) {
      console.warn(`Failed to load ${tabId} content:`, error);
      this.loadingManager.hideLoading(operationId, 'error');
      this.showError(`Failed to load ${tabId} content: ${error.message}`);
    }
  }

  // Display smart sessions
  async displaySmartSessions() {
    // Hide other content areas
    this.hideAllContentAreas();

    // Show sessions content
    const sessionsContent = document.getElementById('sessions-content');
    if (!sessionsContent) {
      console.warn('sessions-content element not found');
      this.showError('Sessions content area not found');
      return;
    }

    sessionsContent.style.display = 'block';
    sessionsContent.innerHTML = '<div class="loading">Loading sessions...</div>';

    try {
      // Ensure history is loaded
      if (!Array.isArray(this.historyService.historyData) || this.historyService.historyData.length === 0) {
        const loadedHistory = await this.historyService.getHistory();
        // IMPORTANT: Update historyData after loading
        if (Array.isArray(loadedHistory) && loadedHistory.length > 0) {
          this.historyService.historyData = loadedHistory;
        }
      }

      const sessions = await this.historyService.getBrowsingSessions();

      let sessionsHtml = '';

      if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
        sessionsHtml = '<div class="empty-note">No browsing sessions found. Visit some websites to build session data.</div>';
      } else {
        sessions.slice(0, 10).forEach((session, index) => {
          const duration = Math.round(session.duration / (1000 * 60)); // minutes

          // Get quality score for session (only if quality analysis feature exists)
          let quality = { label: 'Good', score: 0.5, stars: '⭐' };
          if (this.qualityAnalysisFeature && typeof this.qualityAnalysisFeature.getSimpleQualityScore === 'function') {
            try {
              const sessionContent = session.items?.map(item => item.title).join(' ') || '';
              quality = this.qualityAnalysisFeature.getSimpleQualityScore(sessionContent);
            } catch (e) {
              console.warn('Failed to get quality score:', e);
            }
          }

          sessionsHtml += `
            <div class="session-card" data-session-id="${index}">
              <div class="session-title">
                Session ${index + 1}
                <span class="quality-badge" title="${quality.label} - Score: ${quality.score}">
                  ${quality.stars}
                </span>
              </div>
              <div class="session-summary">${session.count} pages • ${duration} minutes</div>
              <div class="session-meta">${new Date(session.startTime).toLocaleString()}</div>
            </div>
          `;
        });
      }

      if (sessionsContent) {
        sessionsContent.innerHTML = `
          <div class="ai-status">📊 Smart Sessions Analysis</div>
          <div class="sessions-container">
            ${sessionsHtml}
          </div>
        `;

        // Add click handlers for session cards
        setTimeout(() => {
          this.attachSessionClickHandlers(sessions);
        }, 100);
      }
    } catch (error) {
      console.warn('Failed to display smart sessions:', error);
      if (sessionsContent) {
        sessionsContent.innerHTML = `
          <div class="ai-status">❌ Sessions Error</div>
          <div class="error">Failed to load sessions: ${error.message}</div>
        `;
      } else {
        // Fallback to main content area if sessions-content doesn't exist
        const content = document.getElementById('content');
        if (content) {
          content.innerHTML = `
            <div class="ai-status">❌ Sessions Error</div>
            <div class="error">Failed to load sessions: ${error.message}</div>
          `;
        }
      }
    }
  }

  // Attach click handlers to session cards
  attachSessionClickHandlers(sessions) {
    const sessionCards = document.querySelectorAll('.session-card[data-session-id]');

    sessionCards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent triggering when clicking on links
        if (e.target.tagName === 'A' || e.target.closest('a')) {
          return;
        }

        const sessionId = parseInt(card.dataset.sessionId);
        const session = sessions[sessionId];

        if (session && session.items) {
          const duration = Math.round(session.duration / (1000 * 60)); // minutes
          this.showDetailsModal(
            `Session ${sessionId + 1}`,
            `${session.count} pages • ${duration} minutes • ${new Date(session.startTime).toLocaleString()}`,
            session.items
          );
        }
      });
    });
  }

  // Display recent history
  async displayRecentHistory() {
    // Hide other content areas
    this.hideAllContentAreas();
    
    // Show recent content
    const recentContent = document.getElementById('recent-content');
    if (!recentContent) {
      console.warn('recent-content element not found');
      this.showError('Recent content area not found');
      return;
    }
    
    recentContent.style.display = 'block';
    
    try {
      // Ensure history is loaded
      if (!Array.isArray(this.historyService.historyData) || this.historyService.historyData.length === 0) {
        const loadedHistory = await this.historyService.getHistory();
        // IMPORTANT: Update historyData after loading
        if (Array.isArray(loadedHistory) && loadedHistory.length > 0) {
          this.historyService.historyData = loadedHistory;
        }
      }

      const recentItems = this.historyService.getRecentItems(20);
      
      let historyHtml = '';
      if (recentItems && recentItems.length > 0) {
        recentItems.forEach(item => {
          const domain = (() => {
            try {
              return new URL(item.url).hostname;
            } catch {
              return 'unknown';
            }
          })();
          const icon = URLUtils.getURLIcon(item.url);

          historyHtml += `
            <a class="session-card" href="${item.url}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px; flex-shrink: 0;">${icon}</div>
              <div style="flex: 1; min-width: 0;">
                <div class="session-title">${item.title}</div>
                <div class="session-summary">${domain}</div>
                <div class="session-meta">${new Date(item.lastVisitTime).toLocaleString()}</div>
              </div>
            </a>
          `;
        });
      } else {
        historyHtml = '<div class="empty-note">No recent history found. Visit some websites to build history data.</div>';
      }

      recentContent.innerHTML = `
        <div class="ai-status">🕒 Recent History</div>
        <div class="sessions-container">
          ${historyHtml}
        </div>
      `;
    } catch (error) {
      console.warn('Failed to display recent history:', error);
      recentContent.innerHTML = `
        <div class="ai-status">❌ Recent History Error</div>
        <div class="error">Failed to load recent history: ${error.message}</div>
      `;
    }
  }

  // Load tab state
  async loadTabState() {
    try {
      const saved = await chrome.storage.local.get('ui:lastTab');
      const lastTab = saved['ui:lastTab'] || 'summary';
      this.switchTab(lastTab);
    } catch (error) {
      console.warn('Failed to load tab state:', error);
      this.switchTab('summary');
    }
  }

  // Attach event listeners
  attachEventListeners() {
    // Use event delegation for search input - works across all modes
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
      // Remove any existing delegated listener
      searchContainer.removeEventListener('keypress', this._searchKeypressHandler);
      // Create bound handler
      this._searchKeypressHandler = (e) => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && e.target === searchInput && e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          const query = searchInput.value.trim();
          if (query) {
            console.log('Search triggered:', query);
            this.handleSearch(query);
          }
        }
      };
      searchContainer.addEventListener('keypress', this._searchKeypressHandler);
    }
    
    // Also attach directly to search input if it exists
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = e.target.value.trim();
          if (query) {
            console.log('Search triggered (direct):', query);
            this.handleSearch(query);
          }
        }
      });
    }

    // Setup modal listeners
    this.setupModalListeners();
  }

  // Setup modal event listeners
  setupModalListeners() {
    const modal = document.getElementById('detailsModal');
    const closeBtn = document.getElementById('detailsModalClose');
    const closeFooterBtn = document.getElementById('detailsModalCloseBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideDetailsModal());
    }

    if (closeFooterBtn) {
      closeFooterBtn.addEventListener('click', () => this.hideDetailsModal());
    }

    // Close on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideDetailsModal();
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideDetailsModal();
      }
    });
  }

  // Show details modal
  showDetailsModal(title, subtitle, items) {
    const modal = document.getElementById('detailsModal');
    const modalTitle = document.getElementById('detailsModalTitle');
    const modalSubtitle = document.getElementById('detailsModalSubtitle');
    const modalList = document.getElementById('detailsModalList');

    if (!modal || !modalTitle || !modalSubtitle || !modalList) return;

    // Set title and subtitle
    modalTitle.textContent = title;
    modalSubtitle.textContent = subtitle;

    // Clear existing items
    modalList.innerHTML = '';

    // Add items
    if (!items || items.length === 0) {
      modalList.innerHTML = '<div class="details-empty">No items found</div>';
    } else {
      items.forEach(item => {
        const icon = URLUtils.getURLIcon(item.url);
        const listItem = document.createElement('li');
        listItem.className = 'details-modal-item';
        listItem.innerHTML = `
          <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="details-modal-item-link">
            <div class="details-modal-item-icon">${icon}</div>
            <div class="details-modal-item-content">
              <div class="details-modal-item-title">${item.title || 'Untitled'}</div>
              <div class="details-modal-item-url">${item.url}</div>
            </div>
          </a>
        `;
        modalList.appendChild(listItem);
      });
    }

    // Show modal
    modal.classList.add('show');
  }

  // Hide details modal
  hideDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  // Handle search
  async handleSearch(query) {
    if (!query.trim()) return;

    // Save current tab state before showing search results
    if (!this._searchTabState) {
      this._searchTabState = this.currentTab || 'summary';
    }

    // Get content element at the start - ensure it's always available
    let content = document.getElementById('content');
    if (!content) return;

    // Show loading
    content.innerHTML = `
      <div class="ai-status">🔍 Searching: "${query}"</div>
      <div class="loading">Searching your browsing history...</div>
    `;

    try {
      // Ensure history is loaded for search in all modes
      if (!Array.isArray(this.historyService.historyData) || this.historyService.historyData.length === 0) {
        await this.historyService.getHistory();
      }

      // Fast local search using HistoryService
      const matches = this.historyService.searchHistory(query).slice(0, 20);
      const resultsHtml = matches.map(item => {
        const domain = (() => { try { return new URL(item.url).hostname; } catch { return 'unknown'; } })();
        const icon = URLUtils.getURLIcon(item.url);
        return `
          <a class="session-card" href="${item.url}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:24px;flex-shrink:0;">${icon}</div>
            <div style="flex:1;min-width:0;">
              <div class="session-title">${item.title || 'Untitled'}</div>
              <div class="session-summary">${domain}</div>
              <div class="session-meta">${new Date(item.lastVisitTime).toLocaleString()}</div>
            </div>
          </a>`;
      }).join('');

      // Optional summary using AI if available
      let summaryBlock = '';
      try {
        if (this.aiService && this.aiService.aiAvailable) {
          const titles = matches.map(m => m.title).join(', ');
          const summary = await this.aiService.refineSummary(`Search query: ${query}. Items: ${titles}`, 'general');
          summaryBlock = `<div class="session-card"><div class="session-title">AI Summary</div><div class="session-summary">${summary}</div></div>`;
        }
      } catch {}

      // Hide all tab content areas and show search results in main content
      this.hideAllContentAreas();
      
      // Use the existing content variable (already declared above)
      if (content) {
        content.innerHTML = `
          <div class="ai-status">🔍 Results for "${query}" (${matches.length})</div>
          <div style="display:flex;gap:8px;margin:8px 0 12px 0;">
            <button id="searchBackBtn" class="action-btn">⬅️ Back</button>
            <button id="searchCloseBtn" class="action-btn">✖️ Close</button>
          </div>
          ${summaryBlock}
          <div class="sessions-container">${resultsHtml || '<div class="empty-note">No results found.</div>'}</div>
        `;
      }

      // Wire back/close handlers using event delegation on content container
      // This ensures listeners work even if DOM is replaced
      if (content) {
        // Remove old handlers if any
        if (this._searchBackHandler) {
          content.removeEventListener('click', this._searchBackHandler);
        }
        if (this._searchCloseHandler) {
          content.removeEventListener('click', this._searchCloseHandler);
        }
        
        // Create bound handlers - use closest to handle clicks on button children
        this._searchBackHandler = (e) => {
          const btn = e.target.closest('#searchBackBtn');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Back button clicked');
            const lastTab = this._searchTabState || this.currentTab || 'summary';
            this._searchTabState = null;
            this.switchTab(lastTab);
          }
        };
        
        this._searchCloseHandler = (e) => {
          const btn = e.target.closest('#searchCloseBtn');
          if (btn) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked');
            this._searchTabState = null;
            this.switchTab('summary');
            // Clear search input
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
          }
        };
        
        // Attach delegated listeners
        content.addEventListener('click', this._searchBackHandler);
        content.addEventListener('click', this._searchCloseHandler);
      }
      
      // Also attach direct listeners as fallback
      setTimeout(() => {
        const backBtn = document.getElementById('searchBackBtn');
        const closeBtn = document.getElementById('searchCloseBtn');
        
        if (backBtn && !backBtn.hasAttribute('data-listener-attached')) {
          backBtn.setAttribute('data-listener-attached', 'true');
          backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Back button clicked (direct)');
            const lastTab = this._searchTabState || this.currentTab || 'summary';
            this._searchTabState = null;
            this.switchTab(lastTab);
          });
        }
        
        if (closeBtn && !closeBtn.hasAttribute('data-listener-attached')) {
          closeBtn.setAttribute('data-listener-attached', 'true');
          closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close button clicked (direct)');
            this._searchTabState = null;
            this.switchTab('summary');
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
          });
        }
      }, 100);
    } catch (error) {
      console.warn('Search failed:', error);
      // Ensure content is available for error display
      const errorContent = document.getElementById('content');
      if (errorContent) {
        errorContent.innerHTML = `
          <div class="ai-status">❌ Search Error</div>
          <div class="error">Failed to search: ${error.message}</div>
        `;
      }
    }
  }

  // Show error
  showError(message) {
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = `
        <div class="error">${message}</div>
      `;
    }
  }

  // Display performance metrics
  async displayPerformanceMetrics() {
    // Hide other content areas
    this.hideAllContentAreas();
    
    // Show metrics content
    const metricsContent = document.getElementById('metrics-content');
    if (!metricsContent) return;
    
    metricsContent.style.display = 'block';

    try {
      // Get services from AI service (use chromeAIService if hybrid, or basic)
      const aiService = this.aiService.chromeAIService || this.basicAIService || this.aiService;
      const performanceMonitor = aiService?.performanceMonitor || null;
      const requestQueue = aiService?.requestQueue || null;
      const rateLimiter = aiService?.rateLimiter || null;

      // Get performance data with fallbacks
      const performanceSummary = performanceMonitor?.getPerformanceSummary() || { uptime: 0, memoryUsage: 0, activeOperations: 0, successRate: 0 };
      const queueStatus = requestQueue?.getStatus() || { queueLength: 0, processing: false, successRate: 0, avgProcessingTime: 0 };
      const rateLimiterStatus = rateLimiter?.getAllStatuses() || {};
      const operationStats = performanceMonitor?.getAllOperationStats() || [];
      const recentOperations = performanceMonitor?.getRecentOperations(10) || [];
      const alerts = performanceMonitor?.checkPerformanceAlerts() || [];
      const cacheStats = await this.cacheManager.getCacheStats();

      const safe = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
      const safeStr = (v, fallback = '0') => (v !== undefined && v !== null ? v : fallback);

      // Show a message if metrics are not available
      const hasMetrics = performanceMonitor || requestQueue || rateLimiter;

      const metricsHtml = `
        <div class="ai-status">📊 Performance Metrics Dashboard</div>
        ${!hasMetrics ? '<div class="empty-note" style="margin: 20px 0;">⚠️ Performance monitoring is only available in Chrome AI or Gemini modes. Switch from "No AI" mode to see detailed metrics.</div>' : ''}

        <div class="metrics-grid">
          <div class="metric-card">
            <h4>System Overview</h4>
            <div class="metric-item">
              <span class="metric-label">Uptime:</span>
              <span class="metric-value">${safeStr(performanceSummary.uptimeFormatted, '0s')}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Memory Usage:</span>
              <span class="metric-value">${safe(performanceSummary.currentMemory)}MB</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Memory Delta:</span>
              <span class="metric-value ${safe(performanceSummary.memoryDelta) > 0 ? 'positive' : 'negative'}">${safe(performanceSummary.memoryDelta) > 0 ? '+' : ''}${safe(performanceSummary.memoryDelta)}MB</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Active Operations:</span>
              <span class="metric-value">${safe(performanceSummary.activeOperations)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Success Rate:</span>
              <span class="metric-value">${safe(performanceSummary.successRate)}%</span>
            </div>
          </div>

          <div class="metric-card">
            <h4>Request Queue</h4>
            <div class="metric-item">
              <span class="metric-label">Queue Length:</span>
              <span class="metric-value">${safe(queueStatus.queueLength)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Processing:</span>
              <span class="metric-value">${queueStatus.processing ? 'Yes' : 'No'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Active Requests:</span>
              <span class="metric-value">${safe(queueStatus.activeRequests)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Success Rate:</span>
              <span class="metric-value">${safe(queueStatus.successRate)}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Avg Processing Time:</span>
              <span class="metric-value">${safe(queueStatus.averageProcessingTime)}ms</span>
            </div>
          </div>

          <div class="metric-card">
            <h4>Rate Limiter Status</h4>
            ${Object.entries(rateLimiterStatus).length > 0 ?
              Object.entries(rateLimiterStatus).map(([apiType, status]) => `
                <div class="metric-item">
                  <span class="metric-label">${apiType}:</span>
                  <span class="metric-value ${status.canMakeRequest ? 'available' : 'limited'}">
                    ${status.activeRequests}/${status.maxConcurrent}
                    ${status.waitTime > 0 ? `(${status.waitTime}ms wait)` : ''}
                  </span>
                </div>
              `).join('') :
              '<div class="empty-note">No rate limiter data available</div>'
            }
          </div>

          <div class="metric-card">
            <h4>Operation Statistics</h4>
            ${Object.entries(operationStats).length > 0 ?
              Object.entries(operationStats).slice(0, 5).map(([operation, stats]) => `
                <div class="metric-item">
                  <span class="metric-label">${operation}:</span>
                  <span class="metric-value">
                    ${safe(stats.count)} calls, ${safe(stats.averageDuration).toFixed ? stats.averageDuration.toFixed(2) : safe(stats.averageDuration)}ms avg
                  </span>
                </div>
              `).join('') :
              '<div class="empty-note">No operation statistics available yet</div>'
            }
          </div>

          <div class="metric-card">
            <h4>Cache Statistics</h4>
            <div class="metric-item">
              <span class="metric-label">Total Entries:</span>
              <span class="metric-value">${cacheStats?.totalEntries || 0}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Cache Size:</span>
              <span class="metric-value">${cacheStats?.totalSizeFormatted || '0 Bytes'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Compressed:</span>
              <span class="metric-value">${cacheStats?.compressedEntries || 0} entries</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Expired:</span>
              <span class="metric-value">${cacheStats?.expiredEntries || 0} entries</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Compression Ratio:</span>
              <span class="metric-value">${cacheStats?.compressionRatio?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </div>

        ${alerts.length > 0 ? `
          <div class="alerts-section">
            <h4>⚠️ Performance Alerts</h4>
            ${alerts.map(alert => `
              <div class="alert alert-${alert.severity}">
                <strong>${alert.type}:</strong> ${alert.message}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="recent-operations">
          <h4>Recent Operations</h4>
          <div class="operations-list">
            ${recentOperations.map(op => `
              <div class="operation-item ${op.success ? 'success' : 'failed'}">
                <span class="operation-name">${op.name}</span>
                <span class="operation-duration">${op.duration.toFixed(2)}ms</span>
                <span class="operation-time">${new Date(op.timestamp).toLocaleTimeString()}</span>
                ${!op.success ? `<span class="operation-error">${op.error}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        ${recentOperations.length === 0 ? '<div class="empty-note">No recent operations yet</div>' : ''}

        <div class="metrics-actions">
          <button id="metricsExport" class="action-btn">Export Metrics</button>
          <button id="metricsClear" class="action-btn">Clear Metrics</button>
          <button id="cacheClear" class="action-btn">Clear Cache</button>
          <button id="metricsRefresh" class="action-btn">Refresh</button>
        </div>
      `;

      metricsContent.innerHTML = metricsHtml;
      // Bind actions (avoid inline handlers for CSP)
      document.getElementById('metricsExport')?.addEventListener('click', () => this.exportMetrics());
      document.getElementById('metricsClear')?.addEventListener('click', () => this.clearMetrics());
      document.getElementById('cacheClear')?.addEventListener('click', () => this.clearCache());
      document.getElementById('metricsRefresh')?.addEventListener('click', () => this.refreshMetrics());
    } catch (error) {
      console.warn('Failed to display performance metrics:', error);
      metricsContent.innerHTML = `
        <div class="ai-status">❌ Metrics Error</div>
        <div class="error">Failed to load performance metrics: ${error.message}</div>
      `;
    }
  }

  // Export metrics
  exportMetrics() {
    try {
      const aiService = this.aiService.chromeAIService || this.basicAIService || this.aiService;
      const performanceMonitor = aiService?.performanceMonitor;
      const requestQueue = aiService?.requestQueue;

      if (!performanceMonitor || !requestQueue) {
        alert('Performance metrics are not available in the current AI mode. Switch to Chrome AI or Gemini mode to export metrics.');
        return;
      }

      const exportData = {
        performance: performanceMonitor.exportMetrics(),
        queue: requestQueue.exportData(),
        exportTime: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chrome-mnemonic-metrics-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('Metrics exported successfully');
    } catch (error) {
      console.warn('Failed to export metrics:', error);
    }
  }

  // Clear metrics
  clearMetrics() {
    try {
      const aiService = this.aiService.chromeAIService || this.basicAIService || this.aiService;
      const performanceMonitor = aiService?.performanceMonitor;
      const requestQueue = aiService?.requestQueue;

      if (!performanceMonitor || !requestQueue) {
        alert('Performance metrics are not available in the current AI mode.');
        return;
      }

      performanceMonitor.clearMetrics();
      requestQueue.clearHistory();
      
      console.log('Metrics cleared successfully');
      // Refresh the display
      this.displayPerformanceMetrics();
    } catch (error) {
      console.warn('Failed to clear metrics:', error);
    }
  }

  // Clear cache
  async clearCache() {
    try {
      await this.cacheManager.clearCache();
      console.log('Cache cleared successfully');
      // Refresh the display
      this.displayPerformanceMetrics();
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Refresh metrics
  refreshMetrics() {
    this.displayPerformanceMetrics();
  }

  // Render AI Impact Section
  async renderAIImpactSection() {
    const stats = this.aiImpactTracker.getImpactStats();

    return `
      <div class="settings-section" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac;">
        <div class="settings-title">🌟 AI Impact Dashboard</div>
        <div class="settings-description">
          See the real-world benefits of using Chrome's built-in AI. Your privacy and the environment thank you!
        </div>

        <div class="metrics-grid" style="grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
          <div class="metric-card" style="background: white;">
            <h4 style="color: #16a34a;">🔒 Privacy Score</h4>
            <div style="font-size: 32px; font-weight: 700; color: #16a34a; margin: 8px 0;">
              ${stats.privacyScore}%
            </div>
            <div style="font-size: 12px; color: #64748b;">
              ${stats.localOperations} local / ${stats.cloudOperations} cloud
            </div>
          </div>

          <div class="metric-card" style="background: white;">
            <h4 style="color: #0284c7;">⚡ Total Operations</h4>
            <div style="font-size: 32px; font-weight: 700; color: #0284c7; margin: 8px 0;">
              ${stats.totalOperations}
            </div>
            <div style="font-size: 12px; color: #64748b;">
              ~${stats.averageOpsPerDay} per day
            </div>
          </div>

          <div class="metric-card" style="background: white;">
            <h4 style="color: #16a34a;">💰 Cost Saved</h4>
            <div style="font-size: 32px; font-weight: 700; color: #16a34a; margin: 8px 0;">
              $${stats.costSaved}
            </div>
            <div style="font-size: 12px; color: #64748b;">
              vs cloud-only solutions
            </div>
          </div>

          <div class="metric-card" style="background: white;">
            <h4 style="color: #059669;">🌱 CO2 Saved</h4>
            <div style="font-size: 32px; font-weight: 700; color: #059669; margin: 8px 0;">
              ${stats.co2Saved}kg
            </div>
            <div style="font-size: 12px; color: #64748b;">
              carbon emissions avoided
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; padding: 12px; background: white; border-radius: 8px;">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a;">Operations by API</h4>
          ${Object.entries(stats.operationsByAPI).map(([api, counts]) => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #64748b; text-transform: capitalize;">${api}:</span>
              <span style="color: #0f172a; font-weight: 600;">
                <span style="color: #16a34a;">${counts.local} local</span> /
                <span style="color: #f59e0b;">${counts.cloud} cloud</span>
              </span>
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px; font-size: 12px; color: #475569;">
          <strong>💡 Why this matters:</strong><br>
          By using Chrome's built-in AI APIs, your data stays on your device, reducing privacy risks,
          saving money on API costs, and reducing carbon emissions from data center processing.
          <div style="margin-top: 8px;">
            <strong>Uptime:</strong> ${stats.uptime.formatted}
          </div>
        </div>

        <div class="settings-actions" style="margin-top: 16px;">
          <button id="exportAIImpact" class="btn-secondary">Export Impact Report</button>
          <button id="resetAIImpact" class="btn-secondary" style="background: #ef4444;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='#ef4444'">Reset Statistics</button>
        </div>
      </div>
    `;
  }

  // Cleanup
  async cleanup() {
    try {
      console.log('Cleaning up Chrome Mnemonic...');
      await this.aiService.cleanup();
      console.log('Cleanup completed');
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  // Setup cleanup handlers
  setupCleanupHandlers() {
    try {
      // Ensure previous handler is removed to avoid duplicates
      if (this._beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this._beforeUnloadHandler);
      }

      this._beforeUnloadHandler = () => {
        this.cleanup();
      };

      window.addEventListener('beforeunload', this._beforeUnloadHandler);
    } catch (error) {
      console.warn('Failed to setup cleanup handlers:', error);
    }
  }
}

// Initialize Chrome Mnemonic when popup opens
document.addEventListener('DOMContentLoaded', () => {
  window.chromeMnemonic = new ChromeMnemonic();
});
