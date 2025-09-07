# Waiting Phrases System Documentation

## Overview

The Waiting Phrases system provides natural, engaging audio feedback during voice chat interactions while the AI generates responses. This eliminates awkward silences and creates a more conversational experience.

## Table of Contents

1. [Architecture](#architecture)
2. [Configuration](#configuration)
3. [Usage](#usage)
4. [Adding New Languages](#adding-new-languages)
5. [Adding New Categories](#adding-new-categories)
6. [Translation System](#translation-system)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Voice Chat Interface                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Voice Services  │  │ Waiting Phrases │  │ Translation  │ │
│  │                 │  │ Service         │  │ Bridge       │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Configuration   │  │ Audio Queue     │  │ TTS Pipeline │ │
│  │ Loader          │  │ Manager         │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Classes

- **WaitingPhrasesService**: Main service for phrase selection and management
- **TranslationBridge**: Handles phrase translation between languages
- **Configuration Loader**: Loads and validates phrase configurations
- **Audio Queue Manager**: Manages audio playback priorities and transitions

## Configuration

### Configuration File Structure

The waiting phrases are configured in `src/lib/config/waitingPhrases.json`:

```json
{
  "phrases": {
    "category_name": {
      "language_code": [
        "phrase 1",
        "phrase 2"
      ]
    }
  },
  "settings": {
    "avoidConsecutiveRepeats": true,
    "maxPhraseLength": 10,
    "fallbackToTranslation": true,
    "defaultLanguage": "en",
    "maxHistorySize": 5
  }
}
```

### Configuration Schema

The configuration is validated against `src/lib/config/waitingPhrases.schema.json`. Key validation rules:

- Language codes must follow ISO 639-1 format (e.g., "en", "es", "ru")
- Category names must be alphanumeric with optional hyphens/underscores
- Phrases must be 1-200 characters long
- Each language must have at least 1 phrase per category

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `avoidConsecutiveRepeats` | boolean | true | Prevents same phrase from being selected twice in a row |
| `maxPhraseLength` | integer | 10 | Maximum number of words in a phrase |
| `fallbackToTranslation` | boolean | true | Use translation when native phrases unavailable |
| `defaultLanguage` | string | "en" | Fallback language when target language unavailable |
| `maxHistorySize` | integer | 5 | Number of recent phrases to remember for variety |
| `enableContextualPhrases` | boolean | true | Enable category-specific phrases |
| `cacheTimeout` | integer | 300000 | Cache timeout in milliseconds |
| `translationTimeout` | integer | 5000 | Translation request timeout |
| `maxCacheSize` | integer | 100 | Maximum cache entries |

## Usage

### Basic Integration

```javascript
import { waitingPhrasesService } from '$lib/modules/chat/waitingPhrasesService.js';

// Initialize the service
await waitingPhrasesService.initializeWaitingPhrases();

// Select a phrase
const phrase = await waitingPhrasesService.selectWaitingPhrase('en', 'general');

// Use with voice synthesis
await synthesizeWaitingPhrase(phrase, 'en');
```

### Voice Chat Integration

The system automatically integrates with voice chat through the `sendTranscribedText` function:

```javascript
// In voiceServices.js
export async function sendTranscribedText(transcription) {
  // 1. Add user message
  addMessage(MESSAGE_TYPES.USER, transcription);
  
  // 2. Trigger waiting phrase immediately
  await triggerWaitingPhrase();
  
  // 3. Generate AI response asynchronously
  const response = await generateAIResponse(transcription);
  
  // 4. Play AI response (interrupts waiting phrase)
  await synthesizeSpeech(response);
}
```

### Category-Specific Usage

```javascript
// Math-related questions
const mathPhrase = await waitingPhrasesService.selectWaitingPhrase('en', 'math');

// Creative questions
const creativePhrase = await waitingPhrasesService.selectWaitingPhrase('en', 'creative');

// General fallback
const generalPhrase = await waitingPhrasesService.selectWaitingPhrase('en', 'general');
```

## Adding New Languages

### Step 1: Add Language to Configuration

Edit `src/lib/config/waitingPhrases.json`:

```json
{
  "phrases": {
    "general": {
      "en": ["Let me think..."],
      "fr": ["Laissez-moi réfléchir..."],
      "de": ["Lassen Sie mich nachdenken..."]
    }
  }
}
```

### Step 2: Add to i18n System

Update `src/lib/modules/i18n/stores.js`:

```javascript
export const languages = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' }
];
```

### Step 3: Add Translation Mappings

Update `src/lib/modules/chat/translationBridge.js`:

```javascript
this.extendedTranslations = {
  fr: {
    thinking: 'Laissez-moi réfléchir...',
    processing: 'Traitement en cours...'
  },
  de: {
    thinking: 'Lassen Sie mich nachdenken...',
    processing: 'Verarbeitung läuft...'
  }
};
```

### Step 4: Test the Integration

```javascript
// Test phrase selection
const frenchPhrase = await waitingPhrasesService.selectWaitingPhrase('fr');
const germanPhrase = await waitingPhrasesService.selectWaitingPhrase('de');

// Test translation fallback
const translatedPhrase = await translationBridge.translatePhrase('Hello', 'fr');
```

## Adding New Categories

### Step 1: Define Category Phrases

Add to configuration file:

```json
{
  "phrases": {
    "science": {
      "en": [
        "Let me analyze the scientific aspects...",
        "Scientific questions require methodical thinking...",
        "I need to consider the evidence carefully..."
      ],
      "es": [
        "Déjame analizar los aspectos científicos...",
        "Las preguntas científicas requieren pensamiento metódico..."
      ]
    }
  }
}
```

### Step 2: Update Schema (Optional)

If you want strict validation, update the schema to include the new category in examples.

### Step 3: Add Category Detection Logic

```javascript
// In your application logic
function detectQuestionCategory(text) {
  if (/math|calculate|equation|number/i.test(text)) {
    return 'math';
  }
  if (/science|research|experiment|hypothesis/i.test(text)) {
    return 'science';
  }
  if (/creative|art|design|imagine/i.test(text)) {
    return 'creative';
  }
  return 'general';
}

// Use category-specific phrases
const category = detectQuestionCategory(userInput);
const phrase = await waitingPhrasesService.selectWaitingPhrase(language, category);
```

## Translation System

### Translation Bridge Architecture

The TranslationBridge handles phrase translation with multiple fallback mechanisms:

1. **Predefined Mappings**: Direct phrase-to-phrase translations
2. **Pattern Matching**: Regex-based pattern translation
3. **Caching**: Aggressive caching to improve performance
4. **Fallback**: Graceful degradation to English

### Adding Custom Translations

```javascript
import { translationBridge } from '$lib/modules/chat/translationBridge.js';

// Add custom phrase translation
translationBridge.addPhraseTranslation(
  'Custom waiting phrase',
  'customKey',
  {
    es: 'Frase de espera personalizada',
    fr: 'Phrase d\'attente personnalisée',
    de: 'Benutzerdefinierte Wartephrase'
  }
);
```

### Translation Performance

- Translations are cached indefinitely
- Cache size is limited to prevent memory issues
- Failed translations are cached as null to avoid retries
- Translation requests have configurable timeouts

## Error Handling

### Configuration Errors

The system handles various configuration error scenarios:

```javascript
// Configuration loading with fallback
try {
  const config = await loadWaitingPhrasesConfig();
} catch (error) {
  console.error('Config loading failed:', error);
  // Falls back to DEFAULT_PHRASES
}
```

### Translation Errors

```javascript
// Translation with retry logic
async function translateWithRetry(phrase, language, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await translatePhrase(phrase, language);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await delay(Math.pow(2, attempt) * 100); // Exponential backoff
    }
  }
}
```

### Voice Synthesis Errors

```javascript
// Graceful synthesis error handling
try {
  await synthesizeWaitingPhrase(phrase, language);
} catch (error) {
  console.warn('Waiting phrase synthesis failed, continuing without phrase');
  // Voice chat continues normally
}
```

## Performance Optimization

### Caching Strategy

1. **Phrase Cache**: Caches selected phrases by language/category
2. **Translation Cache**: Caches translation results
3. **Configuration Cache**: Caches loaded configuration
4. **LRU Eviction**: Least recently used items are evicted first

### Memory Management

```javascript
// Cache size limits
const MAX_PHRASE_CACHE_SIZE = 50;
const MAX_TRANSLATION_CACHE_SIZE = 200;
const MAX_HISTORY_SIZE = 5;

// Automatic cleanup
service.optimizeCache(); // Removes old/unused entries
service.clearAllCaches(); // Complete cache reset
```

### Lazy Loading

```javascript
// Service initialization is lazy
if (!waitingPhrasesService.isServiceInitialized()) {
  await waitingPhrasesService.initializeWaitingPhrases();
}

// Translation cache warmup
await waitingPhrasesService.warmUpTranslationCache('es');
```

## Testing

### Unit Tests

```bash
# Run phrase selection tests
npm test tests/unit/chat/waitingPhrasesService.test.js

# Run translation tests
npm test tests/unit/chat/translationBridge.test.js

# Run configuration tests
npm test tests/unit/chat/waitingPhrasesConfig.test.js
```

### Integration Tests

```bash
# Run voice flow integration tests
npm test tests/integration/chat/waitingPhrasesIntegration.test.js

# Run multilingual tests
npm test tests/unit/chat/multilingualSupport.test.js
```

### Manual Testing

```javascript
// Test phrase selection
const service = new WaitingPhrasesService();
await service.initializeWaitingPhrases();

const phrases = [];
for (let i = 0; i < 10; i++) {
  phrases.push(await service.selectWaitingPhrase('en'));
}

console.log('Selected phrases:', phrases);
console.log('Unique phrases:', new Set(phrases).size);
```

## Troubleshooting

### Common Issues

#### 1. No Phrases Selected

**Symptoms**: `selectWaitingPhrase` returns null or throws error

**Causes**:
- Configuration file not found or malformed
- Language not supported
- Category doesn't exist

**Solutions**:
```javascript
// Check service initialization
console.log('Service initialized:', service.isServiceInitialized());

// Check available languages
console.log('Available languages:', service.getAvailableLanguages('general'));

// Check configuration
console.log('Config loaded:', !!service.config);
```

#### 2. Translation Failures

**Symptoms**: Phrases always in English despite different language selection

**Causes**:
- Translation service not working
- Network issues
- Unsupported language

**Solutions**:
```javascript
// Test translation service
const isAvailable = await service.isTranslationServiceAvailable('es');
console.log('Translation available:', isAvailable);

// Check translation stats
console.log('Translation stats:', translationBridge.getTranslationStats());
```

#### 3. Performance Issues

**Symptoms**: Slow phrase selection, high memory usage

**Causes**:
- Cache not working
- Too many phrases in history
- Memory leaks

**Solutions**:
```javascript
// Check cache performance
const stats = service.getCacheStats();
console.log('Cache hit rate:', stats.hitRate);

// Optimize cache
service.optimizeCache();

// Clear cache if needed
service.clearAllCaches();
```

#### 4. Voice Synthesis Issues

**Symptoms**: Waiting phrases not playing audio

**Causes**:
- Voice mode not active
- Audio context issues
- TTS service problems

**Solutions**:
```javascript
// Check voice mode
console.log('Voice mode active:', get(isVoiceModeActive));

// Check audio queue
console.log('Audio queue status:', getAudioQueueStatus());

// Test synthesis directly
await synthesizeWaitingPhrase('Test phrase', 'en');
```

### Debug Mode

Enable detailed logging:

```javascript
// Enable debug logging in configuration
{
  "settings": {
    "enableLogging": true,
    "logLevel": "debug"
  }
}

// Or programmatically
service.config.settings.enableLogging = true;
service.config.settings.logLevel = 'debug';
```

### Performance Monitoring

```javascript
// Get detailed statistics
const detailedStats = service.getDetailedCacheStats();
console.log('Performance stats:', detailedStats);

// Monitor translation performance
const translationStats = translationBridge.getTranslationStats();
console.log('Translation performance:', translationStats);
```

## API Reference

### WaitingPhrasesService

#### Methods

- `initializeWaitingPhrases()`: Initialize the service
- `selectWaitingPhrase(language, category)`: Select a phrase
- `clearPhraseHistory()`: Clear selection history
- `warmUpTranslationCache(language)`: Pre-load translations
- `getCacheStats()`: Get cache statistics
- `optimizeCache()`: Optimize cache performance

#### Properties

- `isInitialized`: Service initialization status
- `config`: Current configuration object
- `phraseHistory`: Recent phrase selections
- `supportedLanguages`: Set of supported language codes

### TranslationBridge

#### Methods

- `translatePhrase(phrase, language)`: Translate a phrase
- `addPhraseTranslation(english, key, translations)`: Add custom translation
- `clearCache()`: Clear translation cache
- `warmUpCache(languages, phrases)`: Pre-load translations
- `getTranslationStats()`: Get translation statistics

#### Properties

- `cacheStats`: Translation cache statistics
- `supportedLanguages`: Supported languages for translation

## Best Practices

1. **Always initialize the service** before using it
2. **Handle errors gracefully** - waiting phrases should never break voice chat
3. **Use appropriate categories** for better user experience
4. **Monitor performance** in production environments
5. **Test with multiple languages** during development
6. **Keep phrases natural and conversational**
7. **Avoid overly long phrases** that might annoy users
8. **Use caching effectively** to improve performance
9. **Provide fallbacks** for all error scenarios
10. **Update translations regularly** as you add new phrases

## Contributing

When contributing new phrases or languages:

1. Follow the existing phrase style and tone
2. Ensure phrases are culturally appropriate
3. Test with native speakers when possible
4. Add comprehensive test coverage
5. Update documentation
6. Validate against the JSON schema
7. Consider performance implications

## License

This system is part of the AI Tutor project and follows the same licensing terms.