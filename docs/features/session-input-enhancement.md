# Session Input Enhancement

## Overview

The Session Input Enhancement feature improves the chat interface by providing:

- **Rotating input placeholders** with helpful examples
- **Command menu system** for quick access to tutor commands
- **Contextual help tips** to guide users
- **Multilingual support** for English, Russian, and Spanish
- **Clean interface** without default greeting messages

## Features

### 1. Rotating Input Placeholders

The input field displays rotating placeholder examples that help users understand what kinds of questions they can ask.

**Key Features:**

- 10+ examples per language
- Rotates every 5 seconds
- Avoids repeating recent placeholders
- Categories: general, mathematics, science, writing
- Smooth fade transitions

**Usage:**
Placeholders automatically rotate when the input field is empty. They update immediately when the user switches languages.

### 2. Command Menu

Quick access to common tutoring commands via a dropdown menu.

**Available Commands:**

- `/solve` - Solve a problem step by step
- `/explain` - Explain a concept in detail
- `/check` - Check your work for errors
- `/example` - Show me an example
- `/cheatsheet` - Create a quick reference guide
- `/test` - Generate practice questions
- `/conspect` - Create study notes
- `/plan` - Create a study plan
- `/essay` - Help with essay writing

**How to Use:**

1. Click the 🎯 (Target) icon next to the input field
2. Or press `/` key when input is empty
3. Select a command from the menu
4. The command is inserted into the input field

**Keyboard Navigation:**

- `↑` `↓` - Navigate commands
- `Enter` - Select command
- `Esc` - Close menu

### 3. Help Tips

Contextual tips displayed below the input field to guide users.

**Default Tip:**

- English: "Tip: The more detailed your question, the better the answer!"
- Russian: "Совет: Чем подробнее вопрос, тем лучше ответ!"
- Spanish: "¡Consejo: Cuanto más detallada sea tu pregunta, mejor será la respuesta!"

### 4. Multilingual Support

All content (placeholders, commands, tips) is available in:

- English (en)
- Russian (ru)
- Spanish (es)

Content automatically updates when the user switches languages.

## Configuration Files

### Input Placeholders

**File:** `src/lib/config/inputPlaceholders.json`

Contains placeholder examples organized by category and language.

**Structure:**

```json
{
  "placeholders": {
    "general": {
      "en": ["Example 1", "Example 2", ...],
      "ru": ["Пример 1", "Пример 2", ...],
      "es": ["Ejemplo 1", "Ejemplo 2", ...]
    },
    "mathematics": { ... },
    "science": { ... },
    "writing": { ... }
  },
  "settings": {
    "rotationInterval": 5000,
    "avoidRecentRepeats": true,
    "historySize": 3
  }
}
```

### Tutor Commands

**File:** `src/lib/config/tutorCommands.json`

Contains command definitions with translations.

**Structure:**

```json
{
  "commands": [
    {
      "id": "solve",
      "category": "problem-solving",
      "translations": {
        "en": { "name": "/solve", "description": "..." },
        "ru": { "name": "/решить", "description": "..." },
        "es": { "name": "/resolver", "description": "..." }
      }
    }
  ]
}
```

### Help Tips

**File:** `src/lib/config/helpTips.json`

Contains contextual help tips.

**Structure:**

```json
{
  "tips": {
    "default": {
      "en": "Tip text in English",
      "ru": "Текст совета на русском",
      "es": "Texto del consejo en español"
    }
  }
}
```

## Services

### InputPlaceholderService

**File:** `src/lib/modules/chat/services/InputPlaceholderService.js`

Manages input placeholder examples.

**Key Methods:**

- `getPlaceholder(language, category)` - Get a random placeholder
- `getPlaceholderSequence(language, count)` - Get sequence for rotation
- `isLanguageSupported(language)` - Check language support
- `getRotationInterval()` - Get rotation interval

### TutorCommandsService

**File:** `src/lib/modules/chat/services/TutorCommandsService.js`

Manages tutor command definitions.

**Key Methods:**

