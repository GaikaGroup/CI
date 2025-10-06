/**
 * Example usage of SessionService and MessageService
 * Demonstrates how to use the database service layer for session management
 */

import { SessionService, MessageService } from '../index.js';

/**
 * Example: Complete session workflow
 * This demonstrates creating a session, adding messages, and managing the conversation
 */
export async function sessionWorkflowExample() {
  try {
    const userId = 'user-123';
    
    console.log('=== Session Management Example ===\n');
    
    // 1. Create a new session
    console.log('1. Creating a new session...');
    const session = await SessionService.createSession(
      userId,
      'Math Learning Session',
      'learn',
      'en',
      'Learning algebra and geometry concepts'
    );
    console.log('✓ Session created:', {
      id: session.id,
      title: session.title,
      mode: session.mode,
      language: session.language
    });
    
    // 2. Add some messages to the session
    console.log('\n2. Adding messages to the session...');
    
    const userMessage = await MessageService.addMessage(
      session.id,
      'user',
      'Can you help me understand quadratic equations?',
      { language: 'en', timestamp: new Date().toISOString() },
      userId
    );
    console.log('✓ User message added:', userMessage.id);
    
    const assistantMessage = await MessageService.addMessage(
      session.id,
      'assistant',
      'Of course! A quadratic equation is a polynomial equation of degree 2. The general form is ax² + bx + c = 0, where a ≠ 0.',
      { 
        language: 'en', 
        timestamp: new Date().toISOString(),
        audioUrl: 'https://example.com/audio/response1.mp3'
      },
      userId
    );
    console.log('✓ Assistant message added:', assistantMessage.id);
    
    // 3. Get session with messages
    console.log('\n3. Retrieving session with messages...');
    const sessionWithMessages = await SessionService.getSession(session.id, userId, true);
    console.log('✓ Session retrieved with', sessionWithMessages.messages.length, 'messages');
    console.log('  Message count:', sessionWithMessages.messageCount);
    
    // 4. Search for sessions
    console.log('\n4. Searching for sessions...');
    const searchResults = await SessionService.searchSessions(userId, 'math');
    console.log('✓ Found', searchResults.sessions.length, 'sessions matching "math"');
    
    // 5. Get paginated messages
    console.log('\n5. Getting paginated messages...');
    const messagesPage = await MessageService.getSessionMessages(
      session.id,
      { page: 1, limit: 10, sortOrder: 'asc' },
      userId
    );
    console.log('✓ Retrieved', messagesPage.messages.length, 'messages (page 1)');
    
    // 6. Update session title
    console.log('\n6. Updating session title...');
    const updatedSession = await SessionService.updateSession(
      session.id,
      userId,
      { title: 'Advanced Math Learning Session' }
    );
    console.log('✓ Session title updated to:', updatedSession.title);
    
    // 7. Get user statistics
    console.log('\n7. Getting user statistics...');
    const sessionStats = await SessionService.getSessionStats(userId);
    const messageStats = await MessageService.getMessageStats(userId);
    console.log('✓ Session stats:', {
      totalSessions: sessionStats.totalSessions,
      funSessions: sessionStats.funSessions,
      learnSessions: sessionStats.learnSessions
    });
    console.log('✓ Message stats:', {
      totalMessages: messageStats.totalMessages,
      userMessages: messageStats.userMessages,
      assistantMessages: messageStats.assistantMessages
    });
    
    // 8. Get recent messages
    console.log('\n8. Getting recent messages...');
    const recentMessages = await MessageService.getRecentMessages(userId, 5);
    console.log('✓ Retrieved', recentMessages.length, 'recent messages');
    
    console.log('\n=== Example completed successfully! ===');
    
    return {
      session: updatedSession,
      messages: messagesPage.messages,
      stats: { sessionStats, messageStats }
    };
    
  } catch (error) {
    console.error('❌ Example failed:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    throw error;
  }
}

/**
 * Example: Error handling and validation
 * Demonstrates how the services handle various error conditions
 */
export async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');
  
  try {
    // 1. Try to create session with invalid data
    console.log('1. Testing validation errors...');
    try {
      await SessionService.createSession('', 'Test Session');
    } catch (error) {
      console.log('✓ Caught validation error:', error.message);
    }
    
    // 2. Try to access non-existent session
    console.log('\n2. Testing not found errors...');
    try {
      await SessionService.getSession('non-existent-id', 'user-123');
    } catch (error) {
      console.log('✓ Caught not found error:', error.message);
    }
    
    // 3. Try to add message with invalid type
    console.log('\n3. Testing message validation...');
    try {
      await MessageService.addMessage('session-123', 'invalid-type', 'Hello');
    } catch (error) {
      console.log('✓ Caught message validation error:', error.message);
    }
    
    // 4. Try to update with no valid fields
    console.log('\n4. Testing update validation...');
    try {
      await SessionService.updateSession('session-123', 'user-123', { invalidField: 'value' });
    } catch (error) {
      console.log('✓ Caught update validation error:', error.message);
    }
    
    console.log('\n=== Error handling example completed! ===');
    
  } catch (error) {
    console.error('❌ Error handling example failed:', error.message);
    throw error;
  }
}

