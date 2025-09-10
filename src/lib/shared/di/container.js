/**
 * Dependency Injection Container
 * Manages singleton instances and factories.
 */

export class DIContainer {
  constructor() {
    this.services = new Map(); // key -> instance (singleton)
    this.factories = new Map(); // key -> (container) => instance
  }

  /** Register a concrete instance (singleton). */
  register(key, implementation) {
    this.services.set(key, implementation);
  }

  /** Register a factory (called on each resolve). */
  registerFactory(key, factory) {
    this.factories.set(key, factory);
  }

  /** Resolve a service or factory-created instance. */
  resolve(key) {
    if (this.factories.has(key)) return this.factories.get(key)(this);
    if (this.services.has(key)) return this.services.get(key);
    throw new Error(`Service not registered: ${key}`);
  }

  /** Check if a service/factory is registered. */
  has(key) {
    return this.services.has(key) || this.factories.has(key);
  }

  /** Remove a registration. */
  remove(key) {
    this.services.delete(key);
    this.factories.delete(key);
  }

  /** Clear all registrations. */
  clear() {
    this.services.clear();
    this.factories.clear();
  }
}

/** Global container instance */
export const container = new DIContainer();

/** Optional: centralize DI tokens */
export const TOKENS = {
  LLM_PROVIDER_MANAGER: 'llmProviderManager'
};

/* ------------------------------------------------------------------ */
/* LLM provider manager registration                                   */
/* ------------------------------------------------------------------ */
// Dynamically import the LLM module which registers itself with the container
if (!container.has(TOKENS.LLM_PROVIDER_MANAGER)) {
  (async () => {
    await import('$lib/modules/llm/index.js');
    if (import.meta.env?.DEV) {
      console.info('[DI] Initialized LLM module');
    }
  })();
}
