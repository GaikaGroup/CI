/**
 * Prompt Enhancer for Language Consistency
 * Enhances system prompts with explicit language constraints to prevent language switching
 */

// Language prompt templates for enforcement
export const LANGUAGE_PROMPTS = {
  ru: {
    enforcement:
      'КРИТИЧЕСКИ ВАЖНО: Отвечай ТОЛЬКО на русском языке. Никогда не используй китайский, английский или другие языки в своем ответе.',
    validation: 'Проверь, что весь твой ответ написан на русском языке перед отправкой.',
    strong:
      'СТРОГО ОБЯЗАТЕЛЬНО: Весь твой ответ должен быть написан исключительно на русском языке. Запрещено использовать любые другие языки, включая китайский, английский, испанский или любые другие. Если ты не уверен в переводе какого-то термина, используй русские эквиваленты или объяснения.',
    contextual: 'Пользователь общается на русском языке. Поддерживай разговор на русском.',
    reminder: 'Помни: отвечай только на русском языке.',
    ultra_strong: `═══════════════════════════════════════════════════════════
⚠️ АБСОЛЮТНОЕ ТРЕБОВАНИЕ К ЯЗЫКУ ⚠️
═══════════════════════════════════════════════════════════

ТЫ ДОЛЖЕН ОТВЕЧАТЬ ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ!

❌ ЗАПРЕЩЕНО использовать:
   - Английский язык
   - Китайский язык
   - Испанский язык
   - Любые другие языки

✅ РАЗРЕШЕНО использовать:
   - ТОЛЬКО русский язык
   - Русские буквы: А-Я, а-я
   - Русские слова и выражения

📋 ПРАВИЛА:
1. Каждое слово должно быть на русском
2. Каждое предложение должно быть на русском
3. Весь ответ от начала до конца - на русском
4. Если не знаешь русского слова - опиши на русском
5. Никаких исключений!

🔍 ПРОВЕРКА ПЕРЕД ОТПРАВКОЙ:
   - Прочитай свой ответ
   - Убедись что ВСЁ на русском
   - Если есть хоть одно слово не на русском - ПЕРЕДЕЛАЙ

═══════════════════════════════════════════════════════════`
  },
  en: {
    enforcement:
      'CRITICAL: Respond ONLY in English. Never use Russian, Chinese, or other languages in your response.',
    validation: 'Verify that your entire response is in English before sending.',
    strong:
      "STRICTLY REQUIRED: Your entire response must be written exclusively in English. You are forbidden from using any other languages including Russian, Chinese, Spanish, or any others. If you're unsure about translating a term, use English equivalents or explanations.",
    contextual: 'The user is communicating in English. Maintain the conversation in English.',
    reminder: 'Remember: respond only in English.',
    ultra_strong: `═══════════════════════════════════════════════════════════
⚠️ ABSOLUTE LANGUAGE REQUIREMENT ⚠️
═══════════════════════════════════════════════════════════

YOU MUST RESPOND EXCLUSIVELY IN ENGLISH!

❌ FORBIDDEN to use:
   - Russian language
   - Chinese language
   - Spanish language
   - Any other languages

✅ ALLOWED to use:
   - ONLY English language
   - English letters: A-Z, a-z
   - English words and expressions

📋 RULES:
1. Every word must be in English
2. Every sentence must be in English
3. The entire response from start to finish - in English
4. If you don't know an English word - describe it in English
5. No exceptions!

🔍 CHECK BEFORE SENDING:
   - Read your response
   - Make sure EVERYTHING is in English
   - If there's even one word not in English - REDO IT

═══════════════════════════════════════════════════════════`
  },
  es: {
    enforcement:
      'CRÍTICO: Responde SOLO en español. Nunca uses ruso, chino u otros idiomas en tu respuesta.',
    validation: 'Verifica que toda tu respuesta esté en español antes de enviar.',
    strong:
      'ESTRICTAMENTE REQUERIDO: Toda tu respuesta debe estar escrita exclusivamente en español. Está prohibido usar cualquier otro idioma, incluyendo ruso, chino, inglés o cualquier otro. Si no estás seguro de la traducción de algún término, usa equivalentes o explicaciones en español.',
    contextual: 'El usuario se está comunicando en español. Mantén la conversación en español.',
    reminder: 'Recuerda: responde solo en español.',
    ultra_strong: `═══════════════════════════════════════════════════════════
⚠️ REQUISITO ABSOLUTO DE IDIOMA ⚠️
═══════════════════════════════════════════════════════════

¡DEBES RESPONDER EXCLUSIVAMENTE EN ESPAÑOL!

❌ PROHIBIDO usar:
   - Idioma inglés
   - Idioma ruso
   - Idioma chino
   - Cualquier otro idioma

✅ PERMITIDO usar:
   - SOLO idioma español
   - Letras españolas: A-Z, a-z, ñ, á, é, í, ó, ú, ü
   - Palabras y expresiones españolas

📋 REGLAS:
1. Cada palabra debe estar en español
2. Cada oración debe estar en español
3. Toda la respuesta de principio a fin - en español
4. Si no sabes una palabra en español - descríbela en español
5. ¡Sin excepciones!

🔍 VERIFICACIÓN ANTES DE ENVIAR:
   - Lee tu respuesta
   - Asegúrate de que TODO esté en español
   - Si hay aunque sea una palabra que no esté en español - REHAZLA

═══════════════════════════════════════════════════════════`
  }
};

