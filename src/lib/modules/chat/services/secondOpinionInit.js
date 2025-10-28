/**
 * Second Opinion Service Initialization
 *
 * Initializes the SecondOpinionService with ProviderManager integration
 */

import { ProviderManager } from '$lib/modules/llm/ProviderManager.js';
import SecondOpinionService from './SecondOpinionService.js';

/**
 * Global instance of SecondOpinionService
 */
let secondOpinionServiceInstance = null;

/**
 * Initialize SecondOpinionService with ProviderManager
 * @returns {SecondOpinionService} Initialized service instance
 */
export function initializeSecondOpinionService() {
  if (!secondOpinionServiceInstance) {
    // Create ProviderManager instance
    const providerManager = new ProviderManager();

    // Create SecondOpinionService with ProviderManager
    secondOpinionServiceInstance = new SecondOpinionService(providerManager);

    console.log('[SecondOpinion] Service initialized successfully');
  }

  return secondOpinionServiceInstance;
}

/**
 * Get SecondOpinionService instance
 * Initializes if not already initialized
 * @returns {SecondOpinionService} Service instance
 */
export function getSecondOpinionService() {
  if (!secondOpinionServiceInstance) {
    return initializeSecondOpinionService();
  }

  return secondOpinionServiceInstance;
}

/**
 * Reset SecondOpinionService instance
 * Useful for testing
 */
export function resetSecondOpinionService() {
  secondOpinionServiceInstance = null;
  console.log('[SecondOpinion] Service reset');
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  // Browser environment - initialize on load
  initializeSecondOpinionService();
} else {
  // Server environment - lazy initialize
  console.log('[SecondOpinion] Service will be initialized on first use');
}
