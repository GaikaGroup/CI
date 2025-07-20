/**
 * Factory for creating and retrieving session instances
 */
import { InMemorySessionManager } from './InMemorySessionManager';

/**
 * Factory for creating and retrieving session instances
 */
export class SessionFactory {
  /**
   * Create a new SessionFactory
   */
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Get or create a session
   * @param {string} sessionId - Optional session ID
   * @returns {InMemorySessionManager} - Session instance
   */
  getOrCreateSession(sessionId = null) {
    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    const session = new InMemorySessionManager(sessionId);
    this.sessions.set(session.getSessionId(), session);
    return session;
  }

  /**
   * Remove a session
   * @param {string} sessionId - Session ID to remove
   */
  removeSession(sessionId) {
    this.sessions.delete(sessionId);
  }
}
