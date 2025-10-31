// Proactive Assistant Feature - surfaces contextual content suggestions

class ProactiveAssistantFeature {
  constructor(aiService, historyService, cacheManager = new CacheManager()) {
    this.aiService = aiService;
    this.historyService = historyService;
    this.cache = cacheManager;
  }

  async getSuggestions() {
    try {
      // Cache for 3 minutes
      const suggestions = await this.cache.getCachedData('proactive_suggestions', 3, async () => {
        const history = this.historyService.historyData || [];
        if (history.length === 0) return [];

        // Heuristic seeds
        const recent = history.slice(0, 20);
        const topDomains = this.historyService.getTopDomains(5).map(d => d.domain);
        const timeNow = new Date();
        const hour = timeNow.getHours();

        const context = {
          recentTitles: recent.map(i => i.title).slice(0, 10),
          recentDomains: recent.map(i => { try { return new URL(i.url).hostname.replace('www.',''); } catch { return 'unknown'; } }),
          topDomains,
          hour,
          day: timeNow.toLocaleDateString()
        };

        // If AI available, ask for actionable suggestions
        if (this.aiService.aiAvailable && typeof Writer !== 'undefined') {
          const prompt = `Given the user's recent browsing context below, propose 5 actionable, helpful suggestions.
Each suggestion should include: title, reason, action (url or type), and priority (1-3).

Context:
Recent titles: ${context.recentTitles.join('; ')}
Recent domains: ${context.recentDomains.slice(0,10).join(', ')}
Top domains: ${context.topDomains.join(', ')}
Local time hour: ${context.hour}

Return JSON array of {title, reason, action, priority}.`;

          try {
            const response = await this.aiService.withAISession('Writer', { expectedInputs: [{ type: 'text' }] }, async (writer) => {
              return await writer.write(prompt, { outputLanguage: 'en' });
            }, { timeout: 30000, retries: 1, priority: 'low', description: 'Proactive suggestions' });
            const parsed = JSON.parse(response);
            if (Array.isArray(parsed)) return parsed.slice(0, 5);
          } catch (e) {
            // fall through to heuristic
          }
        }

        // Heuristic fallback suggestions
        const fallback = [];
        if (topDomains.includes('github.com')) fallback.push({ title: 'Review today’s GitHub activity', reason: 'You visited GitHub recently', action: { type: 'open', url: 'https://github.com/pulls' }, priority: 2 });
        if (topDomains.includes('youtube.com')) fallback.push({ title: 'Continue your last watched topic', reason: 'You were on YouTube', action: { type: 'open', url: 'https://www.youtube.com/feed/history' }, priority: 3 });
        if (topDomains.includes('stackoverflow.com')) fallback.push({ title: 'Save helpful StackOverflow answers', reason: 'Capture useful solutions for later', action: { type: 'open', url: 'https://stackoverflow.com/users/saves' }, priority: 2 });
        fallback.push({ title: 'Revisit last session', reason: 'Pick up where you left off', action: { type: 'open', url: recent[0]?.url || 'about:blank' }, priority: 1 });

        return fallback.slice(0, 5);
      });

      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.warn('Proactive suggestions failed:', error);
      return [];
    }
  }

  async displaySuggestions(containerId = 'suggestions-panel') {
    try {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '<div class="ai-status">✨ Recommendations</div><div id="suggestions-list" class="suggestions-grid">Loading…</div>';

      const items = await this.getSuggestions();
      this.lastSuggestions = items; // Store for later use
      const list = document.getElementById('suggestions-list');
      if (!list) return;

      if (items.length === 0) {
        list.innerHTML = '<div class="empty-note">No suggestions yet. Browse a little and check back.</div>';
        return;
      }

      list.innerHTML = items.map((s, idx) => `
        <div class="suggestion-card" data-suggestion-id="suggestion-${idx}">
          <div class="suggestion-title">${s.title || 'Suggestion'}</div>
          <div class="suggestion-reason">${s.reason || ''}</div>
          <div class="suggestion-actions">
            <button class="open-btn" data-action="open" data-suggestion-id="suggestion-${idx}">Open</button>
            <button class="dismiss-btn" data-action="dismiss" data-suggestion-id="suggestion-${idx}">Dismiss</button>
          </div>
        </div>
      `).join('');

      // Delegate click handling to satisfy CSP (no inline handlers)
      list.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute('data-action');
        const suggId = target.getAttribute('data-suggestion-id');
        if (!action || !suggId) return;

        if (action === 'open' && window.chromeMnemonic?.openSuggestion) {
          window.chromeMnemonic.openSuggestion(suggId);
        } else if (action === 'dismiss' && window.chromeMnemonic?.dismissSuggestion) {
          window.chromeMnemonic.dismissSuggestion(suggId);
        }
      }, { once: true });
    } catch (error) {
      console.warn('Display suggestions failed:', error);
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProactiveAssistantFeature;
} else {
  window.ProactiveAssistantFeature = ProactiveAssistantFeature;
}


