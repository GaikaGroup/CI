# Waiting Phrases Troubleshooting Guide

## Quick Diagnostics

Run this diagnostic script to quickly identify common issues:

```javascript
// Diagnostic script - paste into browser console
async function diagnoseWaitingPhrases() {
  console.log('=== Waiting Phrases Diagnostic ===');

  try {
    // Check service availability
    const { waitingPhrasesService } = await import(
      '/src/lib/modules/chat/waitingPhrasesService.js'
    );
    console.log('✓ Service module loaded');

    // Check initialization
    const isInitialized = waitingPhrasesService.isServiceInitialized();
    console.log(`${isInitialized ? '✓' : '✗'} Service initialized: ${isInitialized}`);

    if (!isInitialized) {
      console.log('Attempting to initialize...');
      await waitingPhrasesService.initializeWaitingPhrases();
      console.log('✓ Service initialized successfully');
    }

    // Check configuration
    const config = waitingPhrasesService.config;
    console.log(`${config ? '✓' : '✗'} Configuration loaded: ${!!config}`);

    if (config) {
      const categories = Object.keys(config.phrases);
      console.log(`✓ Available categories: ${categories.join(', ')}`);

      const languages = new Set();
      categories.forEach((cat) => {
        Object.keys(config.phrases[cat]).forEach((lang) => languages.add(lang));
      });
      console.log(`✓ Available languages: ${Array.from(languages).join(', ')}`);
    }

    // Test phrase selection
    console.log('\n--- Testing Phrase Selection ---');
    const testLanguages = ['en', 'es', 'ru'];

    for (const lang of testLanguages) {
      try {
        const phrase = await waitingPhrasesService.selectWaitingPhrase(lang);
        console.log(`✓ ${lang}: "${phrase.substring(0, 50)}..."`);
      } catch (error) {
        console.log(`✗ ${lang}: ${error.message}`);
      }
    }

    // Test translation
    console.log('\n--- Testing Translation ---');
    const { translationBridge } = await import('/src/lib/modules/chat/translationBridge.js');

    try {
      const translated = await translationBridge.translatePhrase(
        'Let me think about this...',
        'es'
      );
      console.log(`✓ Translation test: "${translated}"`);
    } catch (error) {
      console.log(`✗ Translation test failed: ${error.message}`);
    }

    // Check cache stats
    console.log('\n--- Cache Statistics ---');
    const cacheStats = waitingPhrasesService.getCacheStats();
    console.log('Cache stats:', cacheStats);

    const translationStats = translationBridge.getTranslationStats();
    console.log('Translation stats:', translationStats);

    console.log('\n=== Diagnostic Complete ===');
  } catch (error) {
    console.error('✗ Diagnostic failed:', error);
  }
}

// Run diagnostic
diagnoseWaitingPhrases();
```

## Common Issues and Solutions

### Issue 1: Service Not Initializing

**Symptoms:**

- `waitingPhrasesService.isServiceInitialized()` returns `false`
- Errors when calling `selectWaitingPhrase()`
- Console shows "Service not initialized" warnings

**Possible Causes:**

1. Configuration file missing or corrupted
2. Import path issues
3. Network issues loading configuration
4. JavaScript errors during initialization

**Solutions:**

```javascript
// Check if configuration file exists
fetch('/src/lib/config/waitingPhrases.json')
  .then((response) => {
    if (!response.ok) {
      console.error('Configuration file not found or inaccessible');
    }
    return response.json();
  })
  .then((config) => {
    console.log('Configuration loaded successfully:', config);
  })
  .catch((error) => {
    console.error('Failed to load configuration:', error);
  });

// Force re-initialization
waitingPhrasesService.isInitialized = false;
await waitingPhrasesService.initializeWaitingPhrases();

// Check for initialization errors
try {
  await waitingPhrasesService.initializeWaitingPhrases();
} catch (error) {
  console.error('Initialization error details:', error);
  // Check error.message for specific failure reason
}
```

### Issue 2: No Phrases Being Selected

**Symptoms:**

- `selectWaitingPhrase()` returns `null` or empty string
- Always getting the same fallback phrase
- Console shows "No phrases found" warnings

**Possible Causes:**

1. Language not supported in configuration
2. Category doesn't exist
3. Empty phrase arrays in configuration
4. Caching issues

**Solutions:**

```javascript
// Check available languages and categories
const availableLanguages = waitingPhrasesService.getAvailableLanguages('general');
console.log('Available languages:', availableLanguages);

const availableCategories = waitingPhrasesService.getAvailableCategories();
console.log('Available categories:', availableCategories);

// Check if specific language/category combination exists
const isSupported = waitingPhrasesService.isLanguageSupported('es', 'general');
console.log('Spanish general phrases supported:', isSupported);

// Clear cache and try again
waitingPhrasesService.clearAllCaches();
const phrase = await waitingPhrasesService.selectWaitingPhrase('en', 'general');

// Check configuration directly
const config = waitingPhrasesService.config;
console.log('General English phrases:', config?.phrases?.general?.en);
```

### Issue 3: Translation Not Working

**Symptoms:**

