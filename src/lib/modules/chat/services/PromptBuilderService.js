/**
 * Prompt Builder Service
 *
 * Constructs prompts and message arrays for LLM requests.
 * Handles conversation history, language enforcement, and vision model formatting.
 */

import { OPENAI_CONFIG } from '$lib/config/api';
import { PROVIDER_CONFIG } from '$lib/config/llm';

export class PromptBuilderService {
  /**
   * @param {Object} contentFormatter - ContentFormatterService instance
   */
  constructor(contentFormatter) {
    this.contentFormatter = contentFormatter;
  }

  /**
   * Builds the full prompt content from user input and context
   * @param {Object} params - Parameters for building prompt
   * @param {string} params.content - User message content
   * @param {string} params.recognizedText - OCR recognized text from images
   * @param {Array} params.images - Array of image data
   * @param {Object} params.sessionContext - Session context with documents and history
   * @param {Object} params.examProfile - Exam profile configuration
   * @param {string} params.ocrError - OCR processing error message
   * @returns {string} Complete prompt content
   */
  buildPromptContent({ content, recognizedText, images, sessionContext, examProfile, ocrError }) {
    let fullContent = '';

    // Add session context documents if available
    if (sessionContext?.documents && sessionContext.documents.length > 0) {
      fullContent += 'Previous documents:\n';
      sessionContext.documents.forEach((doc, index) => {
        if (doc.content?.processedContent?.text) {
          fullContent += `Document ${index + 1}:\n${doc.content.processedContent.text}\n\n`;
        }
      });
    }

    // Add exam profile information if available
    if (examProfile) {
      const activeModeConfig =
        examProfile.mode === 'exam' ? examProfile.exam : examProfile.practice;

      const courseLine = `Exam course: ${examProfile.subjectName}`;
      const level = examProfile.level ? ` (Level: ${examProfile.level})` : '';
      const languageLine = examProfile.language ? `Target language: ${examProfile.language}.` : '';
      const skillsLine =
        examProfile.skills && examProfile.skills.length > 0
          ? `Skills in focus: ${examProfile.skills.join(', ')}.`
          : '';
      const modeLine = `Mode: ${examProfile.mode === 'exam' ? 'Exam simulation' : 'Practice coaching'}.`;

      fullContent += `${courseLine}${level}\n${modeLine}`;
      if (languageLine) fullContent += `\n${languageLine}`;
      if (skillsLine) fullContent += `\n${skillsLine}`;
      if (activeModeConfig?.summary) {
        fullContent += `\nMode focus: ${activeModeConfig.summary}`;
      }
      if (activeModeConfig?.instructions) {
        fullContent += `\nGuidance: ${activeModeConfig.instructions}`;
      }
      if (activeModeConfig?.followUp) {
        fullContent += `\nFollow-up expectation: ${activeModeConfig.followUp}`;
      }
      fullContent += '\n\n';
    }

    // Add user question
    fullContent += `Student question:\n${content}`;

    // Add recognized text from images
    if (recognizedText) {
      fullContent += `\n\nExercise (from photo):\n${recognizedText}`;
    }

    // Add OCR processing notes if images are attached
    if (images && images.length > 0) {
      if (ocrError) {
        fullContent += `\n\n[OCR Processing Note: ${ocrError}]`;
      } else if (!recognizedText) {
        fullContent += `\n\n[OCR Processing Note: No text could be recognized in the uploaded images. The images may be unclear, contain handwriting that is difficult to read, or may not contain text.]`;
      }
    }

    return fullContent;
  }

