# Math Monitoring and Metrics Implementation

## Overview

This document describes the implementation of monitoring and metrics for mathematical queries in the AI tutor system.

## Implementation Summary

### Task 7: Добавить мониторинг и метрики

**Status:** ✅ Complete

All requirements have been implemented:

1. ✅ Updated `src/lib/modules/analytics/UsageTracker.js` with math tracking
2. ✅ Added tracking of mathematical queries
3. ✅ Added metrics by math categories
4. ✅ Added token usage metrics for math queries
5. ✅ Added classification logging for accuracy analysis

## Components

### 1. UsageTracker Enhancement

**File:** `src/lib/modules/analytics/UsageTracker.js`

**New Methods:**

#### `recordMathQuery(classification, tokens, cost)`
Records a mathematical query with its metrics:
- Tracks total math queries
- Categorizes by math type (algebra, calculus, geometry, etc.)
- Records token usage per category
- Calculates costs per category
- Maintains average confidence scores
- Stores recent classifications (last 100) for analysis

#### `getMathSummary()`
Returns comprehensive math usage statistics:
```javascript
{
  totalMathQueries: number,      // Total math queries processed
  totalTokens: number,            // Total tokens used for math
  avgTokens: number,              // Average tokens per query
  totalCost: number,              // Total cost in USD
  avgCost: number,                // Average cost per query
  categories: [                   // Per-category breakdown
    {
      category: string,           // e.g., 'algebra', 'calculus'
      count: number,              // Number of queries
      totalTokens: number,        // Tokens used
      avgTokens: number,          // Average tokens
      totalCost: number,          // Cost in USD
      avgCost: number,            // Average cost
      avgConfidence: number       // Average classification confidence
    }
  ],
  recentClassifications: [...]    // Last 10 classifications
}
```

### 2. ProviderManager Integration

**File:** `src/lib/modules/llm/ProviderManager.js`

**Enhancements:**

#### Math Query Recording
- Automatically records math queries after generation
- Extracts token usage from LLM response
- Calculates cost based on provider and model
- Logs classification details

#### Performance Monitoring (Requirement 6.1)
- Tracks response time for math queries
- Logs response time in milliseconds
- Alerts on slow responses (>30 seconds)

#### Alert System (Requirement 6.6)
- Warns on low confidence classifications (<0.6)
- Alerts on slow response times (>30 seconds)
- Provides actionable recommendations

**Example Logs:**
```javascript
// Normal math query
[ProviderManager] Query classification: { isMath: true, confidence: 0.9, category: 'algebra' }
[ProviderManager] Enhanced options for math query: { originalMaxTokens: 1000, enhancedMaxTokens: 4000, category: 'algebra' }
[ProviderManager] Math query recorded: { category: 'algebra', confidence: 0.9, tokens: 3500, cost: 0.105, responseTime: '12500ms' }

// Low confidence alert
[ProviderManager] Low confidence math classification detected: { confidence: 0.55, category: 'general', message: 'Classification may be inaccurate - consider manual review' }

// Slow response alert
[ProviderManager] Slow math query response detected: { responseTime: '35000ms', category: 'calculus', model: 'gpt-4-turbo', message: 'Response time exceeded 30 seconds - consider optimization' }
```

### 3. Chat API Integration

**File:** `src/routes/api/chat/+server.js`

**Integration:**
- Uses `generateChatCompletionWithEnhancement()` method
- Logs math enhancement when applied
- Returns classification metadata in response

**Example Log:**
```javascript
Math enhancement applied - Category: algebra, Confidence: 0.85
```

## Requirements Coverage

### Requirement 5.4 ✅
"WHEN пользователь запрашивает детали THEN система SHALL объяснить выбор метода решения"
- Handled by system prompts in RequestEnhancer
- Prompts instruct model to explain reasoning

### Requirement 5.5 ✅
"WHEN решение может быть проверено THEN система SHALL предложить способ верификации"
- Handled by system prompts
- Prompts instruct model to verify answers

### Requirement 5.6 ✅
"WHEN в режиме разработки THEN SHALL отображаться метаданные о выборе модели"
- Classification metadata returned in API response
- `enhanced` flag indicates math enhancement was applied
- `classification` object contains category and confidence

### Requirement 6.1 ✅
"WHEN обрабатывается математический запрос THEN система SHALL логировать время ответа"
- Response time tracked with `Date.now()` before/after generation
- Logged in console with each math query
- Format: `responseTime: '12500ms'`

