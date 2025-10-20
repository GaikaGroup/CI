# Implementation Plan

- [x] 1. Create stats module structure and core service
  - Create directory structure for stats module components and services
  - Implement StatsService class with caching functionality
  - Define TypeScript interfaces for stats data models
  - _Requirements: 1.1, 9.1_

- [ ] 2. Implement database queries for user statistics
  - [x] 2.1 Create user statistics queries
    - Write SQL queries for total users, new users by period, and active users
    - Implement user growth calculation logic
    - Add database indexes for performance optimization
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 Create user activity tracking queries
    - Write queries for daily/monthly user activity graphs
    - Implement user registration trends over time
    - Add query optimization for large datasets
    - _Requirements: 2.4, 2.5_

- [ ] 3. Implement course and subject statistics
  - [x] 3.1 Create course popularity queries
    - Write queries for top 10 most popular courses by session count
    - Implement bottom 5 underperforming courses identification
    - Calculate average time spent per course
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 3.2 Create course statistics aggregation
    - Implement total course count and new courses tracking
    - Add course engagement metrics calculation
    - Create course performance comparison logic
    - _Requirements: 3.4_

- [ ] 4. Implement financial analytics for AI costs
  - [ ] 4.1 Create database model for AI usage tracking
    - Add LlmUsage model to prisma/schema.prisma to persist AI costs and token usage
    - Include fields: provider, model, tokens (prompt/completion/total), cost, timestamp
    - Run prisma migration to create the table
    - Update UsageTracker to save records to database in addition to memory
    - _Requirements: 4.1, 9.2_

  - [ ] 4.2 Create AI cost tracking queries
    - Write queries for total AI costs by month and provider from database
    - Implement OpenAI vs Local LLM cost distribution from persisted data
    - Calculate average cost per message by provider
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 4.3 Create financial trend analysis
    - Implement monthly cost trend calculations from database
    - Add cost projection and forecasting logic
    - Create provider usage statistics
    - _Requirements: 4.3, 4.4_

- [ ] 5. Implement language usage analytics
  - [x] 5.1 Create language statistics queries
    - Write queries for language usage in sessions
    - Implement top languages identification
    - Calculate multilingual user statistics
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.2 Create language diversity metrics
    - Implement average languages per user calculation
    - Add language distribution analysis
    - Create session language tracking
    - _Requirements: 6.4, 6.5_

- [ ] 6. Implement attention economy analytics
  - [x] 6.1 Create time tracking queries
    - Write queries for total time spent in system
    - Implement Fun vs Learn mode time distribution
    - Calculate average session duration by mode
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Create engagement analytics
    - Implement top courses by time spent
    - Add session duration trend analysis
    - Create user engagement patterns
    - _Requirements: 5.4, 5.5_

- [ ] 7. Create API endpoints for stats data
  - [x] 7.1 Implement core stats API routes
    - Create /api/stats/overview endpoint with time range support
    - Implement /api/stats/users endpoint for user analytics
    - Add /api/stats/courses endpoint for course statistics
    - _Requirements: 1.1, 8.1, 8.2_

  - [x] 7.2 Implement specialized stats endpoints
    - Create /api/stats/finance endpoint for cost analytics
    - Implement /api/stats/languages endpoint for language stats
    - Add /api/stats/attention endpoint for time analytics
    - _Requirements: 8.3, 8.4, 8.5_

- [ ] 8. Create stats page route and server-side data loading
  - [x] 8.1 Create new /stats route structure
    - Create src/routes/stats/+page.svelte main component
    - Implement src/routes/stats/+page.server.js for data loading
    - Add admin access control and authentication checks
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 8.2 Implement URL redirect from /admin to /stats
    - Create redirect logic from old /admin route to new /stats route
    - Update page title and meta information
    - Add proper HTTP status codes for redirects
    - _Requirements: 1.4, 1.5_

- [ ] 9. Create KPI cards component
  - [x] 9.1 Implement KPICards component
    - Create component for displaying key metrics cards
    - Add trend indicators with growth percentages
    - Implement responsive grid layout for different screen sizes
    - _Requirements: 2.1, 2.2, 2.3, 9.4_

  - [x] 9.2 Add loading and error states
    - Implement skeleton loading states for KPI cards
    - Add error handling with retry functionality
    - Create fallback displays for missing data
    - _Requirements: 9.3, 9.4_

