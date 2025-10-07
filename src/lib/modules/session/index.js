/**
 * Session module
 *
 * This module provides session-based memory for maintaining conversation context
 * and database services for persistent session and message management.
 */

import { ISessionMemory } from './interfaces/ISessionMemory.js';
import { InMemorySessionManager } from './InMemorySessionManager.js';
import { SessionFactory } from './SessionFactory.js';
import { SessionStorageAdapter } from './SessionStorageAdapter.js';

// Database services
import {
  SessionService,
  SessionError,
  SessionNotFoundError,
  SessionValidationError
} from './services/SessionService.js';
import {
  MessageService,
  MessageError,
  MessageNotFoundError,
  MessageValidationError
} from './services/MessageService.js';

// Export all components
export {
  // Legacy session memory components
  ISessionMemory,
  InMemorySessionManager,
  SessionFactory,
  SessionStorageAdapter,

  // Database services
  SessionService,
  MessageService,

  // Error classes
  SessionError,
  SessionNotFoundError,
  SessionValidationError,
  MessageError,
  MessageNotFoundError,
  MessageValidationError
};

// Session stores
export * from './stores/index.js';

// Session components
export * from './components/index.js';
