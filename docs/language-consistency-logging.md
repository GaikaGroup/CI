# Language Consistency Logging System

This document describes the language consistency logging system implemented to monitor and track language detection and validation performance in the AI tutor application.

## Overview

The language consistency logging system provides comprehensive monitoring and analytics for:
- Language detection accuracy and confidence scoring
- Language validation results and consistency checking
- Session-level language management and stability tracking
- Performance metrics and issue identification

## Components

### 1. LanguageConsistencyLogger

The main logging component that captures and analyzes language-related events.

**Location**: `src/lib/modules/chat/LanguageConsistencyLogger.js`

**Key Features**:
- Detection result logging with confidence scoring
- Validation result tracking and failure analysis
- Session metrics collection and stability monitoring
- Comprehensive statistics and reporting
- Export functionality for external analysis
- Automatic cleanup and memory management

### 2. Enhanced LanguageDetector

Updated to integrate with the logging system for automatic detection tracking.

**Location**: `src/lib/modules/chat/LanguageDetector.js`

**New Features**:
- Automatic logging of detection results when session ID provided
- Enhanced `detectWithConfidence()` method with logging support
- Validation logging in `validateLanguageConsistency()` method

### 3. Enhanced SessionLanguageManager

Updated to log session-level language events and stability changes.

**Location**: `src/lib/modules/chat/SessionLanguageManager.js`

**New Features**:
- Automatic session metrics logging when language becomes stable
- Consistency issue logging for validation failures
- Integration with the main logging system

### 4. API Endpoints

#### Metrics API
**Endpoint**: `GET /api/language-consistency/metrics`

**Query Parameters**:
- `sessionId`: Filter by specific session
- `language`: Filter by language (en, es, ru)
- `timeRange`: Filter by time period (last24h, last7d, last30d)

**Response**: Comprehensive metrics including detection stats, validation stats, session stats, and summary information.

#### Export API
**Endpoint**: `GET /api/language-consistency/export`

**Query Parameters**:
- `format`: Export format (json, csv)
- `includeContext`: Include detailed context information (true/false)
- `sessionId`, `language`, `type`, `severity`, `timeRange`: Filtering options

**Response**: Exported log data in requested format.

#### Clear Logs API
**Endpoint**: `DELETE /api/language-consistency/metrics`

**Query Parameters**:
- `type`: Type of logs to clear (detection, validation)
- `olderThan`: Clear logs older than specified time (last24h, last7d, timestamp)

### 5. Monitoring Dashboard

**Component**: `src/lib/modules/chat/components/LanguageConsistencyMonitor.svelte`

A Svelte component providing a real-time dashboard for monitoring language consistency metrics.

**Features**:
- Real-time metrics display with auto-refresh
- Filtering by time range and language
- Export functionality (JSON/CSV)
- Log management (clear logs)
- Visual statistics and charts

## Usage Examples

### Basic Logging Integration

```javascript
import { languageDetector } from '$lib/modules/chat/LanguageDetector.js';
import { sessionLanguageManager } from '$lib/modules/chat/SessionLanguageManager.js';

// Detect language with logging
const sessionId = 'user-session-123';
const userMessage = 'Hello, how are you?';

const detection = languageDetector.detectWithConfidence(
  userMessage, 
  sessionId, 
  {
    hasImages: false,
    provider: 'openai'
  }
);

// Set session language (automatically logs when stable)
sessionLanguageManager.setSessionLanguage(
  sessionId,
  detection.language,
  detection.confidence,
  {
    method: detection.method,
    userMessage: userMessage.substring(0, 100)
  }
);

// Validate response language
const aiResponse = 'Hello! I am doing well, thank you for asking.';
const validation = languageDetector.validateLanguageConsistency(
  aiResponse,
  detection.language,
  sessionId,
  {
    provider: 'openai',
    model: 'gpt-4',
    responseLength: aiResponse.length
  }
);
```

### Direct Logger Usage

```javascript
import { languageConsistencyLogger } from '$lib/modules/chat/LanguageConsistencyLogger.js';

// Log a consistency issue
languageConsistencyLogger.logConsistencyIssue(
  sessionId,
  'validation_failure',
  {
    expectedLanguage: 'en',
    detectedLanguage: 'zh',
    confidence: 0.9,
    severity: 'high',
    errorMessage: 'Unexpected language switch to Chinese'
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo'
  }
);

// Get comprehensive metrics
const metrics = languageConsistencyLogger.getLanguageConsistencyMetrics({
  timeRange: {
    start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
    end: Date.now()
  }
});

console.log('Detection accuracy:', metrics.summary.averageDetectionConfidence);
console.log('Validation success rate:', metrics.summary.overallValidationSuccessRate);
```

