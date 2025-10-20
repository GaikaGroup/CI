# Design Document

## Overview

Данный документ описывает техническую архитектуру и дизайн статистической панели AI Tutor Platform по адресу /stats. Панель предоставляет администраторам комплексную аналитику с визуализацией данных для принятия управленческих решений.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    A[/stats Route] --> B[StatsPage.svelte]
    B --> C[StatsService]
    B --> D[Chart Components]
    C --> E[Database Queries]
    C --> F[Cache Layer]
    E --> G[(PostgreSQL)]
    F --> H[Redis/Memory Cache]
    
    D --> I[UserStatsChart]
    D --> J[CoursePopularityChart]
    D --> K[FinanceChart]
    D --> L[LanguageChart]
```

### URL Structure

- **Current**: `/admin` → **New**: `/stats`
- Redirect: `/admin` → `/stats` (301 permanent redirect)
- Navigation: Console dropdown будет обновлен для включения ссылки на Stats

## Components and Interfaces

### 1. Main Stats Page Component

**File**: `src/routes/stats/+page.svelte`

```svelte
<script>
  import { onMount } from 'svelte';
  import StatsService from '$lib/modules/stats/services/StatsService.js';
  import KPICards from '$lib/modules/stats/components/KPICards.svelte';
  import UserActivityChart from '$lib/modules/stats/components/UserActivityChart.svelte';
  import CoursePopularityChart from '$lib/modules/stats/components/CoursePopularityChart.svelte';
  import FinanceChart from '$lib/modules/stats/components/FinanceChart.svelte';
  import LanguageChart from '$lib/modules/stats/components/LanguageChart.svelte';
  import AttentionEconomyChart from '$lib/modules/stats/components/AttentionEconomyChart.svelte';
  import TrendsPanel from '$lib/modules/stats/components/TrendsPanel.svelte';
  import TimeRangeSelector from '$lib/modules/stats/components/TimeRangeSelector.svelte';
  
  let statsData = null;
  let loading = true;
  let selectedTimeRange = '30d';
</script>
```

### 2. Stats Service

**File**: `src/lib/modules/stats/services/StatsService.js`

```javascript
class StatsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  async getOverviewStats(timeRange = '30d') {
    const cacheKey = `overview-${timeRange}`;
    if (this.isCached(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    const data = await this.fetchOverviewStats(timeRange);
    this.setCache(cacheKey, data);
    return data;
  }

  async getUserStats(timeRange = '30d') { /* ... */ }
  async getCourseStats(timeRange = '30d') { /* ... */ }
  async getFinanceStats(timeRange = '30d') { /* ... */ }
  async getLanguageStats(timeRange = '30d') { /* ... */ }
  async getAttentionEconomyStats(timeRange = '30d') { /* ... */ }
  async getTrendsData(timeRange = '30d') { /* ... */ }
}
```

### 3. KPI Cards Component

**File**: `src/lib/modules/stats/components/KPICards.svelte`

```svelte
<script>
  export let totalUsers = 0;
  export let totalSessions = 0;
  export let totalMessages = 0;
  export let avgSessionTime = 0;
  export let userGrowth = 0;
  export let sessionGrowth = 0;
  export let messageGrowth = 0;
  export let timeGrowth = 0;
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <!-- KPI Cards with trend indicators -->
</div>
```

### 4. Chart Components

#### User Activity Chart
**File**: `src/lib/modules/stats/components/UserActivityChart.svelte`
- Line chart showing daily active users and new registrations
- Uses Chart.js or similar lightweight library

#### Course Popularity Chart  
**File**: `src/lib/modules/stats/components/CoursePopularityChart.svelte`
- Bar chart for top 10 popular courses
- Table for bottom 5 underperforming courses

#### Finance Chart
**File**: `src/lib/modules/stats/components/FinanceChart.svelte`
- Pie chart for OpenAI vs Local LLM costs
- Line chart for monthly spending trends

#### Language Chart
**File**: `src/lib/modules/stats/components/LanguageChart.svelte`
- Horizontal bar chart for language usage in sessions
- Metrics for multilingual users

#### Attention Economy Chart
**File**: `src/lib/modules/stats/components/AttentionEconomyChart.svelte`
- Time distribution between Fun/Learn modes
- Average session duration trends

## Data Models

### 1. Database Schema for AI Usage Tracking

**New Prisma Model**: `LlmUsage`

```prisma
model LlmUsage {
  id               String   @id @default(cuid())
  provider         String   @db.VarChar(50)  // 'openai', 'local', etc.
  model            String   @db.VarChar(100) // 'gpt-4', 'llama-3', etc.
  promptTokens     Int      @default(0) @map("prompt_tokens")
  completionTokens Int      @default(0) @map("completion_tokens")
  totalTokens      Int      @default(0) @map("total_tokens")
  cost             Decimal  @db.Decimal(12, 8) // Store cost with high precision
  isPaid           Boolean  @default(false) @map("is_paid")
  sessionId        String?  @map("session_id") // Optional link to session
  messageId        String?  @map("message_id") // Optional link to message
  createdAt        DateTime @default(now()) @map("created_at")
  
  @@index([provider, createdAt])
  @@index([model, createdAt])
  @@index([createdAt])
  @@map("llm_usage")
}
```

This model will:
- Persist all AI usage data across server restarts
- Enable historical analysis and trend tracking
- Support high-precision cost tracking (up to 8 decimal places)
- Allow querying by provider, model, and time period

### 2. Stats Data Structure

```typescript
interface StatsOverview {
  users: {
    total: number;
    new7d: number;
    new30d: number;
    active7d: number;
    active30d: number;
    growth: number; // percentage
  };
  
