/**
 * Voice Commands Handler
 *
 * Handles voice command recognition and execution for the chat system.
 * Supports commands like "second opinion", "repeat", "stop", etc.
 */

import { get } from 'svelte/store';
import { selectedLanguage } from '$modules/i18n/stores';
import { synthesizeSpeech } from './voiceServices.js';

/**
 * Voice command patterns for different languages
 */
const COMMAND_PATTERNS = {
  en: {
    secondOpinion: [
      /second\s+opinion/i,
      /another\s+opinion/i,
      /different\s+(answer|response)/i,
      /ask\s+another\s+(model|ai)/i,
      /alternative\s+(answer|response)/i
    ],
    repeat: [/repeat/i, /say\s+that\s+again/i, /what\s+did\s+you\s+say/i],
    stop: [/stop/i, /cancel/i, /never\s+mind/i]
  },
  ru: {
    secondOpinion: [
      /второе\s+мнение/i,
      /другое\s+мнение/i,
      /альтернативный\s+ответ/i,
      /спроси\s+другую\s+модель/i
    ],
    repeat: [/повтори/i, /повтор/i, /что\s+ты\s+сказал/i],
    stop: [/стоп/i, /отмена/i, /не\s+надо/i]
  },
  es: {
    secondOpinion: [
      /segunda\s+opinión/i,
      /otra\s+opinión/i,
      /respuesta\s+diferente/i,
      /pregunta\s+a\s+otro\s+modelo/i
    ],
    repeat: [/repite/i, /repetir/i, /qué\s+dijiste/i],
    stop: [/detener/i, /cancelar/i, /no\s+importa/i]
  }
};

/**
 * Command responses for different languages
 */
const COMMAND_RESPONSES = {
  en: {
    secondOpinionRequested: 'Let me get a second opinion from another AI model...',
    secondOpinionNotAvailable:
      "I'm sorry, but I can't get a second opinion right now. There are no alternative models available.",
    secondOpinionError: 'I encountered an error while getting a second opinion. Please try again.',
    noMessageToOpine:
      "There's no previous message to get a second opinion on. Please ask a question first.",
    commandNotRecognized:
      "I didn't understand that command. You can say 'second opinion' to get an alternative answer."
  },
  ru: {
    secondOpinionRequested: 'Сейчас получу второе мнение от другой модели ИИ...',
    secondOpinionNotAvailable:
      'Извините, но я не могу получить второе мнение прямо сейчас. Нет доступных альтернативных моделей.',
    secondOpinionError:
      'Произошла ошибка при получении второго мнения. Пожалуйста, попробуйте снова.',
    noMessageToOpine:
      'Нет предыдущего сообщения для получения второго мнения. Пожалуйста, сначала задайте вопрос.',
    commandNotRecognized:
      "Я не понял эту команду. Вы можете сказать 'второе мнение', чтобы получить альтернативный ответ."
  },
  es: {
    secondOpinionRequested: 'Déjame obtener una segunda opinión de otro modelo de IA...',
    secondOpinionNotAvailable:
      'Lo siento, pero no puedo obtener una segunda opinión en este momento. No hay modelos alternativos disponibles.',
    secondOpinionError:
      'Encontré un error al obtener una segunda opinión. Por favor, inténtalo de nuevo.',
    noMessageToOpine:
      'No hay un mensaje anterior para obtener una segunda opinión. Por favor, haz una pregunta primero.',
    commandNotRecognized:
      "No entendí ese comando. Puedes decir 'segunda opinión' para obtener una respuesta alternativa."
  }
};

/**
 * Detect if text contains a voice command
 * @param {string} text - Transcribed text
 * @param {string} language - Language code
 * @returns {Object|null} Command object or null if no command detected
 */
