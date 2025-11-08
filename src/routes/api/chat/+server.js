import { json } from '@sveltejs/kit';
import { container } from '$lib/shared/di/container';
import { OPENAI_CONFIG } from '$lib/config/api';
import { languageDetector } from '$lib/modules/chat/LanguageDetector.js';
import { sessionLanguageManager } from '$lib/modules/chat/SessionLanguageManager.js';
import { promptEnhancer } from '$lib/modules/chat/PromptEnhancer.js';
import { languageConsistencyLogger } from '$lib/modules/chat/LanguageConsistencyLogger.js';

// Import refactored services
import { ContentFormatterService } from '$lib/modules/chat/services/ContentFormatterService.js';
import { RequestValidatorService } from '$lib/modules/chat/services/RequestValidatorService.js';
import { PromptBuilderService } from '$lib/modules/chat/services/PromptBuilderService.js';
import { LanguageManagementService } from '$lib/modules/chat/services/LanguageManagementService.js';
import { ResponseBuilderService } from '$lib/modules/chat/services/ResponseBuilderService.js';
import { ErrorHandlerService } from '$lib/modules/chat/services/ErrorHandlerService.js';

// Instantiate services (singleton pattern)
const contentFormatter = new ContentFormatterService();
const requestValidator = new RequestValidatorService();
const promptBuilder = new PromptBuilderService(contentFormatter);
const languageManager = new LanguageManagementService(
  languageDetector,
  sessionLanguageManager,
  languageConsistencyLogger
);
const responseBuilder = new ResponseBuilderService();
const errorHandler = new ErrorHandlerService();

/**
 * Handle POST requests to the chat API
 * @param {Request} request - The request object
 * @param {Object} locals - SvelteKit locals object
 * @returns {Response} - The response object
 */