// Configuration for language validation
export const LANGUAGE_VALIDATION_CONFIG = {
  // Minimum confidence threshold for language detection
  MIN_CONFIDENCE_THRESHOLD: 0.7,

  // Enable automatic response regeneration
  ENABLE_AUTO_REGENERATION: true,

  // Maximum regeneration attempts
  MAX_REGENERATION_ATTEMPTS: 2,

  // Enable translation fallback
  ENABLE_TRANSLATION_FALLBACK: true,

  // Languages to validate against
  SUPPORTED_LANGUAGES: ['en', 'es', 'ru'],

  // Validation timeout in milliseconds
  VALIDATION_TIMEOUT: 5000
};

export class PromptEnhancer {
  constructor() {
    this.supportedLanguages = LANGUAGE_VALIDATION_CONFIG.SUPPORTED_LANGUAGES;
    this.languagePrompts = LANGUAGE_PROMPTS;

    console.log('PromptEnhancer initialized with languages:', this.supportedLanguages);
  }

  /**
   * Enhance system prompt with language constraints
   * @param {string} originalPrompt - Original system prompt
   * @param {string} targetLanguage - Target language code (e.g., 'ru', 'en', 'es')
   * @param {number} confidence - Language detection confidence (0-1)
   * @param {Object} options - Additional options {hasLanguageMixing, enhancementLevel}
   * @returns {string} Enhanced prompt with language constraints
   */
  enhanceSystemPrompt(originalPrompt, targetLanguage, confidence = 1.0, options = {}) {
    try {
      if (!originalPrompt || typeof originalPrompt !== 'string') {
        console.warn('Invalid original prompt provided to enhanceSystemPrompt');
        return originalPrompt || '';
      }

      if (!this.supportedLanguages.includes(targetLanguage)) {
        console.warn(`Unsupported target language: ${targetLanguage}`);
        return originalPrompt;
      }

      const { hasLanguageMixing = false, enhancementLevel } = options;

      // Select appropriate enforcement prompt based on context
      const enforcementPrompt = this.selectPromptTemplate(
        targetLanguage,
        confidence,
        hasLanguageMixing
      );

      // Determine enhancement strength based on confidence or override
      const finalEnhancementLevel = enhancementLevel || this.getEnhancementLevel(confidence);

      let enhancedPrompt = originalPrompt;

      // Add enforcement based on confidence level and context
      if (finalEnhancementLevel === 'ultra_strong') {
        // Ultra strong enforcement - add at beginning, middle, and end
        const validationPrompt = this.languagePrompts[targetLanguage]?.validation || '';
        const ultraStrongPrompt =
          this.languagePrompts[targetLanguage]?.ultra_strong || enforcementPrompt;
        enhancedPrompt = `${ultraStrongPrompt}\n\n${originalPrompt}\n\n${validationPrompt}\n\n${ultraStrongPrompt}`;
      } else if (finalEnhancementLevel === 'strong' || hasLanguageMixing) {
        // Strong enforcement - add at beginning and end with validation
        const validationPrompt = this.languagePrompts[targetLanguage]?.validation || '';
        enhancedPrompt = `${enforcementPrompt}\n\n${originalPrompt}\n\n${validationPrompt}`;
      } else if (finalEnhancementLevel === 'medium') {
        // Medium confidence - add enforcement at the end
        enhancedPrompt = `${originalPrompt}\n\n${enforcementPrompt}`;
      } else {
        // Gentle enhancement - add contextual reminder
        const gentleReminder = this.createLanguageEnforcementPrompt(targetLanguage, 'reminder');
        enhancedPrompt = `${originalPrompt}\n\n${gentleReminder}`;
      }

      console.log(
        `Enhanced prompt for ${targetLanguage} (confidence: ${confidence}, level: ${finalEnhancementLevel}, mixing: ${hasLanguageMixing})`
      );

      return enhancedPrompt;
    } catch (error) {
      console.error('Error enhancing system prompt:', error);
      return originalPrompt;
    }
  }

