// AI Service - Handles all AI API interactions and session management
class AIService {
  constructor() {
    this.aiAvailable = false;
    this.aiAvailabilityNote = '';
    this.rateLimiter = new RateLimiter();
    this.requestQueue = new AIRequestQueue();
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.errorHandler = EnhancedErrorHandler;
    this.aiSessionManager = {
      activeSessions: new Set(),
      
      // Create and track AI session
      async createSession(apiType, config) {
        try {
          // Ensure required output language is specified for safety/quality
          const createConfig = (() => {
            const cfg = { ...(config || {}) };
            const defaultLang = 'en';
            switch (apiType) {
              case 'LanguageModel': {
                // Set outputLanguage directly (required by API)
                if (!cfg.outputLanguage) cfg.outputLanguage = defaultLang;
                // Also set expectedOutputs for Prompt API compatibility
                if (!cfg.expectedOutputs || !Array.isArray(cfg.expectedOutputs) || cfg.expectedOutputs.length === 0) {
                  cfg.expectedOutputs = [{ type: 'text', languages: [defaultLang] }];
                } else {
                  // Fill missing languages
                  cfg.expectedOutputs = cfg.expectedOutputs.map(o => ({
                    type: o.type || 'text',
                    languages: (o.languages && o.languages.length) ? o.languages : [defaultLang]
                  }));
                }
                return cfg;
              }
              case 'Writer':
              case 'Summarizer':
              case 'Rewriter':
              case 'Proofreader':
              case 'Translator': {
                if (!cfg.outputLanguage) cfg.outputLanguage = defaultLang;
                return cfg;
              }
              default:
                return cfg;
            }
          })();

          let session;
          const tryCreate = async (ctor, cfgPrimary, cfgFallback) => {
            try {
              return await ctor.create(cfgPrimary);
            } catch (e) {
              // Retry with fallback config to preserve compatibility across builds
              if (cfgFallback) {
                try {
                  return await ctor.create(cfgFallback);
                } catch (_) {
                  throw e;
                }
              }
              throw e;
            }
          };

          switch (apiType) {
            case 'LanguageModel':
              session = await tryCreate(LanguageModel, createConfig, config);
              break;
            case 'Summarizer':
              session = await tryCreate(Summarizer, createConfig, config);
              break;
            case 'Writer':
              session = await tryCreate(Writer, createConfig, config);
              break;
            case 'Rewriter':
              session = await tryCreate(Rewriter, createConfig, config);
              break;
            case 'Proofreader':
              session = await tryCreate(Proofreader, createConfig, config);
              break;
            case 'Translator':
              session = await tryCreate(Translator, createConfig, config);
              break;
            default:
              throw new Error(`Unknown API type: ${apiType}`);
          }
          
          this.activeSessions.add(session);
          return session;
        } catch (error) {
          console.warn(`Failed to create ${apiType} session:`, error);
          throw error;
        }
      },
      
      // Destroy AI session and remove from tracking
      async destroySession(session) {
        try {
          if (session && typeof session.destroy === 'function') {
            await session.destroy();
          }
          this.activeSessions.delete(session);
        } catch (error) {
          console.warn('Failed to destroy AI session:', error);
        }
      },
      
      // Destroy all active sessions
      async destroyAllSessions() {
        const destroyPromises = Array.from(this.activeSessions).map(session => 
          this.destroySession(session)
        );
        await Promise.allSettled(destroyPromises);
        this.activeSessions.clear();
      },
      
      // Get session count
      getSessionCount() {
        return this.activeSessions.size;
      }
    };
  }

  // Check AI availability
  async checkAIAvailability() {
    try {
      // Check for multiple AI APIs
      const apis = ['LanguageModel', 'Summarizer', 'Writer', 'Rewriter', 'Proofreader', 'Translator'];
      const availableAPIs = [];
      
      for (const api of apis) {
        if (typeof window[api] !== 'undefined') {
          try {
            const availability = await window[api].availability();
            if (availability !== 'unavailable') {
              availableAPIs.push(api);
            }
          } catch (e) {
            // API exists but not available
          }
        }
      }
      
      this.aiAvailable = availableAPIs.length > 0;
      this.aiAvailabilityNote = availableAPIs.length > 0 ? 
        `Available APIs: ${availableAPIs.join(', ')}` : 
        'No AI APIs available';
      
      console.log('AI Availability:', this.aiAvailable, this.aiAvailabilityNote);
      return this.aiAvailable;
    } catch (error) {
      console.warn('AI availability check failed:', error);
      this.aiAvailable = false;
      this.aiAvailabilityNote = 'Check failed';
      return false;
    }
  }

  // Safe AI session wrapper with advanced queueing and performance monitoring
  async withAISession(apiType, config, callback, options = {}) {
    const {
      priority = 'normal',
      timeout = 10000,
      retries = 2,
      description = `${apiType} operation`
    } = options;

    // Use the advanced request queue
    return await this.requestQueue.add(async () => {
      let session = null;
      
      try {
        // Check rate limiting
        if (!this.rateLimiter.canMakeRequest(apiType)) {
          const waitTime = this.rateLimiter.getWaitTime(apiType);
          console.log(`Rate limited: ${apiType}, waiting ${waitTime}ms`);
          await this.rateLimiter.sleep(waitTime);
        }

        // Create session with performance monitoring
        session = await this.performanceMonitor.measureOperation(
          `${apiType}_createSession`,
          () => this.aiSessionManager.createSession(apiType, config)
        );

        // Execute callback with performance monitoring
        const result = await this.performanceMonitor.measureOperation(
          `${apiType}_execute`,
          () => callback(session)
        );

        // Track AI impact (local operation)
        if (window.aiImpactTracker) {
          window.aiImpactTracker.trackOperation(apiType, true);
        }

        return result;

      } catch (error) {
        const classified = this.errorHandler.classify(error);
        this.errorHandler.log(classified, { scope: 'withAISession', apiType });
        throw classified;
      } finally {
        if (session) {
          try {
            await this.performanceMonitor.measureOperation(
              `${apiType}_destroySession`,
              () => this.aiSessionManager.destroySession(session)
            );
          } catch (destroyError) {
            console.warn(`Failed to destroy ${apiType} session:`, destroyError);
          }
        }
      }
    }, {
      priority,
      timeout,
      retries,
      apiType,
      description
    });
  }

