/**
 * AI Impact Tracker - Tracks AI operations for impact dashboard
 * Monitors local vs cloud operations, cost savings, and environmental impact
 */

class AIImpactTracker {
  constructor() {
    this.stats = {
      localOperations: 0,
      cloudOperations: 0,
      operationsByAPI: {
        summarizer: { local: 0, cloud: 0 },
        writer: { local: 0, cloud: 0 },
        rewriter: { local: 0, cloud: 0 },
        proofreader: { local: 0, cloud: 0 },
        translator: { local: 0, cloud: 0 },
        prompt: { local: 0, cloud: 0 }
      },
      startTime: Date.now(),
      lastUpdate: Date.now()
    };

    this.loadStats();
  }

  // Load stats from storage
  async loadStats() {
    try {
      const stored = await chrome.storage.local.get('aiImpactStats');
      if (stored.aiImpactStats) {
        this.stats = { ...this.stats, ...stored.aiImpactStats };
      }
    } catch (error) {
      console.warn('Failed to load AI impact stats:', error);
    }
  }

  // Save stats to storage
  async saveStats() {
    try {
      this.stats.lastUpdate = Date.now();
      await chrome.storage.local.set({ aiImpactStats: this.stats });
    } catch (error) {
      console.warn('Failed to save AI impact stats:', error);
    }
  }

  // Track an AI operation
  async trackOperation(apiType, isLocal = true) {
    if (isLocal) {
      this.stats.localOperations++;
    } else {
      this.stats.cloudOperations++;
    }

    // Track by API type
    const apiKey = apiType.toLowerCase().replace('languagemodel', 'prompt');
    if (this.stats.operationsByAPI[apiKey]) {
      if (isLocal) {
        this.stats.operationsByAPI[apiKey].local++;
      } else {
        this.stats.operationsByAPI[apiKey].cloud++;
      }
    }

    await this.saveStats();
  }

  // Get impact statistics
  getImpactStats() {
    const totalOperations = this.stats.localOperations + this.stats.cloudOperations;
    const privacyScore = totalOperations > 0
      ? Math.round((this.stats.localOperations / totalOperations) * 100)
      : 100;

    // Cost estimates (rough averages per operation)
    const cloudCostPerOp = 0.002; // $0.002 per operation average
    const costSaved = (this.stats.localOperations * cloudCostPerOp).toFixed(2);

    // CO2 estimates (rough averages)
    const cloudCO2PerOp = 0.01; // 10g CO2 per cloud operation
    const co2Saved = ((this.stats.localOperations * cloudCO2PerOp) / 1000).toFixed(2); // in kg

    // Uptime
    const uptimeMs = Date.now() - this.stats.startTime;
    const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const uptimeHours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return {
      totalOperations,
      localOperations: this.stats.localOperations,
      cloudOperations: this.stats.cloudOperations,
      privacyScore,
      costSaved,
      co2Saved,
      operationsByAPI: this.stats.operationsByAPI,
      uptime: {
        days: uptimeDays,
        hours: uptimeHours,
        formatted: `${uptimeDays}d ${uptimeHours}h`
      },
      averageOpsPerDay: totalOperations > 0 && uptimeDays > 0
        ? Math.round(totalOperations / Math.max(uptimeDays, 1))
        : totalOperations
    };
  }

  // Reset statistics
  async resetStats() {
    this.stats = {
      localOperations: 0,
      cloudOperations: 0,
      operationsByAPI: {
        summarizer: { local: 0, cloud: 0 },
        writer: { local: 0, cloud: 0 },
        rewriter: { local: 0, cloud: 0 },
        proofreader: { local: 0, cloud: 0 },
        translator: { local: 0, cloud: 0 },
        prompt: { local: 0, cloud: 0 }
      },
      startTime: Date.now(),
      lastUpdate: Date.now()
    };

    await this.saveStats();
  }

  // Export statistics
  exportStats() {
    return {
      ...this.getImpactStats(),
      exportTime: new Date().toISOString(),
      version: '1.0'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIImpactTracker;
} else {
  window.AIImpactTracker = AIImpactTracker;
}
