/**
 * CommandExtractionService
 *
 * Extracts and analyzes commands used in chat sessions.
 * Supports multilingual command detection and type mapping.
 */

import {
  mapCommandNameToType,
  mapCommandNameToId,
  extractCommandFromText,
  isValidCommand,
  getCommandType
} from '../utils/commandTypes.js';

/**
 * CommandExtractionService class
 */
export class CommandExtractionService {
  /**
   * Extract all commands used in a session
   * @param {Array<Object>} messages - Array of message objects with { type, content }
   * @returns {Object} Object with commandTypes array and primaryCommand
   */
  static extractCommands(messages) {
    if (!messages || !Array.isArray(messages)) {
      return {
        commandTypes: [],
        primaryCommand: null,
        commandCount: 0
      };
    }

    const commandTypesSet = new Set();
    let primaryCommand = null;
    let commandCount = 0;

    // Process messages in chronological order
    for (const message of messages) {
      // Only process user messages
      if (message.type !== 'user') {
        continue;
      }

      const command = extractCommandFromText(message.content);
      if (command) {
        commandCount++;
        const commandType = mapCommandNameToType(command);

        if (commandType) {
          commandTypesSet.add(commandType);

          // Set primary command (first command used)
          if (!primaryCommand) {
            primaryCommand = commandType;
          }
        }
      }
    }

    return {
      commandTypes: Array.from(commandTypesSet),
      primaryCommand,
      commandCount
    };
  }

  /**
   * Map a localized command to its type
   * @param {string} command - Localized command name (e.g., '/solve', '/решить')
   * @returns {string|null} Command type or null if not found
   */
  static mapCommandToType(command) {
    if (!command || typeof command !== 'string') {
      return null;
    }
    return mapCommandNameToType(command);
  }

  /**
   * Map a localized command to its ID
   * @param {string} command - Localized command name
   * @returns {string|null} Command ID or null if not found
   */
  static mapCommandToId(command) {
    if (!command || typeof command !== 'string') {
      return null;
    }
    return mapCommandNameToId(command);
  }

  /**
   * Check if a message contains a command
   * @param {string} content - Message content
   * @returns {boolean} True if message contains a command
   */
  static hasCommand(content) {
    if (!content || typeof content !== 'string') {
      return false;
    }
    return extractCommandFromText(content) !== null;
  }

  /**
   * Extract command from message content
   * @param {string} content - Message content
   * @returns {string|null} Command name or null if not found
   */
  static extractCommand(content) {
    if (!content || typeof content !== 'string') {
      return null;
    }
    return extractCommandFromText(content);
  }

  /**
   * Get primary command from messages (first command used)
   * @param {Array<Object>} messages - Array of message objects
   * @returns {string|null} Primary command type or null
   */
  static getPrimaryCommand(messages) {
    if (!messages || !Array.isArray(messages)) {
      return null;
    }

    for (const message of messages) {
      if (message.type === 'user') {
        const command = extractCommandFromText(message.content);
        if (command) {
          return mapCommandNameToType(command);
        }
      }
    }

    return null;
  }

  /**
   * Get all unique command types from messages
   * @param {Array<Object>} messages - Array of message objects
   * @returns {Array<string>} Array of unique command type IDs
   */
  static getCommandTypes(messages) {
    if (!messages || !Array.isArray(messages)) {
      return [];
    }

    const commandTypes = new Set();

    for (const message of messages) {
      if (message.type === 'user') {
        const command = extractCommandFromText(message.content);
        if (command) {
          const commandType = mapCommandNameToType(command);
          if (commandType) {
            commandTypes.add(commandType);
          }
        }
      }
    }

    return Array.from(commandTypes);
  }

  /**
   * Count commands in messages
   * @param {Array<Object>} messages - Array of message objects
   * @returns {number} Total number of commands found
   */
  static countCommands(messages) {
    if (!messages || !Array.isArray(messages)) {
      return 0;
    }

    let count = 0;
    for (const message of messages) {
      if (message.type === 'user' && this.hasCommand(message.content)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Validate command name
   * @param {string} command - Command name to validate
   * @returns {boolean} True if command is valid
   */
  static isValidCommand(command) {
    return isValidCommand(command);
  }

  /**
   * Get command statistics for a session
   * @param {Array<Object>} messages - Array of message objects
   * @returns {Object} Statistics object with command usage data
   */
  static getCommandStatistics(messages) {
    if (!messages || !Array.isArray(messages)) {
      return {
        totalCommands: 0,
        uniqueCommands: 0,
        commandTypes: [],
        primaryCommand: null,
        commandFrequency: {}
      };
    }

    const commandFrequency = {};
    let primaryCommand = null;

    for (const message of messages) {
      if (message.type === 'user') {
        const command = extractCommandFromText(message.content);
        if (command) {
          const commandType = mapCommandNameToType(command);
          if (commandType) {
            commandFrequency[commandType] = (commandFrequency[commandType] || 0) + 1;
            if (!primaryCommand) {
              primaryCommand = commandType;
            }
          }
        }
      }
    }

    const commandTypes = Object.keys(commandFrequency);
    const totalCommands = Object.values(commandFrequency).reduce((sum, count) => sum + count, 0);

    return {
      totalCommands,
      uniqueCommands: commandTypes.length,
      commandTypes,
      primaryCommand,
      commandFrequency
    };
  }
}

export default CommandExtractionService;