- Always getting English phrases regardless of selected language
- Translation errors in console
- `translationBridge.translatePhrase()` returns `null`

**Possible Causes:**

1. Translation service not initialized
2. Unsupported language for translation
3. Network issues
4. Translation cache corruption

**Solutions:**

```javascript
// Test translation service availability
const isAvailable = await waitingPhrasesService.isTranslationServiceAvailable('es');
console.log('Translation service available for Spanish:', isAvailable);

// Check translation bridge directly
import { translationBridge } from '/src/lib/modules/chat/translationBridge.js';

// Test basic translation
const result = await translationBridge.translatePhrase('Hello', 'es');
console.log('Translation result:', result);

// Check supported languages
const supportedLangs = translationBridge.getSupportedLanguages();
console.log('Translation supported languages:', supportedLangs);

// Clear translation cache
translationBridge.clearCache();

// Check translation statistics
const stats = translationBridge.getTranslationStats();
console.log('Translation stats:', stats);
```

### Issue 4: Performance Problems

**Symptoms:**

- Slow phrase selection (>1 second)
- High memory usage
- Browser becoming unresponsive
- Cache hit rate very low

**Possible Causes:**

1. Cache not working properly
2. Too many phrases in history
3. Memory leaks in caching system
4. Inefficient phrase selection algorithm

**Solutions:**

```javascript
// Check cache performance
const cacheStats = waitingPhrasesService.getCacheStats();
console.log('Cache hit rate:', cacheStats.hitRate);
console.log('Cache size:', cacheStats.size);

// Optimize cache
waitingPhrasesService.optimizeCache();

// Check detailed cache statistics
const detailedStats = waitingPhrasesService.getDetailedCacheStats();
console.log('Detailed cache stats:', detailedStats);

// Monitor phrase selection performance
const startTime = performance.now();
const phrase = await waitingPhrasesService.selectWaitingPhrase('en');
const endTime = performance.now();
console.log(`Phrase selection took ${endTime - startTime} milliseconds`);

// Clear all caches if performance is poor
if (cacheStats.hitRate < 0.5) {
  console.log('Poor cache performance, clearing caches...');
  waitingPhrasesService.clearAllCaches();
}
```

### Issue 5: Voice Synthesis Not Playing

**Symptoms:**

- Phrases are selected but no audio plays
- Console shows synthesis errors
- Audio queue shows waiting phrases but they don't play

**Possible Causes:**

1. Voice mode not active
2. Audio context issues
3. TTS service problems
4. Audio queue management issues

**Solutions:**

```javascript
// Check voice mode status
import { isVoiceModeActive, getAudioQueueStatus } from '/src/lib/modules/chat/voiceServices.js';
import { get } from 'svelte/store';

console.log('Voice mode active:', get(isVoiceModeActive));

// Check audio queue
const queueStatus = getAudioQueueStatus();
console.log('Audio queue status:', queueStatus);

// Test synthesis directly
import { synthesizeWaitingPhrase } from '/src/lib/modules/chat/voiceServices.js';

try {
  await synthesizeWaitingPhrase('Test phrase', 'en');
  console.log('Direct synthesis successful');
} catch (error) {
  console.error('Direct synthesis failed:', error);
}

// Check audio context
console.log('Audio context state:', audioContext?.state);

// Force audio context resume if suspended
if (audioContext?.state === 'suspended') {
  await audioContext.resume();
  console.log('Audio context resumed');
}
```

### Issue 6: Configuration Validation Errors

**Symptoms:**

- Console shows configuration validation errors
- Service falls back to default phrases
- Specific languages or categories not working

**Possible Causes:**

1. Invalid JSON syntax in configuration file
2. Schema validation failures
3. Missing required fields
4. Invalid language codes or category names

**Solutions:**

```javascript
// Validate configuration manually
import { validateConfiguration } from '/src/lib/modules/chat/waitingPhrasesConfig.js';

const config = await fetch('/src/lib/config/waitingPhrases.json').then((r) => r.json());
const validation = validateConfiguration(config);

if (!validation.isValid) {
  console.error('Configuration validation errors:');
  validation.errors.forEach((error, index) => {
    console.error(`${index + 1}. ${error}`);
  });
} else {
  console.log('Configuration is valid');
}

// Check specific configuration sections
console.log('Phrases section:', config.phrases);
console.log('Settings section:', config.settings);

// Validate language codes
const languageCodes = new Set();
Object.values(config.phrases).forEach((category) => {
  Object.keys(category).forEach((lang) => languageCodes.add(lang));
});

console.log('Found language codes:', Array.from(languageCodes));

// Check for empty phrase arrays
Object.entries(config.phrases).forEach(([category, languages]) => {
  Object.entries(languages).forEach(([lang, phrases]) => {
    if (!Array.isArray(phrases) || phrases.length === 0) {
      console.warn(`Empty phrases for ${lang}/${category}`);
    }
  });
});
```

## Advanced Debugging

### Enable Debug Logging

