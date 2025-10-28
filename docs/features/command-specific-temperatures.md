# Command-Specific Temperature Settings

## Overview

The AI Tutor Platform uses **command-specific temperature settings** to optimize LLM responses based on the type of task. Different commands require different levels of creativity vs. accuracy, and temperature controls this balance.

## What is Temperature?

Temperature is a parameter that controls the randomness of LLM responses:

- **Lower (0.1-0.3)**: More deterministic, factual, consistent - best for accuracy
- **Medium (0.4-0.6)**: Balanced creativity and accuracy
- **Higher (0.7-0.9)**: More creative, varied, engaging - best for writing

## Command Temperature Settings

| Command     | Temperature | Purpose                                  | Why This Temperature?                                                                                                                                              |
| ----------- | ----------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/explain`  | **0.2**     | Explains a topic in simple terms         | Needs factual accuracy with minimal variation. Facts must be correct, but wording can vary slightly for engagement.                                                |
| `/solve`    | **0.1**     | Solves a problem step by step            | **Critical accuracy needed**. Step-by-step solutions must be mathematically correct. No room for creative interpretation. Lowest temperature for maximum accuracy. |
| `/check`    | **0.2**     | Checks your answer, text, code, or essay | Must accurately identify errors. Feedback should be precise but can be encouraging/friendly.                                                                       |
| `/practice` | **0.4**     | Gives similar exercises for practice     | Needs creativity to generate diverse problems, but they must still be mathematically valid. Higher creativity for variety.                                         |
| `/notes`    | **0.3**     | Creates a short summary or cheatsheet    | Summary must be accurate and comprehensive. Some variation in structure is okay.                                                                                   |
| `/essay`    | **0.7**     | Writes an essay on a given topic         | Needs creativity, varied vocabulary, and engaging writing style. More freedom is beneficial here.                                                                  |
| **default** | **0.3**     | General chat without commands            | Balanced for conversational tutoring                                                                                                                               |

## Why This Matters

### The Problem

Before implementing command-specific temperatures, all commands used a single temperature (0.7). This caused issues:

**Example - Same Question, Different Answers:**

Session 1 (Temperature 0.7):

```
User: /explain Pythagorean theorem
AI: [Gave WRONG explanation about "theorem of squares on heights"]
```

Session 2 (Temperature 0.7):

```
User: /explain Pythagorean theorem
AI: [Gave CORRECT explanation: a² + b² = c²]
```

With temperature 0.7, the small Ollama model (qwen2.5:1.5b) was too creative and sometimes hallucinated incorrect mathematical concepts.

### The Solution

By using command-specific temperatures:

- `/solve` and `/explain` now use 0.1-0.2 for **consistent, accurate** math explanations
- `/practice` uses 0.4 for **variety** in problem generation while staying accurate
- `/essay` uses 0.7 for **creative, engaging** writing

## Implementation

### Configuration File

```javascript
// src/lib/config/commandTemperatures.js

export const COMMAND_TEMPERATURES = {
  explain: 0.2,
  solve: 0.1,
  check: 0.2,
  practice: 0.4,
  notes: 0.3,
  essay: 0.7,
  default: 0.3
};

export function getTemperatureForCommand(commandOrMessage) {
  // Extracts command from message and returns optimal temperature
  // Falls back to default (0.3) for general chat
}
```

### Usage in Chat API

```javascript
// src/routes/api/chat/+server.js

import { getTemperatureForCommand } from '$lib/config/commandTemperatures.js';

// Determine temperature based on command type
const commandTemperature = getTemperatureForCommand(content);

const options = {
  temperature: commandTemperature, // Dynamic based on command
  maxTokens: adjustedMaxTokens || OPENAI_CONFIG.MAX_TOKENS
};
```

The system automatically:

1. Detects if the message contains a command (e.g., `/explain`, `/solve`)
2. Selects the optimal temperature for that command
3. Falls back to default (0.3) for general chat

## Testing

Comprehensive tests ensure correct temperature selection:

```bash
npm run test:run tests/unit/config/commandTemperatures.test.js
```

Tests verify:

- ✅ Correct temperature values for each command
- ✅ Command extraction from messages
- ✅ Fallback to default for non-commands
- ✅ Temperature optimization hierarchy (solve < explain < practice < essay)

## Benefits

### 1. Consistency in Math Explanations

With lower temperatures (0.1-0.2), mathematical explanations are:

- More consistent across sessions
- Less prone to hallucinations
- More factually accurate

### 2. Variety in Practice Problems

With medium temperature (0.4), practice problems are:

- Diverse and interesting
- Still mathematically valid
- Engaging for students

### 3. Creative Essay Writing

With higher temperature (0.7), essays are:

- Well-written and engaging
- Use varied vocabulary
- Have creative arguments
- Still grounded in facts

## Best Practices

### For Educational Content

- **Always use low temperatures (0.1-0.3)** for factual content
- **Use medium temperatures (0.4-0.6)** for generating examples
- **Use high temperatures (0.7+)** only for creative writing

### For Small Models

Small models (like qwen2.5:1.5b) are more prone to errors:

- **Lower temperatures even more** (0.05-0.15 for solving)
- **Monitor output quality** closely
- **Consider using larger models** for critical educational content

### For Large Models

Larger models (GPT-4, qwen2.5:7b+) are more reliable:

- Can handle slightly higher temperatures
- Still benefit from command-specific optimization
- Less prone to hallucinations

## Monitoring

The system logs temperature usage:

```javascript
console.info(
  `Using temperature: ${commandTemperature} for message: "${content.substring(0, 50)}..."`
);
```

Check logs to verify:

- Commands are detected correctly
- Appropriate temperatures are applied
- No unexpected fallbacks to default

## Future Enhancements

Potential improvements:

1. **Subject-specific temperatures**: Different temperatures for math vs. literature
2. **User preference overrides**: Let advanced users adjust temperatures
3. **Adaptive temperatures**: Learn optimal temperatures based on user feedback
4. **Model-specific tuning**: Different temperature ranges for different models

## Related Documentation

- [LLM Provider Configuration](./llm-providers.md)
- [Math Reasoning Enhancement](./math-reasoning-enhancement.md)
- [Testing Requirements](../../.kiro/steering/testing-requirements.md)

## References

- [OpenAI Temperature Parameter](https://platform.openai.com/docs/api-reference/chat/create#chat-create-temperature)
- [Temperature in Language Models](https://arxiv.org/abs/2202.00666)