- `getCommands(language)` - Get all commands for language
- `getCommandByName(name, language)` - Find command by name
- `getCommandById(id, language)` - Find command by ID
- `formatCommand(commandId, language)` - Format command string

### HelpTipsService

**File:** `src/lib/modules/chat/services/HelpTipsService.js`

Manages contextual help tips.

**Key Methods:**

- `getTip(language, context)` - Get tip for language and context
- `getAllTips(language)` - Get all tips for language
- `isLanguageSupported(language)` - Check language support

## Components

### CommandMenu

**File:** `src/lib/modules/chat/components/CommandMenu.svelte`

Dropdown menu component for displaying commands.

**Props:**

- `commands` - Array of command objects
- `visible` - Boolean to show/hide menu

**Events:**

- `select` - Fired when command is selected
- `close` - Fired when menu should close

### MessageInput (Enhanced)

**File:** `src/lib/modules/chat/components/MessageInput.svelte`

Enhanced input component with placeholders, command menu, and help tip.

**Features:**

- Rotating placeholders
- Command menu button and integration
- Help tip display
- Keyboard shortcuts
- Maintains existing image upload and send functionality

## Adding New Content

### Adding Placeholders

1. Open `src/lib/config/inputPlaceholders.json`
2. Add new placeholder to appropriate category and language:

```json
{
  "placeholders": {
    "general": {
      "en": ["Existing placeholder", "Your new placeholder here"]
    }
  }
}
```

3. Save the file - changes take effect immediately

### Adding Commands

1. Open `src/lib/config/tutorCommands.json`
2. Add new command object:

```json
{
  "id": "newcommand",
  "category": "your-category",
  "translations": {
    "en": { "name": "/newcommand", "description": "Description" },
    "ru": { "name": "/новаякоманда", "description": "Описание" },
    "es": { "name": "/nuevocomando", "description": "Descripción" }
  }
}
```

3. Save the file - changes take effect immediately

### Adding Help Tips

1. Open `src/lib/config/helpTips.json`
2. Add new tip context:

```json
{
  "tips": {
    "your-context": {
      "en": "Tip in English",
      "ru": "Совет на русском",
      "es": "Consejo en español"
    }
  }
}
```

3. Update component to use new context

### Adding Languages

1. Add translations to all three configuration files
2. Update JSON schemas to include new language
3. Test language switching

## Accessibility

The feature includes full accessibility support:

- **ARIA labels** on all interactive elements
- **Keyboard navigation** for command menu
- **Screen reader support** with live regions
- **Focus management** when inserting commands
- **High contrast** compatible styling

## Performance

The feature is optimized for performance:

- **Lazy loading** - Services load on first use
- **Caching** - Configuration files cached in memory
- **Pre-generated sequences** - Placeholder rotation uses pre-generated sequences
- **Efficient intervals** - Single interval for placeholder rotation
- **Cleanup** - Intervals cleared on component destroy

## Browser Support

Works in all modern browsers:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Placeholders not rotating

- Check browser console for errors
- Verify `inputPlaceholders.json` is valid JSON
- Ensure rotation interval is set correctly

### Commands not appearing

- Check browser console for errors
- Verify `tutorCommands.json` is valid JSON
- Ensure language is supported

### Help tip not showing

- Check browser console for errors
- Verify `helpTips.json` is valid JSON
- Ensure context exists in configuration

### Language switching not working

- Verify all configuration files have translations for the language
- Check that language code matches (en, ru, es)
- Clear browser cache and reload

## Future Enhancements

Potential improvements for future versions:

- **Contextual placeholders** - Show different examples based on user context
- **Command history** - Track frequently used commands
- **Smart suggestions** - AI-powered command suggestions
- **Command aliases** - Multiple names for same command
- **Custom commands** - User-defined commands
- **More languages** - French, German, Chinese, Japanese
- **Voice activation** - Voice commands for menu
- **Analytics** - Track placeholder and command usage

## Related Documentation

- [Project Architecture](../project-architecture.md)
- [Coding Standards](../../.kiro/steering/coding-standards.md)
- [Testing Requirements](../../.kiro/steering/testing-requirements.md)
- [API Patterns](../../.kiro/steering/api-patterns.md)