  /**
   * Builds the complete messages array for LLM request
   * @param {Object} params - Parameters for building messages
   * @param {string} params.systemPrompt - Base system prompt
   * @param {string} params.fullContent - Full prompt content
   * @param {Array} params.images - Array of image data
   * @param {Object} params.sessionContext - Session context with history
   * @param {string} params.detectedLanguage - Detected user language
   * @param {string} params.requestedProvider - Requested LLM provider
   * @param {Object} params.examProfile - Exam profile configuration
   * @param {string} params.language - Interface language
   * @param {string} params.detailLevel - Detail level for response
   * @param {number} params.adjustedMinWords - Adjusted minimum words
   * @param {string} params.agentInstructions - Agent-specific instructions
   * @returns {Array} Array of message objects for LLM
   */
  buildMessages({
    systemPrompt,
    fullContent,
    images,
    sessionContext,
    detectedLanguage,
    requestedProvider,
    examProfile,
    language,
    detailLevel,
    adjustedMinWords,
    agentInstructions
  }) {
    const messages = [];

    // Add agent-specific or default system prompt with language enforcement
    const languagePrefix = this._getLanguagePrefix(detectedLanguage);
    const targetLanguage = this._getTargetLanguageName(detectedLanguage);

    if (agentInstructions) {
      messages.push({
        role: 'system',
        content: languagePrefix + agentInstructions
      });
    } else {
      messages.push({
        role: 'system',
        content:
          languagePrefix +
          `You are a helpful AI tutor assistant.

Your role is to:
- Provide clear, accurate, and educational responses
- Explain concepts in a way that's easy to understand
- Be patient and supportive
- Use examples when helpful

Maintain a friendly and encouraging tone.`
      });
    }

    // Add enhanced system prompt with language instructions
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Add conversation history with sliding window
    if (sessionContext?.history && sessionContext.history.length > 0) {
      const maxHistoryMessages = this._getMaxHistoryMessages(requestedProvider);
      const recentHistory =
        sessionContext.history.length > maxHistoryMessages
          ? sessionContext.history.slice(-maxHistoryMessages)
          : sessionContext.history;

      console.log(
        `Using ${recentHistory.length} of ${sessionContext.history.length} history messages (max: ${maxHistoryMessages})`
      );

      recentHistory.forEach((entry) => {
        messages.push({ role: entry.role, content: entry.content });
      });
    }

    // Add formatted course settings if available
    if (examProfile?.settings) {
      const formattedSettings = this.contentFormatter.formatCourseSettings(
        examProfile.settings,
        language,
        examProfile.mode
      );
      if (formattedSettings) {
        messages.push({ role: 'system', content: formattedSettings });
      }
    }

    // Add exam system instructions if available
    if (examProfile) {
      const activeModeConfig =
        examProfile.mode === 'exam' ? examProfile.exam : examProfile.practice;
      const skillFocus =
        examProfile.skills && examProfile.skills.length > 0
          ? `Focus skills: ${examProfile.skills.join(', ')}`
          : null;

      const examSystemLines = [
        `Learner is preparing for ${examProfile.subjectName}${examProfile.level ? ` (${examProfile.level})` : ''}.`,
        examProfile.language ? `Target language: ${examProfile.language}.` : null,
        `Mode: ${examProfile.mode === 'exam' ? 'Exam simulation' : 'Practice workshop'}.`,
        activeModeConfig?.summary ? `Mode summary: ${activeModeConfig.summary}` : null,
        activeModeConfig?.instructions
          ? `Guidance to follow: ${activeModeConfig.instructions}`
          : null,
        activeModeConfig?.followUp ? `After responding, ${activeModeConfig.followUp}` : null,
        skillFocus
      ].filter(Boolean);

      if (examSystemLines.length > 0) {
        messages.push({
          role: 'system',
          content: examSystemLines.join('\n')
        });
      }
    }

    // Add detail level instruction if specified
    if (detailLevel === 'detailed') {
      messages.push({
        role: 'system',
        content:
          'The student requested a detailed explanation. Respond comprehensively with background, step-by-step reasoning, and relevant examples.'
      });
    }

    // Add minimum words instruction if specified
    if (adjustedMinWords) {
      messages.push({
        role: 'system',
        content: `The student expects a detailed essay of at least ${adjustedMinWords} words. Do not stop early.`
      });
    }

    // Add user message (with or without images)
    const languageInstruction = this._getUserLanguageInstruction(detectedLanguage);
    if (images && images.length > 0) {
      messages.push(this._formatVisionMessage(languageInstruction + fullContent, images));
    } else {
      let userContent = languageInstruction + fullContent;

      // Add context reminder for commands
      if (fullContent.trim().startsWith('/')) {
        userContent +=
          '\n\n⚠️ IMPORTANT: This is a COMMAND. Look at the conversation history above to understand what topic it refers to. Apply this command to the PREVIOUS topic discussed.';
      }

      messages.push({ role: 'user', content: userContent });
    }

    // Add language enforcement reminders
    this._addLanguageEnforcement(messages, detectedLanguage, requestedProvider);

    return messages;
  }