/**
 * Example: Pagination and filtering
 * Demonstrates pagination and filtering capabilities
 */
export async function paginationExample() {
  console.log('\n=== Pagination Example ===\n');
  
  try {
    const userId = 'user-456';
    
    // Create multiple sessions for pagination demo
    console.log('1. Creating multiple sessions...');
    const sessions = [];
    for (let i = 1; i <= 5; i++) {
      const session = await SessionService.createSession(
        userId,
        `Session ${i}`,
        i % 2 === 0 ? 'fun' : 'learn',
        'en',
        `This is session number ${i}`
      );
      sessions.push(session);
      
      // Add some messages to each session
      await MessageService.addMessage(session.id, 'user', `Hello from session ${i}`, null, userId);
      await MessageService.addMessage(session.id, 'assistant', `Hi! This is response from session ${i}`, null, userId);
    }
    console.log('✓ Created', sessions.length, 'sessions with messages');
    
    // 2. Test pagination
    console.log('\n2. Testing pagination...');
    const page1 = await SessionService.getUserSessions(userId, { page: 1, limit: 2 });
    console.log('✓ Page 1:', page1.sessions.length, 'sessions');
    console.log('  Pagination info:', {
      currentPage: page1.pagination.currentPage,
      totalPages: page1.pagination.totalPages,
      totalCount: page1.pagination.totalCount,
      hasNextPage: page1.pagination.hasNextPage
    });
    
    const page2 = await SessionService.getUserSessions(userId, { page: 2, limit: 2 });
    console.log('✓ Page 2:', page2.sessions.length, 'sessions');
    
    // 3. Test filtering
    console.log('\n3. Testing filtering...');
    const learnSessions = await SessionService.getUserSessions(userId, { mode: 'learn' });
    const funSessions = await SessionService.getUserSessions(userId, { mode: 'fun' });
    console.log('✓ Learn sessions:', learnSessions.sessions.length);
    console.log('✓ Fun sessions:', funSessions.sessions.length);
    
    // 4. Test message pagination
    console.log('\n4. Testing message pagination...');
    const sessionId = sessions[0].id;
    
    // Add more messages for pagination demo
    for (let i = 3; i <= 10; i++) {
      await MessageService.addMessage(sessionId, 'user', `Message ${i}`, null, userId);
    }
    
    const messagesPage1 = await MessageService.getSessionMessages(
      sessionId,
      { page: 1, limit: 5 },
      userId
    );
    console.log('✓ Messages page 1:', messagesPage1.messages.length, 'messages');
    console.log('  Total messages:', messagesPage1.pagination.totalCount);
    
    console.log('\n=== Pagination example completed! ===');
    
    return {
      sessions,
      paginationDemo: { page1, page2 },
      filteringDemo: { learnSessions, funSessions },
      messagesPagination: messagesPage1
    };
    
  } catch (error) {
    console.error('❌ Pagination example failed:', error.message);
    throw error;
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    console.log('🚀 Running SessionService and MessageService Examples\n');
    
    const workflowResult = await sessionWorkflowExample();
    const paginationResult = await paginationExample();
    await errorHandlingExample();
    
    console.log('\n🎉 All examples completed successfully!');
    
    return {
      workflow: workflowResult,
      pagination: paginationResult
    };
    
  } catch (error) {
    console.error('💥 Examples failed:', error.message);
    throw error;
  }
}

// Export individual examples for selective testing
export default {
  sessionWorkflowExample,
  errorHandlingExample,
  paginationExample,
  runAllExamples
};