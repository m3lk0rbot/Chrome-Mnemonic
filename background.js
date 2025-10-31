// Background script for Chrome Mnemonic - Cross-Session Search Notifications
// This script runs in the background and handles search detection messages

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_SEARCH_DETECTED' || message.type === 'UNIVERSAL_SEARCH_DETECTED') {
    handleUniversalSearchDetection(message.data, sender.tab);
  }
});

// Handle universal search detection
async function handleUniversalSearchDetection(searchData, tab) {
  try {
    console.log('Background: Universal search detected:', searchData);
    
    // Store the search
    await storeUniversalSearch(searchData);
    
    // Check for similar searches
    const similarSearches = await findSimilarSearches(searchData.query);
    
    if (similarSearches.length > 0) {
      // Show notification
      await showSearchNotification(searchData, similarSearches, tab);
    }
  } catch (error) {
    console.warn('Background: Error handling universal search detection:', error);
  }
}

// Store universal search
async function storeUniversalSearch(searchData) {
  try {
    const stored = await chrome.storage.local.get('universalSearches');
    const searches = stored.universalSearches || [];
    
    searches.push({
      ...searchData,
      id: Date.now() + Math.random(),
      storedAt: Date.now()
    });
    
    // Keep only last 1000 searches
    if (searches.length > 1000) {
      searches.splice(0, searches.length - 1000);
    }
    
    await chrome.storage.local.set({ universalSearches: searches });
  } catch (error) {
    console.warn('Background: Failed to store universal search:', error);
  }
}

// Find similar searches
async function findSimilarSearches(query) {
  try {
    const stored = await chrome.storage.local.get('universalSearches');
    const searches = stored.universalSearches || [];
    
    const similarSearches = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    
    for (const search of searches) {
      if (search.query === query) continue; // Skip exact same query
      
      const searchWords = search.query.toLowerCase().split(/\s+/);
      const commonWords = queryWords.filter(word => 
        searchWords.some(searchWord => 
          searchWord.includes(word) || word.includes(searchWord)
        )
      );
      
      // Calculate similarity score
      const similarity = commonWords.length / Math.max(queryWords.length, searchWords.length);
      
      if (similarity > 0.3) { // 30% similarity threshold
        similarSearches.push({
          ...search,
          similarity: similarity
        });
      }
    }
    
    // Sort by similarity and recency
    return similarSearches
      .sort((a, b) => b.similarity - a.similarity || b.timestamp - a.timestamp)
      .slice(0, 5); // Top 5 similar searches
  } catch (error) {
    console.warn('Background: Failed to find similar searches:', error);
    return [];
  }
}

// Show search notification
async function showSearchNotification(currentSearch, similarSearches, tab) {
  try {
    const notificationId = `search-notification-${Date.now()}`;
    
    // Create notification HTML
    const notificationHtml = createSearchNotificationHTML(currentSearch, similarSearches, notificationId);
    
    // Inject notification into the current tab (skip restricted pages)
    try {
      // Check if we can inject into this tab
      const tabInfo = await chrome.tabs.get(tab.id);
      if (!tabInfo.url || 
          tabInfo.url.startsWith('chrome://') || 
          tabInfo.url.startsWith('chrome-extension://') ||
          tabInfo.url.startsWith('edge://') ||
          tabInfo.url.startsWith('about:') ||
          tabInfo.url.includes('extensions.gallery') ||
          tabInfo.url.includes('chrome.google.com/webstore')) {
        console.log(`⏭️ Skipping search notification for restricted page: ${tabInfo.url}`);
        return;
      }
    } catch (tabError) {
      console.warn('Could not check tab URL for search notification, skipping:', tabError);
      return;
    }
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (html, id) => {
        // Create notification element
        const notification = document.createElement('div');
        notification.id = id;
        notification.innerHTML = html;
        notification.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 350px;
          max-height: 400px;
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          overflow: hidden;
          transform: translateX(100%);
          transition: transform 0.3s ease-out;
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
          notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => {
            notification.remove();
          }, 300);
        }, 10000);
        
        // Add click handlers
        const viewMoreBtn = document.getElementById(`view-more-${id}`);
        const expandedContent = document.getElementById(`expanded-content-${id}`);
        
        if (viewMoreBtn && expandedContent) {
          viewMoreBtn.addEventListener('click', () => {
            if (expandedContent.style.display === 'none') {
              expandedContent.style.display = 'block';
              viewMoreBtn.textContent = 'Show Less';
            } else {
              expandedContent.style.display = 'none';
              viewMoreBtn.textContent = `View More (${similarSearches.length} similar searches)`;
            }
          });
        }
      },
      args: [notificationHtml, notificationId]
    });
    } catch (err) {
      // Silently skip errors for pages that can't be scripted
      const errMsg = err.message || '';
      if (errMsg.includes('Cannot access') || errMsg.includes('extensions gallery') || errMsg.includes('cannot be scripted')) {
        console.log(`⏭️ Skipping search notification for restricted page: ${errMsg}`);
      } else {
        console.warn('Background: Error showing search notification:', err);
      }
    }
  } catch (error) {
    console.warn('Background: Failed to show search notification:', error);
  }
}

