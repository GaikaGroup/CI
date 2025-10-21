import { json } from '@sveltejs/kit';
import { container } from '$lib/shared/di/container';
import { OPENAI_CONFIG } from '$lib/config/api';
import { LLM_FEATURES, PROVIDER_CONFIG } from '$lib/config/llm';
import { languageDetector } from '$lib/modules/chat/LanguageDetector.js';
import { sessionLanguageManager } from '$lib/modules/chat/SessionLanguageManager.js';
import { promptEnhancer } from '$lib/modules/chat/PromptEnhancer.js';
import { languageConsistencyLogger } from '$lib/modules/chat/LanguageConsistencyLogger.js';

const INTERFACE_LANGUAGE_MAP = {
  en: 'english',
  es: 'spanish',
  ru: 'russian'
};

function mapInterfaceLanguage(languageCode) {
  if (!languageCode || typeof languageCode !== 'string') {
    return null;
  }
  const normalised = languageCode.toLowerCase();
  return INTERFACE_LANGUAGE_MAP[normalised] ?? null;
}

function getLocalizedValue(value, languageKey) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (languageKey && typeof value[languageKey] === 'string') {
    return value[languageKey];
  }

  if (typeof value.english === 'string') {
    return value.english;
  }

  const firstString = Object.values(value).find((entry) => typeof entry === 'string');
  return firstString ?? null;
}

