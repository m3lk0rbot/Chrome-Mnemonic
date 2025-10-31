async function analyzeHistory() {
  const result = document.getElementById('result');
  
  try {
    result.innerHTML = 'Loading AI-powered history analysis...';

    // Get browser history
    const history = await chrome.history.search({
      text: '',
      maxResults: 50,
      startTime: Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
    });

    if (!history || history.length === 0) {
      result.innerHTML = 'No recent browsing history found. Please browse some websites first.';
      return;
    }

    // Try Chrome Built-in AI APIs using correct LanguageModel API
    if (typeof LanguageModel !== 'undefined') {
      result.innerHTML = 'Checking AI model availability...';
      
      // Check if model is available
      const availability = await LanguageModel.availability();
      console.log('LanguageModel availability:', availability);
      
      if (availability === 'unavailable') {
        result.innerHTML = 'AI model not available on this device. Check hardware requirements.';
        return;
      }
      
      if (availability === 'downloadable') {
        result.innerHTML = 'Downloading AI model... This may take a few minutes.';
      } else {
        result.innerHTML = 'Analyzing browsing patterns with AI...';
      }
      
      // Prepare history data for AI analysis
      const historyText = history.map(item => 
        `${item.title} - ${item.url} (${new Date(item.lastVisitTime).toLocaleDateString()})`
      ).join('\n');

      // Create session with download progress monitoring and required output language
      const session = await LanguageModel.create({
        expectedInputs: [{ type: 'text' }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            result.innerHTML = `Downloading AI model... ${(e.loaded * 100).toFixed(0)}%`;
          });
        }
      });
    
      const prompt = `Analyze this browser history data and provide insights:

${historyText}

Please provide:
1. Top 3 most visited domains
2. Browsing patterns and trends
3. Productivity suggestions
4. Time management insights
5. Website categorization

Format as a clear, actionable report.`;

      const response = await session.prompt(prompt, {
        outputLanguage: 'en'
      });
      result.innerHTML = `🤖 AI-Powered History Analysis:\n\n${response}`;
      
      // Clean up session
      session.destroy();
      return;
    }

    // Fallback: Basic analysis without AI
    result.innerHTML = 'Performing basic history analysis...';
    
    // Analyze history data
    const domains = {};
    const categories = {};
    
    history.forEach(item => {
      try {
        const url = new URL(item.url);
        const domain = url.hostname;
        domains[domain] = (domains[domain] || 0) + 1;
        
        // Simple categorization
        if (domain.includes('youtube') || domain.includes('netflix')) {
          categories['Entertainment'] = (categories['Entertainment'] || 0) + 1;
        } else if (domain.includes('github') || domain.includes('stackoverflow')) {
          categories['Development'] = (categories['Development'] || 0) + 1;
        } else if (domain.includes('news') || domain.includes('cnn') || domain.includes('bbc')) {
          categories['News'] = (categories['News'] || 0) + 1;
        } else {
          categories['Other'] = (categories['Other'] || 0) + 1;
        }
      } catch (e) {
        // Skip invalid URLs
      }
    });

    const topDomains = Object.entries(domains)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([domain, count]) => `${domain}: ${count} visits`)
      .join('\n');

    const categoryBreakdown = Object.entries(categories)
      .map(([category, count]) => `${category}: ${count} sites`)
      .join('\n');

    const analysis = `📈 Basic History Analysis (Last 7 Days):

Top Domains:
${topDomains}

Categories:
${categoryBreakdown}

Total Sites Visited: ${history.length}

💡 To enable AI-powered analysis:
- Ensure Chrome Built-in AI is enabled
- Check chrome://flags for AI features
- This extension uses Chrome's Prompt API and Summarizer API`;

    result.innerHTML = analysis;
    
  } catch (error) {
    result.innerHTML = `Error: ${error.message}`;
    console.error('AI Error:', error);
  }
}

