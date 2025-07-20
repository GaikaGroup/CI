/**
 * Dependency Injection Container
 * 
 * This class is responsible for managing dependencies and providing them when needed.
 * It follows the dependency injection pattern to make the code more testable and maintainable.
 */
export class DIContainer {
  /**
   * Create a new DI container
   */
  constructor() {
    this.services = new Map();
    this.factories = new Map();
  }

  /**
   * Register a service in the container
   * @param {string} key - The key to register the service under
   * @param {any} implementation - The service implementation
   */
  register(key, implementation) {
    this.services.set(key, implementation);
  }

  /**
   * Register a factory function in the container
   * @param {string} key - The key to register the factory under
   * @param {Function} factory - The factory function
   */
  registerFactory(key, factory) {
    this.factories.set(key, factory);
  }

  /**
   * Resolve a service from the container
   * @param {string} key - The key to resolve
   * @returns {any} - The resolved service
   */
  resolve(key) {
    // Check if we have a factory for this key
    if (this.factories.has(key)) {
      return this.factories.get(key)(this);
    }
    
    // Check if we have a service for this key
    if (this.services.has(key)) {
      return this.services.get(key);
    }
    
    throw new Error(`Service not registered: ${key}`);
  }

  /**
   * Check if a service is registered
   * @param {string} key - The key to check
   * @returns {boolean} - True if the service is registered
   */
  has(key) {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Remove a service from the container
   * @param {string} key - The key to remove
   */
  remove(key) {
    this.services.delete(key);
    this.factories.delete(key);
  }

  /**
   * Clear all services from the container
   */
  clear() {
    this.services.clear();
    this.factories.clear();
  }
}

/**
 * Global container instance
 */
export const container = new DIContainer();