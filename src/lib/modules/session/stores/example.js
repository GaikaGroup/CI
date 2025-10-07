/**
 * Session Stores Usage Example
 * Demonstrates how to use the session management stores
 */

import {
  sessionStore,
  chatStore,
  sessionUtils,
  sessionStats,
  messageStats,
  isSessionLoading,
  chatError
} from './index.js';
import { user, isAuthenticated } from '$lib/modules/auth/stores.js';

/**
 * Example: Complete session workflow
 */
export async function sessionWorkflowExample() {
  try {
    // 1. Initialize session stores (usually done on app startup)
    await sessionStore.initialize();

    // 2. Create a new session
    const newSession = await sessionStore.createSession(
      'My Learning Session',
      'learn',
      'en',
      'Working on JavaScript fundamentals'
    );
    console.log('Created session:', newSession);

    // 3. Initialize chat for the session
    await chatStore.initializeSession(newSession.id);

    // 4. Send some messages
    await chatStore.sendMessage('Hello, I want to learn about JavaScript arrays');
    await chatStore.addAssistantMessage(
      'Great! Arrays are fundamental data structures in JavaScript. Let me explain...'
    );

    // 5. Update session title
    await sessionStore.updateSession(newSession.id, {
      title: 'JavaScript Arrays Learning Session'
    });

    // 6. Search for sessions
    await sessionStore.searchSessions('JavaScript');

    console.log('Session workflow completed successfully');
  } catch (error) {
    console.error('Session workflow failed:', error);
  }
}

/**
 * Example: Using derived stores for UI
 */
export function derivedStoresExample() {
  // Subscribe to session statistics
  sessionStats.subscribe((stats) => {
    console.log('Session Stats:', {
      total: stats.total,
      funSessions: stats.funSessions,
      learnSessions: stats.learnSessions,
      totalMessages: stats.totalMessages,
      languages: stats.languages
    });
  });

  // Subscribe to message statistics
  messageStats.subscribe((stats) => {
    console.log('Message Stats:', {
      total: stats.total,
      userMessages: stats.userMessages,
      assistantMessages: stats.assistantMessages,
      hasMessages: stats.hasMessages
    });
  });

  // Subscribe to loading states
  isSessionLoading.subscribe((loading) => {
    console.log('Session loading:', loading);
  });

  // Subscribe to errors
  chatError.subscribe((error) => {
    if (error) {
      console.error('Chat error:', error);
    }
  });
}

/**
 * Example: Session utilities usage
 */
export async function sessionUtilitiesExample() {
  try {
    // Create and immediately start a session
    const session = await sessionUtils.createAndStartSession('Quick Math Help', 'fun', 'en');

    // Send a message
    await chatStore.sendMessage('Can you help me with algebra?');

    // Switch to another session
    const anotherSession = await sessionStore.createSession('History Discussion', 'learn', 'en');

    await sessionUtils.switchSession(anotherSession.id);

    // Continue an existing session
    await sessionUtils.continueSession(session.id);

    // Safely delete a session
    await sessionUtils.deleteSessionSafely(anotherSession.id);

    console.log('Session utilities example completed');
  } catch (error) {
    console.error('Session utilities example failed:', error);
  }
}

/**
 * Example: Reactive UI patterns
 */
export function reactiveUIExample() {
  // This would typically be used in Svelte components

  // Example of reactive session list
  sessionStore.subscribe((state) => {
    if (state.loading) {
      // Show loading spinner
      console.log('Loading sessions...');
    } else if (state.error) {
      // Show error message
      console.log('Error loading sessions:', state.error);
    } else {
      // Render session list
      console.log('Sessions loaded:', state.sessions.length);
    }
  });

  // Example of reactive chat interface
  chatStore.subscribe((state) => {
    if (state.sessionId) {
      console.log(`Chat active for session: ${state.sessionId}`);
      console.log(`Messages: ${state.messages.length}`);
      console.log(`Mode: ${state.mode}, Language: ${state.language}`);
    }
  });
}

/**
 * Example: Error handling patterns
 */
export async function errorHandlingExample() {
  try {
    // Attempt to create a session with invalid data
    await sessionStore.createSession('', 'invalid-mode', 'invalid-lang');
  } catch (error) {
    console.log('Caught validation error:', error.message);
  }

  try {
    // Attempt to access non-existent session
    await sessionStore.selectSession('non-existent-id');
  } catch (error) {
    console.log('Caught not found error:', error.message);
  }

  // Handle errors through store state
  sessionStore.subscribe((state) => {
    if (state.error) {
      // Display user-friendly error message
      console.log('Session error:', state.error);

      // Clear error after handling
      setTimeout(() => {
        sessionStore.setError(null);
      }, 5000);
    }
  });
}

/**
 * Example: Pagination handling
 */
export async function paginationExample() {
  try {
    // Load first page of sessions
    await sessionStore.loadSessions({ page: 1, limit: 10 });

    // Load next page
    await sessionStore.loadNextPage();

    // Load previous page
    await sessionStore.loadPreviousPage();

    // Load with filters
    await sessionStore.loadSessions({
      page: 1,
      mode: 'learn',
      language: 'en',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    console.log('Pagination example completed');
  } catch (error) {
    console.error('Pagination example failed:', error);
  }
}

/**
 * Example: Search functionality
 */
export async function searchExample() {
  try {
    // Search sessions by title and content
    await sessionStore.searchSessions('JavaScript');

    // Search with filters
    await sessionStore.searchSessions('math', {
      mode: 'learn',
      language: 'en'
    });

    // Clear search (load regular sessions)
    await sessionStore.searchSessions('');

    console.log('Search example completed');
  } catch (error) {
    console.error('Search example failed:', error);
  }
}

/**
 * Example: Authentication integration
 */
export function authIntegrationExample() {
  // The stores automatically respond to auth changes
  isAuthenticated.subscribe(async (authenticated) => {
    if (authenticated) {
      console.log('User authenticated, initializing sessions...');
      await sessionStore.initialize();
    } else {
      console.log('User logged out, clearing sessions...');
      sessionStore.reset();
      chatStore.reset();
    }
  });

  user.subscribe((currentUser) => {
    if (currentUser) {
      console.log(`Sessions loaded for user: ${currentUser.name} (${currentUser.id})`);
    }
  });
}

// Export all examples for easy testing
export const examples = {
  sessionWorkflowExample,
  derivedStoresExample,
  sessionUtilitiesExample,
  reactiveUIExample,
  errorHandlingExample,
  paginationExample,
  searchExample,
  authIntegrationExample
};
