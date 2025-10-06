/**
 * Session Store Tests
 * Tests for session management stores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { sessionStore, chatStore, sessionUtils } from '../../../src/lib/modules/session/stores/index.js';
import { user, isAuthenticated } from '../../../src/lib/modules/auth/stores.js';

// Mock the services
vi.mock('../../../src/lib/modules/session/services/SessionService.js', () => ({
  SessionService: {
    getUserSessions: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    searchSessions: vi.fn(),
    getSession: vi.fn()
  }
}));

vi.mock('../../../src/lib/modules/session/services/MessageService.js', () => ({
  MessageService: {
    getSessionMessages: vi.fn(),
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    deleteMessage: vi.fn()
  }
}));

describe('Session Store', () => {
  beforeEach(() => {
    // Reset stores
    sessionStore.reset();
    chatStore.reset();
    
    // Mock authenticated user
    user.set({ id: 'test-user-1', name: 'Test User' });
    isAuthenticated.set(true);
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('sessionStore', () => {
    it('should initialize with default state', () => {
      const state = get(sessionStore);
      
      expect(state.sessions).toEqual([]);
      expect(state.currentSession).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.selectedSessionId).toBeNull();
    });

    it('should set loading state', () => {
      sessionStore.setLoading(true);
      const state = get(sessionStore);
      expect(state.loading).toBe(true);
    });

    it('should set error state', () => {
      const errorMessage = 'Test error';
      sessionStore.setError(errorMessage);
      const state = get(sessionStore);
      expect(state.error).toBe(errorMessage);
    });

    it('should set search query', () => {
      const query = 'test search';
      sessionStore.setSearchQuery(query);
      const state = get(sessionStore);
      expect(state.searchQuery).toBe(query);
    });

    it('should set filters', () => {
      const filters = { mode: 'learn', language: 'es' };
      sessionStore.setFilters(filters);
      const state = get(sessionStore);
      expect(state.filters.mode).toBe('learn');
      expect(state.filters.language).toBe('es');
    });

    it('should clear selection', () => {
      // First set some selection
      sessionStore.setLoading(true);
      const initialState = get(sessionStore);
      initialState.currentSession = { id: 'test-session' };
      initialState.selectedSessionId = 'test-session';
      
      // Then clear it
      sessionStore.clearSelection();
      const state = get(sessionStore);
      expect(state.currentSession).toBeNull();
      expect(state.selectedSessionId).toBeNull();
    });

    it('should reset to initial state', () => {
      // Modify state
      sessionStore.setLoading(true);
      sessionStore.setError('test error');
      sessionStore.setSearchQuery('test');
      
      // Reset
      sessionStore.reset();
      const state = get(sessionStore);
      
      expect(state.sessions).toEqual([]);
      expect(state.currentSession).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.searchQuery).toBe('');
    });
  });

  describe('chatStore', () => {
    it('should initialize with default state', () => {
      const state = get(chatStore);
      
      expect(state.messages).toEqual([]);
      expect(state.currentMessage).toBe('');
      expect(state.isTyping).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.mode).toBe('fun');
      expect(state.language).toBe('en');
      expect(state.sessionId).toBeNull();
    });

    it('should set current message', () => {
      const message = 'Hello world';
      chatStore.setCurrentMessage(message);
      const state = get(chatStore);
      expect(state.currentMessage).toBe(message);
    });

    it('should set typing state', () => {
      chatStore.setTyping(true);
      const state = get(chatStore);
      expect(state.isTyping).toBe(true);
    });

    it('should set mode', () => {
      chatStore.setMode('learn');
      const state = get(chatStore);
      expect(state.mode).toBe('learn');
    });

    it('should set language', () => {
      chatStore.setLanguage('es');
      const state = get(chatStore);
      expect(state.language).toBe('es');
    });

    it('should generate welcome messages', () => {
      const funWelcome = chatStore.getWelcomeMessage('fun', 'en');
      const learnWelcome = chatStore.getWelcomeMessage('learn', 'en');
      
      expect(funWelcome).toContain('fun');
      expect(learnWelcome).toContain('focused learning');
      expect(typeof funWelcome).toBe('string');
      expect(typeof learnWelcome).toBe('string');
    });

    it('should clear session', () => {
      // Set some state
      chatStore.setCurrentMessage('test');
      chatStore.setTyping(true);
      const initialState = get(chatStore);
      initialState.sessionId = 'test-session';
      initialState.messages = [{ id: 1, content: 'test' }];
      
      // Clear session
      chatStore.clearSession();
      const state = get(chatStore);
      
      expect(state.messages).toEqual([]);
      expect(state.sessionId).toBeNull();
      expect(state.currentMessage).toBe('');
      expect(state.isTyping).toBe(false);
    });

    it('should reset to initial state', () => {
      // Modify state
      chatStore.setCurrentMessage('test');
      chatStore.setTyping(true);
      chatStore.setMode('learn');
      
      // Reset
      chatStore.reset();
      const state = get(chatStore);
      
      expect(state.messages).toEqual([]);
      expect(state.currentMessage).toBe('');
      expect(state.isTyping).toBe(false);
      expect(state.mode).toBe('fun');
      expect(state.language).toBe('en');
    });
  });

  describe('sessionUtils', () => {
    it('should provide utility functions', () => {
      expect(typeof sessionUtils.createAndStartSession).toBe('function');
      expect(typeof sessionUtils.continueSession).toBe('function');
      expect(typeof sessionUtils.switchSession).toBe('function');
      expect(typeof sessionUtils.deleteSessionSafely).toBe('function');
    });
  });
});

describe('Derived Stores', () => {
  beforeEach(() => {
    sessionStore.reset();
    chatStore.reset();
  });

  it('should provide session statistics', async () => {
    // This would need to be tested with actual session data
    // For now, just verify the store exists and returns an object
    const { sessionStats } = await import('../../../src/lib/modules/session/stores/index.js');
    const stats = get(sessionStats);
    
    expect(typeof stats).toBe('object');
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.funSessions).toBe('number');
    expect(typeof stats.learnSessions).toBe('number');
  });

  it('should provide message statistics', async () => {
    const { messageStats } = await import('../../../src/lib/modules/session/stores/index.js');
    const stats = get(messageStats);
    
    expect(typeof stats).toBe('object');
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.userMessages).toBe('number');
    expect(typeof stats.assistantMessages).toBe('number');
    expect(typeof stats.hasMessages).toBe('boolean');
  });
});