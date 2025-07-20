/**
 * Session module initialization
 * 
 * This file initializes the session module and registers its components in the DI container.
 * It should be imported in the main application file to ensure the session module is properly initialized.
 */

import { container } from '$lib/shared/di/container';
import { SessionFactory } from './SessionFactory';
import { SessionStorageAdapter } from './SessionStorageAdapter';

// Create a singleton instance of SessionFactory
const sessionFactory = new SessionFactory();

// Register the components in the DI container
container.register('sessionFactory', sessionFactory);
container.register('sessionStorageAdapter', new SessionStorageAdapter(sessionFactory));

console.log('[Session] Session module initialized');