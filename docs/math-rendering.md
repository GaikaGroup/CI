# Mathematical Formula Rendering

This document describes the mathematical formula rendering system implemented in the chatbot to display proper mathematical notation instead of plain text formatting.

## Overview

The system uses KaTeX, a fast math rendering library, to automatically detect and render mathematical expressions in chat messages. This provides a much better user experience when discussing mathematical concepts, formulas, and equations.

## Features

### Automatic Detection

The system automatically detects and converts common mathematical expressions:

- **Exponents**: `x^2` → x²
- **Square roots**: `√169` or `sqrt(169)` → √169
- **Fractions**: `5/2` → ⁵⁄₂ (when in mathematical context)
- **Equations**: `c^2 = a^2 + b^2` → c² = a² + b²

### Explicit Math Delimiters

You can also use LaTeX-style delimiters for more complex expressions:

- **Inline math**: `$x^2 + y^2 = z^2$`
- **Display math**: `$$\frac{a \cdot b}{2}$$`

### Context-Aware Detection

The system uses context clues to determine when to apply mathematical formatting:

- Mathematical keywords (theorem, formula, calculate, solve, etc.)
- Units (cm, m, sq, кв, etc.)
- Mathematical terms in multiple languages (Russian and English)

## Examples

### Pythagorean Theorem Example

**Input:**

```
Для решения задачи используем теорему Пифагора: c^2 = a^2 + b^2

Подставляем значения: c^2 = 5^2 + 12^2 = 25 + 144 = 169
Следовательно: c = √169 = 13
```

**Rendered Output:**

- c² = a² + b²
- c² = 5² + 12² = 25 + 144 = 169
- c = √169 = 13

### Area Calculation Example

**Input:**

```
Площадь прямоугольного треугольника: S = (a * b) / 2
При a = 5 см и S = 30 кв.см: 30 = (5 * b) / 2
```

**Rendered Output:**

- S = (a × b) ÷ 2
- 30 = (5 × b) ÷ 2

## Implementation Details

### Components

1. **MathRenderer.svelte** - Main component that handles math detection and rendering
2. **TypewriterMessage.svelte** - Updated to support math rendering during typewriter animation
3. **MessageList.svelte** - Updated to use MathRenderer for all messages

### Detection Patterns

The system uses regular expressions to detect mathematical patterns:

```javascript
const mathPatterns = [
  // Explicit delimiters
  { pattern: /\$([^$\n]+)\$/g, type: 'inline' },
  { pattern: /\$\$([^$]+)\$\$/g, type: 'display' },

  // Auto-detection patterns
  { pattern: /(\w+)\^(\d+|\{[^}]+\})/g, type: 'auto' }, // Exponents
  { pattern: /√\(([^)]+)\)|sqrt\(([^)]+)\)/g, type: 'auto' }, // Square roots
  { pattern: /(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g, type: 'auto' } // Fractions
];
```

### Context Detection

Mathematical context is determined by checking for:

- Mathematical keywords in Russian and English
- Units of measurement
- Mathematical terms and concepts
- Proximity to other mathematical expressions

### Fallback Handling

If KaTeX rendering fails, the system falls back to:

- Original text with basic monospace formatting
- Error logging for debugging
- Graceful degradation without breaking the UI

## Configuration

### KaTeX Settings

```javascript
const katexOptions = {
  displayMode: type === 'display', // Block vs inline
  throwOnError: false, // Graceful error handling
  strict: false // Allow more LaTeX commands
};
```

### CSS Styling

The system includes custom CSS for:

- Proper font sizing and spacing
- Dark mode compatibility
- Fallback styling for failed renders
- Integration with existing chat UI

## Testing

The math rendering system includes comprehensive tests:

- Plain text handling
- Mathematical expression detection
- KaTeX integration
- Error handling
- CSS class application

Run tests with:

```bash
npm run test:run tests/unit/chat/MathRenderer.test.js
```

## Browser Compatibility

The system works in all modern browsers that support:

- ES6+ JavaScript features
- CSS Grid and Flexbox
- SVG rendering (for KaTeX output)

## Performance

- KaTeX is loaded only when needed
- Rendering is cached to avoid re-computation
- Minimal impact on chat performance
- Graceful degradation on slower devices

## Future Enhancements

Potential improvements include:

1. **Enhanced Detection**: More sophisticated mathematical pattern recognition
2. **Interactive Math**: Clickable formulas for step-by-step solutions
3. **Graph Rendering**: Integration with plotting libraries
4. **Chemical Formulas**: Support for chemistry notation
5. **Multi-language Math**: Better support for mathematical notation in different languages

## Troubleshooting

### Common Issues

1. **Math not rendering**: Check browser console for KaTeX errors
2. **Incorrect detection**: Verify mathematical context keywords are present
3. **Styling issues**: Ensure KaTeX CSS is properly loaded

### Debug Mode

Enable debug logging by setting:

```javascript
console.log('Math detection:', { processedText, mathElements });
```

This will show what mathematical expressions were detected and how they were processed.