// Summarize browsing patterns using AI
async function summarizePatterns() {
  const result = document.getElementById('result');
  
  try {
    result.innerHTML = 'Summarizing your browsing patterns...';
    
    const history = await chrome.history.search({
      text: '',
      maxResults: 30,
      startTime: Date.now() - (7 * 24 * 60 * 60 * 1000)
    });

    if (!history || history.length === 0) {
      result.innerHTML = 'No recent browsing history found.';
      return;
    }

    const historyText = history.map(item => 
      `${item.title} - ${item.url}`
    ).join('\n');

    if (typeof LanguageModel !== 'undefined') {
      const availability = await LanguageModel.availability();
      if (availability !== 'unavailable') {
        const session = await LanguageModel.create({
          expectedInputs: [{ type: 'text' }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
          outputLanguage: 'en'
        });
        const summaryPrompt = `Summarize this browsing history in 3-4 sentences:\n\n${historyText}`;
        const summary = await session.prompt(summaryPrompt, {
          outputLanguage: 'en'
        });
        result.innerHTML = `📝 Browsing Pattern Summary:\n\n${summary}`;
        session.destroy();
        return;
      }
    }
    
    // Fallback summary
    {
      // Fallback summary
      const domains = {};
      history.forEach(item => {
        try {
          const domain = new URL(item.url).hostname;
          domains[domain] = (domains[domain] || 0) + 1;
        } catch (e) {}
      });
      
      const topDomains = Object.entries(domains)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([domain, count]) => `${domain}: ${count} visits`);
      
      result.innerHTML = `📝 Basic Summary:\n\nTop visited sites:\n${topDomains.join('\n')}\n\nTotal sites: ${history.length}`;
    }
  } catch (error) {
    result.innerHTML = `Error: ${error.message}`;
  }
}

