/**
 * Command Type Definitions and Mapping Utilities
 *
 * Maps command IDs from tutorCommands.json to command types with visual indicators.
 * Supports multilingual command variants (en, ru, es).
 */

/**
 * Command type definitions with visual indicators
 * Each command type includes:
 * - id: Unique identifier
 * - emoji: Visual icon
 * - labelKey: Translation key for UI display
 * - color: Badge color scheme
 * - commandIds: Array of command IDs from tutorCommands.json
 */
export const COMMAND_TYPES = {
  explain: {
    id: 'explain',
    emoji: '💡',
    labelKey: 'commands.explain',
    color: '#2196F3', // Blue
    commandIds: ['explain']
  },
  solve: {
    id: 'solve',
    emoji: '🧮',
    labelKey: 'commands.solve',
    color: '#4CAF50', // Green
    commandIds: ['solve']
  },
  check: {
    id: 'check',
    emoji: '✓',
    labelKey: 'commands.check',
    color: '#FF9800', // Orange
    commandIds: ['check']
  },
  practice: {
    id: 'practice',
    emoji: '📝',
    labelKey: 'commands.practice',
    color: '#9C27B0', // Purple
    commandIds: ['practice']
  },
  notes: {
    id: 'notes',
    emoji: '📋',
    labelKey: 'commands.notes',
    color: '#00BCD4', // Cyan
    commandIds: ['notes']
  },
  essay: {
    id: 'essay',
    emoji: '✍️',
    labelKey: 'commands.essay',
    color: '#E91E63', // Pink
    commandIds: ['essay']
  },
  help: {
    id: 'help',
    emoji: '❓',
    labelKey: 'commands.help',
    color: '#607D8B', // Blue Grey
    commandIds: ['help']
  }
};

/**
 * Map of command ID to command type
 * Used for quick lookup when extracting commands from messages
 */
const COMMAND_ID_TO_TYPE = {};
Object.values(COMMAND_TYPES).forEach((type) => {
  type.commandIds.forEach((commandId) => {
    COMMAND_ID_TO_TYPE[commandId] = type.id;
  });
});

/**
 * All supported command variants across languages
 * Maps localized command names to their command IDs
 */
export const COMMAND_VARIANTS = {
  // English
  '/explain': 'explain',
  '/solve': 'solve',
  '/check': 'check',
  '/practice': 'practice',
  '/notes': 'notes',
  '/essay': 'essay',
  '/help': 'help',

  // Russian
  '/объяснить': 'explain',
  '/решить': 'solve',
  '/проверить': 'check',
  '/практика': 'practice',
  '/заметки': 'notes',
  '/эссе': 'essay',
  '/помощь': 'help',

  // Spanish
  '/explicar': 'explain',
  '/resolver': 'solve',
  '/verificar': 'check',
  '/practicar': 'practice',
  '/notas': 'notes',
  '/ensayo': 'essay',
  '/ayuda': 'help'
};

/**
 * Get command type by command ID
 * @param {string} commandId - Command ID from tutorCommands.json
 * @returns {string|null} Command type ID or null if not found
 */
export function getCommandType(commandId) {
  return COMMAND_ID_TO_TYPE[commandId] || null;
}

/**
 * Get command type definition
 * @param {string} typeId - Command type ID
 * @returns {Object|null} Command type definition or null if not found
 */
export function getCommandTypeDefinition(typeId) {
  return COMMAND_TYPES[typeId] || null;
}

/**
 * Get all command types as array
 * @returns {Array<Object>} Array of command type definitions
 */
export function getAllCommandTypes() {
  return Object.values(COMMAND_TYPES);
}

/**
 * Map localized command name to command ID
 * @param {string} commandName - Localized command name (e.g., '/solve', '/решить')
 * @returns {string|null} Command ID or null if not found
 */
export function mapCommandNameToId(commandName) {
  const normalized = commandName.toLowerCase().trim();
  return COMMAND_VARIANTS[normalized] || null;
}

/**
 * Map localized command name to command type
 * @param {string} commandName - Localized command name (e.g., '/solve', '/решить')
 * @returns {string|null} Command type ID or null if not found
 */
export function mapCommandNameToType(commandName) {
  const commandId = mapCommandNameToId(commandName);
  return commandId ? getCommandType(commandId) : null;
}

/**
 * Check if a string is a valid command
 * @param {string} text - Text to check
 * @returns {boolean} True if text is a valid command
 */
export function isValidCommand(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  const normalized = text.toLowerCase().trim();
  return normalized in COMMAND_VARIANTS;
}

/**
 * Extract command from text (finds first command in text)
 * @param {string} text - Text to search
 * @returns {string|null} Command name or null if not found
 */
export function extractCommandFromText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Match command pattern: /word at start of text or after whitespace
  const match = text.match(/(?:^|\s)(\/[а-яА-ЯёЁa-zA-Z]+)/);
  if (match && isValidCommand(match[1])) {
    return match[1];
  }

  return null;
}

/**
 * Get all command variants for a command type
 * @param {string} typeId - Command type ID
 * @returns {Array<string>} Array of command variants
 */
export function getCommandVariantsForType(typeId) {
  const variants = [];
  Object.entries(COMMAND_VARIANTS).forEach(([variant, commandId]) => {
    if (getCommandType(commandId) === typeId) {
      variants.push(variant);
    }
  });
  return variants;
}

/**
 * Get all command variants for multiple command types
 * @param {Array<string>} typeIds - Array of command type IDs
 * @returns {Array<string>} Array of command variants
 */
export function getCommandVariantsForTypes(typeIds) {
  const variants = new Set();
  typeIds.forEach((typeId) => {
    getCommandVariantsForType(typeId).forEach((variant) => variants.add(variant));
  });
  return Array.from(variants);
}
