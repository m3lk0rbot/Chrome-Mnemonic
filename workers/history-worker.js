// History Worker - performs heavy history computations off the UI thread

// Group items by day
function groupByDay(historyData) {
  const grouped = {};
  for (let i = 0; i < historyData.length; i++) {
    const item = historyData[i];
    if (!item || !item.lastVisitTime) continue;
    const date = new Date(item.lastVisitTime);
    if (isNaN(date.getTime())) continue;
    const dayKey = date.toDateString();
    if (!grouped[dayKey]) {
      grouped[dayKey] = { date, items: [], count: 0 };
    }
    grouped[dayKey].items.push(item);
    grouped[dayKey].count++;
  }
  return Object.values(grouped).sort((a, b) => b.date - a.date);
}

// Build sessions based on time gaps
function buildSessions(sortedHistory, maxGapMinutes = 30) {
  if (!sortedHistory || sortedHistory.length === 0) return [];
  const sessions = [];
  let currentSession = [sortedHistory[0]];
  for (let i = 1; i < sortedHistory.length; i++) {
    const current = sortedHistory[i];
    const previous = sortedHistory[i - 1];
    const timeDiff = previous.lastVisitTime - current.lastVisitTime;
    const gapMinutes = timeDiff / (1000 * 60);
    if (gapMinutes <= maxGapMinutes) {
      currentSession.push(current);
    } else {
      if (currentSession.length > 0) {
        sessions.push({
          startTime: currentSession[currentSession.length - 1].lastVisitTime,
          endTime: currentSession[0].lastVisitTime,
          duration: currentSession[0].lastVisitTime - currentSession[currentSession.length - 1].lastVisitTime,
          items: currentSession,
          count: currentSession.length
        });
      }
      currentSession = [current];
    }
  }
  if (currentSession.length > 0) {
    sessions.push({
      startTime: currentSession[currentSession.length - 1].lastVisitTime,
      endTime: currentSession[0].lastVisitTime,
      duration: currentSession[0].lastVisitTime - currentSession[currentSession.length - 1].lastVisitTime,
      items: currentSession,
      count: currentSession.length
    });
  }
  return sessions;
}

// Build statistics
function buildStats(historyData) {
  const totalItems = historyData.length;
  const uniqueDomains = new Set();
  const totalVisits = historyData.reduce((sum, item) => sum + (item.visitCount || 1), 0);

  for (let i = 0; i < historyData.length; i++) {
    const item = historyData[i];
    try {
      const url = new URL(item.url);
      uniqueDomains.add(url.hostname.replace('www.', ''));
    } catch {
      // ignore invalid URLs
    }
  }

  const sessions = buildSessions(historyData);
  const totalSessionTime = sessions.reduce((sum, s) => sum + s.duration, 0);

  return {
    totalItems,
    uniqueDomains: uniqueDomains.size,
    totalVisits,
    totalSessions: sessions.length,
    averageSessionDuration: sessions.length > 0 ? totalSessionTime / sessions.length : 0,
    averageItemsPerSession: sessions.length > 0 ? totalItems / sessions.length : 0
  };
}

self.onmessage = (event) => {
  const { action, payload } = event.data || {};
  try {
    switch (action) {
      case 'groupByDay': {
        const result = groupByDay(payload.historyData || []);
        self.postMessage({ success: true, result });
        break;
      }
      case 'buildSessions': {
        const result = buildSessions(payload.historyData || [], payload.maxGapMinutes || 30);
        self.postMessage({ success: true, result });
        break;
      }
      case 'buildStats': {
        const result = buildStats(payload.historyData || []);
        self.postMessage({ success: true, result });
        break;
      }
      default:
        self.postMessage({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    self.postMessage({ success: false, error: error && error.message ? error.message : 'Worker error' });
  }
};


