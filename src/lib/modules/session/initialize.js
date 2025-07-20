/**
 * Initialize session components
 * 
 * This file initializes the session components and registers them in the DI container.
 */

import { container } from '$lib/shared/di/container';
import { SessionFactory } from './SessionFactory';
import { SessionStorageAdapter } from './SessionStorageAdapter';

/**
 * Initialize session components and register them in the DI container
 */
export function initializeSessionComponents() {
  // Create a singleton instance of SessionFactory
  const sessionFactory = new SessionFactory();
  
  // Register the components in the DI container
  container.register('sessionFactory', sessionFactory);
  
  // Register the SessionStorageAdapter
  container.register('sessionStorageAdapter', new SessionStorageAdapter(sessionFactory));
}

// Initialize session components
initializeSessionComponents();