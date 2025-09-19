import { json } from '@sveltejs/kit';
import { container } from '$lib/shared/di/container';
import { OPENAI_CONFIG } from '$lib/config/api';
import { LLM_FEATURES } from '$lib/config/llm';

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

function formatSubjectSettings(settings, interfaceLanguageCode, activeMode) {
  if (!settings || typeof settings !== 'object') {
    return null;
  }

  const languageKey = mapInterfaceLanguage(interfaceLanguageCode);
  const lines = {};

  const out = [];

  if (settings.name || settings.level || settings.language) {
    const headerParts = [];
    if (settings.name) {
      headerParts.push(`Subject: ${settings.name}`);
    }
    if (settings.level) {
      headerParts.push(`Level: ${settings.level}`);
    }
    if (settings.language) {
      headerParts.push(`Primary interface language: ${settings.language}`);
    }
    out.push(headerParts.join(' · '));
  }

  if (Array.isArray(settings.focus_skills) && settings.focus_skills.length > 0) {
    out.push(`Focus skills: ${settings.focus_skills.join(', ')}`);
  }

  if (settings.navigation_codes?.quick_navigation) {
    out.push(`Navigation quick codes:\n${settings.navigation_codes.quick_navigation}`);
  }

  if (settings.navigation_codes?.code_processing_rules) {
    out.push(
      `Navigation code handling rules:\n${settings.navigation_codes.code_processing_rules}`
    );
  }

  const languageSelection = settings.startup_sequence?.language_selection_interface;
  if (languageSelection) {
    out.push(`Language selection interface:\n${languageSelection}`);
  }

  const welcomeProtocol = getLocalizedValue(
    settings.startup_sequence?.welcome_message_protocol,
    languageKey
  );
  if (welcomeProtocol) {
    out.push(`Welcome message protocol:\n${welcomeProtocol}`);
  }

  if (settings.consent_protocol?.content) {
    out.push(`Consent protocol:\n${settings.consent_protocol.content}`);
  }

  if (settings.consent_protocol?.consent_processing_rules) {
    out.push(`Consent handling rules:\n${settings.consent_protocol.consent_processing_rules}`);
  }

  const addressingPrompt = getLocalizedValue(settings.addressing_protocol, languageKey);
  if (addressingPrompt) {
    out.push(`Addressing protocol:\n${addressingPrompt}`);
  }

  const assessmentBrief = getLocalizedValue(settings.initial_assessment_briefing, languageKey);
  if (assessmentBrief) {
    out.push(`Initial assessment briefing:\n${assessmentBrief}`);
  }

  const mainMenu = getLocalizedValue(settings.main_menu, languageKey);
  if (mainMenu) {
    out.push(`Main navigation menu:\n${mainMenu}`);
  }

  if (settings.help_system) {
    out.push(`Help system overview:\n${settings.help_system}`);
  }

  if (settings.code_processing_system?.input_recognition) {
    out.push(`Code recognition details:\n${settings.code_processing_system.input_recognition}`);
  }

  if (settings.code_processing_system?.response_format) {
    out.push(`Code response format:\n${settings.code_processing_system.response_format}`);
  }

  if (settings.code_processing_system?.error_handling) {
    out.push(`Code error handling:\n${settings.code_processing_system.error_handling}`);
  }

  if (settings.code_processing_system?.context_aware_restrictions) {
    out.push(
      `Context-aware restrictions:\n${settings.code_processing_system.context_aware_restrictions}`
    );
  }

  if (settings.official_exam_specifications) {
    out.push(`Official exam specifications:\n${settings.official_exam_specifications}`);
  }

  if (settings.official_scoring_methodology) {
    out.push(`Official scoring methodology:\n${settings.official_scoring_methodology}`);
  }

  if (settings.session_methodology) {
    out.push(`Session methodology:\n${settings.session_methodology}`);
  }

  if (settings.feedback_and_assessment_protocol) {
    out.push(`Feedback and assessment protocol:\n${settings.feedback_and_assessment_protocol}`);
  }

  if (settings.quality_assurance) {
    out.push(`Quality assurance notes:\n${settings.quality_assurance}`);
  }

  if (settings.compliance_checklist) {
    out.push(`Compliance checklist:\n${settings.compliance_checklist}`);
  }

  const practiceDetails = formatModeDetails(settings.practice_mode, 'Practice mode');
  if (practiceDetails) {
    out.push(practiceDetails);
  }

  const examDetails = formatModeDetails(settings.exam_mode, 'Exam mode');
  if (examDetails) {
    out.push(examDetails);
  }

  if (activeMode && typeof activeMode === 'string') {
    const activeLabel = activeMode === 'exam' ? 'Exam mode' : 'Practice mode';
    out.push(`Active mode for this session: ${activeLabel}.`);
  }

  return out.length > 0 ? out.join('\n\n') : null;
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
    const subjectSettings = activeExamProfile?.settings ?? null;

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
      const subjectLine = `Exam subject: ${activeExamProfile.subjectName}`;
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
      fullContent += `${subjectLine}${level ? level : ''}\n${modeLine}`;
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

    // Check if a specific provider was requested
    const requestedProvider = requestBody.provider;

    // Prepare the messages for the LLM
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI tutor. Respond in ${language || 'English'}.

Use the prior conversation messages and any provided documents to maintain context.

Student question:
[The student's current question about their exercise or homework]

Previous documents:
[Text extracted from previously uploaded documents]

Exercise (from photo):
[Text extracted from the uploaded image]

Your task:
1. Use the previous documents and conversation history to maintain context throughout the conversation.
2. Analyze the student's question, any previous documents, and the exercise text from the photo.
3. Provide a helpful, educational response that addresses the student's specific question about the exercise.
4. If the student is asking a follow-up question about a previously uploaded document, refer to that document in your response.
5. If there are OCR processing notes indicating errors or issues with text recognition, acknowledge these issues in your response.
6. If the text recognition was incomplete or unclear, ask the user if they would like to try uploading a clearer image or typing the text manually.
7. Always be helpful and supportive, even if the text recognition was not perfect.
8. IMPORTANT: If you see a note about "Image processing will be performed in the browser", this means the image is already uploaded and is being processed. Respond with: "I can see you've uploaded an image. I'll analyze the content once the image processing is complete. Please wait a moment."
9. CRITICAL: If there are NO images attached to the message (i.e., no OCR Processing Note is present), do NOT mention image processing or image analysis in your response. Only mention images if they are actually present in the user's message.`
      }
    ];

    // Add conversation history as individual messages
    if (sessionContext?.history && sessionContext.history.length > 0) {
      sessionContext.history.forEach((entry) => {
        messages.push({ role: entry.role, content: entry.content });
      });
    }

    if (activeExamProfile) {
      // Inject fully formatted universal exam settings (if provided)
      const formattedSettings = formatSubjectSettings(
        subjectSettings,
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

    // Add the current user question
    messages.push({ role: 'user', content: fullContent });

    if (detailLevel === 'detailed') {
      messages.unshift({
        role: 'system',
        content:
          'The student requested a detailed explanation. Respond comprehensively with background, step-by-step reasoning, and relevant examples.'
      });
    }

    if (adjustedMinWords) {
      messages.unshift({
        role: 'system',
        content: `The student expects a detailed essay of at least ${adjustedMinWords} words. Do not stop early.`
      });
    }

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

    // Generate completion using the provider manager
    const result = await providerManager.generateChatCompletion(messages, options);

    // Log which provider was used
    console.info(`Response generated using provider: ${result.provider}, model: ${result.model}`);

    // Extract the response content
    const aiResponse = result.content;

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

    return json({ error: errorMessage }, { status: statusCode });
  }
}