export async function POST({ request, locals }) {
  try {
    // 0. Check authentication (backward compatibility)
    if (!locals.user) {
      return json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // 1. Parse and validate request
    const requestBody = await request.json();

    console.log('[API /chat] Received request:', {
      content: requestBody.content?.substring(0, 50),
      hasImages: requestBody.images?.length > 0,
      imagesCount: requestBody.images?.length,
      language: requestBody.language,
      provider: requestBody.provider,
      model: requestBody.model,
      hasSessionContext: !!requestBody.sessionContext,
      recognizedText: requestBody.recognizedText?.substring(0, 50),
      allKeys: Object.keys(requestBody)
    });

    // Backward compatibility: map old field names to new ones
    if (requestBody.message && !requestBody.content) {
      requestBody.content = requestBody.message;
    }
    if (requestBody.sessionId && !requestBody.sessionContext) {
      requestBody.sessionContext = { sessionId: requestBody.sessionId };
    }

    const validation = requestValidator.validateRequest(requestBody);

    if (!validation.valid) {
      console.error('[API /chat] Validation failed:', validation.error);
      console.error('[API /chat] Request body keys:', Object.keys(requestBody));
      console.error('[API /chat] Images info:', {
        hasImages: !!requestBody.images,
        isArray: Array.isArray(requestBody.images),
        length: requestBody.images?.length,
        firstImageType: requestBody.images?.[0]?.substring(0, 30)
      });
      return json({ success: false, error: validation.error }, { status: 400 });
    }

    console.log('[API /chat] Validation passed');

    const normalized = validation.normalized;
    const {
      content,
      images,
      recognizedText,
      language,
      languageConfirmed,
      sessionContext,
      maxTokens,
      detailLevel,
      minWords,
      examProfile: requestExamProfile,
      provider: requestedProvider,
      model: requestedModel
    } = normalized;

    // Extract session ID for language management
    // sessionId can come from sessionContext.sessionId (old format) or be generated
    const sessionId = sessionContext?.sessionId || `temp_${Date.now()}`;

    // 2. Detect and manage language
    let detectedLanguage;
    let languageConfidence;

    console.log('[API /chat] Language detection params:', {
      languageConfirmed,
      providedLanguage: language,
      contentLength: content?.length,
      recognizedTextLength: recognizedText?.length
    });

    // If language is confirmed (e.g., from Voice mode waiting phrase), use it directly
    if (languageConfirmed && language) {
      detectedLanguage = language;
      languageConfidence = 1.0;
      console.log(
        `[Language] Using confirmed language: ${detectedLanguage} (confidence: 1.0, SKIPPING re-detection)`
      );
    } else {
      // Otherwise, detect language from content
      const languageDetection = languageManager.detectLanguage({
        content,
        sessionId,
        fallbackLanguage: language,
        images,
        provider: requestedProvider
      });

      detectedLanguage = languageDetection.language;
      languageConfidence = languageDetection.confidence;
    }

    // Handle short messages with conversation history fallback
    // Skip this if language is already confirmed
    if (!languageConfirmed) {
      const shortMessageResult = languageManager.handleShortMessage({
        content,
        detectedLanguage,
        languageConfidence,
        sessionContext
      });

      if (shortMessageResult.adjusted) {
        detectedLanguage = shortMessageResult.language;
        languageConfidence = shortMessageResult.confidence;
      }
    }

    console.log(
      `[Final Language] Using: ${detectedLanguage} (confidence: ${languageConfidence}, words: ${content.trim().split(/\s+/).length})`
    );

    // 3. Process exam profile and mode configuration
    const sessionExamProfile = sessionContext?.context?.examProfile;
    const activeExamProfile = requestExamProfile || sessionExamProfile || null;
    const activeModeConfig =
      activeExamProfile && activeExamProfile.mode === 'exam'
        ? activeExamProfile.exam
        : activeExamProfile?.practice;

    // Adjust min words and max tokens based on mode configuration
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

    // 4. Handle OCR processing note
    let ocrError = null;
    if (images && images.length > 0) {
      if (!recognizedText) {
        console.info('Info: Image processing will be performed in the browser');
        ocrError = 'Image processing will be performed in the browser.';
      } else {
        console.info('Info: Images attached with recognized text, using client-side OCR results');
      }
    }

    // 5. Build prompt content
    const fullContent = promptBuilder.buildPromptContent({
      content,
      recognizedText,
      images,
      sessionContext,
      examProfile: activeExamProfile,
      ocrError
    });

    // 6. Get language instructions and build system prompt
    const languageInstructions = languageManager.getLanguageInstructions(detectedLanguage);
    const baseSystemPrompt = languageInstructions.instruction;

    console.log(
      '[API /chat] Language instructions for',
      detectedLanguage,
      ':',
      languageInstructions.instruction.substring(0, 100)
    );

    // Enhance system prompt with language constraints
    const enhancedSystemPrompt = promptEnhancer.enhanceSystemPrompt(
      baseSystemPrompt,
      detectedLanguage,
      languageConfidence,
      {
        hasLanguageMixing:
          sessionLanguageManager
            .getSessionLanguage(sessionId)
            ?.validationHistory?.some((v) => !v.isValid) || false,
        enhancementLevel: 'ultra_strong'
      }
    );

    console.log('[API /chat] Enhanced system prompt:', enhancedSystemPrompt.substring(0, 200));

    // Get agent instructions from session context
    const agentInstructions =
      sessionContext?.context?.agentInstructions || activeExamProfile?.agentInstructions || null;

    // 7. Build complete messages array
    const messages = promptBuilder.buildMessages({
      systemPrompt: enhancedSystemPrompt,
      fullContent,
      images,
      sessionContext,
      detectedLanguage,
      requestedProvider,
      examProfile: activeExamProfile,
      language,
      detailLevel,
      adjustedMinWords,
      agentInstructions
    });

    // 8. Prepare LLM request options
    const options = {
      temperature: OPENAI_CONFIG.TEMPERATURE,
      maxTokens:
        adjustedMaxTokens && adjustedMaxTokens > OPENAI_CONFIG.MAX_TOKENS
          ? Math.min(adjustedMaxTokens, OPENAI_CONFIG.DETAILED_MAX_TOKENS)
          : adjustedMaxTokens || OPENAI_CONFIG.MAX_TOKENS
    };

    if (requestedProvider) {
      options.provider = requestedProvider;
      console.info(`Using requested provider: ${requestedProvider}`);
    }

    if (requestedModel) {
      options.model = requestedModel;
      console.info(`Using requested model: ${requestedModel}`);
    }

    console.log(
      `[Language Enforcement] Generating response in ${languageInstructions.targetLanguage} (${detectedLanguage}) with ${messages.filter((m) => m.role === 'system').length} system messages`
    );

    // Log first system message to verify language instruction
    const firstSystemMsg = messages.find((m) => m.role === 'system');
    if (firstSystemMsg) {
      console.log(`[First System Message] ${firstSystemMsg.content.substring(0, 100)}...`);
    }

    // 9. Generate completion using provider manager
    const providerManager = container.resolve('llmProviderManager');

    // Check if streaming is requested (Requirement 1.1, 8.2)
    const streamRequested = requestBody.stream === true;

    if (streamRequested) {
      // Return streaming response (Requirement 1.1)
      console.log('[API /chat] Streaming mode enabled');

      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              let fullResponse = '';
              let chunkCount = 0;
              const streamStartTime = Date.now();

              // Use streaming completion with onChunk callback
              await providerManager.generateChatCompletionWithEnhancement(messages, {
                ...options,
                stream: true,
                onChunk: (chunk) => {
                  try {
                    // Send chunk to client (Requirement 1.1)
                    fullResponse += chunk;
                    chunkCount++;
                    controller.enqueue(new TextEncoder().encode(chunk));
                  } catch (chunkError) {
                    // Log chunk processing error but continue (Requirement 7.3)
                    console.error('[API /chat] Error processing chunk:', {
                      error: chunkError.message,
                      chunkNumber: chunkCount,
                      timestamp: new Date().toISOString()
                    });
                  }
                }
              });

              controller.close();

              // Log completion with metrics (Requirement 7.2)
              const streamDuration = Date.now() - streamStartTime;
              console.log('[API /chat] Streaming completed:', {
                totalLength: fullResponse.length,
                chunkCount,
                duration: `${streamDuration}ms`,
                avgChunkSize: chunkCount > 0 ? Math.round(fullResponse.length / chunkCount) : 0,
                timestamp: new Date().toISOString()
              });
            } catch (error) {
              // Log detailed error context server-side (Requirement 7.3)
              console.error('[API /chat] Streaming error:', {
                errorType: error.name,
                errorMessage: error.message,
                stack: error.stack,
                userId: locals.user?.id,
                sessionId: sessionContext?.sessionId,
                language: detectedLanguage,
                provider: options.provider,
                model: options.model,
                timestamp: new Date().toISOString()
              });

              // Sanitize error message for client (Requirement 7.3)
              const sanitizedError = error.message.includes('API key')
                ? 'Authentication error with AI provider'
                : error.message.includes('rate limit')
                  ? 'Service temporarily unavailable due to high demand'
                  : error.message.includes('timeout')
                    ? 'Request timed out, please try again'
                    : 'An error occurred while streaming the response';

              // Send error to client
              try {
                controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${sanitizedError}]`));
              } catch (enqueueError) {
                console.error('[API /chat] Failed to send error to client:', enqueueError);
              }

              controller.error(new Error(sanitizedError));
            }
          }
        }),
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked'
          }
        }
      );
    }

    // Non-streaming mode (existing behavior, backward compatibility)
    const result = await providerManager.generateChatCompletionWithEnhancement(messages, options);

    console.info(`Response generated using provider: ${result.provider}, model: ${result.model}`);

    if (result.enhanced) {
      console.info(
        `Math enhancement applied - Category: ${result.classification?.category}, Confidence: ${result.classification?.confidence}`
      );
    }

    // 10. Validate response language consistency
    const aiResponse = result.content;
    languageManager.validateResponseLanguage({
      aiResponse,
      expectedLanguage: detectedLanguage,
      sessionId,
      metadata: {
        provider: result.provider,
        model: result.model,
        responseLength: aiResponse?.length || 0
      }
    });

    // 11. Build and return success response
    const successResponse = responseBuilder.buildSuccessResponse({
      aiResponse,
      recognizedText,
      examProfile: activeExamProfile,
      providerInfo: {
        name: result.provider,
        model: result.model
      },
      llmMetadata: result.llmMetadata
    });

    // Add success field for backward compatibility
    return json({ success: true, ...successResponse });
  } catch (error) {
    // Handle errors using error handler service
    const handledError = errorHandler.handleError(error, {
      endpoint: '/api/chat',
      method: 'POST'
    });

    const errorResponse = responseBuilder.buildErrorResponse({
      error: handledError.originalError,
      context: 'chat processing'
    });

    // Add success field for backward compatibility
    return json(
      { success: false, ...errorResponse.response },
      { status: errorResponse.statusCode }
    );
  }
}
