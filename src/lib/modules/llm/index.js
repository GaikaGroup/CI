/**
 * LLM Module Index
 * 
 * This file exports the LLM module components and registers them with the DI container.
 */

import { ProviderManager } from './ProviderManager';
import { ResourceMonitor } from './ResourceMonitor';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { container } from '$lib/shared/di/container';
import { LLM_FEATURES } from '$lib/config/llm';

// Export all components
export { ProviderManager, ResourceMonitor, OpenAIProvider, OllamaProvider };

/**
 * Initialize the LLM module and register components with the DI container
 */
export function initializeLLMModule() {
  // Create and register the provider manager
  const providerManager = new ProviderManager();
  container.register('llmProviderManager', providerManager);
  
  // Create and register the resource monitor
  const resourceMonitor = new ResourceMonitor();
  container.register('llmResourceMonitor', resourceMonitor);
  
  // Start resource monitoring if local LLM is enabled
  if (LLM_FEATURES.ENABLE_LOCAL_LLM) {
    resourceMonitor.startMonitoring();
    
    // Add a listener to switch providers when resources are constrained
    resourceMonitor.addListener((data) => {
      if (data.memoryThresholdExceeded || data.cpuThresholdExceeded) {
        console.warn('Resource constraints detected, switching to OpenAI provider');
        providerManager.setDefaultProvider('openai');
      }
    });
  }
  
  console.log('LLM module initialized');
  return { providerManager, resourceMonitor };
}

// Register factory functions for individual providers
container.registerFactory('openaiProvider', () => new OpenAIProvider());

if (LLM_FEATURES.ENABLE_LOCAL_LLM) {
  container.registerFactory('ollamaProvider', () => new OllamaProvider());
}

// Auto-initialize if not in a test environment
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  initializeLLMModule();
}