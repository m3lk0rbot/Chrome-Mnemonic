// Content script for Chrome Mnemonic - Universal Search Detection
// This script runs in the extension context and can access chrome.runtime

// Listen for messages from injected scripts
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHROME_MNEMONIC_SEARCH_DETECTED') {
    // Forward to background script
    chrome.runtime.sendMessage({
      type: 'UNIVERSAL_SEARCH_DETECTED',
      data: event.data.data
    });
  }
});

// Monitor for search form submissions on any website
function monitorSearchInputs() {
  const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="search"], input[placeholder*="Search"], textarea[placeholder*="search"], textarea[placeholder*="Search"]');

  searchInputs.forEach(input => {
    // Monitor for form submissions
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const query = input.value.trim();
        if (query.length > 3) {
          // Send search data to background script
          chrome.runtime.sendMessage({
            type: 'UNIVERSAL_SEARCH_DETECTED',
            data: {
              query: query,
              website: URLUtils.getDomain(window.location.href),
              domain: URLUtils.getDomain(window.location.href),
              timestamp: Date.now(),
              url: window.location.href
            }
          });
        }
      }
    });

    // Monitor for button clicks (submit buttons)
    const form = input.closest('form');
    if (form) {
      form.addEventListener('submit', () => {
        const query = input.value.trim();
        if (query.length > 3) {
          chrome.runtime.sendMessage({
            type: 'UNIVERSAL_SEARCH_DETECTED',
            data: {
              query: query,
              website: URLUtils.getDomain(window.location.href),
              domain: URLUtils.getDomain(window.location.href),
              timestamp: Date.now(),
              url: window.location.href
            }
          });
        }
      });
    }
  });
}

// Start monitoring when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorSearchInputs);
} else {
  monitorSearchInputs();
}

// Monitor for dynamically added search inputs
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const searchInputs = node.querySelectorAll ? 
          node.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="search"], input[placeholder*="Search"], textarea[placeholder*="search"], textarea[placeholder*="Search"]') : [];
        
        if (searchInputs.length > 0) {
          searchInputs.forEach(input => {
            // Add event listeners to new search inputs
            input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                const query = input.value.trim();
                if (query.length > 3) {
                  chrome.runtime.sendMessage({
                    type: 'UNIVERSAL_SEARCH_DETECTED',
                    data: {
                      query: query,
                      website: URLUtils.getDomain(window.location.href),
                      domain: URLUtils.getDomain(window.location.href),
                      timestamp: Date.now(),
                      url: window.location.href
                    }
                  });
                }
              }
            });
          });
        }
      }
    });
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('Chrome Mnemonic content script loaded');