export function detectVoiceCommand(text, language = 'en') {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const patterns = COMMAND_PATTERNS[language] || COMMAND_PATTERNS.en;
  const normalizedText = text.trim().toLowerCase();

  // Check for second opinion command
  if (patterns.secondOpinion.some((pattern) => pattern.test(normalizedText))) {
    return {
      type: 'secondOpinion',
      originalText: text,
      language
    };
  }

  // Check for repeat command
  if (patterns.repeat.some((pattern) => pattern.test(normalizedText))) {
    return {
      type: 'repeat',
      originalText: text,
      language
    };
  }

  // Check for stop command
  if (patterns.stop.some((pattern) => pattern.test(normalizedText))) {
    return {
      type: 'stop',
      originalText: text,
      language
    };
  }

  return null;
}

/**
 * Execute a voice command
 * @param {Object} command - Command object from detectVoiceCommand
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Command execution result
 */
export async function executeVoiceCommand(command, context = {}) {
  const { sessionId, userId, lastMessageId, onStatusChange } = context;
  const language = command.language || get(selectedLanguage);

  try {
    switch (command.type) {
      case 'secondOpinion':
        return await handleSecondOpinionCommand(
          lastMessageId,
          sessionId,
          userId,
          language,
          onStatusChange
        );

      case 'repeat':
        return await handleRepeatCommand(context, language);

      case 'stop':
        return await handleStopCommand(context, language);

      default:
        return {
          success: false,
          message: getCommandResponse('commandNotRecognized', language),
          shouldSpeak: true
        };
    }
  } catch (error) {
    console.error('[VoiceCommands] Command execution error:', error);
    return {
      success: false,
      message: getCommandResponse('secondOpinionError', language),
      shouldSpeak: true,
      error: error.message
    };
  }
}

/**
 * Handle second opinion voice command
 * @param {string} lastMessageId - ID of the last assistant message
 * @param {string} sessionId - Current session ID
 * @param {string} userId - Current user ID
 * @param {string} language - Language code
 * @param {Function} onStatusChange - Callback for status updates
 * @returns {Promise<Object>} Command result
 */
async function handleSecondOpinionCommand(
  lastMessageId,
  sessionId,
  userId,
  language,
  onStatusChange
) {
  // Check if we have a message to get opinion on
  if (!lastMessageId) {
    const message = getCommandResponse('noMessageToOpine', language);
    return {
      success: false,
      message,
      shouldSpeak: true
    };
  }

  try {
    // Update UI to show we're generating second opinion
    if (onStatusChange) {
      onStatusChange({ isGeneratingSecondOpinion: true });
    }

    // Announce that we're getting a second opinion
    const announcementMessage = getCommandResponse('secondOpinionRequested', language);
    await synthesizeSpeech(announcementMessage, {
      isWaitingPhrase: false,
      language,
      priority: 1
    });

    // Request second opinion via API
    const response = await fetch('/api/chat/second-opinion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messageId: lastMessageId,
        sessionId,
        language
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to get second opinion');
    }

    const result = await response.json();

    if (result.success) {
      // Update UI with provider info
      if (onStatusChange) {
        onStatusChange({
          isGeneratingSecondOpinion: false,
          currentProvider: result.data.provider
        });
      }

      // Announce the provider
      const providerAnnouncement = getProviderAnnouncement(
        result.data.provider,
        result.data.model,
        language
      );

      // Speak the provider announcement
      await synthesizeSpeech(providerAnnouncement, {
        isWaitingPhrase: false,
        language,
        priority: 1
      });

      // Speak the second opinion content
      await synthesizeSpeech(result.data.content, {
        isWaitingPhrase: false,
        language,
        priority: 1
      });

      // Clear provider indicator after speaking
      if (onStatusChange) {
        onStatusChange({ currentProvider: null });
      }

      return {
        success: true,
        message: result.data.content,
        shouldSpeak: false, // Already spoken
        opinionData: result.data
      };
    } else {
      // Clear generating status
      if (onStatusChange) {
        onStatusChange({ isGeneratingSecondOpinion: false });
      }

      const errorMessage = getCommandResponse('secondOpinionError', language);
      return {
        success: false,
        message: errorMessage,
        shouldSpeak: true
      };
    }
  } catch (error) {
    console.error('[VoiceCommands] Second opinion error:', error);

    // Clear generating status
    if (onStatusChange) {
      onStatusChange({ isGeneratingSecondOpinion: false });
    }

    // Check if it's a "no alternatives" error
    if (error.message.includes('alternative') || error.message.includes('available')) {
      const message = getCommandResponse('secondOpinionNotAvailable', language);
      return {
        success: false,
        message,
        shouldSpeak: true
      };
    }

    const errorMessage = getCommandResponse('secondOpinionError', language);
    return {
      success: false,
      message: errorMessage,
      shouldSpeak: true,
      error: error.message
    };
  }
}