```javascript
// Enable comprehensive logging
waitingPhrasesService.config.settings.enableLogging = true;
waitingPhrasesService.config.settings.logLevel = 'debug';

// Or modify configuration file
{
  "settings": {
    "enableLogging": true,
    "logLevel": "debug"
  }
}
```

### Monitor Service State

```javascript
// Create monitoring function
function monitorWaitingPhrases() {
  const monitor = {
    serviceState: waitingPhrasesService.isServiceInitialized(),
    cacheStats: waitingPhrasesService.getCacheStats(),
    translationStats: translationBridge.getTranslationStats(),
    voiceMode: get(isVoiceModeActive),
    audioQueue: getAudioQueueStatus(),
    timestamp: new Date().toISOString()
  };

  console.log('Waiting Phrases Monitor:', monitor);
  return monitor;
}

// Run monitoring every 5 seconds
const monitorInterval = setInterval(monitorWaitingPhrases, 5000);

// Stop monitoring
// clearInterval(monitorInterval);
```

### Test All Language Combinations

```javascript
// Comprehensive language testing
async function testAllLanguages() {
  const categories = waitingPhrasesService.getAvailableCategories();
  const results = {};

  for (const category of categories) {
    results[category] = {};
    const languages = waitingPhrasesService.getAvailableLanguages(category);

    for (const language of languages) {
      try {
        const phrase = await waitingPhrasesService.selectWaitingPhrase(language, category);
        results[category][language] = {
          success: true,
          phrase: phrase.substring(0, 50) + '...',
          length: phrase.length
        };
      } catch (error) {
        results[category][language] = {
          success: false,
          error: error.message
        };
      }
    }
  }

  console.log('Language test results:', results);
  return results;
}

await testAllLanguages();
```

### Memory Usage Analysis

```javascript
// Analyze memory usage
function analyzeMemoryUsage() {
  const analysis = {
    phraseCache: {
      size: waitingPhrasesService.phraseCache?.size || 0,
      entries: []
    },
    translationCache: {
      size: translationBridge.translationCache?.size || 0,
      entries: []
    },
    phraseHistory: {
      size: waitingPhrasesService.phraseHistory?.length || 0,
      entries: waitingPhrasesService.phraseHistory || []
    }
  };

  // Analyze phrase cache entries
  if (waitingPhrasesService.phraseCache) {
    for (const [key, entry] of waitingPhrasesService.phraseCache.entries()) {
      analysis.phraseCache.entries.push({
        key,
        phraseCount: entry.phrases?.length || 0,
        accessCount: entry.accessCount || 0,
        lastAccessed: new Date(entry.lastAccessed || 0).toISOString(),
        ageMinutes: Math.round((Date.now() - (entry.timestamp || 0)) / 60000)
      });
    }
  }

  // Analyze translation cache entries
  if (translationBridge.translationCache) {
    for (const [key, value] of translationBridge.translationCache.entries()) {
      const [phrase, lang] = key.split(':');
      analysis.translationCache.entries.push({
        phrase: phrase.substring(0, 30) + '...',
        language: lang,
        hasTranslation: value !== null,
        translationLength: value?.length || 0
      });
    }
  }

  console.log('Memory usage analysis:', analysis);
  return analysis;
}

analyzeMemoryUsage();
```

## Error Codes Reference

| Code  | Description                            | Solution                                          |
| ----- | -------------------------------------- | ------------------------------------------------- |
| WP001 | Service not initialized                | Call `initializeWaitingPhrases()`                 |
| WP002 | Configuration loading failed           | Check configuration file exists and is valid JSON |
| WP003 | No phrases found for language/category | Add phrases to configuration or use fallback      |
| WP004 | Translation service unavailable        | Check network connection and translation bridge   |
| WP005 | Voice synthesis failed                 | Check TTS service and audio context               |
| WP006 | Cache corruption detected              | Clear caches with `clearAllCaches()`              |
| WP007 | Invalid language code                  | Use valid ISO 639-1 language codes                |
| WP008 | Configuration validation failed        | Fix configuration according to schema             |

## Performance Benchmarks

Expected performance metrics:

- **Phrase Selection**: < 10ms (cached), < 50ms (uncached)
- **Translation**: < 100ms (cached), < 2000ms (uncached)
- **Service Initialization**: < 500ms
- **Cache Hit Rate**: > 80% after warmup
- **Memory Usage**: < 10MB for typical usage

If your metrics are significantly worse than these benchmarks, investigate caching issues or configuration problems.

## Getting Help

If you're still experiencing issues after following this guide:

1. **Check the main documentation**: `docs/waiting-phrases.md`
2. **Run the diagnostic script** provided at the top of this guide
3. **Enable debug logging** and examine console output
4. **Check browser developer tools** for network errors or JavaScript exceptions
5. **Test with a minimal configuration** to isolate the problem
6. **Create a reproducible test case** for bug reports

## Reporting Issues

When reporting issues, please include:

1. **Diagnostic script output**
2. **Browser and version**
3. **Configuration file** (sanitized if needed)
4. **Console logs** with debug logging enabled
5. **Steps to reproduce** the issue
6. **Expected vs actual behavior**

This information will help identify and resolve issues quickly.
