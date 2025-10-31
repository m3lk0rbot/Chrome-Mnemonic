// Loading Manager - Handles loading states, progress indicators, and user feedback
class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.loadingStates = new Map();
    this.progressCallbacks = new Map();
  }

  // Show loading state with optional progress tracking
  showLoading(operationId, message = 'Loading...', options = {}) {
    const {
      showProgress = false,
      progressCallback = null,
      timeout = 10000,
      allowCancel = false
    } = options;

    const loadingState = {
      id: operationId,
      message: message,
      startTime: Date.now(),
      progress: 0,
      showProgress: showProgress,
      allowCancel: allowCancel,
      cancelled: false,
      timeout: timeout
    };

    this.activeLoaders.set(operationId, loadingState);
    this.loadingStates.set(operationId, 'loading');

    if (progressCallback) {
      this.progressCallbacks.set(operationId, progressCallback);
    }

    this.renderLoadingUI(loadingState);

    // Set timeout
    if (timeout > 0) {
      setTimeout(() => {
        if (this.activeLoaders.has(operationId)) {
          this.hideLoading(operationId, 'timeout');
        }
      }, timeout);
    }

    console.log(`🔄 Loading started: ${operationId} - ${message}`);
    return operationId;
  }

  // Update loading progress
  updateProgress(operationId, progress, message = null) {
    const loadingState = this.activeLoaders.get(operationId);
    if (!loadingState) return;

    loadingState.progress = Math.max(0, Math.min(100, progress));
    if (message) {
      loadingState.message = message;
    }

    this.renderLoadingUI(loadingState);

    // Call progress callback if provided
    const callback = this.progressCallbacks.get(operationId);
    if (callback) {
      callback(loadingState.progress, loadingState.message);
    }

    console.log(`📊 Progress updated: ${operationId} - ${loadingState.progress}%`);
  }

  // Hide loading state
  hideLoading(operationId, reason = 'completed') {
    const loadingState = this.activeLoaders.get(operationId);
    if (!loadingState) return;

    const duration = Date.now() - loadingState.startTime;
    this.activeLoaders.delete(operationId);
    this.loadingStates.set(operationId, reason);
    this.progressCallbacks.delete(operationId);

    this.removeLoadingUI(operationId);

    console.log(`✅ Loading finished: ${operationId} - ${reason} (${duration}ms)`);
  }

  // Cancel loading operation
  cancelLoading(operationId) {
    const loadingState = this.activeLoaders.get(operationId);
    if (!loadingState || !loadingState.allowCancel) return false;

    loadingState.cancelled = true;
    this.hideLoading(operationId, 'cancelled');
    return true;
  }

  // Check if operation is loading
  isLoading(operationId) {
    return this.activeLoaders.has(operationId);
  }

  // Get loading state
  getLoadingState(operationId) {
    return this.activeLoaders.get(operationId) || null;
  }

  // Get all active loaders
  getActiveLoaders() {
    return Array.from(this.activeLoaders.values());
  }

  // Render loading UI
  renderLoadingUI(loadingState) {
    const content = document.getElementById('content');
    if (!content) return;

    // Create or update loading overlay
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'loading-overlay';
      loadingOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(248, 249, 250, 0.95);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      content.appendChild(loadingOverlay);
    }

    const progressBar = loadingState.showProgress ? `
      <div style="width: 200px; height: 4px; background: #e1e5e9; border-radius: 2px; margin: 12px 0; overflow: hidden;">
        <div style="
          width: ${loadingState.progress}%;
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 2px;
          transition: width 0.3s ease;
        "></div>
      </div>
    ` : '';

    const cancelButton = loadingState.allowCancel ? `
      <button onclick="window.loadingManager.cancelLoading('${loadingState.id}')" style="
        margin-top: 12px;
        padding: 6px 12px;
        border: 1px solid #dc3545;
        border-radius: 4px;
        background: white;
        color: #dc3545;
        cursor: pointer;
        font-size: 12px;
      ">Cancel</button>
    ` : '';

    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid #e1e5e9;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        "></div>
        <div style="
          font-size: 14px;
          color: #2c3e50;
          margin-bottom: 8px;
          font-weight: 500;
        ">${loadingState.message}</div>
        ${progressBar}
        ${cancelButton}
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  // Remove loading UI
  removeLoadingUI(operationId) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.remove();
    }
  }

  // Show progress for multi-step operations
  showProgress(operationId, steps) {
    const stepNames = Array.isArray(steps) ? steps : Object.keys(steps);
    const totalSteps = stepNames.length;
    let currentStep = 0;

    this.showLoading(operationId, `Starting ${stepNames[0]}...`, {
      showProgress: true,
      allowCancel: true
    });

    return {
      nextStep: (stepName = null) => {
        currentStep++;
        const progress = (currentStep / totalSteps) * 100;
        const message = stepName || stepNames[currentStep - 1] || `Step ${currentStep} of ${totalSteps}`;
        this.updateProgress(operationId, progress, message);
      },
      complete: () => {
        this.hideLoading(operationId, 'completed');
      },
      cancel: () => {
        this.cancelLoading(operationId);
      }
    };
  }

  // Show loading with estimated time
  showLoadingWithEstimate(operationId, message, estimatedSeconds) {
    this.showLoading(operationId, message, { showProgress: true });
    
    const startTime = Date.now();
    const estimatedMs = estimatedSeconds * 1000;
    
    const updateProgress = () => {
      if (!this.activeLoaders.has(operationId)) return;
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(95, (elapsed / estimatedMs) * 100); // Cap at 95%
      
      this.updateProgress(operationId, progress, `${message} (${Math.ceil((estimatedMs - elapsed) / 1000)}s remaining)`);
      
      if (progress < 95) {
        setTimeout(updateProgress, 1000);
      }
    };
    
    setTimeout(updateProgress, 1000);
    return operationId;
  }

  // Show loading with dots animation
  showLoadingDots(operationId, message) {
    this.showLoading(operationId, message);
    
    let dotCount = 0;
    const maxDots = 3;
    
    const animateDots = () => {
      if (!this.activeLoaders.has(operationId)) return;
      
      dotCount = (dotCount + 1) % (maxDots + 1);
      const dots = '.'.repeat(dotCount);
      const loadingState = this.activeLoaders.get(operationId);
      if (loadingState) {
        loadingState.message = message + dots;
        this.renderLoadingUI(loadingState);
      }
      
      setTimeout(animateDots, 500);
    };
    
    setTimeout(animateDots, 500);
    return operationId;
  }

  // Clear all loading states
  clearAll() {
    this.activeLoaders.forEach((_, operationId) => {
      this.hideLoading(operationId, 'cleared');
    });
    this.activeLoaders.clear();
    this.loadingStates.clear();
    this.progressCallbacks.clear();
  }

  // Get loading statistics
  getStats() {
    const activeCount = this.activeLoaders.size;
    const totalOperations = this.loadingStates.size;
    const completedOperations = Array.from(this.loadingStates.values()).filter(state => 
      state === 'completed' || state === 'cancelled' || state === 'timeout'
    ).length;

    return {
      activeLoaders: activeCount,
      totalOperations: totalOperations,
      completedOperations: completedOperations,
      successRate: totalOperations > 0 ? (completedOperations / totalOperations * 100).toFixed(1) : 0
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingManager;
} else {
  window.LoadingManager = LoadingManager;
}
