import { container } from '$lib/shared/di/container';

let initializationPromise = null;

export async function ensureProviderManager() {
  if (container.has('llmProviderManager')) {
    return container.resolve('llmProviderManager');
  }

  if (!initializationPromise) {
    initializationPromise = import('./index.js').then(({ initializeLLMModule }) => {
      const { providerManager } = initializeLLMModule();
      return providerManager;
    });
  }

  return initializationPromise;
}
