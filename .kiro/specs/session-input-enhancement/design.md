# Session Input Enhancement - Design Document

## Overview

This design document outlines the architecture and implementation approach for enhancing the session chat interface with rotating input placeholders, a command menu system, and contextual help tips. The enhancement follows the established patterns from the waiting phrases feature, using centralized JSON configuration files with multilingual support.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ChatInterface.svelte                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              MessageInput.svelte                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ Command Menu │  │ Input Field  │  │ Help Tip   │  │  │
│  │  │   Button     │  │ w/ Rotating  │  │  Display   │  │  │
│  │  │              │  │ Placeholders │  │            │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ InputPlaceholder │  │ TutorCommands    │  │ HelpTips  │ │
│  │    Service       │  │    Service       │  │  Service  │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Configuration Files (JSON)                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ inputPlaceholders│  │ tutorCommands    │  │ helpTips  │ │
│  │     .json        │  │     .json        │  │   .json   │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Decisions

**1. Follow Waiting Phrases Pattern**

- Rationale: The waiting phrases feature provides a proven, well-tested pattern for multilingual configuration management
- Benefits: Consistency, maintainability, reduced learning curve for developers
- Implementation: Use similar JSON structure, service architecture, and validation schemas

**2. Centralized Configuration**

- Rationale: Separating content from code makes it easier to update, translate, and maintain
- Benefits: Non-developers can update content, easier A/B testing, simpler localization workflow
- Implementation: Store all content in `src/lib/config/` directory with JSON schemas

**3. Service-Based Architecture**

- Rationale: Encapsulate business logic in reusable services
- Benefits: Testability, separation of concerns, easier to mock for testing
- Implementation: Create dedicated service classes for each feature

**4. Lazy Loading and Caching**

- Rationale: Improve initial load performance and reduce redundant operations
- Benefits: Faster page loads, reduced memory usage, better user experience
- Implementation: Load configurations on-demand and cache results

**5. Keyboard-First Design**

- Rationale: Power users benefit from keyboard shortcuts
- Benefits: Improved accessibility, faster workflow for frequent users
- Implementation: Support "/" key to trigger command menu

## Components and Interfaces

### 1. Enhanced MessageInput Component

**Location:** `src/lib/modules/chat/components/MessageInput.svelte`

**Responsibilities:**

- Display rotating input placeholders
- Render command menu button and dropdown
- Show contextual help tip
- Handle user interactions with commands
- Maintain existing image upload and send functionality

**Component Structure:**

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { Target } from 'lucide-svelte'; // Command menu icon
  import InputPlaceholderService from '../services/InputPlaceholderService';
  import TutorCommandsService from '../services/TutorCommandsService';
  import HelpTipsService from '../services/HelpTipsService';

  let currentPlaceholder = '';
  let showCommandMenu = false;
  let commands = [];
  let helpTip = '';
  let placeholderInterval;

  // Existing props and state...
</script>

