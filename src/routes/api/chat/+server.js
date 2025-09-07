import { json } from '@sveltejs/kit';
import { container } from '$lib/shared/di/container';
import { OPENAI_CONFIG } from '$lib/config/api';
import { LLM_FEATURES } from '$lib/config/llm';

/**
 * Handle POST requests to the chat API
 * @param {Request} request - The request object
 * @returns {Response} - The response object
 */
export async function POST({ request }) {
  try {
    const requestBody = await request.json();
    const { content, images, recognizedText: clientRecognizedText, language, sessionContext } = requestBody;

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

      // Add conversation history
      if (sessionContext.history && sessionContext.history.length > 0) {
        fullContent += `Conversation history:\n`;
        sessionContext.history.forEach(entry => {
          fullContent += `${entry.role === 'user' ? 'Student' : 'Tutor'}: ${entry.content}\n`;
        });
        fullContent += `\n`;
      }
    }

    // Format according to the specified structure
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

You will receive input in this format:

Previous documents:
[Text extracted from previously uploaded documents]

Conversation history:
Student: [Previous question from the student]
Tutor: [Your previous response]
...

Student question:
[The student's current question about their exercise or homework]

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
      },
      {
        role: 'user',
        content: fullContent
      }
    ];

    // Options for the LLM request
    const options = {
      temperature: OPENAI_CONFIG.TEMPERATURE,
      maxTokens: OPENAI_CONFIG.MAX_TOKENS
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

    if (error.message.includes('API key')) {
      errorMessage = 'API configuration error';
    } else if (error.message.includes('timed out')) {
      errorMessage = 'Request timed out';
      statusCode = 504;
    } else if (error.message.includes('not running') || error.message.includes('not accessible')) {
      errorMessage = 'Local LLM service is not available';
      statusCode = 503;
    }

    return json({ error: errorMessage }, { status: statusCode });
  }
}
