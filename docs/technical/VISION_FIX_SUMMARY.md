# Vision Model Fix Summary

## Issue
When uploading an image and asking a question, the system was using the text model `qwen2.5:7b` instead of the vision model `llava:7b`.

## Root Cause
The `PromptEnhancer.addLanguageConstraints()` method was converting structured message content (array with text and images) into a plain string, causing the image information to be lost.

## Solution
Updated `src/lib/modules/chat/PromptEnhancer.js` to preserve structured message format when adding language reminders.

### Before (Broken)
```javascript
// Converted array to string: "[object Object]\n\n(Reminder)"
content: `${lastUserMessage.content}\n\n${reminder}`
```

### After (Fixed)
```javascript
// Preserves array structure, adds reminder to text part only
if (isStructuredContent) {
  const contentCopy = [...lastUserMessage.content];
  const firstTextIndex = contentCopy.findIndex(c => c.type === 'text');
  contentCopy[firstTextIndex] = {
    ...contentCopy[firstTextIndex],
    text: `${contentCopy[firstTextIndex].text}\n\n${reminder}`
  };
  content: contentCopy  // Array preserved!
}
```

## Impact
- ✅ Image structure preserved in messages
- ✅ `hasImages()` correctly detects images
- ✅ `OllamaProvider` selects `llava:7b` for vision requests
- ✅ Language reminders added without breaking structure

## Testing
Run the verification:
```bash
npm run dev
# Upload an image and ask a question
# Check logs for: [Ollama] Using vision model: llava:7b
```

## Files Modified
- `src/lib/modules/chat/PromptEnhancer.js`

## Configuration
Vision model is configured in `src/lib/config/llm.js`:
```javascript
VISION_MODEL: import.meta.env.VITE_OLLAMA_VISION_MODEL || 'llava:7b'
```

To use a different model:
```bash
VITE_OLLAMA_VISION_MODEL=llava:13b
```

## Requirements
Ensure llava is installed:
```bash
ollama pull llava:7b
```

## Date
October 16, 2025