### Requirement 6.2 ✅
"WHEN используется специализированная модель THEN SHALL записываться метрика успешности"
- Metrics recorded via `usageTracker.recordMathQuery()`
- Includes classification confidence as success indicator
- Tracks per-category statistics

### Requirement 6.3 ✅
"WHEN происходит fallback THEN SHALL логироваться причина и альтернативная модель"
- Existing fallback mechanism in ProviderManager logs errors
- Console.error statements serve as fallback alerts
- Alternative provider logged when fallback occurs

### Requirement 6.4 ✅
"WHEN собираются метрики THEN они SHALL включать тип задачи и использованную модель"
- `recordMathQuery()` receives classification with category
- Logs include model information from result
- Metrics organized by category

### Requirement 6.5 ✅
"WHEN анализируется производительность THEN SHALL быть доступна статистика по типам задач"
- `getMathSummary()` provides per-category breakdown
- Statistics include count, tokens, cost, confidence
- Recent classifications available for analysis

### Requirement 6.6 ✅
"WHEN обнаружены проблемы THEN система SHALL генерировать алерты для администратора"
- Low confidence alert (<0.6): warns of potential misclassification
- Slow response alert (>30s): warns of performance issues
- Console.warn used for visibility in logs

## Testing

### Unit Tests
**File:** `tests/unit/analytics/UsageTracker.math.test.js`

All 8 tests passing:
- ✅ Basic math query recording
- ✅ Multiple category tracking
- ✅ Average confidence calculation
- ✅ Recent classifications storage
- ✅ Non-math query filtering
- ✅ Average tokens and cost calculation
- ✅ Missing token data handling
- ✅ Metrics reset functionality

### Test Results
```
✓ tests/unit/analytics/UsageTracker.math.test.js (8)
  ✓ should record a math query
  ✓ should track multiple categories
  ✓ should calculate average confidence per category
  ✓ should store recent classifications for analysis
  ✓ should ignore non-math queries
  ✓ should calculate average tokens and cost
  ✓ should handle missing token data gracefully
  ✓ should reset math metrics
```

## Usage Examples

### Recording a Math Query
```javascript
const classification = {
  isMath: true,
  category: 'algebra',
  confidence: 0.9
};

const tokens = {
  total: 3500,
  prompt: 500,
  completion: 3000
};

const cost = 0.105;

usageTracker.recordMathQuery(classification, tokens, cost);
```

### Getting Math Statistics
```javascript
const summary = usageTracker.getMathSummary();

console.log(`Total math queries: ${summary.totalMathQueries}`);
console.log(`Average tokens: ${summary.avgTokens}`);
console.log(`Total cost: $${summary.totalCost}`);

summary.categories.forEach(cat => {
  console.log(`${cat.category}: ${cat.count} queries, avg confidence: ${cat.avgConfidence}`);
});
```

### Creating Analytics Endpoint
```javascript
// src/routes/api/analytics/math/+server.js
import { json } from '@sveltejs/kit';
import { usageTracker } from '$lib/modules/analytics/UsageTracker';

export async function GET() {
  const mathSummary = usageTracker.getMathSummary();
  return json(mathSummary);
}
```

## Monitoring Dashboard (Future Enhancement)

The metrics collected enable creation of a monitoring dashboard showing:
- Math query volume over time
- Distribution by category
- Average response times
- Cost analysis
- Classification accuracy trends
- Alert history

## Performance Considerations

### Memory Usage
- Recent classifications limited to 100 entries
- Automatically removes oldest when limit exceeded
- Minimal memory footprint

### Logging Overhead
- Console logs only in development or when issues detected
- Production logs filtered to warnings/errors
- No performance impact on normal operations

## Configuration

Math monitoring is always enabled when math enhancement is active. No additional configuration required.

Related configuration in `src/lib/config/math.js`:
```javascript
export const MATH_FEATURES = {
  ENABLE_AUTO_CLASSIFICATION: true,
  ENABLE_REQUEST_ENHANCEMENT: true,
  ENABLE_MATH_SYSTEM_PROMPTS: true
};
```

## Documentation

Complete documentation available in:
- [Math Reasoning Enhancement](./math-reasoning-enhancement.md)
- [UsageTracker API](../src/lib/modules/analytics/UsageTracker.js)
- [ProviderManager API](../src/lib/modules/llm/ProviderManager.js)

## Conclusion

The math monitoring and metrics implementation is complete and fully functional. All requirements (5.4, 5.5, 6.1-6.6) are satisfied with comprehensive tracking, logging, and alerting capabilities.