// Get AI-powered suggestions
async function getSuggestions() {
  const result = document.getElementById('result');
  
  try {
    result.innerHTML = 'Generating personalized suggestions...';
    
    const history = await chrome.history.search({
      text: '',
      maxResults: 20,
      startTime: Date.now() - (3 * 24 * 60 * 60 * 1000)
    });

    if (!history || history.length === 0) {
      result.innerHTML = 'No recent browsing history found.';
      return;
    }

    const historyText = history.map(item => item.title).join(', ');

    if (typeof LanguageModel !== 'undefined') {
      const availability = await LanguageModel.availability();
      if (availability !== 'unavailable') {
        const session = await LanguageModel.create({
          expectedInputs: [{ type: 'text' }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
          outputLanguage: 'en'
        });
        const prompt = `Based on this browsing history, provide 5 personalized productivity suggestions:

${historyText}

Focus on:
- Time management improvements
- Website recommendations
- Productivity tools
- Learning opportunities
- Digital wellness tips

Format as a numbered list with actionable advice.`;

        const response = await session.prompt(prompt, {
          outputLanguage: 'en'
        });
        result.innerHTML = `💡 Personalized Suggestions:\n\n${response}`;
        session.destroy();
        return;
      }
    }
    
    // Fallback suggestions
    {
      // Fallback suggestions
      const suggestions = [
        "1. Consider using website blockers for distracting sites",
        "2. Set specific times for social media browsing",
        "3. Bookmark frequently visited work-related sites",
        "4. Use browser extensions for productivity",
        "5. Take regular breaks from screen time"
      ];
      
      result.innerHTML = `💡 General Suggestions:\n\n${suggestions.join('\n')}\n\nEnable AI for personalized recommendations!`;
    }
  } catch (error) {
    result.innerHTML = `Error: ${error.message}`;
  }
}

// Translate analysis using AI
async function translateAnalysis() {
  const result = document.getElementById('result');
  
  try {
    result.innerHTML = 'Translating analysis...';
    
    const history = await chrome.history.search({
      text: '',
      maxResults: 10,
      startTime: Date.now() - (7 * 24 * 60 * 60 * 1000)
    });

    if (!history || history.length === 0) {
      result.innerHTML = 'No recent browsing history found.';
      return;
    }

    const analysisText = `Your browsing summary: ${history.length} sites visited in the last 7 days. Top domains include various websites for work, entertainment, and information.`;

    if (typeof LanguageModel !== 'undefined') {
      const availability = await LanguageModel.availability();
      if (availability !== 'unavailable') {
        const session = await LanguageModel.create({
          expectedInputs: [{ type: 'text' }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
          outputLanguage: 'en'
        });
        const languages = ['Spanish', 'French', 'German', 'Japanese'];
        const randomLang = languages[Math.floor(Math.random() * languages.length)];
        
        const translationPrompt = `Translate this text to ${randomLang}:\n\n${analysisText}`;
        const translation = await session.prompt(translationPrompt, {
          outputLanguage: 'en'
        });
        result.innerHTML = `🌐 Translation (${randomLang}):\n\n${translation}\n\nOriginal: ${analysisText}`;
        session.destroy();
        return;
      }
    }
    
    // Fallback translation
    {
      result.innerHTML = `🌐 Translation not available.\n\nOriginal analysis: ${analysisText}\n\nEnable Chrome Built-in AI for translation features!`;
    }
  } catch (error) {
    result.innerHTML = `Error: ${error.message}`;
  }
}

// Debug function to check AI API availability
async function checkAIStatus() {
  const result = document.getElementById('result');
  
  try {
    result.innerHTML = 'Checking Chrome Built-in AI API status...';
    
    let status = '🔧 AI API Status Check:\n\n';
    
    // Check if LanguageModel exists (correct API)
    if (typeof LanguageModel !== 'undefined') {
      status += '✅ LanguageModel API found\n';
      
      try {
        // Check availability
        const availability = await LanguageModel.availability();
        status += `Model availability: ${availability}\n`;
        
        if (availability === 'unavailable') {
          status += '❌ Model not available on this device\n';
          status += '\nHardware requirements:\n';
          status += '- Windows 10/11, macOS 13+, Linux, or ChromeOS\n';
          status += '- 22GB free storage space\n';
          status += '- 4GB+ VRAM\n';
          status += '- Unmetered internet connection\n';
        } else if (availability === 'downloadable') {
          status += '📥 Model needs to be downloaded (22GB)\n';
        } else {
          status += '✅ Model ready to use\n';
        }
        
        // Check model parameters
        try {
          const params = await LanguageModel.params();
          status += `\nModel parameters:\n`;
          status += `- Default temperature: ${params.defaultTemperature}\n`;
          status += `- Max temperature: ${params.maxTemperature}\n`;
          status += `- Default top-K: ${params.defaultTopK}\n`;
          status += `- Max top-K: ${params.maxTopK}\n`;
        } catch (e) {
          status += 'Could not get model parameters\n';
        }
        
        // Test a simple API call if available
        if (availability !== 'unavailable') {
          try {
            status += '\n🧪 Testing LanguageModel...\n';
            const session = await LanguageModel.create({
              expectedInputs: [{ type: 'text' }],
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
              outputLanguage: 'en'
            });
            const testResponse = await session.prompt('Say "Hello" if you can hear me', {
              outputLanguage: 'en'
            });
            status += `✅ LanguageModel working: ${testResponse}\n`;
            session.destroy();
          } catch (error) {
            status += `❌ LanguageModel error: ${error.message}\n`;
          }
        }
        
      } catch (error) {
        status += `❌ Error checking LanguageModel: ${error.message}\n`;
      }
      
    } else {
      status += '❌ LanguageModel API not found\n';
      status += '\nPossible reasons:\n';
      status += '- Chrome Built-in AI not enabled\n';
      status += '- Extension context not supported\n';
      status += '- Trial tokens expired\n';
      status += '- Chrome version incompatible\n';
      status += '- Hardware requirements not met\n';
    }
    
    // Check Chrome version
    status += `\nChrome Version: ${navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown'}\n`;
    
    // Check extension permissions
    status += '\nExtension Permissions:\n';
    try {
      const permissions = await chrome.permissions.getAll();
      status += `Granted: ${permissions.granted.map(p => p.permissions).flat().join(', ')}\n`;
      status += `Optional: ${permissions.optional.map(p => p.permissions).flat().join(', ')}\n`;
    } catch (e) {
      status += 'Could not check permissions\n';
    }
    
    result.innerHTML = status;
    
  } catch (error) {
    result.innerHTML = `Error checking AI status: ${error.message}`;
  }
}

// Add event listeners when page loads
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('analyzeBtn').addEventListener('click', analyzeHistory);
  document.getElementById('summarizeBtn').addEventListener('click', summarizePatterns);
  document.getElementById('suggestBtn').addEventListener('click', getSuggestions);
  document.getElementById('translateBtn').addEventListener('click', translateAnalysis);
  document.getElementById('debugBtn').addEventListener('click', checkAIStatus);
});