<div class="input-container">
  <!-- Command Menu Button -->
  <button class="command-menu-button" on:click={toggleCommandMenu}>
    <Target />
  </button>

  <!-- Input Field with Rotating Placeholder -->
  <input
    type="text"
    placeholder={currentPlaceholder}
    on:keydown={handleKeyDown}
    bind:value={$inputMessage}
  />

  <!-- Command Menu Dropdown -->
  {#if showCommandMenu}
    <CommandMenu {commands} on:select={handleCommandSelect} />
  {/if}

  <!-- Help Tip -->
  <div class="help-tip">{helpTip}</div>
</div>
```

**Key Features:**

- Placeholder rotation every 5 seconds
- Command menu toggle on button click or "/" key
- Automatic command insertion on selection
- Smooth fade transitions for placeholder changes

### 2. CommandMenu Component

**Location:** `src/lib/modules/chat/components/CommandMenu.svelte`

**Responsibilities:**

- Display list of available commands
- Handle command selection
- Support keyboard navigation (arrow keys, Enter)
- Close on outside click or Escape key

**Component Structure:**

```svelte
<script>
  import { createEventDispatcher } from 'svelte';

  export let commands = [];
  export let visible = false;

  const dispatch = createEventDispatcher();
  let selectedIndex = 0;

  function selectCommand(command) {
    dispatch('select', command);
  }
</script>

{#if visible}
  <div class="command-menu-dropdown">
    {#each commands as command, index}
      <button
        class="command-item"
        class:selected={index === selectedIndex}
        on:click={() => selectCommand(command)}
      >
        <span class="command-name">{command.name}</span>
        <span class="command-description">{command.description}</span>
      </button>
    {/each}
  </div>
{/if}
```

**Styling:**

- Dropdown positioned below command button
- Hover and keyboard selection states
- Smooth animations for open/close
- Responsive design for mobile

### 3. InputPlaceholderService

**Location:** `src/lib/modules/chat/services/InputPlaceholderService.js`

**Responsibilities:**

- Load placeholder configuration from JSON
- Select random placeholders for rotation
- Track placeholder history to avoid repeats
- Support language switching

**Service Interface:**

```javascript
class InputPlaceholderService {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.placeholderHistory = [];
    this.currentLanguage = null;
  }

  async initialize() {
    // Load configuration from inputPlaceholders.json
  }

  getPlaceholder(language, category = 'general') {
    // Return random placeholder avoiding recent repeats
  }

  getPlaceholderSequence(language, count = 10) {
    // Return array of placeholders for rotation
  }

  isLanguageSupported(language) {
    // Check if language has placeholders
  }
}

export const inputPlaceholderService = new InputPlaceholderService();
```

**Key Features:**

- Lazy initialization on first use
- Caching of loaded configuration
- History tracking (last 3 placeholders)
- Fallback to English if language not supported

### 4. TutorCommandsService

**Location:** `src/lib/modules/chat/services/TutorCommandsService.js`

**Responsibilities:**

- Load command definitions from JSON
- Provide localized command names and descriptions
- Support command filtering and search
- Validate command syntax

**Service Interface:**

```javascript
class TutorCommandsService {
  constructor() {
    this.config = null;
    this.isInitialized = false;
  }

  async initialize() {
    // Load configuration from tutorCommands.json
  }

  getCommands(language) {
    // Return array of commands for language
    // Returns: [{ id, name, description, syntax }]
  }

  getCommandByName(name, language) {
    // Find command by localized name
  }

  formatCommand(commandId, language) {
    // Return formatted command string (e.g., "/solve")
  }
}

export const tutorCommandsService = new TutorCommandsService();
```

**Command Structure:**

```javascript
{
  id: 'solve',
  translations: {
    en: { name: '/solve', description: 'Solve a problem step by step' },
    ru: { name: '/решить', description: 'Решить задачу пошагово' },
    es: { name: '/resolver', description: 'Resolver un problema paso a paso' }
  }
}
```

### 5. HelpTipsService

**Location:** `src/lib/modules/chat/services/HelpTipsService.js`

**Responsibilities:**

- Load help tip configuration from JSON
- Provide localized help tips
- Support contextual tips based on user state

**Service Interface:**

```javascript
class HelpTipsService {
  constructor() {
    this.config = null;
    this.isInitialized = false;
  }

  async initialize() {
    // Load configuration from helpTips.json
  }

  getTip(language, context = 'default') {
    // Return help tip for language and context
  }

  getAllTips(language) {
    // Return all tips for language
  }
}

export const helpTipsService = new HelpTipsService();
```

**Tip Structure:**

```javascript
{
  context: 'default',
  translations: {
    en: 'Tip: The more detailed your question, the better the answer!',
    ru: 'Совет: Чем подробнее вопрос, тем лучше ответ!',
    es: '¡Consejo: Cuanto más detallada sea tu pregunta, mejor será la respuesta!'
  }
}
```

## Data Models

### Input Placeholders Configuration

**File:** `src/lib/config/inputPlaceholders.json`

**Structure:**

```json
{
  "$schema": "./inputPlaceholders.schema.json",
  "version": "1.0.0",
  "description": "Input placeholder examples for session chat",
  "lastUpdated": "2025-10-20",
  "placeholders": {
    "general": {
      "en": [
        "Ask me anything about math, science, or writing...",
        "What would you like to learn today?",
        "Need help with homework? Just ask!",
        "Explain a concept, solve a problem, or practice a skill...",
        "Type your question here..."
      ],
      "ru": [
        "Спроси меня о математике, науке или письме...",
        "Что бы ты хотел изучить сегодня?",
        "Нужна помощь с домашним заданием? Просто спроси!",
        "Объясни концепцию, реши задачу или попрактикуйся...",
        "Введи свой вопрос здесь..."
      ],
      "es": [
        "Pregúntame sobre matemáticas, ciencias o escritura...",
        "¿Qué te gustaría aprender hoy?",
        "¿Necesitas ayuda con la tarea? ¡Solo pregunta!",
        "Explica un concepto, resuelve un problema o practica...",
        "Escribe tu pregunta aquí..."
      ]
    },
    "mathematics": {
      "en": [
        "Solve this equation: 2x + 5 = 15",
        "Explain how to find the derivative of x²",
        "Help me understand quadratic equations"
      ],
      "ru": [
        "Реши это уравнение: 2x + 5 = 15",
        "Объясни, как найти производную x²",
        "Помоги мне понять квадратные уравнения"
      ],
      "es": [
        "Resuelve esta ecuación: 2x + 5 = 15",
        "Explica cómo encontrar la derivada de x²",
        "Ayúdame a entender las ecuaciones cuadráticas"
      ]
    }
  },
  "settings": {
    "rotationInterval": 5000,
    "avoidRecentRepeats": true,
    "historySize": 3,
    "defaultLanguage": "en"
  }
}
```

### Tutor Commands Configuration

**File:** `src/lib/config/tutorCommands.json`

**Structure:**

```json
{
  "$schema": "./tutorCommands.schema.json",
  "version": "1.0.0",
  "description": "Tutor command definitions with multilingual support",
  "lastUpdated": "2025-10-20",
  "commands": [
    {
      "id": "solve",
      "category": "problem-solving",
      "translations": {
        "en": {
          "name": "/solve",
          "description": "Solve a problem step by step"
        },
        "ru": {
          "name": "/решить",
          "description": "Решить задачу пошагово"
        },
        "es": {
          "name": "/resolver",
          "description": "Resolver un problema paso a paso"
        }
      }
    },
    {
      "id": "explain",
      "category": "understanding",
      "translations": {
        "en": {
          "name": "/explain",
          "description": "Explain a concept in detail"
        },
        "ru": {
          "name": "/объяснить",
          "description": "Подробно объяснить концепцию"
        },
        "es": {
          "name": "/explicar",
          "description": "Explicar un concepto en detalle"
        }
      }
    },
    {
      "id": "check",
      "category": "validation",
      "translations": {
        "en": {
          "name": "/check",
          "description": "Check your work for errors"
        },
        "ru": {
          "name": "/проверить",
          "description": "Проверить работу на ошибки"
        },
        "es": {
          "name": "/verificar",
          "description": "Verificar tu trabajo en busca de errores"
        }
      }
    }
  ],
  "settings": {
    "enableKeyboardShortcut": true,
    "shortcutKey": "/",
    "defaultLanguage": "en"
  }
}
```

### Help Tips Configuration

**File:** `src/lib/config/helpTips.json`

**Structure:**

```json
{
  "$schema": "./helpTips.schema.json",
  "version": "1.0.0",
  "description": "Contextual help tips for session interface",
  "lastUpdated": "2025-10-20",
  "tips": {
    "default": {
      "en": "Tip: The more detailed your question, the better the answer!",
      "ru": "Совет: Чем подробнее вопрос, тем лучше ответ!",
      "es": "¡Consejo: Cuanto más detallada sea tu pregunta, mejor será la respuesta!"
    },
    "with-images": {
      "en": "Tip: Upload images of problems for visual analysis",
      "ru": "Совет: Загрузите изображения задач для визуального анализа",
      "es": "Consejo: Sube imágenes de problemas para análisis visual"
    },
    "commands": {
      "en": "Tip: Use / to see available commands",
      "ru": "Совет: Используй / чтобы увидеть доступные команды",
      "es": "Consejo: Usa / para ver los comandos disponibles"
    }
  },
  "settings": {
    "displayDuration": 0,
    "fadeTransition": true,
    "defaultLanguage": "en"
  }
}
```

## Error Handling

### Configuration Loading Errors

**Strategy:** Graceful degradation with fallback content

**Implementation:**

```javascript
async initialize() {
  try {
    this.config = await loadConfig('inputPlaceholders.json');
    this.isInitialized = true;
  } catch (error) {
    console.error('Failed to load placeholders:', error);
    // Use hardcoded fallback
    this.config = {
      placeholders: {
        general: {
          en: ['Type your question here...']
        }
      }
    };
    this.isInitialized = true;
  }
}
```

### Missing Translations

**Strategy:** Fallback to English, then to default placeholder

**Implementation:**

```javascript
getPlaceholder(language) {
  // Try requested language
  let placeholders = this.config.placeholders.general[language];

  if (!placeholders || placeholders.length === 0) {
    // Fallback to English
    placeholders = this.config.placeholders.general['en'];
  }

  if (!placeholders || placeholders.length === 0) {
    // Ultimate fallback
    return 'Type your question here...';
  }

  return this.selectRandom(placeholders);
}
```

### Service Initialization Failures

**Strategy:** Log error and continue with limited functionality

**Implementation:**

- Services fail gracefully without breaking the UI
- User can still type and send messages
- Error logged to console for debugging
- Optional: Display subtle notification to user

## Testing Strategy

### Unit Tests

**InputPlaceholderService Tests:**

- Configuration loading and parsing
- Placeholder selection with history tracking
- Language fallback logic
- Random selection without consecutive repeats
- Error handling for missing configurations

**TutorCommandsService Tests:**

- Command loading and retrieval
- Localized command name resolution
- Command filtering by category
- Invalid command handling

**HelpTipsService Tests:**

- Tip loading and retrieval
- Context-based tip selection
- Language fallback
- Missing tip handling

### Integration Tests

**MessageInput Component Tests:**

- Placeholder rotation timing
- Command menu open/close
- Command insertion into input field
- Keyboard shortcuts (/ key)
- Help tip display
- Language switching updates all content

### E2E Tests

**User Workflow Tests:**

- User sees rotating placeholders
- User opens command menu with button
- User opens command menu with "/" key
- User selects command and it appears in input
- User switches language and sees translated content
- User types message with command and sends successfully

## Performance Considerations

### Lazy Loading

**Strategy:** Load configurations only when needed

**Implementation:**

```javascript
// Load on first access
async getPlaceholder(language) {
  if (!this.isInitialized) {
    await this.initialize();
  }
  return this._selectPlaceholder(language);
}
```

### Caching

**Strategy:** Cache loaded configurations in memory

**Benefits:**

- Avoid repeated file reads
- Faster subsequent access
- Reduced network/disk I/O

**Implementation:**

```javascript
class ConfigCache {
  constructor() {
    this.cache = new Map();
  }

  async get(key, loader) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const data = await loader();
    this.cache.set(key, data);
    return data;
  }
}
```

### Placeholder Rotation Optimization

**Strategy:** Pre-generate rotation sequence

**Implementation:**

```javascript
// Generate sequence once
const sequence = inputPlaceholderService.getPlaceholderSequence(language, 20);

// Rotate through sequence
let index = 0;
setInterval(() => {
  currentPlaceholder = sequence[index % sequence.length];
  index++;
}, 5000);
```

## Accessibility

### Keyboard Navigation

**Requirements:**

- Tab to command menu button
- Enter/Space to open menu
- Arrow keys to navigate commands
- Enter to select command
- Escape to close menu
- "/" key to open menu from input field

**Implementation:**

```javascript
function handleKeyDown(event) {
  if (event.key === '/') {
    event.preventDefault();
    openCommandMenu();
  } else if (event.key === 'Escape' && showCommandMenu) {
    closeCommandMenu();
  } else if (event.key === 'ArrowDown' && showCommandMenu) {
    navigateCommands('down');
  } else if (event.key === 'ArrowUp' && showCommandMenu) {
    navigateCommands('up');
  }
}
```

### Screen Reader Support

**Requirements:**

- ARIA labels for all interactive elements
- Announce placeholder changes
- Announce command menu state
- Describe command purpose

**Implementation:**

```svelte
<button aria-label="Open command menu" aria-expanded={showCommandMenu} aria-haspopup="menu">
  <Target />
</button>

<input
  type="text"
  aria-label="Message input"
  aria-describedby="help-tip"
  placeholder={currentPlaceholder}
/>

<div id="help-tip" role="status" aria-live="polite">
  {helpTip}
</div>
```

### Visual Indicators

**Requirements:**

- Clear focus states
- High contrast for text
- Visible hover states
- Loading indicators

## Internationalization (i18n)

### Language Detection

**Strategy:** Use existing i18n system from `$modules/i18n/stores`

**Implementation:**

```javascript
import { selectedLanguage } from '$modules/i18n/stores';

// React to language changes
$: currentLanguage = $selectedLanguage;
$: updatePlaceholders(currentLanguage);
$: updateCommands(currentLanguage);
$: updateHelpTip(currentLanguage);
```

### Supported Languages

**Initial Release:**

- English (en)
- Russian (ru)
- Spanish (es)

**Future Expansion:**

- French (fr)
- German (de)
- Chinese (zh)
- Japanese (ja)

### Translation Workflow

**Process:**

1. Add new language to configuration files
2. Provide translations for all placeholders, commands, and tips
3. Update JSON schemas to include new language
4. Test language switching
5. Deploy updated configurations

**No code changes required** - all content is in JSON files

## Security Considerations

### Input Validation

**Concern:** Command injection or XSS through user input

**Mitigation:**

- Commands are predefined in configuration
- User input is sanitized before processing
- No dynamic command execution
- Commands are inserted as text, not executed

**Implementation:**

```javascript
function insertCommand(command) {
  // Sanitize command text
  const sanitized = command.name.replace(/[<>]/g, '');
  inputMessage.set(sanitized + ' ');
}
```

### Configuration File Security

**Concern:** Malicious content in JSON files

**Mitigation:**

- JSON schema validation
- Content Security Policy (CSP)
- Files served from trusted source
- No executable code in configurations

### XSS Prevention

**Concern:** Malicious scripts in placeholders or tips

**Mitigation:**

- Svelte automatically escapes HTML
- No `{@html}` tags used
- Content treated as plain text
- Regular security audits

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1)

**Tasks:**

1. Create configuration files and schemas
2. Implement service classes
3. Add unit tests for services
4. Validate configuration loading

**Deliverables:**

- `inputPlaceholders.json` with 10+ examples per language
- `tutorCommands.json` with 9 command definitions
- `helpTips.json` with contextual tips
- Service classes with full test coverage

### Phase 2: UI Integration (Week 2)

**Tasks:**

1. Update MessageInput component
2. Create CommandMenu component
3. Implement placeholder rotation
4. Add keyboard shortcuts
5. Style components

**Deliverables:**

- Enhanced MessageInput with all features
- CommandMenu component
- Integration tests
- Updated documentation

### Phase 3: Testing & Polish (Week 3)

**Tasks:**

1. E2E testing
2. Accessibility audit
3. Performance optimization
4. Bug fixes
5. User acceptance testing

**Deliverables:**

- Complete test suite
- Performance benchmarks
- Accessibility compliance report
- Production-ready feature

## Monitoring and Analytics

### Metrics to Track

**Usage Metrics:**

- Placeholder rotation views
- Command menu opens
- Command selections by type
- Language distribution
- Help tip impressions

**Performance Metrics:**

- Configuration load time
- Placeholder rotation smoothness
- Command menu open/close latency
- Memory usage

**Error Metrics:**

- Configuration load failures
- Service initialization errors
- Missing translation fallbacks

### Implementation

**Using Console Logging (Development):**

```javascript
console.log('[InputPlaceholder] Rotated to:', placeholder);
console.log('[CommandMenu] Opened with', commands.length, 'commands');
console.log('[Command] Selected:', command.id);
```

**Using Analytics (Production):**

```javascript
// Optional: Send to analytics service
if (window.analytics) {
  window.analytics.track('Command Selected', {
    commandId: command.id,
    language: currentLanguage
  });
}
```

## Future Enhancements

### Contextual Placeholders

**Concept:** Show different placeholders based on user context

**Examples:**

- Math mode: Show math-related examples
- Writing mode: Show writing prompts
- After image upload: Show image analysis examples

**Implementation:**

```javascript
getContextualPlaceholder(language, context) {
  const category = this.detectCategory(context);
  return this.getPlaceholder(language, category);
}
```

### Command History

**Concept:** Track frequently used commands

**Benefits:**

- Show popular commands first
- Personalize command menu
- Suggest relevant commands

### Smart Suggestions

**Concept:** AI-powered command suggestions

**Examples:**

- Detect math problem → Suggest /solve
- Detect essay text → Suggest /check
- Detect concept question → Suggest /explain

### Command Aliases

**Concept:** Support multiple names for same command

**Examples:**

- /solve, /solution, /answer
- /explain, /clarify, /elaborate

### Custom Commands

**Concept:** Allow users to create personal commands

**Implementation:**

- Store in localStorage
- Sync across devices
- Share with other users

## Dependencies

### External Libraries

**None required** - Feature uses only existing dependencies:

- Svelte (UI framework)
- lucide-svelte (icons)
- Existing i18n system

### Internal Dependencies

**Required Modules:**

- `$modules/i18n/stores` - Language selection
- `$modules/i18n/translations` - Translation utilities
- `$modules/theme/stores` - Dark mode support
- `$shared/components/Button.svelte` - Button component

### Configuration Files

**New Files:**

- `src/lib/config/inputPlaceholders.json`
- `src/lib/config/inputPlaceholders.schema.json`
- `src/lib/config/tutorCommands.json`
- `src/lib/config/tutorCommands.schema.json`
- `src/lib/config/helpTips.json`
- `src/lib/config/helpTips.schema.json`

## Rollback Plan

### If Issues Arise

**Step 1:** Disable feature via feature flag

```javascript
const ENABLE_INPUT_ENHANCEMENTS = false;

{#if ENABLE_INPUT_ENHANCEMENTS}
  <!-- New features -->
{:else}
  <!-- Original input -->
{/if}
```

**Step 2:** Revert to previous MessageInput component

- Keep backup of original component
- Simple file replacement
- No database changes needed

**Step 3:** Remove configuration files

- Delete JSON files
- Remove service classes
- Clean up imports

**Recovery Time:** < 5 minutes (simple file revert)

## Documentation Requirements

### Developer Documentation

**Files to Create:**

- `docs/features/session-input-enhancement.md` - Feature overview
- `docs/guides/adding-commands.md` - How to add new commands
- `docs/guides/translating-content.md` - Translation workflow

**Content:**

- Architecture overview
- Service API documentation
- Configuration file formats
- Testing guidelines
- Troubleshooting guide

### User Documentation

**Files to Update:**

- `README.md` - Add feature to feature list
- `docs/QUICK-START.md` - Mention command menu

**Content:**

- How to use command menu
- Available commands list
- Keyboard shortcuts
- Language support

### Code Documentation

**Requirements:**

- JSDoc comments for all public methods
- Inline comments for complex logic
- README in service directories
- Example usage in comments

**Example:**

```javascript
/**
 * Get a random placeholder for the specified language
 * @param {string} language - Language code (e.g., 'en', 'ru', 'es')
 * @param {string} category - Placeholder category (default: 'general')
 * @returns {string} Random placeholder text
 * @throws {Error} If language is not supported
 * @example
 * const placeholder = service.getPlaceholder('en', 'mathematics');
 * // Returns: "Solve this equation: 2x + 5 = 15"
 */
getPlaceholder(language, category = 'general') {
  // Implementation
}
```

## Success Criteria

### Functional Requirements

- ✅ Placeholders rotate every 5 seconds
- ✅ At least 10 placeholders per language
- ✅ Command menu opens with button click
- ✅ Command menu opens with "/" key
- ✅ 9 commands available (solve, explain, check, example, cheatsheet, test, conspect, plan, essay)
- ✅ Commands localized in 3 languages
- ✅ Help tip displays below input
- ✅ All content updates on language switch
- ✅ No default greeting message

### Performance Requirements

- ✅ Configuration loads in < 100ms
- ✅ Placeholder rotation is smooth (no flicker)
- ✅ Command menu opens in < 50ms
- ✅ No memory leaks from rotation interval
- ✅ Works smoothly on mobile devices

### Quality Requirements

- ✅ 80%+ test coverage
- ✅ All accessibility checks pass
- ✅ No console errors
- ✅ Works in all supported browsers
- ✅ Responsive design (mobile, tablet, desktop)

### User Experience Requirements

- ✅ Intuitive command menu interface
- ✅ Clear visual feedback for interactions
- ✅ Helpful placeholder examples
- ✅ Smooth animations and transitions
- ✅ Consistent with existing UI design

## Conclusion

This design provides a comprehensive blueprint for enhancing the session input interface with rotating placeholders, a command menu system, and contextual help tips. The architecture follows established patterns from the waiting phrases feature, ensuring consistency and maintainability.

### Key Strengths

1. **Proven Pattern:** Leverages successful waiting phrases architecture
2. **Maintainability:** Centralized JSON configuration for easy updates
3. **Scalability:** Easy to add new languages, commands, and placeholders
4. **Performance:** Lazy loading and caching optimize resource usage
5. **Accessibility:** Full keyboard navigation and screen reader support
6. **Testability:** Service-based architecture enables comprehensive testing

### Implementation Readiness

The design is ready for implementation with:

- Clear component structure
- Defined service interfaces
- Detailed data models
- Comprehensive error handling
- Testing strategy
- Migration plan

### Next Steps

1. Review and approve design document
2. Create implementation tasks
3. Begin Phase 1: Core Infrastructure
4. Iterate based on feedback
5. Deploy to production

This enhancement will significantly improve user engagement by providing helpful examples, quick access to common commands, and contextual guidance throughout the learning experience.