// Create notification HTML
function createSearchNotificationHTML(currentSearch, similarSearches, notificationId) {
  const mostRecent = similarSearches[0];
  const timeAgo = getTimeAgo(mostRecent.timestamp);
  
  return `
    <div style="padding: 16px;">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="
          width: 32px; 
          height: 32px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
        ">
          <span style="color: white; font-size: 16px;">🧠</span>
        </div>
        <div>
          <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
            Similar Search Found!
          </div>
          <div style="font-size: 12px; color: #6c757d;">
            You searched for this on ${mostRecent.website}
          </div>
        </div>
        <button onclick="this.closest('[id=\\'${notificationId}\\']').remove()" style="
          background: none; 
          border: none; 
          font-size: 18px; 
          color: #6c757d; 
          cursor: pointer;
          margin-left: auto;
          padding: 4px;
        ">×</button>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 500; color: #2c3e50; margin-bottom: 4px;">
          "${mostRecent.query}"
        </div>
        <div style="font-size: 12px; color: #6c757d;">
          ${timeAgo} • ${mostRecent.website}
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <button id="view-more-${notificationId}" style="
          background: #667eea;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
        ">
          View More (${similarSearches.length} similar searches)
        </button>
      </div>
      
      <div id="expanded-content-${notificationId}" style="display: none; max-height: 200px; overflow-y: auto;">
        ${similarSearches.map(search => `
          <div style="
            padding: 8px; 
            margin: 4px 0; 
            background: #f8f9fa; 
            border-radius: 6px;
            border-left: 3px solid #667eea;
          ">
            <div style="font-weight: 500; color: #2c3e50; margin-bottom: 2px;">
              "${search.query}"
            </div>
            <div style="font-size: 11px; color: #6c757d;">
              ${getTimeAgo(search.timestamp)} • ${search.website}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}


// Get time ago string
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Inject notification into page
function injectNotificationIntoPage(html, notificationId) {
  // Create notification element
  const notification = document.createElement('div');
  notification.id = notificationId;
  notification.innerHTML = html;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    max-height: 400px;
    background: white;
    border: 1px solid #e1e5e9;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
    overflow: hidden;
    transform: translateX(100%);
    transition: transform 0.3s ease-out;
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    removeNotification(notificationId);
  }, 10000);
  
  // Add click handlers
  attachNotificationHandlers(notificationId);
}

// Attach notification handlers
function attachNotificationHandlers(notificationId) {
  const viewMoreBtn = document.getElementById(`view-more-${notificationId}`);
  const expandedContent = document.getElementById(`expanded-content-${notificationId}`);
  
  if (viewMoreBtn && expandedContent) {
    viewMoreBtn.addEventListener('click', () => {
      if (expandedContent.style.display === 'none') {
        expandedContent.style.display = 'block';
        viewMoreBtn.textContent = 'Show Less';
      } else {
        expandedContent.style.display = 'none';
        viewMoreBtn.textContent = `View More (${similarSearches.length} similar searches)`;
      }
    });
  }
}