/**
 * Handle repeat command
 * @param {Object} context - Command context
 * @param {string} language - Language code
 * @returns {Promise<Object>} Command result
 */
async function handleRepeatCommand(context, language) {
  const { lastResponse } = context;

  if (!lastResponse) {
    return {
      success: false,
      message: "There's nothing to repeat.",
      shouldSpeak: true
    };
  }

  // Repeat the last response
  await synthesizeSpeech(lastResponse, {
    isWaitingPhrase: false,
    language,
    priority: 1
  });

  return {
    success: true,
    message: lastResponse,
    shouldSpeak: false // Already spoken
  };
}

/**
 * Handle stop command
 * @param {Object} context - Command context
 * @param {string} language - Language code
 * @returns {Promise<Object>} Command result
 */
async function handleStopCommand(context, language) {
  // Stop any ongoing audio playback
  // This would be handled by the voice services

  return {
    success: true,
    message: 'Stopped.',
    shouldSpeak: false // Don't speak confirmation
  };
}

/**
 * Get command response text
 * @param {string} key - Response key
 * @param {string} language - Language code
 * @returns {string} Response text
 */
function getCommandResponse(key, language) {
  const responses = COMMAND_RESPONSES[language] || COMMAND_RESPONSES.en;
  return responses[key] || responses.commandNotRecognized;
}

/**
 * Get provider announcement text
 * @param {string} provider - Provider name
 * @param {string} model - Model name
 * @param {string} language - Language code
 * @returns {string} Announcement text
 */
function getProviderAnnouncement(provider, model, language) {
  const announcements = {
    en: `Here's a second opinion from ${provider}${model ? `, using the ${model} model` : ''}.`,
    ru: `Вот второе мнение от ${provider}${model ? `, используя модель ${model}` : ''}.`,
    es: `Aquí está una segunda opinión de ${provider}${model ? `, usando el modelo ${model}` : ''}.`
  };

  return announcements[language] || announcements.en;
}

/**
 * Check if text is likely a command vs a regular question
 * @param {string} text - Transcribed text
 * @param {string} language - Language code
 * @returns {boolean} True if text is likely a command
 */
export function isLikelyCommand(text, language = 'en') {
  const command = detectVoiceCommand(text, language);
  return command !== null;
}

/**
 * Get list of available commands for a language
 * @param {string} language - Language code
 * @returns {Array<string>} List of command examples
 */
export function getAvailableCommands(language = 'en') {
  const commands = {
    en: [
      "Say 'second opinion' to get an alternative answer",
      "Say 'repeat' to hear the last response again",
      "Say 'stop' to cancel"
    ],
    ru: [
      "Скажите 'второе мнение' для альтернативного ответа",
      "Скажите 'повтори' чтобы услышать последний ответ снова",
      "Скажите 'стоп' для отмены"
    ],
    es: [
      "Di 'segunda opinión' para obtener una respuesta alternativa",
      "Di 'repite' para escuchar la última respuesta de nuevo",
      "Di 'detener' para cancelar"
    ]
  };

  return commands[language] || commands.en;
}
