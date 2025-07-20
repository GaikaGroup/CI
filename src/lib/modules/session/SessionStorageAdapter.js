/**
 * Adapter to integrate session memory with document processing and chat
 */

/**
 * Adapter to integrate session memory with document processing and chat
 */
export class SessionStorageAdapter {
  /**
   * Create a new SessionStorageAdapter
   * @param {SessionFactory} sessionFactory - The session factory
   */
  constructor(sessionFactory) {
    this.sessionFactory = sessionFactory;
  }

  /**
   * Process and store a document in the session
   * @param {Object} document - The document to process and store
   * @param {string} sessionId - The session ID
   * @param {Object} ocrService - The OCR service to use for processing
   * @returns {Promise<Object>} - The processed document result
   */
  async processAndStoreDocument(document, sessionId, ocrService) {
    const session = this.sessionFactory.getOrCreateSession(sessionId);

    // Process document with OCR
    const ocrResult = await ocrService.processDocument(document);

    // Store document and its processed content
    session.storeDocument({
      originalDocument: document,
      processedContent: ocrResult
    });

    // Update context with document information
    session.updateContext({
      lastProcessedDocument: {
        contentSummary: this.summarizeContent(ocrResult)
      }
    });

    return ocrResult;
  }

  /**
   * Handle a user message within a session
   * @param {string} message - The user message
   * @param {string} sessionId - The session ID
   * @param {Function} responseGenerator - Function to generate bot response
   * @returns {Promise<string>} - The bot response
   */
  async handleUserMessage(message, sessionId, responseGenerator) {
    const session = this.sessionFactory.getOrCreateSession(sessionId);

    // Add user message to conversation history
    session.addToConversation(message, true);

    // Get full context including uploaded documents and history
    const fullContext = session.getContext();

    // Generate response with context
    const response = await responseGenerator(message, fullContext);

    // Add bot response to conversation history
    session.addToConversation(response, false);

    return response;
  }

  /**
   * Create a simple summary of document content
   * @param {Object} ocrResult - The OCR result to summarize
   * @returns {string} - A summary of the content
   */
  summarizeContent(ocrResult) {
    // Simple implementation - in production, use more sophisticated summarization
    const text = ocrResult.text || '';
    return text.length > 100 ? `${text.substring(0, 100)}...` : text;
  }
}