// Remove notification
function removeNotification(notificationId) {
  const notification = document.getElementById(notificationId);
  if (notification) {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
}

// Handle extension icon click to open as side panel
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Try to use side panel API if available
    if (chrome.sidePanel) {
      await chrome.sidePanel.open({ tabId: tab.id });
    } else {
      // Fallback to new tab
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    }
  } catch (error) {
    // Fallback to new tab if side panel fails
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }
});

// Initialize background script
console.log('Chrome Mnemonic background script loaded');

// Revisit Notifications (tabs-only). Runs entirely in background.
(function setupRevisitNotifications() {
  try {
    console.log('🔔 Revisit notifications module initialized');
    const DAYS_90 = 90 * 24 * 60 * 60 * 1000;
    const NOTIFY_THRESHOLD = 2; // prior visits needed
    const THROTTLE_MINUTES = 0; // show on every reload (no throttle)

    const getDomain = (url) => {
      try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
    };

    // Normalize URL for matching (remove query, hash, trailing slash)
    const normalizeUrl = (url) => {
      try {
        const u = new URL(url);
        u.search = '';
        u.hash = '';
        let path = u.pathname;
        if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1);
        u.pathname = path;
        return u.href;
      } catch { return url; }
    };

    async function getMuted() {
      const res = await chrome.storage.local.get('revisitMutedDomains');
      return new Set(res.revisitMutedDomains || []);
    }

    async function muteDomain(domain) {
      const cur = await getMuted();
      cur.add(domain);
      await chrome.storage.local.set({ revisitMutedDomains: Array.from(cur) });
    }

    async function getThrottle() { return {}; }
    async function setThrottle(_) { /* disabled */ }

    chrome.webNavigation.onCommitted.addListener(async (details) => {
      try {
        const url = details.url || '';
        // Skip restricted pages that can't be scripted
        if (!url || 
            url.startsWith('chrome://') || 
            url.startsWith('chrome-extension://') ||
            url.startsWith('edge://') ||
            url.startsWith('about:') ||
            url.includes('extensions.gallery') ||
            url.includes('chrome.google.com/webstore')) return;
        if (details.transitionType === 'reload') return;
        if (details.frameId !== 0) return; // Only main frame

        const domain = getDomain(url);
        if (!domain) return;

        const muted = await getMuted();
        if (muted.has(domain)) {
          console.log(`🔕 Domain ${domain} is muted, skipping notification`);
          return;
        }

        // No throttle; show on every main-frame navigation

        // Search by domain to catch all pages on the site
        const normalizedUrl = normalizeUrl(url);
        const historyItems = await chrome.history.search({ 
          text: domain, 
          maxResults: 100, 
          startTime: Date.now() - DAYS_90 
        });
        
        // Exact-page items (normalized)
        const samePageItems = (historyItems || []).filter(i => normalizeUrl(i.url) === normalizedUrl);
        
        // Merge all visits across any stored variants of this page
        let allVisits = [];
        try {
          const perItem = await Promise.all(samePageItems.map(i => chrome.history.getVisits({ url: i.url }).catch(() => [])));
          allVisits = perItem.flat();
        } catch {}

        const visitCount = allVisits.length;
        const last = visitCount > 0 ? new Date(Math.max(...allVisits.map(v => v.visitTime || 0))).toLocaleString() : 'recently';
        const recentList = allVisits
          .sort((a,b) => (b.visitTime||0) - (a.visitTime||0))
          .slice(0,5)
          .map(v => new Date(v.visitTime).toLocaleString());

        console.log(`📊 URL: ${url.substring(0, 50)}... | Page visits: ${visitCount}`);

        if (visitCount >= 1) {
          
          const tabId = details.tabId;
          const popupUrl = chrome.runtime.getURL('popup.html');
          
          console.log(`🔔 Showing notification for ${url.substring(0, 50)}... (${visitCount} visits)`);
          
          try {
            // Check if we can inject into this tab (skip restricted pages)
            try {
              const tabs = await chrome.tabs.get(tabId);
              if (!tabs.url || 
                  tabs.url.startsWith('chrome://') || 
                  tabs.url.startsWith('chrome-extension://') ||
                  tabs.url.startsWith('edge://') ||
                  tabs.url.startsWith('about:') ||
                  tabs.url.includes('extensions.gallery') ||
                  tabs.url.includes('chrome.google.com/webstore')) {
                console.log(`⏭️ Skipping restricted page: ${tabs.url.substring(0, 50)}`);
                return;
              }
            } catch (tabError) {
              console.warn('Could not check tab URL, skipping injection:', tabError);
              return;
            }
            
            await chrome.scripting.executeScript({
              target: { tabId },
              func: (visits, lastSeen, dom, listTimes, pageUrl) => {
                try {
                  const id = 'mnemonic-revisit-toast';
                  const existing = document.getElementById(id);
                  if (existing) existing.remove();
                  
                  const el = document.createElement('div');
                  el.id = id;
                  el.style.cssText = `position:fixed;bottom:16px;right:16px;background:#111;color:#fff;padding:12px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;z-index:2147483647;display:block;max-width:460px;`;
                  const plural = visits === 1 ? 'time' : 'times';
                  const listHtml = (listTimes||[]).map(t => `<li style="margin:2px 0;">${t}</li>`).join('') || '<li>recently</li>';
                  el.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                      <span>🔔</span>
                      <strong>You visited this page ${visits} ${plural}.</strong>
                    </div>
                    <div style="font-size:12px;color:#e5e7eb;margin-bottom:6px;word-break:break-all;">${pageUrl}</div>
                    <div style="max-height:160px;overflow:auto;background:#1f2937;padding:8px;border-radius:8px;margin-bottom:8px;">
                      <div style="margin-bottom:6px;color:#9ca3af;">Latest visits</div>
                      <ul style="padding-left:18px;margin:0;">${listHtml}</ul>
                    </div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                      <button id="mnemonic-revisit-mute" style="background:#6b7280;color:#fff;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;">Mute this page</button>
                      <button id="mnemonic-revisit-close" style="background:#374151;color:#fff;border:none;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;">Close</button>
                    </div>`;
                  
                  document.body.appendChild(el);
                  
                  const close = () => { try { el.remove(); } catch {} };
                  
                  document.getElementById('mnemonic-revisit-mute')?.addEventListener('click', () => {
                    close();
                    window.postMessage({ type: 'MNEMONIC_MUTE_PAGE', url: document.location.href }, '*');
                  });
                  document.getElementById('mnemonic-revisit-close')?.addEventListener('click', close);
                } catch (e) { console.error('Toast injection error:', e); }
              },
              args: [visitCount, last, domain, recentList, normalizedUrl]
            });
            await setThrottle(domain);
            
            // Listen for mute requests
            const onMessage = async (msg, sender) => {
              if (msg?.type === 'MNEMONIC_MUTE_PAGE' && msg.url) {
                const stored = await chrome.storage.local.get('revisitMutedPages');
                const set = new Set(stored.revisitMutedPages || []);
                set.add(msg.url);
                await chrome.storage.local.set({ revisitMutedPages: Array.from(set) });
                chrome.runtime.onMessage.removeListener(onMessage);
              }
            };
            chrome.runtime.onMessage.addListener(onMessage);
          } catch (err) {
            // Silently skip errors for pages that can't be scripted (like extensions gallery)
            const errMsg = err.message || '';
            if (errMsg.includes('Cannot access') || errMsg.includes('extensions gallery') || errMsg.includes('cannot be scripted')) {
              console.log(`⏭️ Skipping injection for restricted page: ${errMsg}`);
            } else {
              console.error('Failed to inject toast:', err);
            }
          }
        }
      } catch (err) {
        console.error('Revisit notification error:', err);
      }
    });
    
    console.log('✅ Revisit notification listener registered');
  } catch (err) {
    console.error('Failed to setup revisit notifications:', err);
  }
})();