  /**
   * Create strong language enforcement prompt
   * @param {string} language - Target language code
   * @param {string} templateType - Type of template ('enforcement', 'strong', 'contextual', 'reminder')
   * @returns {string} Language enforcement prompt
   */
  createLanguageEnforcementPrompt(language, templateType = 'enforcement') {
    if (!this.languagePrompts[language]) {
      console.warn(`No enforcement prompt available for language: ${language}`);
      return this.createGenericEnforcementPrompt(language);
    }

    const template = this.languagePrompts[language][templateType];
    if (!template) {
      console.warn(
        `No ${templateType} template available for language: ${language}, falling back to enforcement`
      );
      return this.languagePrompts[language].enforcement;
    }

    return template;
  }

  /**
   * Select appropriate prompt template based on context
   * @param {string} language - Target language code
   * @param {number} confidence - Language detection confidence
   * @param {boolean} hasLanguageMixing - Whether previous responses had language mixing
   * @returns {string} Selected prompt template
   */
  selectPromptTemplate(language, confidence = 1.0, hasLanguageMixing = false) {
    if (!this.languagePrompts[language]) {
      return this.createGenericEnforcementPrompt(language);
    }

    // ALWAYS use ultra_strong enforcement to prevent language switching
    // This is the most effective way to maintain language consistency
    return this.createLanguageEnforcementPrompt(language, 'ultra_strong');
  }

  /**
   * Add language constraints to message array
   * @param {Array} messages - Array of message objects
   * @param {string} targetLanguage - Target language code
   * @returns {Array} Messages with language constraints added
   */
  addLanguageConstraints(messages, targetLanguage) {
    try {
      if (!Array.isArray(messages)) {
        console.warn('Invalid messages array provided to addLanguageConstraints');
        return messages || [];
      }

      if (!this.supportedLanguages.includes(targetLanguage)) {
        console.warn(`Unsupported target language for constraints: ${targetLanguage}`);
        return messages;
      }

      const enhancedMessages = [...messages];

      // Find the system message and enhance it
      const systemMessageIndex = enhancedMessages.findIndex((msg) => msg.role === 'system');

      if (systemMessageIndex !== -1) {
        // Enhance existing system message
        const systemMessage = enhancedMessages[systemMessageIndex];
        enhancedMessages[systemMessageIndex] = {
          ...systemMessage,
          content: this.enhanceSystemPrompt(systemMessage.content, targetLanguage, 0.8)
        };
      } else {
        // Add new system message with language constraints
        const languageSystemMessage = {
          role: 'system',
          content: this.createLanguageEnforcementPrompt(targetLanguage)
        };
        enhancedMessages.unshift(languageSystemMessage);
      }

      // Add language reminder to the last user message if confidence is low
      const lastUserMessageIndex = this.findLastUserMessageIndex(enhancedMessages);
      if (lastUserMessageIndex !== -1) {
        const lastUserMessage = enhancedMessages[lastUserMessageIndex];

        // Check if message has structured content (e.g., with images)
        const isStructuredContent = Array.isArray(lastUserMessage.content);

        // Get text content for reminder check
        const textContent = isStructuredContent
          ? lastUserMessage.content
              .filter((c) => c.type === 'text')
              .map((c) => c.text)
              .join(' ')
          : lastUserMessage.content;

        const reminder = this.createContextualLanguageReminder(targetLanguage, textContent);

        if (reminder) {
          if (isStructuredContent) {
            // For structured content, add reminder to the first text part
            const contentCopy = [...lastUserMessage.content];
            const firstTextIndex = contentCopy.findIndex((c) => c.type === 'text');

            if (firstTextIndex !== -1) {
              contentCopy[firstTextIndex] = {
                ...contentCopy[firstTextIndex],
                text: `${contentCopy[firstTextIndex].text}\n\n${reminder}`
              };
            } else {
              // No text part found, add one at the beginning
              contentCopy.unshift({
                type: 'text',
                text: reminder
              });
            }

            enhancedMessages[lastUserMessageIndex] = {
              ...lastUserMessage,
              content: contentCopy
            };
          } else {
            // For simple text content, append reminder as before
            enhancedMessages[lastUserMessageIndex] = {
              ...lastUserMessage,
              content: `${lastUserMessage.content}\n\n${reminder}`
            };
          }
        }
      }

      console.log(
        `Added language constraints for ${targetLanguage} to ${enhancedMessages.length} messages`
      );

      return enhancedMessages;
    } catch (error) {
      console.error('Error adding language constraints:', error);
      return messages;
    }
  }

  /**
   * Get enhancement level based on confidence
   * @param {number} confidence - Language detection confidence (0-1)
   * @returns {string} Enhancement level: 'strong', 'medium', or 'gentle'
   */
  getEnhancementLevel(confidence) {
    if (confidence >= 0.8) return 'strong';
    if (confidence >= 0.5) return 'medium';
    return 'gentle';
  }

