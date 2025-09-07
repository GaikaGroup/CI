/**
 * Waiting Phrases Configuration Loader
 * Handles loading, validation, and fallback for waiting phrases configuration
 */

import waitingPhrasesData from '../../config/waitingPhrases.json';

/**
 * Default fallback phrases in case configuration loading fails
 */
const DEFAULT_PHRASES = {
  phrases: {
    general: {
      en: [
        "Let me think about this...",
        "Give me a moment to process this...",
        "Hmm, interesting question...",
        "I need to consider this carefully...",
        "Let me gather my thoughts..."
      ]
    }
  },
  settings: {
    avoidConsecutiveRepeats: true,
    maxPhraseLength: 8,
    fallbackToTranslation: true,
    defaultLanguage: "en",
    maxHistorySize: 5,
    enableContextualPhrases: false
  }
};

/**
 * Validates the structure of a phrases configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateConfiguration(config) {
  const errors = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be a valid object');
    return { isValid: false, errors };
  }

  // Validate phrases structure
  if (!config.phrases || typeof config.phrases !== 'object') {
    errors.push('Configuration must contain a "phrases" object');
  } else {
    // Validate phrase categories
    for (const [category, languages] of Object.entries(config.phrases)) {
      if (!languages || typeof languages !== 'object') {
        errors.push(`Category "${category}" must contain language objects`);
        continue;
      }
      
      // Validate language entries
      for (const [lang, phrases] of Object.entries(languages)) {
        if (!Array.isArray(phrases)) {
          errors.push(`Language "${lang}" in category "${category}" must contain an array of phrases`);
          continue;
        }
        
        if (phrases.length === 0) {
          errors.push(`Language "${lang}" in category "${category}" must contain at least one phrase`);
          continue;
        }
        
        // Validate individual phrases
        phrases.forEach((phrase, index) => {
          if (typeof phrase !== 'string' || phrase.trim().length === 0) {
            errors.push(`Phrase ${index} in "${lang}/${category}" must be a non-empty string`);
          }
        });
      }
    }
  }

  // Validate settings structure
  if (!config.settings || typeof config.settings !== 'object') {
    errors.push('Configuration must contain a "settings" object');
  } else {
    const settings = config.settings;
    
    // Validate required settings
    if (typeof settings.avoidConsecutiveRepeats !== 'boolean') {
      errors.push('Setting "avoidConsecutiveRepeats" must be a boolean');
    }
    
    if (typeof settings.maxPhraseLength !== 'number' || settings.maxPhraseLength < 1) {
      errors.push('Setting "maxPhraseLength" must be a positive number');
    }
    
    if (typeof settings.fallbackToTranslation !== 'boolean') {
      errors.push('Setting "fallbackToTranslation" must be a boolean');
    }
    
    if (typeof settings.defaultLanguage !== 'string' || settings.defaultLanguage.length === 0) {
      errors.push('Setting "defaultLanguage" must be a non-empty string');
    }
    
    if (typeof settings.maxHistorySize !== 'number' || settings.maxHistorySize < 1) {
      errors.push('Setting "maxHistorySize" must be a positive number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Merges user configuration with default configuration
 * @param {Object} userConfig - User-provided configuration
 * @param {Object} defaultConfig - Default fallback configuration
 * @returns {Object} Merged configuration
 */
function mergeWithDefaults(userConfig, defaultConfig) {
  const merged = {
    phrases: { ...defaultConfig.phrases },
    settings: { ...defaultConfig.settings }
  };

  if (userConfig.phrases) {
    for (const [category, languages] of Object.entries(userConfig.phrases)) {
      if (!merged.phrases[category]) {
        merged.phrases[category] = {};
      }
      
      for (const [lang, phrases] of Object.entries(languages)) {
        if (Array.isArray(phrases) && phrases.length > 0) {
          merged.phrases[category][lang] = [...phrases];
        }
      }
    }
  }

  if (userConfig.settings) {
    Object.assign(merged.settings, userConfig.settings);
  }

  return merged;
}

/**
 * Loads and validates waiting phrases configuration with comprehensive error handling
 * @returns {Promise<Object>} Promise resolving to validated configuration
 */