function formatModeDetails(mode, label) {
  if (!mode || typeof mode !== 'object') {
    return null;
  }

  const lines = [];

  if (mode.summary) {
    lines.push(`${label} summary: ${mode.summary}`);
  }
  if (mode.instructions) {
    lines.push(`${label} instructions: ${mode.instructions}`);
  }

  const followUp =
    mode.follow_up_guidance ?? mode.followUpGuidance ?? mode.follow_up ?? mode.followUp ?? null;
  if (followUp) {
    lines.push(`${label} follow-up guidance: ${followUp}`);
  }

  const minWords = mode.min_words ?? mode.minWords ?? null;
  if (minWords) {
    lines.push(`${label} minimum word expectation: ${minWords}`);
  }

  const maxTokens = mode.max_tokens ?? mode.maxTokens ?? null;
  if (maxTokens) {
    lines.push(`${label} maximum token guidance: ${maxTokens}`);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

function formatCourseSettings(settings, interfaceLanguageCode, activeMode) {
  if (!settings || typeof settings !== 'object') {
    return null;
  }

  const languageKey = mapInterfaceLanguage(interfaceLanguageCode);
  const lines = [];

  if (settings.name || settings.level || settings.language) {
    const headerParts = [];
    if (settings.name) {
      headerParts.push(`Course: ${settings.name}`);
    }
    if (settings.level) {
      headerParts.push(`Level: ${settings.level}`);
    }
    if (settings.language) {
      headerParts.push(`Primary interface language: ${settings.language}`);
    }
    lines.push(headerParts.join(' · '));
  }

  if (Array.isArray(settings.focus_skills) && settings.focus_skills.length > 0) {
    lines.push(`Focus skills: ${settings.focus_skills.join(', ')}`);
  }

  if (settings.navigation_codes?.quick_navigation) {
    lines.push(`Navigation quick codes:\n${settings.navigation_codes.quick_navigation}`);
  }

  if (settings.navigation_codes?.code_processing_rules) {
    lines.push(
      `Navigation code handling rules:\n${settings.navigation_codes.code_processing_rules}`
    );
  }

  const languageSelection = settings.startup_sequence?.language_selection_interface;
  if (languageSelection) {
    lines.push(`Language selection interface:\n${languageSelection}`);
  }

  const welcomeProtocol = getLocalizedValue(
    settings.startup_sequence?.welcome_message_protocol,
    languageKey
  );
  if (welcomeProtocol) {
    lines.push(`Welcome message protocol:\n${welcomeProtocol}`);
  }

  if (settings.consent_protocol?.content) {
    lines.push(`Consent protocol:\n${settings.consent_protocol.content}`);
  }

  if (settings.consent_protocol?.consent_processing_rules) {
    lines.push(`Consent handling rules:\n${settings.consent_protocol.consent_processing_rules}`);
  }

  const addressingPrompt = getLocalizedValue(settings.addressing_protocol, languageKey);
  if (addressingPrompt) {
    lines.push(`Addressing protocol:\n${addressingPrompt}`);
  }

  const assessmentBrief = getLocalizedValue(settings.initial_assessment_briefing, languageKey);
  if (assessmentBrief) {
    lines.push(`Initial assessment briefing:\n${assessmentBrief}`);
  }

  const mainMenu = getLocalizedValue(settings.main_menu, languageKey);
  if (mainMenu) {
    lines.push(`Main navigation menu:\n${mainMenu}`);
  }

  if (settings.help_system) {
    lines.push(`Help system overview:\n${settings.help_system}`);
  }

  if (settings.code_processing_system?.input_recognition) {
    lines.push(`Code recognition details:\n${settings.code_processing_system.input_recognition}`);
  }

  if (settings.code_processing_system?.response_format) {
    lines.push(`Code response format:\n${settings.code_processing_system.response_format}`);
  }

  if (settings.code_processing_system?.error_handling) {
    lines.push(`Code error handling:\n${settings.code_processing_system.error_handling}`);
  }

  if (settings.code_processing_system?.context_aware_restrictions) {
    lines.push(
      `Context-aware restrictions:\n${settings.code_processing_system.context_aware_restrictions}`
    );
  }

  if (settings.official_exam_specifications) {
    lines.push(`Official exam specifications:\n${settings.official_exam_specifications}`);
  }

  if (settings.official_scoring_methodology) {
    lines.push(`Official scoring methodology:\n${settings.official_scoring_methodology}`);
  }

  if (settings.session_methodology) {
    lines.push(`Session methodology:\n${settings.session_methodology}`);
  }

  if (settings.feedback_and_assessment_protocol) {
    lines.push(`Feedback and assessment protocol:\n${settings.feedback_and_assessment_protocol}`);
  }

  if (settings.quality_assurance) {
    lines.push(`Quality assurance notes:\n${settings.quality_assurance}`);
  }

  if (settings.compliance_checklist) {
    lines.push(`Compliance checklist:\n${settings.compliance_checklist}`);
  }

  const practiceDetails = formatModeDetails(settings.practice_mode, 'Practice mode');
  if (practiceDetails) {
    lines.push(practiceDetails);
  }

  const examDetails = formatModeDetails(settings.exam_mode, 'Exam mode');
  if (examDetails) {
    lines.push(examDetails);
  }

  if (activeMode && typeof activeMode === 'string') {
    const activeLabel = activeMode === 'exam' ? 'Exam mode' : 'Practice mode';
    lines.push(`Active mode for this session: ${activeLabel}.`);
  }

  return lines.length > 0 ? lines.join('\n\n') : null;
}

/**
 * Handle POST requests to the chat API
 * @param {Request} request - The request object
 * @returns {Response} - The response object
 */
export async function POST({ request }) {
  try {
    const requestBody = await request.json();
    const {
      content,
      images,
      recognizedText: clientRecognizedText,
      language,
      sessionContext,
      maxTokens,
      detailLevel,
      minWords,
      examProfile: requestExamProfile
    } = requestBody;

    // Check if a specific provider was requested (moved here to avoid reference error)
    const requestedProvider = requestBody.provider;

    // Extract session ID for language management
    const sessionId = sessionContext?.sessionId || `temp_${Date.now()}`;

    // Detect language from user message content
    let detectedLanguage = language; // Use provided language as fallback
    let languageConfidence = 0.5;

    if (content && content.trim().length > 0) {
      try {
        const languageDetection = languageDetector.detectWithConfidence(content, sessionId, {
          hasImages: !!(images && images.length > 0),
          provider: requestedProvider || 'default'
        });
        detectedLanguage = languageDetection.language;
        languageConfidence = languageDetection.confidence;

        console.log(`Language detected: ${detectedLanguage} (confidence: ${languageConfidence})`);

        // Store language preference in session context
        sessionLanguageManager.setSessionLanguage(sessionId, detectedLanguage, languageConfidence, {
          method: languageDetection.method,
          userMessage: content.substring(0, 100), // Store first 100 chars for context
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('Language detection failed, using fallback:', error);
        detectedLanguage = language || 'en';
        languageConfidence = 0.3;

        // Log detection failure
        try {
          languageConsistencyLogger.logConsistencyIssue(
            sessionId,
            'detection_failure',
            {
              errorMessage: error.message,
              severity: 'medium'
            },
            {
              provider: requestedProvider || 'default',
              messageLength: content?.length || 0
            }
          );
        } catch (logError) {
          console.warn('Failed to log detection failure:', logError);
        }
      }
    } else {
      // Try to get language from session if no content to analyze
      const sessionLanguage = sessionLanguageManager.getSessionLanguage(sessionId);
      if (sessionLanguage) {
        detectedLanguage = sessionLanguage.detectedLanguage;
        languageConfidence = sessionLanguage.confidence;
        console.log(
          `Using session language: ${detectedLanguage} (confidence: ${languageConfidence})`
        );
      }
    }

    // Log session context if available
    if (sessionContext) {
      console.info('Session context received:', {
        hasDocuments: sessionContext.documents?.length > 0,
        documentsCount: sessionContext.documents?.length || 0,
        historyCount: sessionContext.history?.length || 0,
        contextKeys: Object.keys(sessionContext.context || {})
      });
    }

    // Don't attempt OCR on server - just pass through the images
    let recognizedText = clientRecognizedText || '';
    let ocrError = null;

    // Log the request details for debugging
    console.info('Request details:', {
      contentLength: content?.length || 0,
      hasImages: !!images,
      imagesLength: images?.length || 0,
      hasRecognizedText: !!clientRecognizedText,
      recognizedTextLength: clientRecognizedText?.length || 0,
      requestBodyKeys: Object.keys(requestBody)
    });

    if (images && images.length > 0) {
      if (!clientRecognizedText) {
        // Just indicate that processing will happen client-side
        console.info('Info: Image processing will be performed in the browser');
        ocrError = 'Image processing will be performed in the browser.';
      } else {
        console.info('Info: Images attached with recognized text, using client-side OCR results');
        ocrError = null;
      }
    } else {
      // No images attached, don't add any OCR processing note
      console.info('Info: No images attached to message, skipping OCR processing');
      ocrError = null;
    }

    const sessionExamProfile = sessionContext?.context?.examProfile;
    const activeExamProfile = requestExamProfile || sessionExamProfile || null;
    const courseSettings = activeExamProfile?.settings ?? null;

    const activeModeConfig =
      activeExamProfile && activeExamProfile.mode === 'exam'
        ? activeExamProfile.exam
        : activeExamProfile?.practice;

    let adjustedMinWords = minWords;
    if (activeModeConfig?.minWords) {
      adjustedMinWords = adjustedMinWords
        ? Math.max(adjustedMinWords, activeModeConfig.minWords)
        : activeModeConfig.minWords;
    }

    let adjustedMaxTokens = maxTokens;
    if (activeModeConfig?.maxTokens) {
      adjustedMaxTokens = adjustedMaxTokens
        ? Math.max(adjustedMaxTokens, activeModeConfig.maxTokens)
        : activeModeConfig.maxTokens;
    }

    // Combine original content with recognized text, session context, and any OCR errors
    let fullContent = '';

    // Add session context if available
    if (sessionContext) {
      // Add previously uploaded documents
      if (sessionContext.documents && sessionContext.documents.length > 0) {
        fullContent += `Previous documents:\n`;
        sessionContext.documents.forEach((doc, index) => {
          if (doc.content && doc.content.processedContent && doc.content.processedContent.text) {
            fullContent += `Document ${index + 1}:\n${doc.content.processedContent.text}\n\n`;
          }
        });
      }
    }

    // Format according to the specified structure
    if (activeExamProfile) {
      const courseLine = `Exam course: ${activeExamProfile.subjectName}`;
      const level = activeExamProfile.level ? ` (Level: ${activeExamProfile.level})` : '';
      const languageLine = activeExamProfile.language
        ? `Target language: ${activeExamProfile.language}.`
        : '';
      const skillsLine =
        activeExamProfile.skills && activeExamProfile.skills.length > 0
          ? `Skills in focus: ${activeExamProfile.skills.join(', ')}.`
          : '';
      const modeLine = `Mode: ${
        activeExamProfile.mode === 'exam' ? 'Exam simulation' : 'Practice coaching'
      }.`;
      fullContent += `${courseLine}${level ? level : ''}\n${modeLine}`;
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

    fullContent += `Student question:\n${content}`;

    if (recognizedText) {
      fullContent += `\n\nExercise (from photo):\n${recognizedText}`;
    }

    // Only add OCR processing note if images are actually attached
    if (images && images.length > 0) {
      if (ocrError) {
        fullContent += `\n\n[OCR Processing Note: ${ocrError}]`;
      } else if (!recognizedText) {
        fullContent += `\n\n[OCR Processing Note: No text could be recognized in the uploaded images. The images may be unclear, contain handwriting that is difficult to read, or may not contain text.]`;
      }
    }

    // Get the LLM Provider Manager from the container
    const providerManager = container.resolve('llmProviderManager');

    // SMART LOGIC: For very short messages, check previous user messages
    // Short messages like "sí", "ok", "yes" are hard to detect reliably
    const wordCount = content.trim().split(/\s+/).length;

    if (wordCount <= 2 && languageConfidence < 0.9 && sessionContext?.history) {
      // Message is very short and confidence is not high - check history
      const userMessages = sessionContext.history.filter((msg) => msg.role === 'user');

      if (userMessages.length > 0) {
        // Get the most recent user message (not the current one)
        const previousUserMessage = userMessages[userMessages.length - 1];
        const historyDetection = languageDetector.detectLanguageFromText(
          previousUserMessage.content
        );

        if (historyDetection.confidence > 0.7) {
          console.log(
            `[Short Message] Overriding ${detectedLanguage} (${languageConfidence}) with history language ${historyDetection.language} (${historyDetection.confidence})`
          );
          detectedLanguage = historyDetection.language;
          languageConfidence = historyDetection.confidence;
        }
      }
    }

    console.log(
      `[Final Language] Using: ${detectedLanguage} (confidence: ${languageConfidence}, words: ${wordCount})`
    );

    // Create base system prompt with strong language enforcement
    const languageNames = {
      ru: 'Russian',
      es: 'Spanish',
      en: 'English',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese'
    };

    const targetLanguage = languageNames[detectedLanguage] || 'English';

    // ULTRA SIMPLE: Just tell the model to respond in the user's language
    const languageInstructions = {
      es: `Responde SOLO en español. El usuario escribe en español, tú respondes en español. Cada palabra debe ser en español.`,
      ru: `Отвечай ТОЛЬКО на русском. Пользователь пишет на русском, ты отвечаешь на русском. Каждое слово должно быть на русском.`,
      en: `Respond ONLY in English. The user writes in English, you respond in English. Every word must be in English.`,
      fr: `Réponds UNIQUEMENT en français. L'utilisateur écrit en français, tu réponds en français. Chaque mot doit être en français.`,
      de: `Antworte NUR auf Deutsch. Der Benutzer schreibt auf Deutsch, du antwortest auf Deutsch. Jedes Wort muss auf Deutsch sein.`,
      it: `Rispondi SOLO in italiano. L'utente scrive in italiano, tu rispondi in italiano. Ogni parola deve essere in italiano.`,
      pt: `Responda APENAS em português. O usuário escreve em português, você responde em português. Cada palavra deve ser em português.`
    };

    const baseSystemPrompt = `You are a helpful AI tutor.

${languageInstructions[detectedLanguage] || `Respond in ${targetLanguage}. The user is writing in ${targetLanguage}, so you must respond in ${targetLanguage}.`}

⚠️ CRITICAL CONTEXT RULE:
BEFORE answering ANY question, you MUST:
1. Read ALL previous messages in this conversation
2. Understand what topic was just discussed
3. Use that context in your answer

If the student uses a command like /explain, /test, /пример - it refers to the PREVIOUS topic in the conversation.
NEVER ignore the conversation history. ALWAYS maintain context.

IMPORTANT - COMMAND PROCESSING RULES:
The student can use special commands that start with "/" to request specific actions. These commands are CONTEXTUAL and refer to the previous conversation:

Available commands:
- /solve or /решить or /resolver: Solve the problem or equation from the previous message step by step
- /explain or /объяснить or /explicar: Explain the concept, solution, or topic from the previous message in more detail
- /check or /проверить or /verificar: Check the student's work from the previous message for errors
- /example or /пример or /ejemplo: Show an example related to the current topic or previous message
- /cheatsheet or /шпаргалка or /guía: Create a quick reference guide for the current topic
- /test or /тест or /prueba: Generate practice questions on the current topic
- /conspect or /конспект or /notas: Create study notes for the current topic
- /plan or /план: Create a study plan for the current topic
- /essay or /эссе or /ensayo: Write a COMPLETE essay (not instructions) on the current topic. You must write the actual essay text, not explain how to write it.

CRITICAL COMMAND CONTEXT RULES:
⚠️ BEFORE ANSWERING ANY COMMAND, YOU MUST:
1. READ THE ENTIRE CONVERSATION HISTORY ABOVE
2. IDENTIFY THE LAST TOPIC OR QUESTION DISCUSSED
3. APPLY THE COMMAND TO THAT TOPIC

When a student uses a command, it ALWAYS refers to the PREVIOUS message or conversation context:

Example 1:
- Student: "теория струн"
- You: [explain string theory]
- Student: "/explain"
- You MUST: Explain string theory in MORE DETAIL (the topic from previous message)

Example 2:
- Student: "2x + 5 = 15"
- You: [provide solution]
- Student: "/пример"
- You MUST: Give an example similar to "2x + 5 = 15" (the problem from previous message)

Example 3:
- Student: "квантовая механика"
- You: [explain quantum mechanics]
- Student: "/тест"
- You MUST: Create a test about quantum mechanics (the topic from previous message)

Example 4 (ESSAY command):
- Student: "теория струн"
- You: [explain string theory]
- Student: "/эссе"
- You MUST: Write a COMPLETE essay about string theory (NOT instructions on how to write it)
- WRONG: "Для написания эссе о теории струн, ты можешь рассмотреть..."
- CORRECT: "Теория струн: революция в современной физике\n\nТеория струн представляет собой..."

⚠️ CRITICAL: Commands without additional text ALWAYS refer to the IMMEDIATELY PREVIOUS topic in the conversation.
⚠️ NEVER ask "what topic?" - ALWAYS look at the conversation history first!
⚠️ For /essay or /эссе: WRITE THE ACTUAL ESSAY, not instructions!

SMART CONTEXT AWARENESS:
7. If a student just discussed topic A in detail, and then uses a command about topic B:
   - You MAY briefly acknowledge topic A and offer to work on it instead
   - Example: "I see you want an essay about [topic B]. I also noticed you just wrote detailed notes about [topic A]. Would you like me to write about [topic A] instead, or shall I proceed with [topic B]?"
   - Keep this suggestion brief and friendly, don't insist
   - If the student clearly wants topic B, proceed with topic B
8. Be contextually aware but respect the student's explicit request

Student question:
[The student's current question about their exercise or homework]

Previous documents:
[Text extracted from previously uploaded documents]

Exercise (from photo):
[Text extracted from the uploaded image]

Your task:
1. Use the previous documents and conversation history to maintain context throughout the conversation.
2. If the student uses a command (starts with /), check the previous messages to understand the context.
3. Analyze the student's question, any previous documents, and the exercise text from the photo.
4. Provide a helpful, educational response that addresses the student's specific question about the exercise.
5. If the student is asking a follow-up question about a previously uploaded document, refer to that document in your response.
6. If there are OCR processing notes indicating errors or issues with text recognition, acknowledge these issues in your response.
7. If the text recognition was incomplete or unclear, ask the user if they would like to try uploading a clearer image or typing the text manually.
8. Always be helpful and supportive, even if the text recognition was not perfect.
9. IMPORTANT: If you see a note about "Image processing will be performed in the browser", this means the image is already uploaded and is being processed. Respond with: "I can see you've uploaded an image. I'll analyze the content once the image processing is complete. Please wait a moment."
10. CRITICAL: If there are NO images attached to the message (i.e., no OCR Processing Note is present), do NOT mention image processing or image analysis in your response. Only mention images if they are actually present in the user's message.`;

    // Check if there were previous language inconsistencies for this session
    const sessionLanguageState = sessionLanguageManager.getSessionLanguage(sessionId);
    const hasLanguageMixing =
      sessionLanguageState?.validationHistory?.some((v) => !v.isValid) || false;

    // Enhance system prompt with language constraints based on confidence and history
    // Always use 'ultra_strong' enforcement level to prevent language switching
    const enhancedSystemPrompt = promptEnhancer.enhanceSystemPrompt(
      baseSystemPrompt,
      detectedLanguage,
      languageConfidence,
      { hasLanguageMixing, enhancementLevel: 'ultra_strong' }
    );

    // Prepare the messages for the LLM
    const messages = [
      {
        role: 'system',
        content: enhancedSystemPrompt
      }
    ];

    // Add conversation history as individual messages (limited to recent messages)
    if (sessionContext?.history && sessionContext.history.length > 0) {
      // Determine max history based on provider
      const isOllamaProvider =
        !requestedProvider ||
        requestedProvider === 'ollama' ||
        PROVIDER_CONFIG.DEFAULT_PROVIDER === 'ollama';

      const maxHistoryMessages = isOllamaProvider
        ? parseInt(import.meta.env.VITE_OLLAMA_MAX_HISTORY_MESSAGES || '16', 10)
        : OPENAI_CONFIG.MAX_HISTORY_MESSAGES;

      // Take only the most recent messages to avoid exceeding context window
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

    if (activeExamProfile) {
      // Inject fully formatted universal exam settings (if provided)
      const formattedSettings = formatCourseSettings(
        courseSettings,
        language,
        activeExamProfile.mode
      );
      if (formattedSettings) {
        messages.push({ role: 'system', content: formattedSettings });
      }

      const skillFocus =
        activeExamProfile.skills && activeExamProfile.skills.length > 0
          ? `Focus skills: ${activeExamProfile.skills.join(', ')}`
          : null;
      const examSystemLines = [
        `Learner is preparing for ${activeExamProfile.subjectName}${
          activeExamProfile.level ? ` (${activeExamProfile.level})` : ''
        }.`,
        activeExamProfile.language ? `Target language: ${activeExamProfile.language}.` : null,
        `Mode: ${activeExamProfile.mode === 'exam' ? 'Exam simulation' : 'Practice workshop'}.`,
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

    // Add language instruction directly in user message
    const userLanguageInstruction = {
      es: `[Responde en español]\n\n`,
      ru: `[Отвечай на русском]\n\n`,
      en: `[Respond in English]\n\n`,
      fr: `[Réponds en français]\n\n`,
      de: `[Antworte auf Deutsch]\n\n`,
      it: `[Rispondi in italiano]\n\n`,
      pt: `[Responda em português]\n\n`
    };

    const languageInstruction = userLanguageInstruction[detectedLanguage] || '';

    // Add the current user question
    // If images are provided, format message for vision models
    if (images && images.length > 0) {
      console.log('[Vision] Using vision model for image analysis');
      const userMessage = {
        role: 'user',
        content: [
          {
            type: 'text',
            text: languageInstruction + fullContent
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

      messages.push(userMessage);
    } else {
      // Text-only message - add language instruction to user message
      let userContent = languageInstruction + fullContent;

      // If this is a command, add explicit context reminder
      if (fullContent.trim().startsWith('/')) {
        const contextReminder = `\n\n⚠️ IMPORTANT: This is a COMMAND. Look at the conversation history above to understand what topic it refers to. Apply this command to the PREVIOUS topic discussed.`;
        userContent = userContent + contextReminder;
      }

      messages.push({ role: 'user', content: userContent });
    }

    // Simple reminder in the target language
    const simpleReminders = {
      es: `Responde en español.`,
      ru: `Отвечай на русском.`,
      en: `Respond in English.`,
      fr: `Réponds en français.`,
      de: `Antworte auf Deutsch.`,
      it: `Rispondi in italiano.`,
      pt: `Responda em português.`
    };

    messages.push({
      role: 'system',
      content: simpleReminders[detectedLanguage] || `Respond in ${targetLanguage}.`
    });

    // SIMPLIFIED: Don't use PromptEnhancer - keep it simple
    const enhancedMessages = messages;

    // Add agent-specific system prompt if available from course/session context
    // This allows each course to define its own AI tutor personality and instructions
    const agentInstructions =
      sessionContext?.context?.agentInstructions || activeExamProfile?.agentInstructions || null;

    // Add language instruction directly into the base prompt
    const languagePrefix = {
      es: `RESPONDE EN ESPAÑOL.\n\n`,
      ru: `ОТВЕЧАЙ НА РУССКОМ.\n\n`,
      en: `RESPOND IN ENGLISH.\n\n`,
      fr: `RÉPONDS EN FRANÇAIS.\n\n`,
      de: `ANTWORTE AUF DEUTSCH.\n\n`,
      it: `RISPONDI IN ITALIANO.\n\n`,
      pt: `RESPONDA EM PORTUGUÊS.\n\n`
    };

    if (agentInstructions) {
      // Use course-specific agent instructions with language prefix
      enhancedMessages.unshift({
        role: 'system',
        content:
          (languagePrefix[detectedLanguage] || `RESPOND IN ${targetLanguage.toUpperCase()}.\n\n`) +
          agentInstructions
      });
    } else {
      // Fallback to default educational tutor prompt with language prefix
      enhancedMessages.unshift({
        role: 'system',
        content:
          (languagePrefix[detectedLanguage] || `RESPOND IN ${targetLanguage.toUpperCase()}.\n\n`) +
          `You are a helpful AI tutor assistant.

Your role is to:
- Provide clear, accurate, and educational responses
- Explain concepts in a way that's easy to understand
- Be patient and supportive
- Use examples when helpful

Maintain a friendly and encouraging tone.`
      });
    }

    if (detailLevel === 'detailed') {
      enhancedMessages.unshift({
        role: 'system',
        content:
          'The student requested a detailed explanation. Respond comprehensively with background, step-by-step reasoning, and relevant examples.'
      });
    }

    if (adjustedMinWords) {
      enhancedMessages.unshift({
        role: 'system',
        content: `The student expects a detailed essay of at least ${adjustedMinWords} words. Do not stop early.`
      });
    }

    // One final simple reminder
    const finalReminders = {
      es: `Tu respuesta: 100% español.`,
      ru: `Твой ответ: 100% русский.`,
      en: `Your response: 100% English.`,
      fr: `Ta réponse: 100% français.`,
      de: `Deine Antwort: 100% Deutsch.`,
      it: `La tua risposta: 100% italiano.`,
      pt: `Sua resposta: 100% português.`
    };

    enhancedMessages.push({
      role: 'system',
      content: finalReminders[detectedLanguage] || `Your response: 100% ${targetLanguage}.`
    });

    // Options for the LLM request
    const options = {
      temperature: OPENAI_CONFIG.TEMPERATURE,
      maxTokens:
        adjustedMaxTokens && adjustedMaxTokens > OPENAI_CONFIG.MAX_TOKENS
          ? Math.min(adjustedMaxTokens, OPENAI_CONFIG.DETAILED_MAX_TOKENS)
          : adjustedMaxTokens || OPENAI_CONFIG.MAX_TOKENS
    };

    // If a specific provider was requested and provider switching is enabled, use it
    if (requestedProvider && LLM_FEATURES.ENABLE_PROVIDER_SWITCHING) {
      options.provider = requestedProvider;
      console.info(`Using requested provider: ${requestedProvider}`);
    }

    // If a specific model was requested, use it
    if (requestBody.model) {
      options.model = requestBody.model;
      console.info(`Using requested model: ${requestBody.model}`);
    }

    // Special handling for Ollama - add extra language enforcement
    // Small models like qwen2.5:1.5b need very explicit instructions
    const isOllama =
      !requestedProvider ||
      requestedProvider === 'ollama' ||
      PROVIDER_CONFIG.DEFAULT_PROVIDER === 'ollama';

    if (isOllama) {
      // For Ollama, add a very simple, direct instruction at the very end
      const ollamaLanguageMap = {
        es: 'español',
        ru: 'русский',
        en: 'English',
        fr: 'français',
        de: 'Deutsch',
        it: 'italiano',
        pt: 'português'
      };

      const targetLangName = ollamaLanguageMap[detectedLanguage] || targetLanguage;

      // Add as the absolute last message before generation
      enhancedMessages.push({
        role: 'system',
        content: `Language: ${targetLangName}`
      });

      console.log(`[Ollama] Added extra language enforcement: ${targetLangName}`);
    }

    console.log(
      `[Language Enforcement] Generating response in ${targetLanguage} (${detectedLanguage}) with ${enhancedMessages.filter((m) => m.role === 'system').length} system messages`
    );

    // Log first system message to verify language instruction is first
    const firstSystemMsg = enhancedMessages.find((m) => m.role === 'system');
    if (firstSystemMsg) {
      console.log(`[First System Message] ${firstSystemMsg.content.substring(0, 100)}...`);
    }

    // Generate completion using the provider manager with automatic enhancement
    const result = await providerManager.generateChatCompletionWithEnhancement(
      enhancedMessages,
      options
    );

    // Log which provider was used
    console.info(`Response generated using provider: ${result.provider}, model: ${result.model}`);

    // Log math enhancement if applied
    if (result.enhanced) {
      console.info(
        `Math enhancement applied - Category: ${result.classification?.category}, Confidence: ${result.classification?.confidence}`
      );
    }

    // Extract the response content
    let aiResponse = result.content;

    // Validate response language consistency
    try {
      const validationResult = languageDetector.validateLanguageConsistency(
        aiResponse,
        detectedLanguage,
        sessionId,
        {
          provider: result.provider,
          model: result.model,
          responseLength: aiResponse?.length || 0
        }
      );

      // Log validation result for monitoring
      console.log(`Language validation: ${validationResult.isConsistent ? 'PASS' : 'FAIL'}`, {
        sessionId,
        expectedLanguage: detectedLanguage,
        detectedLanguage: validationResult.detectedLanguage,
        confidence: validationResult.confidence,
        severity: validationResult.severity,
        recommendation: validationResult.recommendation
      });

      // Add validation result to session history
      sessionLanguageManager.addValidationResult(sessionId, validationResult);

      // Handle validation failures
      if (!validationResult.isConsistent && validationResult.severity === 'high') {
        console.warn(`High severity language inconsistency detected in session ${sessionId}:`, {
          expected: detectedLanguage,
          detected: validationResult.detectedLanguage,
          confidence: validationResult.confidence,
          recommendation: validationResult.recommendation
        });

        // For high severity issues, we could regenerate the response or return an error
        // For now, we'll log the issue and continue with the original response
        // In a future enhancement, we could implement automatic regeneration here

        if (validationResult.recommendation === 'regenerate') {
          // Log that regeneration is recommended but not implemented yet
          console.warn(
            `Response regeneration recommended but not implemented for session ${sessionId}`
          );

          // Log the regeneration recommendation as a consistency issue
          try {
            languageConsistencyLogger.logConsistencyIssue(
              sessionId,
              'regeneration_recommended',
              {
                expectedLanguage: detectedLanguage,
                detectedLanguage: validationResult.detectedLanguage,
                confidence: validationResult.confidence,
                severity: validationResult.severity,
                recommendation: validationResult.recommendation
              },
              {
                provider: result.provider,
                model: result.model,
                responseLength: aiResponse?.length || 0
              }
            );
          } catch (logError) {
            console.warn('Failed to log regeneration recommendation:', logError);
          }
        }
      }

      // For medium severity issues, just log for monitoring
      if (!validationResult.isConsistent && validationResult.severity === 'medium') {
        console.info(`Medium severity language inconsistency detected in session ${sessionId}`, {
          expected: detectedLanguage,
          detected: validationResult.detectedLanguage
        });
      }
    } catch (validationError) {
      console.error('Language validation failed:', validationError);

      // Log validation failure as a consistency issue
      try {
        languageConsistencyLogger.logConsistencyIssue(
          sessionId,
          'validation_error',
          {
            errorMessage: validationError.message,
            severity: 'high'
          },
          {
            provider: result.provider,
            model: result.model,
            responseLength: aiResponse?.length || 0
          }
        );
      } catch (logError) {
        console.warn('Failed to log validation error:', logError);
      }

      // Continue with original response if validation fails
    }

    // Include provider information in the response (if in development mode or provider switching is enabled)
    const includeProviderInfo = import.meta.env.DEV || LLM_FEATURES.ENABLE_PROVIDER_SWITCHING;

    return json({
      response: aiResponse,
      ocrText: recognizedText,
      ...(activeExamProfile && { examProfile: activeExamProfile }),
      ...(includeProviderInfo && {
        provider: {
          name: result.provider,
          model: result.model
        }
      })
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });

    // Provide more specific error messages based on the error type
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error.message?.includes?.('API key')) {
      errorMessage = 'API configuration error';
    } else if (error.message?.includes?.('timed out')) {
      errorMessage = 'Request timed out';
      statusCode = 504;
    } else if (
      error.message?.includes?.('not running') ||
      error.message?.includes?.('not accessible')
    ) {
      errorMessage = 'Local LLM service is not available';
      statusCode = 503;
    }

    // In development, include error details
    if (import.meta.env.DEV) {
      return json(
        {
          error: errorMessage,
          details: error.message,
          stack: error.stack
        },
        { status: statusCode }
      );
    }

    return json({ error: errorMessage }, { status: statusCode });
  }
}