  /**
   * Create gentle language reminder for low confidence scenarios
   * @param {string} language - Target language code
   * @returns {string} Gentle reminder prompt
   */
  createGentleLanguageReminder(language) {
    const reminders = {
      ru: 'Пожалуйста, отвечай на русском языке.',
      en: 'Please respond in English.',
      es: 'Por favor, responde en español.'
    };

    return reminders[language] || `Please respond in ${language}.`;
  }

  /**
   * Create contextual language reminder based on user message
   * @param {string} language - Target language code
   * @param {string} userMessage - User's message content
   * @returns {string|null} Contextual reminder or null if not needed
   */
  createContextualLanguageReminder(language, userMessage) {
    // Only add contextual reminder if user message is short or unclear
    if (!userMessage || userMessage.length > 100) {
      return null;
    }

    const contextualReminders = {
      ru: '(Ответь на русском языке)',
      en: '(Please respond in English)',
      es: '(Responde en español)'
    };

    return contextualReminders[language] || null;
  }

  /**
   * Create generic enforcement prompt for unsupported languages
   * @param {string} language - Language code
   * @returns {string} Generic enforcement prompt
   */
  createGenericEnforcementPrompt(language) {
    return `IMPORTANT: Please respond only in ${language}. Do not use any other languages in your response.`;
  }

  /**
   * Find the index of the last user message in the messages array
   * @param {Array} messages - Array of message objects
   * @returns {number} Index of last user message or -1 if not found
   */
  findLastUserMessageIndex(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get available language prompts
   * @returns {Object} Available language prompts
   */
  getAvailableLanguagePrompts() {
    return { ...this.languagePrompts };
  }

  /**
   * Add or update language prompt template
   * @param {string} language - Language code
   * @param {Object} prompts - Prompt templates {enforcement, validation}
   */
  addLanguagePrompt(language, prompts) {
    if (!language || !prompts || !prompts.enforcement) {
      console.warn('Invalid language prompt configuration');
      return;
    }

    this.languagePrompts[language] = {
      enforcement: prompts.enforcement,
      validation: prompts.validation || prompts.enforcement
    };

    if (!this.supportedLanguages.includes(language)) {
      this.supportedLanguages.push(language);
    }

    console.log(`Added/updated language prompt for: ${language}`);
  }

  /**
   * Check if language is supported
   * @param {string} language - Language code to check
   * @returns {boolean} True if language is supported
   */
  isLanguageSupported(language) {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Get validation instructions for a specific language
   * @param {string} language - Target language code
   * @returns {string} Validation instructions
   */
  getValidationInstructions(language) {
    if (!this.languagePrompts[language]) {
      return `Please ensure your response is written entirely in ${language}.`;
    }

    return this.languagePrompts[language].validation;
  }

  /**
   * Get all available template types for a language
   * @param {string} language - Target language code
   * @returns {Array<string>} Available template types
   */
  getAvailableTemplateTypes(language) {
    if (!this.languagePrompts[language]) {
      return [];
    }

    return Object.keys(this.languagePrompts[language]);
  }

  /**
   * Create language-specific prompt based on conversation context
   * @param {string} language - Target language code
   * @param {Object} context - Conversation context {messageCount, hasErrors, userPreference}
   * @returns {string} Context-aware language prompt
   */
  createContextAwarePrompt(language, context = {}) {
    const { messageCount = 0, hasErrors = false, userPreference = null } = context;

    if (!this.languagePrompts[language]) {
      return this.createGenericEnforcementPrompt(language);
    }

    // For first message or when user explicitly set preference
    if (messageCount <= 1 || userPreference === language) {
      return this.createLanguageEnforcementPrompt(language, 'contextual');
    }

    // If there were previous errors, use strong enforcement
    if (hasErrors) {
      return this.createLanguageEnforcementPrompt(language, 'strong');
    }

    // For ongoing conversation, use gentle reminder
    return this.createLanguageEnforcementPrompt(language, 'reminder');
  }

  /**
   * Get enhancement statistics
   * @returns {Object} Enhancement statistics
   */
  getStats() {
    return {
      supportedLanguages: [...this.supportedLanguages],
      availablePrompts: Object.keys(this.languagePrompts),
      templateTypes: this.supportedLanguages.reduce((acc, lang) => {
        acc[lang] = this.getAvailableTemplateTypes(lang);
        return acc;
      }, {}),
      config: { ...LANGUAGE_VALIDATION_CONFIG }
    };
  }
}

// Export singleton instance
export const promptEnhancer = new PromptEnhancer();