### API Usage

```javascript
// Fetch current metrics
const response = await fetch('/api/language-consistency/metrics?timeRange=last24h&language=ru');
const data = await response.json();

console.log('Russian language metrics:', data.metrics);

// Export logs as CSV
const exportResponse = await fetch('/api/language-consistency/export?format=csv&timeRange=last7d');
const csvData = await exportResponse.text();

// Clear old logs
await fetch('/api/language-consistency/metrics?olderThan=last7d', {
  method: 'DELETE'
});
```

## Monitoring Dashboard Usage

```svelte
<script>
  import LanguageConsistencyMonitor from '$lib/modules/chat/components/LanguageConsistencyMonitor.svelte';
</script>

<LanguageConsistencyMonitor />
```

The dashboard provides:
- Real-time metrics with auto-refresh every 30 seconds
- Filtering by time range and language
- Export functionality for logs
- Visual representation of statistics
- Log management capabilities

## Configuration

### Logger Configuration

```javascript
import { languageConsistencyLogger } from '$lib/modules/chat/LanguageConsistencyLogger.js';

// Update logger configuration
languageConsistencyLogger.updateConfig({
  maxLogEntries: 2000,        // Maximum logs to keep in memory
  currentLogLevel: 1,         // Log level (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR)
  enableMetrics: true,        // Enable metrics collection
  enableDetailedLogging: true // Enable detailed context logging
});
```

### Automatic Cleanup

The logger automatically cleans up old logs every 5 minutes, removing entries older than 24 hours. This can be configured:

```javascript
languageConsistencyLogger.updateConfig({
  cleanupInterval: 300000,    // 5 minutes
  // Cleanup happens automatically based on log timestamps
});
```

## Metrics and Statistics

### Detection Statistics
- Total detections count
- Language distribution
- Confidence score distribution
- Detection method usage
- Average confidence by language

### Validation Statistics
- Total validations count
- Success/failure rates
- Severity distribution (none, low, medium, high)
- Recommendation distribution (accept, review, regenerate)
- Language consistency rates

### Session Statistics
- Total active sessions
- Language stability rates
- Average interactions per session
- Session language distribution
- Stability achievement metrics

### Global Metrics
- Overall system performance
- Trend analysis over time
- Critical issue identification
- Performance benchmarking

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Reduce `maxLogEntries` or increase cleanup frequency
2. **Missing Logs**: Check that session IDs are being passed to detection/validation methods
3. **API Errors**: Verify that the logging system is properly initialized
4. **Dashboard Not Loading**: Check API endpoints are accessible and returning valid data

### Debug Mode

Enable debug logging for detailed troubleshooting:

```javascript
languageConsistencyLogger.updateConfig({
  currentLogLevel: 0, // DEBUG level
  enableDetailedLogging: true
});
```

### Performance Monitoring

Monitor logger performance:

```javascript
const stats = languageConsistencyLogger.getLoggerStats();
console.log('Memory usage:', stats.memoryUsage);
console.log('Log counts:', {
  detection: stats.detectionLogsCount,
  validation: stats.validationLogsCount,
  sessions: stats.sessionMetricsCount
});
```

## Best Practices

1. **Always provide session IDs** when calling detection/validation methods for proper tracking
2. **Include relevant context** in logging calls for better analysis
3. **Monitor memory usage** in production environments
4. **Export logs regularly** for long-term analysis and backup
5. **Set appropriate log levels** based on environment (DEBUG for development, INFO+ for production)
6. **Use filtering** when querying large datasets to improve performance
7. **Regular cleanup** of old logs to maintain system performance

## Integration with Existing Systems

The logging system is designed to integrate seamlessly with existing language consistency components:

- **Chat API**: Automatically logs detection and validation results
- **Session Management**: Tracks language stability and consistency
- **Provider Management**: Logs provider-specific performance metrics
- **Error Handling**: Captures and categorizes language-related issues

The system provides valuable insights for:
- Identifying language switching issues
- Monitoring detection accuracy
- Tracking validation performance
- Analyzing user language patterns
- Optimizing language consistency algorithms