// Quality Analysis Feature - Handles content quality scoring and analysis
class QualityAnalysisFeature {
  constructor(aiService, historyService) {
    this.aiService = aiService;
    this.historyService = historyService;
    this.proofreaderToken = null;
  }

  // Initialize Proofreader API with token
  async initializeProofreaderAPI() {
    try {
      // Get proofreader token from storage
      const stored = await chrome.storage.local.get('proofreaderToken');
      this.proofreaderToken = stored.proofreaderToken;
      
      if (this.proofreaderToken) {
        console.log('Proofreader API initialized with token');
        return true;
      } else {
        console.log('No proofreader token found');
        return false;
      }
    } catch (error) {
      console.warn('Failed to initialize Proofreader API:', error);
      return false;
    }
  }

  // Analyze content quality with Proofreader API
  async analyzeContentQualityWithProofreader(content, contentType = 'general') {
    if (!this.aiService.aiAvailable || typeof Proofreader === 'undefined' || !this.proofreaderToken) {
      return { score: 0.5, feedback: 'Proofreader API not available' };
    }

    try {
      return await this.aiService.withAISession('Proofreader', {
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
      const positiveWords = ['excellent', 'good', 'clear', 'well-written', 'engaging', 'polished'];
      const negativeWords = ['unclear', 'confusing', 'poor', 'awkward', 'repetitive', 'needs improvement'];
      
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

  // Score browsing history quality
  async scoreBrowsingHistoryQuality() {
    try {
      const historyData = this.historyService.historyData;
      const qualityScores = [];
      
      // Sample recent items for quality analysis
      const sampleItems = historyData.slice(0, 20);
      
      for (const item of sampleItems) {
        try {
          const quality = await this.analyzeContentQualityWithProofreader(
            `${item.title} - ${item.url}`,
            'history'
          );
          
          qualityScores.push({
            url: item.url,
            title: item.title,
            quality: quality,
            timestamp: item.lastVisitTime
          });
        } catch (error) {
          console.warn('Failed to analyze quality for item:', item.url);
        }
      }
      
      // Store quality analysis
      await chrome.storage.local.set({ 
        browsingQualityAnalysis: {
          scores: qualityScores,
          averageScore: this.calculateAverageScore(qualityScores),
          analyzedAt: Date.now()
        }
      });
      
      console.log('Browsing history quality analysis completed');
      return qualityScores;
    } catch (error) {
      console.warn('Failed to score browsing history quality:', error);
      return [];
    }
  }

  // Calculate average quality score
  calculateAverageScore(qualityScores) {
    if (qualityScores.length === 0) return 0;
    
    const totalScore = qualityScores.reduce((sum, item) => sum + item.quality.score, 0);
    return totalScore / qualityScores.length;
  }

  // Display content quality insights
  async displayContentQualityInsights() {
    try {
      const stored = await chrome.storage.local.get('browsingQualityAnalysis');
      const qualityAnalysis = stored.browsingQualityAnalysis;
      
      const qualityContainer = document.getElementById('contentQualityInsights');
      if (!qualityContainer) return;

      if (!qualityAnalysis) {
        qualityContainer.innerHTML = `
          <div class="quality-section">
            <h3>📊 Content Quality Analysis</h3>
            <p>No quality analysis available. Run analysis to see insights.</p>
          </div>
        `;
        return;
      }

      const averageScore = qualityAnalysis.averageScore;
      const scorePercentage = Math.round(averageScore * 100);
      const scoreColor = this.getScoreColor(averageScore);
      const scoreLabel = this.getScoreLabel(averageScore);

      const qualityHtml = `
        <div class="quality-section">
          <h3>📊 Content Quality Analysis</h3>
          
          <div class="quality-overview">
            <div class="quality-score">
              <div class="score-circle ${scoreColor}">
                <span class="score-number">${scorePercentage}%</span>
                <span class="score-label">${scoreLabel}</span>
              </div>
            </div>
            
            <div class="quality-stats">
              <div class="stat-item">
                <span class="stat-label">Average Quality</span>
                <span class="stat-value">${scorePercentage}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Pages Analyzed</span>
                <span class="stat-value">${qualityAnalysis.scores.length}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Last Updated</span>
                <span class="stat-value">${new Date(qualityAnalysis.analyzedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div class="quality-breakdown">
            <h4>Quality Breakdown</h4>
            <div class="quality-bars">
              ${this.generateQualityBars(qualityAnalysis.scores)}
            </div>
          </div>

          <div class="quality-recommendations">
            <h4>Recommendations</h4>
            <div class="recommendations-list">
              ${this.generateQualityRecommendations(averageScore)}
            </div>
          </div>
        </div>
      `;

      qualityContainer.innerHTML = qualityHtml;
    } catch (error) {
      console.warn('Failed to display content quality insights:', error);
    }
  }

  // Get score color based on quality
  getScoreColor(score) {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  // Get score label based on quality
  getScoreLabel(score) {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Improvement';
  }

  // Generate quality bars
  generateQualityBars(scores) {
    const ranges = {
      'excellent': { min: 0.8, max: 1.0, label: 'Excellent (80-100%)', color: '#4CAF50' },
      'good': { min: 0.6, max: 0.8, label: 'Good (60-79%)', color: '#8BC34A' },
      'fair': { min: 0.4, max: 0.6, label: 'Fair (40-59%)', color: '#FFC107' },
      'poor': { min: 0.0, max: 0.4, label: 'Poor (0-39%)', color: '#F44336' }
    };

    const counts = {};
    Object.keys(ranges).forEach(range => counts[range] = 0);

    scores.forEach(score => {
      const qualityScore = score.quality.score;
      Object.entries(ranges).forEach(([range, config]) => {
        if (qualityScore >= config.min && qualityScore < config.max) {
          counts[range]++;
        }
      });
    });

    return Object.entries(ranges).map(([range, config]) => {
      const count = counts[range];
      const percentage = scores.length > 0 ? (count / scores.length) * 100 : 0;
      
      return `
        <div class="quality-bar">
          <div class="bar-label">${config.label}</div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%; background-color: ${config.color};"></div>
            <span class="bar-count">${count}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Generate quality recommendations
  generateQualityRecommendations(averageScore) {
    const recommendations = [];

    if (averageScore < 0.4) {
      recommendations.push('Consider visiting more reputable and well-written sources');
      recommendations.push('Look for content with clear structure and proper grammar');
      recommendations.push('Diversify your sources to include more authoritative websites');
    } else if (averageScore < 0.6) {
      recommendations.push('Try to balance your content sources for better quality');
      recommendations.push('Look for more in-depth articles and resources');
      recommendations.push('Consider academic or professional sources for research topics');
    } else if (averageScore < 0.8) {
      recommendations.push('Great job! You\'re accessing quality content');
      recommendations.push('Consider exploring more specialized or expert sources');
      recommendations.push('Look for peer-reviewed or professionally edited content');
    } else {
      recommendations.push('Excellent! You\'re consistently accessing high-quality content');
      recommendations.push('Keep up the great browsing habits');
      recommendations.push('Consider sharing quality sources with others');
    }

    return recommendations.map(rec => `
      <div class="recommendation-item">
        <span class="recommendation-icon">💡</span>
        <span class="recommendation-text">${rec}</span>
      </div>
    `).join('');
  }

  // Analyze multilingual browsing patterns
  async analyzeMultilingualBrowsingPatterns() {
    try {
      const historyData = this.historyService.historyData;
      const languageAnalysis = {
        languages: {},
        totalPages: historyData.length,
        analyzedAt: Date.now()
      };

      // Sample recent items for language detection
      const sampleItems = historyData.slice(0, 30);
      
      for (const item of sampleItems) {
        try {
          const languageDetection = await this.aiService.detectLanguage(item.title);
          const language = languageDetection.language || 'unknown';
          
          if (!languageAnalysis.languages[language]) {
            languageAnalysis.languages[language] = {
              count: 0,
              confidence: 0,
              pages: []
            };
          }
          
          languageAnalysis.languages[language].count++;
          languageAnalysis.languages[language].confidence += languageDetection.confidence;
          languageAnalysis.languages[language].pages.push({
            title: item.title,
            url: item.url,
            confidence: languageDetection.confidence
          });
        } catch (error) {
          console.warn('Failed to detect language for item:', item.url);
        }
      }

      // Calculate average confidence for each language
      Object.keys(languageAnalysis.languages).forEach(lang => {
        const langData = languageAnalysis.languages[lang];
        langData.confidence = langData.confidence / langData.count;
      });

      // Store language analysis
      await chrome.storage.local.set({ multilingualAnalysis: languageAnalysis });
      
      console.log('Multilingual browsing analysis completed');
      return languageAnalysis;
    } catch (error) {
      console.warn('Failed to analyze multilingual patterns:', error);
      return null;
    }
  }

  // Display multilingual insights
  async displayMultilingualInsights() {
    try {
      const stored = await chrome.storage.local.get('multilingualAnalysis');
      const languageAnalysis = stored.multilingualAnalysis;
      
      const multilingualContainer = document.getElementById('multilingualInsights');
      if (!multilingualContainer) return;

      if (!languageAnalysis) {
        multilingualContainer.innerHTML = `
          <div class="multilingual-section">
            <h3>🌍 Multilingual Analysis</h3>
            <p>No language analysis available. Run analysis to see insights.</p>
          </div>
        `;
        return;
      }

      const languages = Object.entries(languageAnalysis.languages)
        .sort(([,a], [,b]) => b.count - a.count);

      const multilingualHtml = `
        <div class="multilingual-section">
          <h3>🌍 Multilingual Analysis</h3>
          
          <div class="language-overview">
            <div class="language-stats">
              <div class="stat-item">
                <span class="stat-label">Languages Detected</span>
                <span class="stat-value">${languages.length}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Pages Analyzed</span>
                <span class="stat-value">${languageAnalysis.totalPages}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Last Updated</span>
                <span class="stat-value">${new Date(languageAnalysis.analyzedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div class="language-breakdown">
            <h4>Language Distribution</h4>
            <div class="language-list">
              ${languages.map(([lang, data]) => `
                <div class="language-item">
                  <div class="language-info">
                    <span class="language-name">${this.getLanguageName(lang)}</span>
                    <span class="language-code">${lang}</span>
                  </div>
                  <div class="language-stats">
                    <span class="language-count">${data.count} pages</span>
                    <span class="language-confidence">${Math.round(data.confidence * 100)}% confidence</span>
                  </div>
                  <div class="language-bar">
                    <div class="language-fill" style="width: ${(data.count / languageAnalysis.totalPages) * 100}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      multilingualContainer.innerHTML = multilingualHtml;
    } catch (error) {
      console.warn('Failed to display multilingual insights:', error);
    }
  }

  // Get language name from code
  getLanguageName(code) {
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'unknown': 'Unknown'
    };
    
    return languageNames[code] || code.toUpperCase();
  }

  // Get simple quality score for content (fast heuristic-based)
  getSimpleQualityScore(content) {
    if (!content || typeof content !== 'string') {
      return { score: 0, stars: '☆☆☆☆☆', label: 'No content' };
    }

    let score = 0.5; // Base score

    // Length factor (prefer moderate length)
    const length = content.length;
    if (length > 50 && length < 500) score += 0.15;
    else if (length >= 500 && length < 1000) score += 0.1;
    else if (length < 20) score -= 0.2;

    // Capital letters (indicates proper formatting)
    const capitals = (content.match(/[A-Z]/g) || []).length;
    if (capitals > 0 && capitals < length * 0.5) score += 0.1;

    // Punctuation (indicates structure)
    const punctuation = (content.match(/[.!?]/g) || []).length;
    if (punctuation > 0) score += 0.05;

    // Keywords indicating quality content
    const qualityKeywords = ['learn', 'guide', 'tutorial', 'documentation', 'article', 'research', 'study'];
    const lowerContent = content.toLowerCase();
    if (qualityKeywords.some(kw => lowerContent.includes(kw))) score += 0.1;

    // Low-quality indicators
    const lowQualityIndicators = ['error', '404', 'not found', 'access denied'];
    if (lowQualityIndicators.some(ind => lowerContent.includes(ind))) score -= 0.3;

    // Normalize score
    score = Math.max(0, Math.min(1, score));

    // Convert to stars
    const starCount = Math.round(score * 5);
    const stars = '⭐'.repeat(starCount) + '☆'.repeat(5 - starCount);

    // Label
    let label;
    if (score >= 0.8) label = 'Excellent';
    else if (score >= 0.6) label = 'Good';
    else if (score >= 0.4) label = 'Fair';
    else if (score >= 0.2) label = 'Poor';
    else label = 'Low Quality';

    return { score: Math.round(score * 100), stars, label };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QualityAnalysisFeature;
} else {
  window.QualityAnalysisFeature = QualityAnalysisFeature;
}
