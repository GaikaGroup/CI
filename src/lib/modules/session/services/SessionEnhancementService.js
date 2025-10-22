/**
 * SessionEnhancementService
 *
 * Enhances session objects with computed UI fields for display.
 * Adds preview text, primary command, and command types.
 */

import { CommandExtractionService } from './CommandExtractionService.js';

/**
 * SessionEnhancementService class
 */
export class SessionEnhancementService {
  /**
   * Enhance a single session with computed UI fields
   * @param {Object} session - Session object with messages array
   * @returns {Object} Enhanced session object
   */
  static enhanceSession(session) {
    if (!session) {
      return null;
    }

    const enhanced = { ...session };

    // Extract commands if messages are available
    if (session.messages && Array.isArray(session.messages)) {
      const commandData = CommandExtractionService.extractCommands(session.messages);
      enhanced.commandTypes = commandData.commandTypes;
      enhanced.primaryCommand = commandData.primaryCommand;
      enhanced.commandCount = commandData.commandCount;

      // Generate preview text if not already set
      if (!enhanced.preview) {
        enhanced.preview = this.getPreviewText(session.messages);
      }
    } else {
      enhanced.commandTypes = [];
      enhanced.primaryCommand = null;
      enhanced.commandCount = 0;
    }

    return enhanced;
  }

  /**
   * Enhance multiple sessions
   * @param {Array<Object>} sessions - Array of session objects
   * @returns {Array<Object>} Array of enhanced session objects
   */
  static enhanceSessions(sessions) {
    if (!sessions || !Array.isArray(sessions)) {
      return [];
    }

    return sessions.map((session) => this.enhanceSession(session));
  }

  /**
   * Get primary command from messages (first command used)
   * @param {Array<Object>} messages - Array of message objects
   * @returns {string|null} Primary command type or null
   */
  static getPrimaryCommand(messages) {
    return CommandExtractionService.getPrimaryCommand(messages);
  }

  /**
   * Generate preview text from messages
   * Extracts first user message and truncates to 150 characters
   * @param {Array<Object>} messages - Array of message objects
   * @returns {string} Preview text
   */
  static getPreviewText(messages) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return '';
    }

    // Find first user message
    const firstUserMessage = messages.find((msg) => msg.type === 'user');

    if (!firstUserMessage || !firstUserMessage.content) {
      return '';
    }

    const content = firstUserMessage.content.trim();

    // Truncate to 150 characters
    if (content.length <= 150) {
      return content;
    }

    // Find last space before 150 chars to avoid cutting words
    const truncated = content.substring(0, 150);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > 100) {
      // If we found a space reasonably close to the end, use it
      return truncated.substring(0, lastSpace) + '...';
    }

    // Otherwise just truncate at 150
    return truncated + '...';
  }

  /**
   * Check if session has commands
   * @param {Object} session - Session object with messages
   * @returns {boolean} True if session has commands
   */
  static hasCommands(session) {
    if (!session || !session.messages || !Array.isArray(session.messages)) {
      return false;
    }

    return session.messages.some(
      (msg) => msg.type === 'user' && CommandExtractionService.hasCommand(msg.content)
    );
  }

  /**
   * Get command types from session
   * @param {Object} session - Session object with messages
   * @returns {Array<string>} Array of command type IDs
   */
  static getCommandTypes(session) {
    if (!session || !session.messages || !Array.isArray(session.messages)) {
      return [];
    }

    return CommandExtractionService.getCommandTypes(session.messages);
  }

  /**
   * Enhance session with minimal data (without messages)
   * Useful when messages are not loaded
   * @param {Object} session - Session object without messages
   * @returns {Object} Enhanced session object
   */
  static enhanceSessionMinimal(session) {
    if (!session) {
      return null;
    }

    return {
      ...session,
      commandTypes: session.commandTypes || [],
      primaryCommand: session.primaryCommand || null,
      commandCount: session.commandCount || 0,
      preview: session.preview || ''
    };
  }

  /**
   * Calculate session display priority
   * Used for sorting sessions by relevance
   * @param {Object} session - Enhanced session object
   * @returns {number} Priority score (higher is more important)
   */
  static calculateDisplayPriority(session) {
    if (!session) {
      return 0;
    }

    let priority = 0;

    // Recent sessions get higher priority
    const daysSinceUpdate =
      (Date.now() - new Date(session.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    priority += Math.max(0, 100 - daysSinceUpdate);

    // Sessions with more messages get higher priority
    priority += Math.min(session.messageCount || 0, 50);

    // Sessions with commands get bonus priority
    if (session.commandCount > 0) {
      priority += 20;
    }

    // Sessions with multiple command types get extra bonus
    if (session.commandTypes && session.commandTypes.length > 1) {
      priority += 10;
    }

    return priority;
  }

  /**
   * Format session for display
   * Adds formatted date/time strings
   * @param {Object} session - Session object
   * @param {string} locale - Locale for date formatting (default: 'en-GB')
   * @returns {Object} Session with formatted display fields
   */
  static formatSessionForDisplay(session, locale = 'en-GB') {
    if (!session) {
      return null;
    }

    const updatedAt = new Date(session.updatedAt);
    const createdAt = new Date(session.createdAt);

    return {
      ...session,
      formattedDate: updatedAt.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      formattedTime: updatedAt.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      }),
      formattedDateTime: updatedAt.toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      createdDate: createdAt.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      isRecent: Date.now() - updatedAt.getTime() < 24 * 60 * 60 * 1000 // Within last 24 hours
    };
  }
}

export default SessionEnhancementService;