  /**
   * Formats a message for vision models with images
   * @param {string} textContent - Text content
   * @param {Array} images - Array of image data URLs
   * @returns {Object} Vision message object
   */
  _formatVisionMessage(textContent, images) {
    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: textContent
        }
      ]
    };

    // Add each image to the message
    for (const imageData of images) {
      userMessage.content.push({
        type: 'image_url',
        image_url: {
          url: imageData
        }
      });
    }

    return userMessage;
  }

  /**
   * Adds language enforcement messages to the messages array
   * @param {Array} messages - Messages array to modify
   * @param {string} detectedLanguage - Detected language code
   * @param {string} requestedProvider - Requested provider
   */
  _addLanguageEnforcement(messages, detectedLanguage, requestedProvider) {
    const simpleReminders = {
      es: 'Responde en español.',
      ru: 'Отвечай на русском.',
      en: 'Respond in English.',
      fr: 'Réponds en français.',
      de: 'Antworte auf Deutsch.',
      it: 'Rispondi in italiano.',
      pt: 'Responda em português.'
    };

    messages.push({
      role: 'system',
      content:
        simpleReminders[detectedLanguage] ||
        `Respond in ${this._getTargetLanguageName(detectedLanguage)}.`
    });

    // Extra enforcement for Ollama
    const isOllama =
      !requestedProvider ||
      requestedProvider === 'ollama' ||
      PROVIDER_CONFIG.DEFAULT_PROVIDER === 'ollama';

    if (isOllama) {
      const ollamaLanguageMap = {
        es: 'español',
        ru: 'русский',
        en: 'English',
        fr: 'français',
        de: 'Deutsch',
        it: 'italiano',
        pt: 'português'
      };

      const targetLangName =
        ollamaLanguageMap[detectedLanguage] || this._getTargetLanguageName(detectedLanguage);

      messages.push({
        role: 'system',
        content: `Language: ${targetLangName}`
      });

      console.log(`[Ollama] Added extra language enforcement: ${targetLangName}`);
    }

    // Final reminder
    const finalReminders = {
      es: 'Tu respuesta: 100% español.',
      ru: 'Твой ответ: 100% русский.',
      en: 'Your response: 100% English.',
      fr: 'Ta réponse: 100% français.',
      de: 'Deine Antwort: 100% Deutsch.',
      it: 'La tua risposta: 100% italiano.',
      pt: 'Sua resposta: 100% português.'
    };

    messages.push({
      role: 'system',
      content:
        finalReminders[detectedLanguage] ||
        `Your response: 100% ${this._getTargetLanguageName(detectedLanguage)}.`
    });
  }

  /**
   * Gets the language prefix for system prompts
   * @param {string} languageCode - Language code
   * @returns {string} Language prefix
   */
  _getLanguagePrefix(languageCode) {
    const languagePrefix = {
      es: 'RESPONDE EN ESPAÑOL.\n\n',
      ru: 'ОТВЕЧАЙ НА РУССКОМ.\n\n',
      en: 'RESPOND IN ENGLISH.\n\n',
      fr: 'RÉPONDS EN FRANÇAIS.\n\n',
      de: 'ANTWORTE AUF DEUTSCH.\n\n',
      it: 'RISPONDI IN ITALIANO.\n\n',
      pt: 'RESPONDA EM PORTUGUÊS.\n\n'
    };

    return (
      languagePrefix[languageCode] ||
      `RESPOND IN ${this._getTargetLanguageName(languageCode).toUpperCase()}.\n\n`
    );
  }

  /**
   * Gets the user language instruction
   * @param {string} languageCode - Language code
   * @returns {string} User language instruction
   */
  _getUserLanguageInstruction(languageCode) {
    const userLanguageInstruction = {
      es: '[Responde en español]\n\n',
      ru: '[Отвечай на русском]\n\n',
      en: '[Respond in English]\n\n',
      fr: '[Réponds en français]\n\n',
      de: '[Antworte auf Deutsch]\n\n',
      it: '[Rispondi in italiano]\n\n',
      pt: '[Responda em português]\n\n'
    };

    return userLanguageInstruction[languageCode] || '';
  }

  /**
   * Gets the target language name from code
   * @param {string} languageCode - Language code
   * @returns {string} Language name
   */
  _getTargetLanguageName(languageCode) {
    const languageNames = {
      ru: 'Russian',
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese'
    };

    return languageNames[languageCode] || 'English';
  }

  /**
   * Gets the maximum history messages based on provider
   * @param {string} requestedProvider - Requested provider
   * @returns {number} Maximum history messages
   */
  _getMaxHistoryMessages(requestedProvider) {
    const isOllamaProvider =
      !requestedProvider ||
      requestedProvider === 'ollama' ||
      PROVIDER_CONFIG.DEFAULT_PROVIDER === 'ollama';

    return isOllamaProvider
      ? parseInt(import.meta.env.VITE_OLLAMA_MAX_HISTORY_MESSAGES || '16', 10)
      : OPENAI_CONFIG.MAX_HISTORY_MESSAGES;
  }
}
