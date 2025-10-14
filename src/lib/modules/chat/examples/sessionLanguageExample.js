/**
 * Example usage of Session Language Management system
 * Demonstrates how to integrate language consistency features
 */

import { sessionLanguageManager } from '../SessionLanguageManager.js';
import { sessionLanguagePersistence } from '../SessionLanguagePersistence.js';
import { 
  initializeSessionLanguageState,
  updateSessionLanguageFromMessage,
  getSessionLanguageForChat,
  enhanceSystemMessagesWithLanguage,
  validateResponseLanguage
} from '../utils/sessionLanguageIntegration.js';

/**
 * Example: Initialize language management for a new chat session
 */
export async function exampleInitializeSession(sessionId, userId) {
  console.log(`Initializing language management for session: ${sessionId}`);
  
  try {
    // Initialize language state from session data
    const languageState = await initializeSessionLanguageState(sessionId, userId);
    
    console.log('Language state initialized:', {
      language: languageState.detectedLanguage,
      confidence: languageState.confidence,
      isStable: languageState.isStable
    });
    
    return languageState;
  } catch (error) {
    console.error('Failed to initialize session language:', error);
    throw error;
  }
}

/**
 * Example: Process user message and update language detection
 */
export async function exampleProcessUserMessage(sessionId, userId, messageContent) {
  console.log(`Processing user message for session: ${sessionId}`);
  console.log(`Message: "${messageContent.substring(0, 100)}..."`);
  
  try {
    // Update language detection based on user message
    const updatedState = await updateSessionLanguageFromMessage(sessionId, userId, messageContent);
    
    if (updatedState) {
      console.log('Language state updated:', {
        language: updatedState.detectedLanguage,
        confidence: updatedState.confidence,
        previousLanguage: updatedState.confidenceHistory[updatedState.confidenceHistory.length - 2]?.language
      });
    } else {
      console.log('No language update needed');
    }
    
    return updatedState;
  } catch (error) {
    console.error('Failed to process user message:', error);
    return null;
  }
}

/**
 * Example: Enhance chat API messages with language enforcement
 */
export function exampleEnhanceChatMessages(sessionId, originalMessages) {
  console.log(`Enhancing chat messages for session: ${sessionId}`);
  
  try {
    // Get language information for the session
    const languageInfo = getSessionLanguageForChat(sessionId);
    
    if (!languageInfo) {
      console.log('No language information available, using original messages');
      return originalMessages;
    }
    
    console.log('Language info:', {
      language: languageInfo.language,
      confidence: languageInfo.confidence,
      shouldEnforce: languageInfo.enforcementInstructions !== null
    });
    
    // Enhance messages with language enforcement
    const enhancedMessages = enhanceSystemMessagesWithLanguage(originalMessages, sessionId);
    
    console.log(`Enhanced messages: ${enhancedMessages.length} total (${enhancedMessages.length - originalMessages.length} added)`);
    
    return enhancedMessages;
  } catch (error) {
    console.error('Failed to enhance chat messages:', error);
    return originalMessages;
  }
}

/**
 * Example: Validate AI response for language consistency
 */
export async function exampleValidateResponse(sessionId, responseContent) {
  console.log(`Validating response for session: ${sessionId}`);
  console.log(`Response: "${responseContent.substring(0, 100)}..."`);
  
  try {
    // Validate response language
    const validationResult = await validateResponseLanguage(sessionId, responseContent);
    
    console.log('Validation result:', {
      isValid: validationResult.isValid,
      detectedLanguage: validationResult.detectedLanguage,
      expectedLanguage: validationResult.expectedLanguage,
      confidence: validationResult.confidence,
      recommendation: validationResult.recommendation
    });
    
    if (!validationResult.isValid) {
      console.warn('Language validation failed!', {
        severity: validationResult.severity,
        recommendation: validationResult.recommendation
      });
    }
    
    return validationResult;
  } catch (error) {
    console.error('Failed to validate response:', error);
    return { isValid: false, error: error.message };
  }
}