  // Content Enhancement: Refine summary using Rewriter API
  async refineSummary(summary, type = 'general') {
    try {
      // Input validation
      if (!summary || typeof summary !== 'string') {
        console.warn('Invalid summary input for refinement');
        return summary || '';
      }

      if (!this.aiAvailable || typeof Rewriter === 'undefined') {
        console.log('Rewriter API not available, returning original summary');
        return summary; // Return original if Rewriter not available
      }

      const refinementPrompts = {
        'session': 'Improve this browsing session summary to be more engaging and insightful. Make it conversational and helpful.',
        'general': 'Refine this text to be more polished and professional.',
        'smart-session': 'Enhance this smart session summary to be more motivational and actionable.'
      };

      const prompt = refinementPrompts[type] || refinementPrompts['general'];
      const fullPrompt = `${prompt}\n\nText to refine:\n${summary}`;

      // Truncate if too long to prevent API errors
      const maxLength = 8000; // Conservative limit
      const truncatedPrompt = fullPrompt.length > maxLength ? 
        fullPrompt.substring(0, maxLength) + '...' : fullPrompt;

      return await this.withAISession('Rewriter', {
        expectedInputs: [{ type: 'text' }]
      }, async (rewriter) => {
        try {
          return await rewriter.rewrite(truncatedPrompt, {
            outputLanguage: 'en',
            style: type === 'session' ? 'conversational' : 'professional'
          });
        } catch (rewriteError) {
          console.warn('Rewriter API call failed:', rewriteError);
          throw rewriteError;
        }
      }, {
        priority: 'normal',
        timeout: 15000,
        retries: 1,
        description: `Refine ${type} summary`
      });
    } catch (error) {
      console.warn('Summary refinement failed:', error);
      return summary; // Return original on error
    }
  }

  // Analyze content quality using Proofreader API
  async analyzeContentQuality(content, contentType = 'summary') {
    if (!this.aiAvailable || typeof Proofreader === 'undefined') {
      return { score: 0.5, feedback: 'Proofreader API not available' };
    }

    try {
      return await this.withAISession('Proofreader', {
        expectedInputs: [{ type: 'text' }]
      }, async (proofreader) => {
        const result = await proofreader.proofread(content, {
          outputLanguage: 'en',
          style: contentType === 'summary' ? 'conversational' : 'professional'
        });
        
        // Parse the result to extract quality score
        const score = this.extractQualityScore(result);
        return {
          score: score,
          feedback: result,
          contentType: contentType,
          analyzedAt: Date.now()
        };
      });
    } catch (error) {
      console.warn('Content quality analysis failed:', error);
      return { score: 0.5, feedback: 'Analysis failed', error: error.message };
    }
  }

  // Extract quality score from proofreader result
  extractQualityScore(result) {
    // Simple heuristic to extract quality score from proofreader feedback
    if (typeof result === 'string') {
      const positiveWords = ['excellent', 'good', 'clear', 'well-written', 'engaging'];
      const negativeWords = ['unclear', 'confusing', 'poor', 'awkward', 'repetitive'];
      
      const lowerResult = result.toLowerCase();
      const positiveCount = positiveWords.filter(word => lowerResult.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerResult.includes(word)).length;
      
      // Base score of 0.5, adjust based on feedback
      let score = 0.5;
      score += (positiveCount * 0.1);
      score -= (negativeCount * 0.1);
      
      return Math.max(0, Math.min(1, score));
    }
    return 0.5;
  }

  // Detect language using Translator API
  async detectLanguage(content) {
    if (!this.aiAvailable || typeof Translator === 'undefined') {
      return { language: 'en', confidence: 0.5 };
    }

    try {
      return await this.withAISession('Translator', {
        expectedInputs: [{ type: 'text' }]
      }, async (translator) => {
        const result = await translator.detectLanguage(content);
        return {
          language: result.language || 'en',
          confidence: result.confidence || 0.8,
          detectedAt: Date.now()
        };
      });
    } catch (error) {
      console.warn('Language detection failed:', error);
      return { language: 'en', confidence: 0.5, error: error.message };
    }
  }

  // Translate content using Translator API
  async translateContent(content, targetLanguage, sourceLanguage = null) {
    if (!this.aiAvailable || typeof Translator === 'undefined') {
      return content; // Return original if Translator not available
    }

    try {
      return await this.withAISession('Translator', {
        expectedInputs: [{ type: 'text' }]
      }, async (translator) => {
        return await translator.translate(content, {
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLanguage,
          outputLanguage: targetLanguage
        });
      });
    } catch (error) {
      console.warn('Translation failed:', error);
      return content; // Return original on error
    }
  }

  // Cleanup all AI sessions
  async cleanup() {
    try {
      console.log('Cleaning up AI sessions...');
      await this.aiSessionManager.destroyAllSessions();
      console.log(`Cleaned up ${this.aiSessionManager.getSessionCount()} AI sessions`);
    } catch (error) {
      console.warn('AI cleanup failed:', error);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIService;
} else {
  window.AIService = AIService;
}
