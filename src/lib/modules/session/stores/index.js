/**
 * Session Stores Index
 * Centralized export for all session-related stores
 */

// Main stores
export {
  sessionStore,
  filteredSessions,
  currentSessionWithMessages,
  sessionStats,
  isSessionLoading,
  sessionError,
  isSearching
} from './sessionStore.js';

export {
  chatStore,
  userMessages,
  assistantMessages,
  messageStats,
  isChatLoading,
  chatError,
  isTyping
} from './chatStore.js';

// Re-export services for convenience
export { SessionService } from '../services/SessionService.js';
export { MessageService } from '../services/MessageService.js';

// Store initialization utilities
import { sessionStore } from './sessionStore.js';
import { chatStore } from './chatStore.js';

/**
 * Initialize all session stores
 * Call this when the app starts or when user authentication changes
 */
export async function initializeSessionStores() {
  try {
    await sessionStore.initialize();
  } catch (error) {
    console.error('[SessionStores] Failed to initialize:', error);
  }
}

/**
 * Reset all session stores
 * Call this when user logs out
 */
export function resetSessionStores() {
  sessionStore.reset();
  chatStore.reset();
}

/**
 * Session store utilities
 */
export const sessionUtils = {
  /**
   * Create a new session and navigate to chat
   */
  async createAndStartSession(title, mode = 'fun', language = 'en') {
    const session = await sessionStore.createSession(title, mode, language);
    await chatStore.initializeSession(session.id);
    return session;
  },

  /**
   * Continue an existing session
   */
  async continueSession(sessionId) {
    await sessionStore.selectSession(sessionId);
    await chatStore.initializeSession(sessionId);
  },

  /**
   * Switch between sessions
   */
  async switchSession(sessionId) {
    chatStore.clearSession();
    await this.continueSession(sessionId);
  },

  /**
   * Delete session and clear if it's current
   */
  async deleteSessionSafely(sessionId) {
    // Clear chat if this is the current session
    const currentState = get(chatStore);
    if (currentState.sessionId === sessionId) {
      chatStore.clearSession();
    }
    
    await sessionStore.deleteSession(sessionId);
  }
};

// Import get function for utilities
import { get } from 'svelte/store';