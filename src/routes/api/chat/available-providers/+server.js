/**
 * Available Providers API Endpoint
 *
 * GET /api/chat/available-providers
 * Get list of available LLM providers for second opinion
 */

import { json } from '@sveltejs/kit';
import { ProviderManager } from '$lib/modules/llm/ProviderManager.js';
import { OLLAMA_CONFIG } from '$lib/config/llm.js';

// Provider display information
const PROVIDER_INFO = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'Cloud-based AI models from OpenAI',
    models: [
      {
        id: 'chatgpt-4o-latest',
        name: 'ChatGPT-4.5 (Latest)',
        description: 'Latest GPT-4.5 model with superior reasoning, especially for math',
        capabilities: ['text', 'vision', 'reasoning', 'math']
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Previous generation model',
        capabilities: ['text', 'vision', 'reasoning']
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Faster and more cost-effective',
        capabilities: ['text', 'vision']
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'High performance with vision capabilities',
        capabilities: ['text', 'vision']
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and efficient for most tasks',
        capabilities: ['text']
      }
    ]
  },
  ollama: {
    name: 'ollama',
    displayName: 'Ollama (Local)',
    description: 'Local AI models running on your machine',
    models: []
  }
};

/**
 * Handle GET requests to retrieve available providers
 * @param {Request} request - The request object
 * @param {Object} url - URL object with query parameters
 * @returns {Response} - The response object
 */
export async function GET({ url }) {
  try {
    // Get excludeProvider from query params
    const excludeProvider = url.searchParams.get('excludeProvider');

    console.log('[API /chat/available-providers] Request received:', {
      excludeProvider: excludeProvider || 'none'
    });

    // Initialize provider manager
    const providerManager = new ProviderManager();

    // Get all registered providers
    const allProviders = providerManager.listProviders();

    // Build provider list with availability and model information
    const providers = [];

    for (const providerName of allProviders) {
      // Skip excluded provider
      if (excludeProvider && providerName === excludeProvider) {
        console.log(`[API /chat/available-providers] Skipping excluded provider: ${providerName}`);
        continue;
      }

      // Check availability
      const available = await providerManager.isProviderAvailable(providerName);

      // Get provider info
      const info = PROVIDER_INFO[providerName] || {
        name: providerName,
        displayName: providerName.charAt(0).toUpperCase() + providerName.slice(1),
        description: `${providerName} provider`,
        models: []
      };

      // For Ollama, get models from config
      if (providerName === 'ollama') {
        info.models = OLLAMA_CONFIG.MODELS.map((modelId) => ({
          id: modelId,
          name: modelId,
          description: `Local model: ${modelId}`,
          capabilities: ['text']
        }));

        // Add vision model if configured
        if (OLLAMA_CONFIG.VISION_MODEL) {
          info.models.push({
            id: OLLAMA_CONFIG.VISION_MODEL,
            name: OLLAMA_CONFIG.VISION_MODEL,
            description: `Local vision model: ${OLLAMA_CONFIG.VISION_MODEL}`,
            capabilities: ['text', 'vision']
          });
        }
      }

      providers.push({
        name: info.name,
        displayName: info.displayName,
        description: info.description,
        available,
        models: info.models
      });
    }

    console.log('[API /chat/available-providers] Providers retrieved:', {
      total: providers.length,
      available: providers.filter((p) => p.available).length,
      excluded: excludeProvider || 'none'
    });

    // Return formatted response
    return json({
      success: true,
      data: {
        providers
      }
    });
  } catch (error) {
    console.error('[API /chat/available-providers] Error:', error);

    // Generic error response
    return json(
      {
        success: false,
        error: 'Failed to retrieve available providers. Please try again.'
      },
      { status: 500 }
    );
  }
}
