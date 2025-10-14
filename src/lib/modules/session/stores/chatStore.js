/**
 * Chat Store for Session Messages
 * Manages messages within a specific session context
 * Integrates with session store and message service
 */

import { writable, derived, get } from 'svelte/store';
import { user, isAuthenticated } from '$lib/modules/auth/stores.js';
import { sessionStore } from './sessionStore.js';
import { MessageService } from '../services/MessageService.js';

/**
 * Chat state interface
 */
const initialChatState = {
  messages: [],
  currentMessage: '',
  isTyping: false,
  loading: false,
  error: null,
  mode: 'fun', // 'fun' | 'learn'
  language: 'en',
  sessionId: null,
  pagination: {
    currentPage: 1,
    totalPages: 0,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

/**
 * Create the chat store
 */
function createChatStore() {
  const { subscribe, set, update } = writable(initialChatState);

  return {
    subscribe,

    /**
     * Initialize chat for a specific session
     */
    async initializeSession(sessionId) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      this.setLoading(true);
      this.setError(null);

      try {
        // Get session details
        const sessionState = get(sessionStore);
        let session = sessionState.currentSession;

        if (!session || session.id !== sessionId) {
          session = await sessionStore.selectSession(sessionId);
        }

        // Load messages for the session
        const result = await MessageService.getSessionMessages(
          sessionId,
          { page: 1, limit: 50, sortOrder: 'asc' },
          currentUser.id
        );

        update((state) => ({
          ...state,
          sessionId,
          messages: result.messages,
          pagination: result.pagination,
          mode: session.mode,
          language: session.language,
          loading: false,
          error: null
        }));
      } catch (error) {
        console.error('[ChatStore] Failed to initialize session:', error);
        this.setError(error.message || 'Failed to load session messages');
        this.setLoading(false);
        throw error;
      }
    },

    /**
     * Initialize chat from a session object (without loading messages)
     * Useful when navigating to a new session
     */
    initializeFromSession(session) {
      if (!session) {
        throw new Error('Session object is required');
      }

      update((state) => ({
        ...state,
        sessionId: session.id,
        mode: session.mode,
        language: session.language,
        messages: [], // Will be loaded by initializeSession
        error: null
      }));
    },

    /**
     * Add a new message to the current session
     */
    async addMessage(type, content, metadata = null) {
      const currentUser = get(user);
      const currentState = get({ subscribe });

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      if (!currentState.sessionId) {
        throw new Error('No active session');
      }

      try {
        const newMessage = await MessageService.addMessage(
          currentState.sessionId,
          type,
          content,
          metadata,
          currentUser.id
        );

        // Add message to local state
        update((state) => ({
          ...state,
          messages: [...state.messages, newMessage],
          error: null
        }));

        // Update session store to reflect new message count
        const sessionState = get(sessionStore);
        if (sessionState.currentSession?.id === currentState.sessionId) {
          sessionStore.updateSession(currentState.sessionId, {
            messageCount: (sessionState.currentSession.messageCount || 0) + 1
          });
        }

        return newMessage;
      } catch (error) {
        console.error('[ChatStore] Failed to add message:', error);
        this.setError(error.message || 'Failed to send message');
        throw error;
      }
    },

    /**
     * Send a user message
     */
    async sendMessage(content, metadata = null) {
      if (!content || content.trim().length === 0) {
        return;
      }

      return await this.addMessage('user', content.trim(), metadata);
    },

    /**
     * Add an assistant message
     */
    async addAssistantMessage(content, metadata = null) {
      return await this.addMessage('assistant', content, metadata);
    },

    /**
     * Update an existing message
     */
    async updateMessage(messageId, updates) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      try {
        const updatedMessage = await MessageService.updateMessage(
          messageId,
          updates,
          currentUser.id
        );

        update((state) => ({
          ...state,
          messages: state.messages.map((msg) => (msg.id === messageId ? updatedMessage : msg)),
          error: null
        }));

        return updatedMessage;
      } catch (error) {
        console.error('[ChatStore] Failed to update message:', error);
        this.setError(error.message || 'Failed to update message');
        throw error;
      }
    },

    /**
     * Delete a message
     */
    async deleteMessage(messageId) {
      const currentUser = get(user);
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      try {
        await MessageService.deleteMessage(messageId, currentUser.id);

        update((state) => ({
          ...state,
          messages: state.messages.filter((msg) => msg.id !== messageId),
          error: null
        }));

        // Update session store to reflect decreased message count
        const currentState = get({ subscribe });
        const sessionState = get(sessionStore);
        if (sessionState.currentSession?.id === currentState.sessionId) {
          sessionStore.updateSession(currentState.sessionId, {
            messageCount: Math.max(0, (sessionState.currentSession.messageCount || 1) - 1)
          });
        }

        return true;
      } catch (error) {
        console.error('[ChatStore] Failed to delete message:', error);
        this.setError(error.message || 'Failed to delete message');
        throw error;
      }
    },

    /**
     * Load more messages (pagination)
     */
    async loadMoreMessages() {
      const currentUser = get(user);
      const currentState = get({ subscribe });

      if (!currentUser || !currentState.sessionId) {
        return;
      }

      if (!currentState.pagination.hasNextPage) {
        return;
      }

      this.setLoading(true);

      try {
        const nextPage = currentState.pagination.currentPage + 1;
        const result = await MessageService.getSessionMessages(
          currentState.sessionId,
          { page: nextPage, limit: currentState.pagination.limit, sortOrder: 'asc' },
          currentUser.id
        );

        update((state) => ({
          ...state,
          messages: [...state.messages, ...result.messages],
          pagination: result.pagination,
          loading: false,
          error: null
        }));
      } catch (error) {
        console.error('[ChatStore] Failed to load more messages:', error);
        this.setError(error.message || 'Failed to load more messages');
        this.setLoading(false);
      }
    },

    /**
     * Set current message being typed
     */
    setCurrentMessage(message) {
      update((state) => ({
        ...state,
        currentMessage: message
      }));
    },

    /**
     * Set typing indicator
     */
    setTyping(isTyping) {
      update((state) => ({
        ...state,
        isTyping
      }));
    },

    /**
     * Set chat mode and update session
     */
    async setMode(mode) {
      const currentState = get({ subscribe });

      update((state) => ({
        ...state,
        mode
      }));

      // Update session if we have one
      if (currentState.sessionId) {
        try {
          await sessionStore.updateSession(currentState.sessionId, { mode });
        } catch (error) {
          console.error('[ChatStore] Failed to update session mode:', error);
        }
      }
    },

    /**
     * Set chat language and update session
     */
    async setLanguage(language) {
      const currentState = get({ subscribe });

      update((state) => ({
        ...state,
        language
      }));

      // Update session if we have one
      if (currentState.sessionId) {
        try {
          await sessionStore.updateSession(currentState.sessionId, { language });
        } catch (error) {
          console.error('[ChatStore] Failed to update session language:', error);
        }
      }
    },

    /**
     * Set loading state
     */
    setLoading(loading) {
      update((state) => ({
        ...state,
        loading
      }));
    },

    /**
     * Set error state
     */
    setError(error) {
      update((state) => ({
        ...state,
        error
      }));
    },

    /**
     * Clear messages and reset chat state
     */
    reset() {
      set(initialChatState);
    },

    /**
     * Clear current session but keep store structure
     */
    clearSession() {
      update((state) => ({
        ...state,
        messages: [],
        sessionId: null,
        currentMessage: '',
        isTyping: false,
        error: null,
        pagination: initialChatState.pagination
      }));
    },

    /**
     * Generate welcome message based on mode
     */
    getWelcomeMessage(mode = 'fun', language = 'en') {
      const welcomeMessages = {
        fun: {
          en: "Hi there! I'm your AI tutor and I'm here to make learning fun! What would you like to explore today?",
          es: '¡Hola! Soy tu tutor de IA y estoy aquí para hacer que el aprendizaje sea divertido. ¿Qué te gustaría explorar hoy?',
          fr: "Salut ! Je suis votre tuteur IA et je suis là pour rendre l'apprentissage amusant ! Qu'aimeriez-vous explorer aujourd'hui ?",
          de: 'Hallo! Ich bin dein KI-Tutor und bin hier, um das Lernen spaßig zu machen! Was möchtest du heute erkunden?'
        },
        learn: {
          en: "Welcome to your focused learning session. I'm here to help you master new concepts and skills. What subject would you like to work on?",
          es: 'Bienvenido a tu sesión de aprendizaje enfocado. Estoy aquí para ayudarte a dominar nuevos conceptos y habilidades. ¿En qué materia te gustaría trabajar?',
          fr: "Bienvenue dans votre session d'apprentissage ciblée. Je suis là pour vous aider à maîtriser de nouveaux concepts et compétences. Sur quel sujet aimeriez-vous travailler ?",
          de: 'Willkommen zu deiner fokussierten Lernsitzung. Ich bin hier, um dir zu helfen, neue Konzepte und Fähigkeiten zu meistern. An welchem Fach möchtest du arbeiten?'
        }
      };

      return (
        welcomeMessages[mode]?.[language] || welcomeMessages[mode]?.en || welcomeMessages.fun.en
      );
    }
  };
}

