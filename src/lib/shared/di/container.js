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
/* Server-only registration using top-level await + dynamic import     */
/* ------------------------------------------------------------------ */
/**
 * We only register the ProviderManager on the server to avoid bundling
 * server-only code into the client build.
 *
 * NOTE: Vite/SvelteKit supports top-level await in SSR modules.
 */
if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.SSR) {
  // Dynamically import to keep this file browser-safe.
  const { ProviderManager } = await import('$lib/modules/llm/ProviderManager.js');

  if (!container.has(TOKENS.LLM_PROVIDER_MANAGER)) {
    const instance = new ProviderManager({ fetchImpl: fetch });
    container.register(TOKENS.LLM_PROVIDER_MANAGER, instance);

    if (import.meta.env.DEV) {
      console.info('[DI] Registered:', TOKENS.LLM_PROVIDER_MANAGER);
    }
  }
}
