// Clustering Feature - Handles AI-powered clustering and analysis
class ClusteringFeature {
  constructor(aiService, historyService) {
    this.aiService = aiService;
    this.historyService = historyService;
  }

  // AI-Powered Clustering: Enhanced AI clustering using Summarizer API
  async computeAIClustersEnhanced() {
    if (!this.aiService.aiAvailable || typeof Summarizer === 'undefined') {
      return this.computeBasicClusters();
    }

    try {
      const MAX_ITEMS = 30; // Limit for AI processing
      const recentItems = this.historyService.historyData.slice(0, MAX_ITEMS);
      
      if (recentItems.length === 0) {
        return [];
      }

      // Create comprehensive content for AI analysis
      const contentForAI = recentItems.map((item, idx) => {
        const host = (() => { try { return new URL(item.url).hostname.replace('www.',''); } catch { return ''; } })();
        return `${idx + 1}. ${item.title} (${host})`;
      }).join('\n');

      const prompt = `Analyze this browsing history and create intelligent topic-based clusters.

Browsing History:
${contentForAI}

Create 3-6 meaningful clusters based on:
1. **Topic similarity** - group related subjects together
2. **Learning intent** - research vs entertainment vs work
3. **Content type** - articles, videos, documentation, social media
4. **Domain patterns** - but prioritize topic over domain
5. **User behavior** - what the user was trying to accomplish

For each cluster, provide:
- **name**: Descriptive cluster name (3-6 words)
- **description**: What this cluster represents (1-2 sentences)
- **intent**: Primary user intent (research, entertainment, work, learning, shopping, news, social)
- **topics**: Array of main topics (2-4 topics)
- **items**: Array of item indices (0-based) that belong to this cluster
- **confidence**: How confident you are in this clustering (0-1)

Return a JSON array of clusters. Focus on meaningful groupings that help the user understand their browsing patterns.`;

      const response = await this.aiService.withAISession('Summarizer', {
        expectedInputs: [{ type: 'text' }]
      }, async (summarizer) => {
        return await summarizer.summarize(prompt, {
          outputLanguage: 'en'
        });
      });

      try {
        const clusters = JSON.parse(response);
        if (!Array.isArray(clusters)) {
          throw new Error('Invalid cluster format');
        }

        // Map cluster data to actual history items
        const mappedClusters = clusters.map(cluster => ({
          name: cluster.name || 'Unnamed Cluster',
          description: cluster.description || 'No description available',
          intent: cluster.intent || 'unknown',
          topics: cluster.topics || [],
          confidence: cluster.confidence || 0.5,
          items: (cluster.items || []).map(idx => recentItems[idx]).filter(Boolean),
          itemCount: (cluster.items || []).length
        })).filter(cluster => cluster.items.length > 0);

        console.log(`Created ${mappedClusters.length} AI-powered clusters`);
        return mappedClusters;
      } catch (parseError) {
        console.warn('Failed to parse AI clusters:', parseError);
        return this.computeBasicClusters();
      }
    } catch (error) {
      console.warn('Enhanced AI clustering failed:', error);
      return this.computeBasicClusters();
    }
  }

  // Basic clustering fallback
  computeBasicClusters() {
    const historyData = this.historyService.historyData;
    const domainGroups = {};
    
    // Group by domain
    historyData.forEach(item => {
      try {
        const domain = new URL(item.url).hostname.replace('www.', '');
        if (!domainGroups[domain]) {
          domainGroups[domain] = [];
        }
        domainGroups[domain].push(item);
      } catch (error) {
        // Skip invalid URLs
      }
    });

    // Convert to cluster format
    return Object.entries(domainGroups)
      .filter(([, items]) => items.length > 0)
      .map(([domain, items]) => ({
        name: `${domain} (${items.length})`,
        description: `Pages from ${domain}`,
        intent: this.guessIntentFromDomain(domain),
        topics: [domain],
        confidence: 0.3,
        items: items,
        itemCount: items.length
      }))
      .sort((a, b) => b.itemCount - a.itemCount)
      .slice(0, 8);
  }

