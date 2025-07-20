/**
 * Interface for session memory implementations
 */
export class ISessionMemory {
  /**
   * Store a document in the session
   * @param {Object} document - The document to store
   * @returns {string} - Document ID
   */
  storeDocument(document) {}

  /**
   * Add a message to the conversation history
   * @param {string} message - The message content
   * @param {boolean} isUser - Whether the message is from the user (true) or bot (false)
   */
  addToConversation(message, isUser) {}

  /**
   * Get the current session context
   * @returns {Object} - The session context including documents and history
   */
  getContext() {}

  /**
   * Update the session context with new information
   * @param {Object} newContext - New context information to merge
   */
  updateContext(newContext) {}
}
