/**
 * In-memory implementation of session memory
 */
import { ISessionMemory } from './interfaces/ISessionMemory';

/**
 * In-memory implementation of session memory
 */
export class InMemorySessionManager extends ISessionMemory {
  /**
   * Create a new InMemorySessionManager
   * @param {string} sessionId - Optional session ID
   */
  constructor(sessionId = null) {
    super();
    this.sessionId = sessionId || this.generateSessionId();
    this.memory = {
      uploadedDocuments: [],
      conversationHistory: [],
      currentContext: {}
    };
  }

  /**
   * Generate a unique session ID
   * @returns {string} - A unique session ID
   */
  generateSessionId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Store a document in the session
   * @param {Object} document - The document to store
   * @returns {string} - Document ID
   */
  storeDocument(document) {
    const documentId = this.generateSessionId();
    this.memory.uploadedDocuments.push({
      id: documentId,
      content: document,
      timestamp: Date.now()
    });
    return documentId;
  }

  /**
   * Add a message to the conversation history
   * @param {string} message - The message content
   * @param {boolean} isUser - Whether the message is from the user (true) or bot (false)
   */
  addToConversation(message, isUser = true) {
    this.memory.conversationHistory.push({
      role: isUser ? 'user' : 'assistant',
      content: message,
      timestamp: Date.now()
    });
  }

  /**
   * Get the current session context
   * @returns {Object} - The session context including documents and history
   */
  getContext() {
    return {
      documents: this.memory.uploadedDocuments,
      history: this.memory.conversationHistory,
      context: this.memory.currentContext
    };
  }

  /**
   * Update the session context with new information
   * @param {Object} newContext - New context information to merge
   */
  updateContext(newContext) {
    this.memory.currentContext = {...this.memory.currentContext, ...newContext};
  }

  /**
   * Get the session ID
   * @returns {string} - The session ID
   */
  getSessionId() {
    return this.sessionId;
  }
}
