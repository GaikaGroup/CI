/**
 * Command-specific temperature settings for optimal LLM performance
 *
 * Temperature controls the randomness of LLM responses:
 * - Lower (0.1-0.3): More deterministic, factual, consistent
 * - Medium (0.4-0.6): Balanced creativity and accuracy
 * - Higher (0.7-0.9): More creative, varied, engaging
 */

export const COMMAND_TEMPERATURES = {
  // Factual explanation - needs accuracy with minimal variation
  explain: 0.2,

  // Problem solving - requires maximum accuracy and deterministic steps
  solve: 0.1,

  // Answer checking - must be precise in error detection
  check: 0.2,

  // Practice generation - needs some variety but still accurate
  practice: 0.4,

  // Note creation - accurate summary with good structure
  notes: 0.3,

  // Essay writing - needs creativity and engaging style
  essay: 0.7,

  // Default for general chat without specific commands
  default: 0.3
};

/**
 * Extract command from user message
 * @param {string} message - User message
 * @returns {string|null} - Command name or null
 */
export function extractCommand(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const trimmed = message.trim().toLowerCase();

  // Check for slash commands
  const slashMatch = trimmed.match(/^\/(\w+)/);
  if (slashMatch) {
    const command = slashMatch[1];
    if (command in COMMAND_TEMPERATURES) {
      return command;
    }
  }

  return null;
}

/**
 * Get optimal temperature for a given command or message
 * @param {string} commandOrMessage - Command name or full message
 * @returns {number} - Temperature value (0.0 - 1.0)
 */
export function getTemperatureForCommand(commandOrMessage) {
  if (!commandOrMessage) {
    return COMMAND_TEMPERATURES.default;
  }

  // If it's already a known command
  if (commandOrMessage in COMMAND_TEMPERATURES) {
    return COMMAND_TEMPERATURES[commandOrMessage];
  }

  // Try to extract command from message
  const command = extractCommand(commandOrMessage);
  if (command) {
    return COMMAND_TEMPERATURES[command];
  }

  // Default temperature for general chat
  return COMMAND_TEMPERATURES.default;
}

/**
 * Get all available commands with their temperatures
 * @returns {Object} - Command descriptions with temperatures
 */
export function getCommandInfo() {
  return {
    explain: {
      temperature: COMMAND_TEMPERATURES.explain,
      description: 'Explains a topic in simple terms',
      usage: '/explain [topic]'
    },
    solve: {
      temperature: COMMAND_TEMPERATURES.solve,
      description: 'Solves a problem step by step',
      usage: '/solve [problem]'
    },
    check: {
      temperature: COMMAND_TEMPERATURES.check,
      description: 'Checks your answer, text, code, or essay',
      usage: '/check [content]'
    },
    practice: {
      temperature: COMMAND_TEMPERATURES.practice,
      description: 'Gives similar exercises for practice',
      usage: '/practice [topic] [count]'
    },
    notes: {
      temperature: COMMAND_TEMPERATURES.notes,
      description: 'Creates a short summary or cheatsheet',
      usage: '/notes [topic]'
    },
    essay: {
      temperature: COMMAND_TEMPERATURES.essay,
      description: 'Writes an essay on a given topic',
      usage: '/essay [topic]'
    }
  };
}