  // Guess intent from domain
  guessIntentFromDomain(domain) {
    const domainLower = domain.toLowerCase();
    
    if (domainLower.includes('youtube') || domainLower.includes('netflix') || domainLower.includes('spotify')) {
      return 'entertainment';
    } else if (domainLower.includes('github') || domainLower.includes('stackoverflow') || domainLower.includes('docs')) {
      return 'learning';
    } else if (domainLower.includes('linkedin') || domainLower.includes('slack') || domainLower.includes('teams')) {
      return 'work';
    } else if (domainLower.includes('amazon') || domainLower.includes('shop') || domainLower.includes('buy')) {
      return 'shopping';
    } else if (domainLower.includes('wikipedia') || domainLower.includes('research') || domainLower.includes('scholar')) {
      return 'research';
    } else {
      return 'general';
    }
  }

  // Compute learning intent clusters
  async computeLearningIntentClusters() {
    const historyData = this.historyService.historyData;
    const learningClusters = {
      'tutorials': [],
      'documentation': [],
      'coding': [],
      'research': [],
      'tools': []
    };

    historyData.forEach(item => {
      const title = item.title.toLowerCase();
      const url = item.url.toLowerCase();
      
      if (title.includes('tutorial') || title.includes('guide') || title.includes('how to')) {
        learningClusters.tutorials.push(item);
      } else if (title.includes('docs') || title.includes('documentation') || title.includes('api')) {
        learningClusters.documentation.push(item);
      } else if (title.includes('code') || title.includes('programming') || title.includes('github')) {
        learningClusters.coding.push(item);
      } else if (title.includes('research') || title.includes('study') || title.includes('analysis')) {
        learningClusters.research.push(item);
      } else if (title.includes('tool') || title.includes('app') || title.includes('software')) {
        learningClusters.tools.push(item);
      }
    });

    return Object.entries(learningClusters)
      .filter(([, items]) => items.length > 0)
      .map(([type, items]) => ({
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} (${items.length})`,
        description: `Learning content related to ${type}`,
        intent: 'learning',
        topics: [type],
        confidence: 0.7,
        items: items,
        itemCount: items.length
      }))
      .sort((a, b) => b.itemCount - a.itemCount);
  }

  // Analyze knowledge threads across sessions
  async analyzeKnowledgeThreads(sessionGroups) {
    if (!sessionGroups || !Array.isArray(sessionGroups)) {
      return [];
    }

    const knowledgeThreads = [];
    
    sessionGroups.forEach(session => {
      if (session && session.items && Array.isArray(session.items)) {
        const topics = this.extractTopicsFromSession(session.items);
        if (topics.length > 0) {
          knowledgeThreads.push({
            sessionId: session.id || Date.now(),
            topics: topics,
            itemCount: session.items.length,
            duration: session.duration || 0,
            startTime: session.startTime || Date.now()
          });
        }
      }
    });

    return knowledgeThreads;
  }

  // Extract topics from session items
  extractTopicsFromSession(items) {
    const topicCounts = {};
    
    items.forEach(item => {
      const title = item.title.toLowerCase();
      const url = item.url.toLowerCase();
      
      // Simple topic extraction based on keywords
      const topics = this.extractTopicsFromText(title + ' ' + url);
      topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  // Extract topics from text
  extractTopicsFromText(text) {
    const topics = [];
    const lowerText = text.toLowerCase();
    
    // Programming topics
    if (lowerText.includes('javascript') || lowerText.includes('js')) topics.push('javascript');
    if (lowerText.includes('python')) topics.push('python');
    if (lowerText.includes('react')) topics.push('react');
    if (lowerText.includes('node')) topics.push('nodejs');
    if (lowerText.includes('css')) topics.push('css');
    if (lowerText.includes('html')) topics.push('html');
    
    // General topics
    if (lowerText.includes('design')) topics.push('design');
    if (lowerText.includes('business')) topics.push('business');
    if (lowerText.includes('marketing')) topics.push('marketing');
    if (lowerText.includes('data')) topics.push('data');
    if (lowerText.includes('ai') || lowerText.includes('artificial intelligence')) topics.push('ai');
    
    return topics;
  }

  // Display enhanced clusters
  async displayEnhancedClusters() {
    try {
      // Check if we're using basic AI service (no AI mode)
      const isBasicMode = window.chromeMnemonic && window.chromeMnemonic.aiMode === 'no-ai';

      // Ensure a container exists inside the Clusters tab
      let enhancedContainer = document.getElementById('enhancedClusters');
      if (!enhancedContainer) {
        const clustersContent = document.getElementById('clusters-content');
        if (clustersContent) {
          clustersContent.style.display = 'block';
          enhancedContainer = document.createElement('div');
          enhancedContainer.id = 'enhancedClusters';
          clustersContent.innerHTML = '';
          clustersContent.appendChild(enhancedContainer);
        }
      }
      if (!enhancedContainer) return;

      if (isBasicMode) {
        await this.displayBasicClusters(enhancedContainer);
        return;
      }

      // Show loading state
      enhancedContainer.innerHTML = '<div class="loading">Computing clusters...</div>';

      const clusters = await this.computeAIClustersEnhanced();
      const learningClusters = await this.computeLearningIntentClusters();
      const knowledgeThreads = await this.analyzeKnowledgeThreads([]);

      let clustersHtml = '';

      if (clusters.length > 0) {
        clustersHtml += `
          <div class="clusters-section">
            <h3>🧠 AI-Powered Topic Clusters</h3>
            <div class="clusters-grid">
              ${clusters.map((cluster, clusterIndex) => {
                // Get quality score for cluster
                const qualityAnalyzer = window.chromeMnemonic?.qualityAnalysisFeature;
                const clusterContent = `${cluster.name} ${cluster.description} ${cluster.topics.join(' ')}`;
                const quality = qualityAnalyzer ? qualityAnalyzer.getSimpleQualityScore(clusterContent) : { stars: '⭐⭐⭐', label: 'Good', score: 60 };

                return `
                <div class="cluster-card" data-cluster-id="${clusterIndex}" data-cluster-type="ai">
                  <div class="cluster-header">
                    <h4 class="cluster-title">${cluster.name}</h4>
                    <span class="cluster-confidence">${Math.round(cluster.confidence * 100)}%</span>
                  </div>
                  <p class="cluster-description">${cluster.description}</p>
                  <div class="cluster-meta">
                    <span class="cluster-intent">${cluster.intent}</span>
                    <span class="cluster-count">${cluster.itemCount} items</span>
                    <span class="quality-badge" title="${quality.label} - Score: ${quality.score}" style="font-size: 11px; margin-left: 8px;">
                      ${quality.stars}
                    </span>
                  </div>
                  <div class="cluster-topics">
                    ${cluster.topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        `;
      }

      if (learningClusters.length > 0) {
        clustersHtml += `
          <div class="clusters-section">
            <h3>📚 Learning Intent Clusters</h3>
            <div class="clusters-grid">
              ${learningClusters.map((cluster, clusterIndex) => `
                <div class="cluster-card learning-cluster" data-cluster-id="${clusterIndex}" data-cluster-type="learning">
                  <div class="cluster-header">
                    <h4 class="cluster-title">${cluster.name}</h4>
                    <span class="cluster-confidence">${Math.round(cluster.confidence * 100)}%</span>
                  </div>
                  <p class="cluster-description">${cluster.description}</p>
                  <div class="cluster-meta">
                    <span class="cluster-intent">${cluster.intent}</span>
                    <span class="cluster-count">${cluster.itemCount} items</span>
                  </div>
                  <div class="cluster-topics">
                    ${cluster.topics ? cluster.topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('') : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (clustersHtml === '') {
        clustersHtml = '<div class="empty-note">No clusters found. Try visiting more websites to build browsing patterns.</div>';
      }

      enhancedContainer.innerHTML = clustersHtml;

      // Add click handlers for cluster cards
      setTimeout(() => {
        this.attachClusterClickHandlers(clusters, learningClusters);
      }, 100);
    } catch (error) {
      console.warn('Failed to display enhanced clusters:', error);
      const enhancedContainer = document.getElementById('enhancedClusters');
      if (enhancedContainer) {
        enhancedContainer.innerHTML = `<div class="error">Failed to display clusters: ${error.message}</div>`;
      }
    }
  }

  // Attach click handlers to cluster cards
  attachClusterClickHandlers(aiClusters, learningClusters) {
    const clusterCards = document.querySelectorAll('.cluster-card');

    clusterCards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent triggering when clicking on links
        if (e.target.tagName === 'A' || e.target.closest('a')) {
          return;
        }

        const clusterId = parseInt(card.dataset.clusterId);
        const clusterType = card.dataset.clusterType;

        let cluster;
        if (clusterType === 'ai') {
          cluster = aiClusters[clusterId];
        } else if (clusterType === 'learning') {
          cluster = learningClusters[clusterId];
        } else if (clusterType === 'basic') {
          cluster = this.basicClusters[clusterId];
        }

        if (cluster && cluster.items) {
          const chromeMnemonic = window.chromeMnemonic;
          if (chromeMnemonic) {
            chromeMnemonic.showDetailsModal(
              cluster.name,
              `${cluster.itemCount} items in this cluster`,
              cluster.items
            );
          }
        }
      });
    });
  }

  // Display basic clusters (no AI mode)
  async displayBasicClusters(container) {
    try {
      console.log('🔧 Displaying basic clusters (No AI mode)');
      
      // Get history data
      const history = await this.historyService.getHistory();
      if (!Array.isArray(history) || history.length === 0) {
        container.innerHTML = '<div class="ai-status">📊 No history data available</div>';
        return;
      }

      // Use basic AI service for clustering
      const basicAIService = window.chromeMnemonic.basicAIService;
      if (!basicAIService) {
        container.innerHTML = '<div class="ai-status">⚠️ Basic AI service not available</div>';
        return;
      }

      const clusters = await basicAIService.clusterHistory(history);
      
      let clustersHtml = '';

      // Store clusters for click handlers
      this.basicClusters = clusters;

      if (clusters.length > 0) {
        clustersHtml += `
          <div class="clusters-section">
            <h3>🔧 Basic Topic Clusters</h3>
            <div class="clusters-grid">
              ${clusters.map((cluster, clusterIndex) => `
                <div class="cluster-card" data-cluster-id="${clusterIndex}" data-cluster-type="basic">
                  <div class="cluster-header">
                    <h4 class="cluster-title">${cluster.name}</h4>
                    <span class="cluster-confidence">${Math.round(cluster.confidence * 100)}%</span>
                  </div>
                  <p class="cluster-description">${cluster.description}</p>
                  <div class="cluster-meta">
                    <span class="cluster-intent">${cluster.type}</span>
                    <span class="cluster-count">${cluster.itemCount} items</span>
                  </div>
                  <div class="cluster-topics">
                    ${cluster.domain ? `<span class="topic-tag">${cluster.domain}</span>` : ''}
                    ${cluster.keyword ? `<span class="topic-tag">${cluster.keyword}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else {
        clustersHtml = '<div class="ai-status">📊 No clusters found</div>';
      }

      // Add learning clusters (basic version)
      const learningClusters = clusters.filter(c => c.type === 'domain' && c.itemCount >= 3);
      if (learningClusters.length > 0) {
        clustersHtml += `
          <div class="clusters-section">
            <h3>📚 Learning Intent Clusters</h3>
            <div class="clusters-grid">
              ${learningClusters.map((cluster, clusterIndex) => `
                <div class="cluster-card learning-cluster" data-cluster-id="${clusterIndex}" data-cluster-type="basic">
                  <div class="cluster-header">
                    <h4 class="cluster-title">${cluster.name}</h4>
                    <span class="cluster-confidence">${Math.round(cluster.confidence * 100)}%</span>
                  </div>
                  <p class="cluster-description">${cluster.description}</p>
                  <div class="cluster-meta">
                    <span class="cluster-intent">${cluster.type}</span>
                    <span class="cluster-count">${cluster.itemCount} items</span>
                  </div>
                  <div class="cluster-topics">
                    <span class="topic-tag">${cluster.domain}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      container.innerHTML = clustersHtml;

      // Add click handlers for cluster cards
      setTimeout(() => {
        this.attachClusterClickHandlers([], learningClusters);
      }, 100);
      
    } catch (error) {
      console.warn('Failed to display basic clusters:', error);
      container.innerHTML = `<div class="ai-status">❌ Basic Clusters Error</div><div class="error">Failed to load basic clusters: ${error.message}</div>`;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClusteringFeature;
} else {
  window.ClusteringFeature = ClusteringFeature;
}