export async function loadWaitingPhrasesConfig() {
  const startTime = Date.now();
  let config = null;
  let configSource = 'unknown';
  
  try {
    console.log('Loading waiting phrases configuration...');
    
    // Attempt to load configuration from imported JSON
    try {
      config = waitingPhrasesData;
      configSource = 'imported-json';
      console.log('Configuration loaded from imported JSON file');
    } catch (importError) {
      console.warn('Failed to load configuration from imported JSON:', importError);
      throw new Error(`Configuration import failed: ${importError.message}`);
    }
    
    // Validate the loaded configuration
    console.log('Validating configuration structure...');
    const validation = validateConfiguration(config);
    
    if (!validation.isValid) {
      console.error('Configuration validation failed with errors:', validation.errors);
      
      // Log detailed validation errors for debugging
      validation.errors.forEach((error, index) => {
        console.error(`Validation error ${index + 1}: ${error}`);
      });
      
      // Attempt to repair configuration if possible
      console.log('Attempting to repair configuration...');
      const repairedConfig = attemptConfigurationRepair(config);
      
      if (repairedConfig) {
        const repairValidation = validateConfiguration(repairedConfig);
        if (repairValidation.isValid) {
          console.log('Configuration successfully repaired');
          config = repairedConfig;
          configSource = 'repaired';
        } else {
          console.warn('Configuration repair failed, using default configuration');
          config = DEFAULT_PHRASES;
          configSource = 'default-fallback';
        }
      } else {
        console.warn('Configuration repair not possible, using default configuration');
        config = DEFAULT_PHRASES;
        configSource = 'default-fallback';
      }
    } else {
      console.log('Configuration validation successful');
      // Merge with defaults to ensure all required fields are present
      config = mergeWithDefaults(config, DEFAULT_PHRASES);
      configSource = 'validated-merged';
    }
    
    // Final validation of the configuration
    const finalValidation = validateConfiguration(config);
    if (!finalValidation.isValid) {
      console.error('Final configuration validation failed, this should not happen');
      config = DEFAULT_PHRASES;
      configSource = 'emergency-default';
    }
    
    const loadTime = Date.now() - startTime;
    console.log(`Configuration loaded successfully in ${loadTime}ms (source: ${configSource})`);
    
    // Log configuration statistics
    logConfigurationStats(config, configSource);
    
    return config;
    
  } catch (error) {
    const loadTime = Date.now() - startTime;
    console.error(`Failed to load waiting phrases configuration after ${loadTime}ms:`, error);
    
    // Log error details for debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      configSource,
      timestamp: new Date().toISOString(),
      loadTime
    };
    console.error('Configuration loading error details:', errorDetails);
    
    console.warn('Using default configuration as emergency fallback');
    
    // Ensure default configuration is valid
    const defaultValidation = validateConfiguration(DEFAULT_PHRASES);
    if (!defaultValidation.isValid) {
      console.error('CRITICAL: Default configuration is invalid!', defaultValidation.errors);
      // Create minimal emergency configuration
      return createEmergencyConfiguration();
    }
    
    return DEFAULT_PHRASES;
  }
}

/**
 * Attempt to repair a malformed configuration
 * @param {Object} config - Malformed configuration
 * @returns {Object|null} Repaired configuration or null if repair not possible
 */
function attemptConfigurationRepair(config) {
  try {
    console.log('Attempting configuration repair...');
    
    if (!config || typeof config !== 'object') {
      console.log('Configuration is not an object, cannot repair');
      return null;
    }
    
    const repaired = {
      phrases: {},
      settings: {}
    };
    
    // Repair phrases section
    if (config.phrases && typeof config.phrases === 'object') {
      for (const [category, languages] of Object.entries(config.phrases)) {
        if (languages && typeof languages === 'object') {
          repaired.phrases[category] = {};
          
          for (const [lang, phrases] of Object.entries(languages)) {
            if (Array.isArray(phrases)) {
              // Filter out invalid phrases
              const validPhrases = phrases.filter(phrase => 
                typeof phrase === 'string' && phrase.trim().length > 0
              );
              
              if (validPhrases.length > 0) {
                repaired.phrases[category][lang] = validPhrases;
              }
            }
          }
        }
      }
    }
    
    // Ensure at least one category exists
    if (Object.keys(repaired.phrases).length === 0) {
      repaired.phrases.general = DEFAULT_PHRASES.phrases.general;
    }
    
    // Repair settings section
    if (config.settings && typeof config.settings === 'object') {
      repaired.settings = { ...DEFAULT_PHRASES.settings, ...config.settings };
      
      // Validate and fix individual settings
      if (typeof repaired.settings.avoidConsecutiveRepeats !== 'boolean') {
        repaired.settings.avoidConsecutiveRepeats = DEFAULT_PHRASES.settings.avoidConsecutiveRepeats;
      }
      
      if (typeof repaired.settings.maxPhraseLength !== 'number' || repaired.settings.maxPhraseLength < 1) {
        repaired.settings.maxPhraseLength = DEFAULT_PHRASES.settings.maxPhraseLength;
      }
      
      if (typeof repaired.settings.fallbackToTranslation !== 'boolean') {
        repaired.settings.fallbackToTranslation = DEFAULT_PHRASES.settings.fallbackToTranslation;
      }
      
      if (typeof repaired.settings.defaultLanguage !== 'string' || repaired.settings.defaultLanguage.length === 0) {
        repaired.settings.defaultLanguage = DEFAULT_PHRASES.settings.defaultLanguage;
      }
      
      if (typeof repaired.settings.maxHistorySize !== 'number' || repaired.settings.maxHistorySize < 1) {
        repaired.settings.maxHistorySize = DEFAULT_PHRASES.settings.maxHistorySize;
      }
    } else {
      repaired.settings = { ...DEFAULT_PHRASES.settings };
    }
    
    console.log('Configuration repair completed');
    return repaired;
    
  } catch (repairError) {
    console.error('Configuration repair failed:', repairError);
    return null;
  }
}

