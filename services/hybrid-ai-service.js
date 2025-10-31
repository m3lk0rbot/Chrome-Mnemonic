// Hybrid AI Service - switches between Chrome AI and Gemini API

class HybridAIService {
  constructor() {
    this.useGemini = false;
    this.geminiApiKey = null;
    this.chromeAIService = null;
    this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    this.initialized = false;
  }

  // Initialize the hybrid service
  async initialize() {
    try {
      // Initialize Chrome AI service
      this.chromeAIService = new AIService();
      await this.chromeAIService.checkAIAvailability();

      // Load settings from storage
      await this.loadSettings();

      this.initialized = true;
      console.log('HybridAIService initialized:', {
        useGemini: this.useGemini,
        chromeAIAvailable: this.chromeAIService.aiAvailable
      });
    } catch (error) {
      console.warn('HybridAIService initialization failed:', error);
      this.initialized = false;
    }
  }

  // Load settings from chrome.storage.local
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['useGemini', 'geminiApiKey']);
      this.useGemini = result.useGemini || false;
      this.geminiApiKey = result.geminiApiKey || null;
      
      // If no key exists, use default demo key for hackathon
      // NOTE: This is for hackathon demo only - users should replace with their own key in Settings
      if (!this.geminiApiKey) {
        // Default demo API key for hackathon (from project)
        const DEFAULT_DEMO_KEY = 'AIzaSyDrs3pbfeZ_rqoRGQQudptpbAm7f5o171o';
        this.geminiApiKey = DEFAULT_DEMO_KEY;
        // Auto-save the default key for demo purposes
        await this.saveSettings(false, DEFAULT_DEMO_KEY);
        console.log('Using default demo API key. Users can replace it in Settings.');
      }
    } catch (error) {
      console.warn('Failed to load AI settings:', error);
    }
  }

  // Save settings to chrome.storage.local
  async saveSettings(useGemini, apiKey) {
    try {
      await chrome.storage.local.set({
        useGemini: useGemini,
        geminiApiKey: apiKey
      });
      this.useGemini = useGemini;
      this.geminiApiKey = apiKey;
      console.log('AI settings saved:', { useGemini, hasApiKey: !!apiKey });
    } catch (error) {
      console.warn('Failed to save AI settings:', error);
      throw error;
    }
  }

  // Set whether to use Gemini API
  async setUseGemini(enabled) {
    this.useGemini = enabled;
    // IMPORTANT: Save to storage to prevent reloading old setting
    try {
      const current = await chrome.storage.local.get(['geminiApiKey']);
      await chrome.storage.local.set({
        useGemini: enabled,
        geminiApiKey: current.geminiApiKey || this.geminiApiKey
      });
      console.log('Gemini API mode:', enabled ? 'enabled' : 'disabled');
    } catch (error) {
      console.warn('Failed to save useGemini setting:', error);
      // Still set locally even if storage fails
      console.log('Gemini API mode:', enabled ? 'enabled' : 'disabled');
    }
  }

  // Setup Gemini API with key
  async setupGemini(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Validate the API key first
    const validation = await this.validateGeminiApiKey(apiKey);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Save settings
    await this.saveSettings(true, apiKey);
    console.log('Gemini API setup complete');
  }

  // Validate Gemini API key
  async validateGeminiApiKey(apiKey) {
    try {
      // Try v1beta first (preferred)
      let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test connection'
            }]
          }],
          generationConfig: {
            maxOutputTokens: 10
          }
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        return { valid: true, message: 'API key is valid (using gemini-1.5-flash v1beta)' };
      } else {
        // Check error details
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // If v1beta fails with model not found, try v1
        if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
          console.log('v1beta failed, trying v1...');
          response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: 'Test connection'
                }]
              }],
              generationConfig: {
                maxOutputTokens: 10
              }
            }),
            signal: AbortSignal.timeout(15000)
          });
          
          if (response.ok) {
            // Update base URL to v1
            this.geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
            return { valid: true, message: 'API key is valid (using gemini-1.5-flash v1)' };
          }
        }
        
        return { valid: false, message: errorMsg };
      }
    } catch (error) {
      return { valid: false, message: 'Network error: ' + error.message };
    }
  }

  // Call Gemini API
  async callGeminiAPI(apiType, config, callback) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Map Chrome AI types to Gemini prompts
      const prompt = this.getGeminiPrompt(apiType, config);
      
      // Try gemini-1.5-flash first, fallback to gemini-1.5-pro if needed
      let response;
      try {
        response = await fetch(`${this.geminiBaseUrl}?key=${this.geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 512,
              candidateCount: 1,
              stopSequences: [],
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE"
              }
            ]
          }),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
      } catch (error) {
        // If fetch fails (network error), throw it
        console.warn('Gemini API call failed:', error);
        throw new Error(`Gemini API network error: ${error.message}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`Gemini API error: ${errorMsg}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
      
      // Simulate the callback pattern for compatibility
      return await callback({ 
        result: text,
        apiType: 'Gemini',
        source: 'cloud'
      });
    } catch (error) {
      console.warn('Gemini API call failed:', error);
      throw error;
    }
  }

  // Get appropriate prompt for Gemini based on Chrome AI type
  getGeminiPrompt(apiType, config) {
    const prompts = {
      'LanguageModel': 'You are a helpful AI assistant. Please respond to the following request: ',
      'Summarizer': 'Please provide a concise summary of the following content: ',
      'Writer': 'Please write the following content: ',
      'Rewriter': 'Please rewrite the following content to improve clarity and style: ',
      'Proofreader': 'Please proofread and correct the following text: ',
      'Translator': 'Please translate the following text: ',
      'Prompt': 'Please analyze the following image and text: '
    };

    const basePrompt = prompts[apiType] || 'Please process the following request: ';
    
    // Extract the actual prompt from config if available
    const userPrompt = config.expectedInputs?.[0]?.data || 
                      config.prompt || 
                      'No specific prompt provided';
    
    return basePrompt + userPrompt;
  }

  // Main method that switches between Chrome AI and Gemini
  async withAISession(apiType, config, callback, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Add timeout to prevent hanging operations
    const timeoutMs = options.timeout || 45000; // 45 second default timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI operation timeout')), timeoutMs);
    });

    try {
      // If Gemini is enabled and API key is available, use Gemini
      if (this.useGemini && this.geminiApiKey) {
        try {
          console.log(`Using Gemini API for ${apiType}`);
          return await this.callGeminiAPI(apiType, config, callback);
        } catch (error) {
          console.warn(`Gemini API failed for ${apiType}, falling back to Chrome AI:`, error);
          // Fallback to Chrome AI
        }
      }

      // Use Chrome AI (default or fallback)
      if (this.chromeAIService && this.chromeAIService.aiAvailable) {
        console.log(`Using Chrome AI for ${apiType}`);
        return await this.chromeAIService.withAISession(apiType, config, callback, options);
      } else {
        throw new Error('No AI service available. Please check your configuration.');
      }
    } catch (error) {
      console.warn(`AI operation failed for ${apiType}:`, error);
      throw error;
    }
  }

  // Proxy other AIService methods
  get aiAvailable() {
    return this.chromeAIService?.aiAvailable || this.useGemini;
  }

  get aiAvailabilityNote() {
    if (this.useGemini && this.geminiApiKey) {
      return 'Gemini API (Cloud)';
    } else if (this.chromeAIService?.aiAvailable) {
      return this.chromeAIService.aiAvailabilityNote;
    } else {
      return 'No AI available';
    }
  }

  get aiSessionManager() {
    return this.chromeAIService?.aiSessionManager || { getSessionCount: () => 0 };
  }

  // Check AI availability (both Chrome and Gemini)
  async checkAIAvailability() {
    if (!this.initialized) {
      await this.initialize();
    }

    const chromeAvailable = this.chromeAIService?.aiAvailable || false;
    const geminiAvailable = this.useGemini && this.geminiApiKey;

    return {
      chrome: chromeAvailable,
      gemini: geminiAvailable,
      active: chromeAvailable || geminiAvailable
    };
  }

  // Get current AI configuration
  getConfiguration() {
    return {
      useGemini: this.useGemini,
      hasApiKey: !!this.geminiApiKey,
      chromeAIAvailable: this.chromeAIService?.aiAvailable || false,
      activeProvider: this.useGemini && this.geminiApiKey ? 'Gemini' : 'Chrome AI'
    };
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HybridAIService;
} else {
  window.HybridAIService = HybridAIService;
}