/**
 * Example: Complete chat flow with language management
 */
export async function exampleCompleteChatFlow(sessionId, userId, userMessage) {
  console.log(`\n=== Complete Chat Flow Example ===`);
  console.log(`Session: ${sessionId}, User: ${userId}`);
  
  try {
    // Step 1: Initialize session language management
    await exampleInitializeSession(sessionId, userId);
    
    // Step 2: Process user message and update language detection
    await exampleProcessUserMessage(sessionId, userId, userMessage);
    
    // Step 3: Prepare enhanced messages for chat API
    const originalMessages = [
      { role: 'system', content: 'You are a helpful AI tutor.' },
      { role: 'user', content: userMessage }
    ];
    
    const enhancedMessages = exampleEnhanceChatMessages(sessionId, originalMessages);
    
    // Step 4: Simulate AI response (in real implementation, this would come from LLM)
    const simulatedResponse = userMessage.includes('русский') || userMessage.includes('Привет') 
      ? 'Привет! Я готов помочь вам с изучением. О чём вы хотели бы поговорить?'
      : 'Hello! I\'m ready to help you learn. What would you like to discuss?';
    
    // Step 5: Validate AI response
    const validationResult = await exampleValidateResponse(sessionId, simulatedResponse);
    
    // Step 6: Get final session statistics
    const stats = sessionLanguageManager.getSessionLanguageStats(sessionId);
    console.log('\nFinal session stats:', stats);
    
    return {
      enhancedMessages,
      response: simulatedResponse,
      validation: validationResult,
      stats
    };
    
  } catch (error) {
    console.error('Complete chat flow failed:', error);
    throw error;
  }
}

/**
 * Example usage scenarios
 */
export const exampleScenarios = {
  // Russian user scenario
  russianUser: {
    sessionId: 'session-ru-001',
    userId: 'user-123',
    messages: [
      'Привет! Помоги мне с математикой.',
      'Как решить квадратное уравнение?',
      'Спасибо за объяснение!'
    ]
  },
  
  // English user scenario
  englishUser: {
    sessionId: 'session-en-001', 
    userId: 'user-456',
    messages: [
      'Hello! Can you help me with physics?',
      'What is Newton\'s second law?',
      'Thanks for the explanation!'
    ]
  },
  
  // Mixed language scenario (should be corrected)
  mixedLanguage: {
    sessionId: 'session-mixed-001',
    userId: 'user-789',
    messages: [
      'Hola! ¿Puedes ayudarme con química?',
      'What is the periodic table?', // Language switch
      '¿Cómo se forma un enlace químico?'
    ]
  }
};

/**
 * Run example scenarios
 */
export async function runExampleScenarios() {
  console.log('\n=== Running Example Scenarios ===\n');
  
  for (const [scenarioName, scenario] of Object.entries(exampleScenarios)) {
    console.log(`\n--- ${scenarioName.toUpperCase()} SCENARIO ---`);
    
    try {
      for (let i = 0; i < scenario.messages.length; i++) {
        const message = scenario.messages[i];
        console.log(`\nMessage ${i + 1}: "${message}"`);
        
        const result = await exampleCompleteChatFlow(
          scenario.sessionId,
          scenario.userId,
          message
        );
        
        console.log(`Response: "${result.response}"`);
        console.log(`Validation: ${result.validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
      }
    } catch (error) {
      console.error(`Scenario ${scenarioName} failed:`, error);
    }
  }
  
  console.log('\n=== Example Scenarios Complete ===');
}

// Export all example functions
export default {
  exampleInitializeSession,
  exampleProcessUserMessage,
  exampleEnhanceChatMessages,
  exampleValidateResponse,
  exampleCompleteChatFlow,
  exampleScenarios,
  runExampleScenarios
};