/**
 * Create the main chat store instance
 */
export const chatStore = createChatStore();

/**
 * Derived store for user messages only
 */
export const userMessages = derived([chatStore], ([$chatStore]) =>
  $chatStore.messages.filter((msg) => msg.type === 'user')
);

/**
 * Derived store for assistant messages only
 */
export const assistantMessages = derived([chatStore], ([$chatStore]) =>
  $chatStore.messages.filter((msg) => msg.type === 'assistant')
);

/**
 * Derived store for message statistics
 */
export const messageStats = derived([chatStore], ([$chatStore]) => {
  const messages = $chatStore.messages;
  return {
    total: messages.length,
    userMessages: messages.filter((msg) => msg.type === 'user').length,
    assistantMessages: messages.filter((msg) => msg.type === 'assistant').length,
    hasMessages: messages.length > 0,
    lastMessage: messages.length > 0 ? messages[messages.length - 1] : null
  };
});

/**
 * Derived store for chat loading state
 */
export const isChatLoading = derived([chatStore], ([$chatStore]) => $chatStore.loading);

/**
 * Derived store for chat error state
 */
export const chatError = derived([chatStore], ([$chatStore]) => $chatStore.error);

/**
 * Derived store for typing state
 */
export const isTyping = derived([chatStore], ([$chatStore]) => $chatStore.isTyping);

// All stores are already exported above with individual export statements