  sessions: {
    total: number;
    new7d: number;
    new30d: number;
    avgDuration: number;
    growth: number;
  };
  
  messages: {
    total: number;
    new7d: number;
    new30d: number;
    avgPerSession: number;
    growth: number;
  };
  
  courses: {
    total: number;
    new30d: number;
    popular: CourseStats[];
    underperforming: CourseStats[];
  };
  
  finance: {
    totalCost: number;
    monthlyCosts: MonthlyCost[];
    providerDistribution: ProviderCost[];
    avgCostPerMessage: number;
  };
  
  languages: {
    totalLanguages: number;
    topLanguages: LanguageStats[];
    avgLanguagesPerUser: number;
  };
  
  attentionEconomy: {
    totalTime: number;
    funVsLearn: ModeDistribution;
    avgSessionTime: ModeTime[];
    topCoursesByTime: CourseTimeStats[];
  };
}

interface CourseStats {
  id: string;
  name: string;
  sessionCount: number;
  avgTime: number;
}

interface MonthlyCost {
  month: string;
  cost: number;
  messageCount: number;
}

interface ProviderCost {
  provider: 'openai' | 'local';
  cost: number;
  messageCount: number;
  percentage: number;
}

interface LanguageStats {
  language: string;
  sessionCount: number;
  percentage: number;
}

interface ModeDistribution {
  fun: { time: number; percentage: number };
  learn: { time: number; percentage: number };
}
```

### 2. Database Queries

#### User Statistics Query
```sql
-- Total users and growth
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_7d,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_30d
FROM users;

-- Active users (users with sessions in period)
SELECT COUNT(DISTINCT user_id) as active_users
FROM sessions 
WHERE created_at >= NOW() - INTERVAL '30 days';
```

#### Course Statistics Query
```sql
-- Popular courses
SELECT 
  course_id,
  COUNT(*) as session_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_duration_minutes
FROM sessions 
WHERE course_id IS NOT NULL 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY course_id
ORDER BY session_count DESC
LIMIT 10;
```

#### Language Statistics Query
```sql
-- Language usage in sessions
SELECT 
  language,
  COUNT(*) as session_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY language
ORDER BY session_count DESC;
```

## API Endpoints

### 1. Stats API Routes

**File**: `src/routes/api/stats/overview/+server.js`
```javascript
export async function GET({ url }) {
  const timeRange = url.searchParams.get('range') || '30d';
  
  try {
    const stats = await StatsService.getOverviewStats(timeRange);
    return json(stats);
  } catch (error) {
    return json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
```

**File**: `src/routes/api/stats/users/+server.js`
**File**: `src/routes/api/stats/courses/+server.js`
**File**: `src/routes/api/stats/finance/+server.js`
**File**: `src/routes/api/stats/languages/+server.js`
**File**: `src/routes/api/stats/attention/+server.js`

### 2. Page Load Data

**File**: `src/routes/stats/+page.server.js`
```javascript
export async function load({ url }) {
  const timeRange = url.searchParams.get('range') || '30d';
  
  try {
    const [overview, trends] = await Promise.all([
      StatsService.getOverviewStats(timeRange),
      StatsService.getTrendsData(timeRange)
    ]);
    
    return {
      overview,
      trends,
      timeRange
    };
  } catch (error) {
    return {
      error: 'Failed to load statistics',
      overview: null,
      trends: null
    };
  }
}
```

## Error Handling

### 1. Graceful Degradation
- If specific chart data fails to load, show placeholder with retry button
- If entire stats fail, show basic metrics from cache
- Loading states with skeleton components

### 2. Error States
```svelte
{#if error}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-red-700">Failed to load statistics</p>
    <button on:click={retry} class="mt-2 px-4 py-2 bg-red-600 text-white rounded">
      Retry
    </button>
  </div>
{:else if loading}
  <StatsSkeletonLoader />
{:else}
  <!-- Stats content -->
{/if}
```

## Testing Strategy

### 1. Unit Tests
- `StatsService.test.js` - Test data fetching and caching
- `KPICards.test.js` - Test component rendering with different data
- `Chart components` - Test chart rendering and interactions

### 2. Integration Tests
- API endpoint tests for all stats routes
- Database query performance tests
- Cache functionality tests

### 3. E2E Tests
- Full stats page loading and interaction
- Time range filtering functionality
- Chart interactions and tooltips

## Performance Considerations

### 1. Caching Strategy
- Server-side caching for 10 minutes
- Client-side caching for navigation
- Incremental data updates for real-time metrics

### 2. Database Optimization
- Indexed queries on frequently accessed columns
- Materialized views for complex aggregations
- Query result pagination for large datasets

### 3. Chart Performance
- Lazy loading of chart components
- Data sampling for large datasets
- Efficient re-rendering on data updates

## Security

### 1. Access Control
- Admin role verification on all stats routes
- Session validation for API endpoints
- Rate limiting on stats API calls

### 2. Data Privacy
- No PII in aggregated statistics
- Anonymized user data in charts
- Secure handling of financial data

## Migration Plan

### 1. URL Migration
1. Create new `/stats` route
2. Implement redirect from `/admin` to `/stats`
3. Update Console navigation dropdown
4. Update internal links and references

### 2. Deployment Strategy
1. Deploy new stats components
2. Test with existing admin users
3. Update navigation after verification
4. Monitor performance and usage

