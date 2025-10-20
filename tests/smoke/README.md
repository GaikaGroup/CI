# Smoke Tests

Smoke tests are quick, basic tests that verify critical functionality after deployment. They should complete within 30 seconds and catch major issues immediately.

## Purpose

Smoke tests verify that:
- The application starts without errors
- Critical API endpoints are accessible
- Database connections work
- Essential services are operational

## When to Run

- After deployment to staging/production
- Before running full test suite
- As part of health checks
- During CI/CD pipeline

## Running Smoke Tests

```bash
# Run all smoke tests
npm run test:smoke

# Run specific smoke test
npm run test:run tests/smoke/health-check.test.js
```

## Adding New Smoke Tests

Smoke tests should be:
1. **Fast**: Complete in < 5 seconds each
2. **Simple**: Test only basic functionality
3. **Critical**: Focus on must-have features
4. **Independent**: Don't depend on other tests

### Example Smoke Test

```javascript
import { describe, it, expect } from 'vitest';

describe('My Feature Smoke Test', () => {
  it('should verify basic functionality', async () => {
    // Test critical path only
    const result = await myFeature.basicOperation();
    expect(result).toBeDefined();
  });
});
```

## Current Smoke Tests

### health-check.test.js
Verifies application startup and critical modules load correctly.

### api-availability.test.js
Tests that critical API endpoints respond to requests.

### database-connection.test.js
Confirms database connectivity and schema accessibility.

## Deployment Integration

Smoke tests should be run:
1. Immediately after deployment
2. Before marking deployment as successful
3. As part of automated health checks

If smoke tests fail, deployment should be rolled back automatically.

## Troubleshooting

### Smoke tests timing out
- Check if services are actually running
- Verify network connectivity
- Increase timeout if needed (but keep < 30s total)

### Database connection failures
- Verify DATABASE_URL environment variable
- Check database is running and accessible
- Confirm migrations have been applied

### API endpoint failures
- Check if application server is running
- Verify correct port and host configuration
- Review application logs for startup errors
