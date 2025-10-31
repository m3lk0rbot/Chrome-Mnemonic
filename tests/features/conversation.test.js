// Tests for ConversationFeature class
const ConversationFeature = require('../../features/conversation.js');

// Mock dependencies
const mockAIService = {
  aiAvailable: true,
  withAISession: jest.fn()
};

const mockHistoryService = {
  getHistory: jest.fn(),
  getRecentItems: jest.fn()
};

describe('ConversationFeature', () => {
  let conversationFeature;

  beforeEach(() => {
    conversationFeature = new ConversationFeature(mockAIService, mockHistoryService);
    
    // Reset mocks
    mockAIService.withAISession.mockClear();
    mockHistoryService.getHistory.mockClear();
    mockHistoryService.getRecentItems.mockClear();
    
    // Mock Chrome storage
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue();
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(conversationFeature.aiService).toBe(mockAIService);
      expect(conversationFeature.historyService).toBe(mockHistoryService);
      expect(conversationFeature.conversationHistory).toEqual([]);
      expect(conversationFeature.isTyping).toBe(false);
    });
  });

  describe('initializeConversationSystem', () => {
    it('should initialize conversation system', async () => {
      const result = await conversationFeature.initializeConversationSystem();
      
      expect(result).toBe(true);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('conversationHistory');
    });

    it('should handle storage errors', async () => {
      chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
      
      const result = await conversationFeature.initializeConversationSystem();
      
      expect(result).toBe(false);
    });
  });

  describe('startConversation', () => {
    it('should start a conversation', async () => {
      mockAIService.withAISession.mockResolvedValue('AI response');
      
      const result = await conversationFeature.startConversation('Hello');
      
      expect(result).toBe('AI response');
      expect(conversationFeature.conversationHistory).toHaveLength(2); // user + assistant
    });

    it('should handle AI errors', async () => {
      mockAIService.withAISession.mockRejectedValue(new Error('AI Error'));
      
      const result = await conversationFeature.startConversation('Hello');
      
      expect(result).toContain('I apologize, but I encountered an error');
      expect(conversationFeature.conversationHistory).toHaveLength(2);
    });
  });

  describe('generateConversationResponse', () => {
    it('should generate AI response when available', async () => {
      mockAIService.aiAvailable = true;
      mockAIService.withAISession.mockResolvedValue('AI response');
      
      const result = await conversationFeature.generateConversationResponse('Hello');
      
      expect(result).toBe('AI response');
      expect(mockAIService.withAISession).toHaveBeenCalled();
    });

    it('should generate fallback response when AI unavailable', async () => {
      mockAIService.aiAvailable = false;
      mockHistoryService.getHistory.mockResolvedValue([
        { url: 'https://example.com', title: 'Example' }
      ]);
      
      const result = await conversationFeature.generateConversationResponse('Hello');
      
      expect(result).toContain('I can help you explore your browsing history');
      expect(mockAIService.withAISession).not.toHaveBeenCalled();
    });
  });

  describe('displayConversationInterface', () => {
    it('should display conversation interface', () => {
      const mockContainer = { innerHTML: '' };
      document.getElementById = jest.fn().mockReturnValue(mockContainer);
      
      conversationFeature.displayConversationInterface();
      
      expect(document.getElementById).toHaveBeenCalledWith('conversationInterface');
      expect(mockContainer.innerHTML).toContain('Chat with Chrome Mnemonic');
    });

    it('should handle missing container', () => {
      document.getElementById = jest.fn().mockReturnValue(null);
      
      expect(() => conversationFeature.displayConversationInterface()).not.toThrow();
    });
  });

  describe('renderConversationHistory', () => {
    it('should render conversation history', () => {
      conversationFeature.conversationHistory = [
        { type: 'user', message: 'Hello' },
        { type: 'assistant', message: 'Hi there!' }
      ];
      
      const html = conversationFeature.renderConversationHistory();
      
      expect(html).toContain('Hello');
      expect(html).toContain('Hi there!');
    });

    it('should show welcome message for empty history', () => {
      conversationFeature.conversationHistory = [];
      
      const html = conversationFeature.renderConversationHistory();
      
      expect(html).toContain('Hi! I\'m Chrome Mnemonic');
    });
  });

  describe('attachConversationEventListeners', () => {
    it('should attach event listeners', () => {
      const mockInput = { addEventListener: jest.fn() };
      const mockButton = { addEventListener: jest.fn() };
      const mockChips = [{ addEventListener: jest.fn() }];
      
      document.getElementById = jest.fn()
        .mockReturnValueOnce(mockInput) // conversationInput
        .mockReturnValueOnce(mockButton) // sendMessageBtn
        .mockReturnValueOnce(mockChips); // suggestion chips
      
      conversationFeature.attachConversationEventListeners();
      
      expect(mockInput.addEventListener).toHaveBeenCalled();
      expect(mockButton.addEventListener).toHaveBeenCalled();
    });
  });

  describe('handleUserMessage', () => {
    it('should handle user message', async () => {
      mockAIService.withAISession.mockResolvedValue('Response');
      
      await conversationFeature.handleUserMessage('Hello');
      
      expect(conversationFeature.conversationHistory).toHaveLength(2);
    });
  });

  describe('showTypingIndicator', () => {
    it('should show typing indicator', () => {
      const mockIndicator = { style: { display: '' } };
      document.getElementById = jest.fn().mockReturnValue(mockIndicator);
      
      conversationFeature.showTypingIndicator();
      
      expect(mockIndicator.style.display).toBe('block');
    });
  });

  describe('hideTypingIndicator', () => {
    it('should hide typing indicator', () => {
      const mockIndicator = { style: { display: '' } };
      document.getElementById = jest.fn().mockReturnValue(mockIndicator);
      
      conversationFeature.hideTypingIndicator();
      
      expect(mockIndicator.style.display).toBe('none');
    });
  });

  describe('saveConversationHistory', () => {
    it('should save conversation history', async () => {
      conversationFeature.conversationHistory = [
        { type: 'user', message: 'Hello' }
      ];
      
      await conversationFeature.saveConversationHistory();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        conversationHistory: conversationFeature.conversationHistory
      });
    });
  });

  describe('clearConversationHistory', () => {
    it('should clear conversation history', async () => {
      conversationFeature.conversationHistory = [
        { type: 'user', message: 'Hello' }
      ];
      
      await conversationFeature.clearConversationHistory();
      
      expect(conversationFeature.conversationHistory).toHaveLength(0);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        conversationHistory: []
      });
    });
  });
});