- [ ] 10. Create chart components for data visualization
  - [ ] 10.1 Implement UserActivityChart component
    - Install chart.js and svelte-chartjs dependencies if not already present
    - Create UserActivityChart.svelte component in src/lib/modules/stats/components/
    - Fetch daily activity data from /api/stats/users endpoint
    - Implement line chart using Chart.js showing daily active users and new registrations
    - Add interactive tooltips with detailed daily data
    - Implement responsive chart sizing for mobile devices
    - Integrate chart into stats page replacing the placeholder
    - _Requirements: 2.4, 2.5, 9.4_

  - [ ] 10.2 Implement CoursePopularityChart component
    - Create CoursePopularityChart.svelte component
    - Fetch course data and render bar chart for top 10 popular courses
    - Add table display for bottom 5 underperforming courses
    - Implement course performance comparison visualization
    - Integrate into stats page
    - _Requirements: 3.3, 3.4_

  - [ ] 10.3 Implement FinanceChart component
    - Create FinanceChart.svelte component
    - Fetch finance data and create pie chart for OpenAI vs Local LLM cost distribution
    - Add line chart for monthly spending trends
    - Implement cost breakdown visualization
    - Integrate into stats page
    - _Requirements: 4.2, 4.3_

  - [ ] 10.4 Implement LanguageChart component
    - Create LanguageChart.svelte component
    - Fetch language data and create horizontal bar chart for language usage
    - Add metrics display for multilingual users
    - Implement language diversity visualization
    - Integrate into stats page
    - _Requirements: 6.2, 6.3, 6.5_

  - [ ] 10.5 Implement AttentionEconomyChart component
    - Create AttentionEconomyChart.svelte component
    - Fetch attention economy data and create time distribution charts for Fun vs Learn modes
    - Add average session duration trend visualization
    - Implement top courses by time spent display
    - Integrate into stats page
    - _Requirements: 5.2, 5.4, 5.5_

- [ ] 11. Create time range filtering functionality
  - [x] 11.1 Implement TimeRangeSelector component
    - Create selector for predefined time periods (7d, 30d, 3m, 1y)
    - Add custom date range picker functionality
    - Implement URL parameter persistence for selected ranges
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 11.2 Integrate time filtering with all components
    - Update all chart components to respond to time range changes
    - Implement loading states during time range updates
    - Add data refresh functionality for new time periods
    - _Requirements: 8.3, 8.5_

- [ ] 12. Implement trends and forecasting
  - [x] 12.1 Create TrendsPanel component
    - Implement user growth trend indicators (growing/stable/declining)
    - Add forecasting for next month user count
    - Create platform health indicators with color coding
    - _Requirements: 7.1, 7.2, 7.5_

  - [x] 12.2 Add seasonal and weekly patterns
    - Implement weekly activity pattern analysis
    - Add seasonal trend detection and display
    - Create cost forecasting for next month
    - _Requirements: 7.3, 7.4_

- [ ] 13. Implement caching and performance optimization
  - [x] 13.1 Add server-side caching
    - Implement 10-minute cache for complex statistical queries
    - Add cache invalidation logic for data updates
    - Create cache warming for frequently accessed stats
    - _Requirements: 9.1, 9.2_

  - [x] 13.2 Optimize database queries
    - Add database indexes for frequently queried columns
    - Implement query result pagination for large datasets
    - Add query performance monitoring and optimization
    - _Requirements: 9.5_

- [ ] 14. Add error handling and loading states
  - [x] 14.1 Implement comprehensive error handling
    - Create graceful degradation for failed chart data
    - Add retry mechanisms for failed API calls
    - Implement fallback displays with cached data
    - _Requirements: 9.4_

  - [ ] 14.2 Create skeleton loading components
    - Implement skeleton loaders for all chart components
    - Add loading states for KPI cards and statistics
    - Create smooth transitions between loading and loaded states
    - _Requirements: 9.3_

- [ ] 15. Update navigation and integrate with existing Console
  - [x] 15.1 Update Console navigation dropdown
    - Modify ConsoleDropdown component to include Stats link
    - Update navigation highlighting for /stats route
    - Ensure proper active state indication
    - _Requirements: 1.1, 1.2_

  - [x] 15.2 Test navigation integration
    - Verify all Console navigation links work correctly
    - Test breadcrumb navigation and back functionality
    - Ensure consistent styling with existing Console pages
    - _Requirements: 1.3, 1.4_