/**
 * Create minimal emergency configuration when all else fails
 * @returns {Object} Emergency configuration
 */
function createEmergencyConfiguration() {
  console.warn('Creating emergency configuration');
  
  return {
    phrases: {
      general: {
        en: [
          "Please wait...",
          "Processing...",
          "One moment..."
        ]
      }
    },
    settings: {
      avoidConsecutiveRepeats: false,
      maxPhraseLength: 3,
      fallbackToTranslation: false,
      defaultLanguage: "en",
      maxHistorySize: 3,
      enableContextualPhrases: false
    }
  };
}

/**
 * Log configuration statistics for monitoring
 * @param {Object} config - Configuration object
 * @param {string} source - Configuration source
 */
function logConfigurationStats(config, source) {
  try {
    const stats = {
      source,
      categories: Object.keys(config.phrases).length,
      totalLanguages: new Set(),
      totalPhrases: 0,
      settings: Object.keys(config.settings).length
    };
    
    // Count languages and phrases
    for (const category of Object.keys(config.phrases)) {
      const languages = Object.keys(config.phrases[category]);
      languages.forEach(lang => stats.totalLanguages.add(lang));
      
      for (const lang of languages) {
        const phrases = config.phrases[category][lang];
        if (Array.isArray(phrases)) {
          stats.totalPhrases += phrases.length;
        }
      }
    }
    
    stats.totalLanguages = stats.totalLanguages.size;
    
    console.log('Configuration statistics:', stats);
    
  } catch (error) {
    console.warn('Failed to generate configuration statistics:', error);
  }
}

/**
 * Gets phrases for a specific language and category
 * @param {Object} config - Configuration object
 * @param {string} language - Target language code
 * @param {string} category - Phrase category (default: 'general')
 * @returns {Array<string>} Array of phrases for the specified language and category
 */
export function getPhrasesForLanguage(config, language, category = 'general') {
  try {
    // Check if category exists
    if (!config.phrases[category]) {
      console.warn(`Category "${category}" not found, falling back to "general"`);
      category = 'general';
    }
    
    // Check if language exists in category
    if (config.phrases[category][language]) {
      return config.phrases[category][language];
    }
    
    // Fallback to default language
    const defaultLang = config.settings.defaultLanguage;
    if (config.phrases[category][defaultLang]) {
      console.warn(`Language "${language}" not found in category "${category}", falling back to "${defaultLang}"`);
      return config.phrases[category][defaultLang];
    }
    
    // Final fallback to any available language in the category
    const availableLanguages = Object.keys(config.phrases[category]);
    if (availableLanguages.length > 0) {
      const fallbackLang = availableLanguages[0];
      console.warn(`Default language "${defaultLang}" not found, using "${fallbackLang}"`);
      return config.phrases[category][fallbackLang];
    }
    
    // Ultimate fallback to default phrases
    console.error(`No phrases found for category "${category}", using default phrases`);
    return DEFAULT_PHRASES.phrases.general.en;
    
  } catch (error) {
    console.error('Error getting phrases for language:', error);
    return DEFAULT_PHRASES.phrases.general.en;
  }
}

/**
 * Gets available languages for a specific category
 * @param {Object} config - Configuration object
 * @param {string} category - Phrase category (default: 'general')
 * @returns {Array<string>} Array of available language codes
 */
export function getAvailableLanguages(config, category = 'general') {
  try {
    if (!config.phrases[category]) {
      return [];
    }
    return Object.keys(config.phrases[category]);
  } catch (error) {
    console.error('Error getting available languages:', error);
    return [];
  }
}

/**
 * Gets available categories in the configuration
 * @param {Object} config - Configuration object
 * @returns {Array<string>} Array of available category names
 */
export function getAvailableCategories(config) {
  try {
    return Object.keys(config.phrases);
  } catch (error) {
    console.error('Error getting available categories:', error);
    return ['general'];
  }
}

/**
 * Checks if a language is supported in a specific category
 * @param {Object} config - Configuration object
 * @param {string} language - Language code to check
 * @param {string} category - Phrase category (default: 'general')
 * @returns {boolean} True if language is supported
 */
export function isLanguageSupported(config, language, category = 'general') {
  try {
    return !!(config.phrases[category] && 
              config.phrases[category][language] && 
              Array.isArray(config.phrases[category][language]) &&
              config.phrases[category][language].length > 0);
  } catch (error) {
    console.error('Error checking language support:', error);
    return false;
  }
}

export { validateConfiguration, mergeWithDefaults, DEFAULT_PHRASES };