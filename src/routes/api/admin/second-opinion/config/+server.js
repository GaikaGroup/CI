/**
 * Admin API endpoint for managing second opinion configuration
 */

import { json } from '@sveltejs/kit';
import { SECOND_OPINION_CONFIG } from '$lib/config/secondOpinion.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/admin/second-opinion/config
 * Get current second opinion configuration
 */
export async function GET({ locals }) {
  // Check if user is admin
  if (!locals.user || locals.user.type !== 'admin') {
    return json(
      {
        success: false,
        error: 'Unauthorized: Admin access required'
      },
      { status: 403 }
    );
  }

  try {
    return json({
      success: true,
      config: SECOND_OPINION_CONFIG
    });
  } catch (error) {
    console.error('[Admin] Error getting config:', error);
    return json(
      {
        success: false,
        error: 'Failed to get configuration'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/second-opinion/config
 * Update second opinion configuration
 */
export async function PUT({ request, locals }) {
  // Check if user is admin
  if (!locals.user || locals.user.type !== 'admin') {
    return json(
      {
        success: false,
        error: 'Unauthorized: Admin access required'
      },
      { status: 403 }
    );
  }

  try {
    const updatedConfig = await request.json();

    // Validate configuration
    if (!validateConfig(updatedConfig)) {
      return json(
        {
          success: false,
          error: 'Invalid configuration'
        },
        { status: 400 }
      );
    }

    // Update the configuration in memory
    Object.assign(SECOND_OPINION_CONFIG, updatedConfig);

    // Optionally: Save to file for persistence
    // Note: In production, you might want to save this to a database instead
    try {
      const configPath = path.join(process.cwd(), 'src/lib/config/secondOpinion.js');
      const configContent = `// Second Opinion Configuration
// This file is auto-generated. Do not edit manually.

export const SECOND_OPINION_CONFIG = ${JSON.stringify(SECOND_OPINION_CONFIG, null, 2)};

// Error messages for different languages
export function getErrorMessage(key, language = 'en') {
	const messages = {
		en: {
			RATE_LIMIT_EXCEEDED: 'You have exceeded the rate limit for second opinions. Please try again later.',
			NO_ALTERNATIVE_PROVIDERS: 'No alternative AI models are currently available.',
			PROVIDER_UNAVAILABLE: 'The selected AI model is not available.',
			TIMEOUT: 'Second opinion generation timed out. Please try again.',
			GENERATION_FAILED: 'Failed to generate second opinion. Please try again.'
		},
		ru: {
			RATE_LIMIT_EXCEEDED: 'Вы превысили лимит запросов на второе мнение. Пожалуйста, попробуйте позже.',
			NO_ALTERNATIVE_PROVIDERS: 'Альтернативные модели ИИ в настоящее время недоступны.',
			PROVIDER_UNAVAILABLE: 'Выбранная модель ИИ недоступна.',
			TIMEOUT: 'Время ожидания второго мнения истекло. Пожалуйста, попробуйте снова.',
			GENERATION_FAILED: 'Не удалось получить второе мнение. Пожалуйста, попробуйте снова.'
		},
		es: {
			RATE_LIMIT_EXCEEDED: 'Has excedido el límite de solicitudes de segunda opinión. Por favor, inténtalo más tarde.',
			NO_ALTERNATIVE_PROVIDERS: 'No hay modelos de IA alternativos disponibles actualmente.',
			PROVIDER_UNAVAILABLE: 'El modelo de IA seleccionado no está disponible.',
			TIMEOUT: 'Se agotó el tiempo de espera para la segunda opinión. Por favor, inténtalo de nuevo.',
			GENERATION_FAILED: 'No se pudo generar la segunda opinión. Por favor, inténtalo de nuevo.'
		}
	};

	return messages[language]?.[key] || messages.en[key] || 'An error occurred';
}
`;

      // Note: Writing to source files is not recommended in production
      // This is just for demonstration. In production, use a database or config file
      console.log('[Admin] Configuration updated (in-memory only)');
      // await fs.writeFile(configPath, configContent, 'utf-8');
    } catch (writeError) {
      console.warn('[Admin] Could not persist config to file:', writeError);
      // Continue anyway - config is updated in memory
    }

    return json({
      success: true,
      message: 'Configuration updated successfully',
      config: SECOND_OPINION_CONFIG
    });
  } catch (error) {
    console.error('[Admin] Error updating config:', error);
    return json(
      {
        success: false,
        error: 'Failed to update configuration'
      },
      { status: 500 }
    );
  }
}

/**
 * Validate configuration object
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function validateConfig(config) {
  try {
    // Check required fields
    if (typeof config.ENABLED !== 'boolean') return false;
    if (typeof config.ALLOW_MANUAL_SELECTION !== 'boolean') return false;

    // Validate provider selection
    if (!config.PROVIDER_SELECTION) return false;
    const validStrategies = ['priority', 'cost', 'performance', 'round-robin', 'random'];
    if (!validStrategies.includes(config.PROVIDER_SELECTION.DEFAULT_STRATEGY)) return false;

    // Validate rate limits
    if (!config.RATE_LIMIT) return false;
    if (typeof config.RATE_LIMIT.ENABLED !== 'boolean') return false;
    if (config.RATE_LIMIT.ENABLED) {
      if (
        typeof config.RATE_LIMIT.MAX_REQUESTS_PER_HOUR !== 'number' ||
        config.RATE_LIMIT.MAX_REQUESTS_PER_HOUR < 1
      )
        return false;
      if (
        typeof config.RATE_LIMIT.MAX_REQUESTS_PER_DAY !== 'number' ||
        config.RATE_LIMIT.MAX_REQUESTS_PER_DAY < 1
      )
        return false;
    }

    // Validate divergence settings
    if (!config.DIVERGENCE) return false;
    if (typeof config.DIVERGENCE.ENABLED !== 'boolean') return false;
    if (config.DIVERGENCE.ENABLED) {
      if (
        typeof config.DIVERGENCE.THRESHOLD_LOW !== 'number' ||
        config.DIVERGENCE.THRESHOLD_LOW < 0 ||
        config.DIVERGENCE.THRESHOLD_LOW > 1
      )
        return false;
      if (
        typeof config.DIVERGENCE.THRESHOLD_MEDIUM !== 'number' ||
        config.DIVERGENCE.THRESHOLD_MEDIUM < 0 ||
        config.DIVERGENCE.THRESHOLD_MEDIUM > 1
      )
        return false;
    }

    // Validate performance settings
    if (!config.PERFORMANCE) return false;
    if (
      typeof config.PERFORMANCE.GENERATION_TIMEOUT !== 'number' ||
      config.PERFORMANCE.GENERATION_TIMEOUT < 5000
    )
      return false;

    return true;
  } catch (error) {
    console.error('[Admin] Config validation error:', error);
    return false;
  }
}
