# Testing Guide

This directory contains all tests for the AI Tutor Platform. We follow a comprehensive testing strategy with unit, integration, E2E, smoke, and regression tests.

## Table of Contents

- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual functions/services
│   ├── auth/               # Authentication tests
│   ├── chat/               # Chat system tests
│   ├── courses/            # Course management tests
│   ├── document/           # Document processing tests
│   ├── llm/                # LLM provider tests
│   ├── session/            # Session management tests
│   ├── subjects/           # Subject/agent tests
│   ├── utils/              # Utility function tests
│   └── bugfixes/           # Regression tests for fixed bugs
├── integration/             # Integration tests with database
│   ├── api/                # API endpoint tests
│   ├── auth/               # Auth flow tests
│   ├── chat/               # Chat integration tests
│   ├── document/           # Document processing integration
│   ├── routes/             # Route handler tests
│   └── session/            # Session integration tests
├── e2e/                     # End-to-end user flow tests
│   ├── voiceChatFlow.test.js
│   ├── userExperienceValidation.test.js
│   └── voiceModeUxValidation.test.js
└── smoke/                   # Quick deployment verification tests
    ├── health-check.test.js
    ├── api-availability.test.js
    └── database-connection.test.js
```

## Running Tests

### All Tests

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (during development)
npm run test

# Run with coverage report
npm run test:coverage

# Run with UI
npm run test:ui
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:run tests/unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Smoke tests only
npm run test:smoke

# Regression tests only
npm run test:run tests/unit/bugfixes
```

### Specific Test Files

```bash
# Run a single test file
npm run test:run tests/unit/auth/authService.test.js

# Run tests matching a pattern
npm run test:run tests/unit/chat
```

### API Coverage Audit

```bash
# Check API endpoint test coverage
npm run test:audit-api
```

## Writing Tests

### Unit Tests

Unit tests focus on individual functions or services in isolation.

**Example:**

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyService } from '../../../src/lib/services/MyService.js';

describe('MyService', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should process data correctly', () => {
    // Arrange
    const input = 'test data';
    
    // Act
    const result = MyService.process(input);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', () => {
    // Test error scenarios
    const invalidInput = null;
    const result = MyService.process(invalidInput);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### Integration Tests

Integration tests verify that components work together correctly, typically with a real database.

**Example:**

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../../src/lib/database/client.js';

describe('User API Integration', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  it('should create user via API', async () => {
    const response = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com' })
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();
  });
});
```

### E2E Tests

E2E tests verify complete user workflows from start to finish.

**Example:**

```javascript
import { describe, it, expect } from 'vitest';

describe('User Registration Flow', () => {
  it('should complete full registration process', async () => {
    // 1. Navigate to registration page
    // 2. Fill in form
    // 3. Submit
    // 4. Verify account created
    // 5. Verify email sent
    // 6. Verify can log in
  });
});
```

### Smoke Tests

Smoke tests are quick checks that verify critical functionality after deployment.

**Example:**

```javascript
import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should verify application starts', async () => {
    // Quick check that app is running
    const health = await checkHealth();
    expect(health.status).toBe('ok');
  });
});
```

### Regression Tests

Regression tests prevent previously fixed bugs from reoccurring. See [bugfixes/README.md](./unit/bugfixes/README.md) for detailed guidelines.

## Coverage Requirements

We enforce minimum coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

Coverage is automatically checked:
- On every test run with `npm run test:coverage`
- In pre-push git hooks
- In CI/CD pipeline

If coverage falls below thresholds, tests will fail.

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Improving Coverage

1. Identify uncovered code in the coverage report
2. Write tests for uncovered functions/branches
3. Run coverage again to verify improvement
4. Commit tests with your code changes

## CI/CD Integration

Tests run automatically in our CI/CD pipeline:

### On Every Push

1. **Code Quality**: ESLint and Prettier checks
2. **Tests**: Unit, integration, E2E, and smoke tests
3. **Coverage**: Coverage report generation and threshold validation
4. **Build**: Production build verification
5. **Security**: npm audit for vulnerabilities

### Pre-commit Hooks

Before each commit:
- Lint and format staged files
- Run unit tests

### Pre-push Hooks

Before each push:
- Run full test suite
- Check coverage thresholds
- Verify build succeeds

### Bypassing Hooks (Not Recommended)

```bash
# Skip pre-commit hooks (use sparingly!)
git commit --no-verify

# Skip pre-push hooks (use sparingly!)
git push --no-verify
```

## Best Practices

### DO:

- ✅ Write tests for all new features
- ✅ Write tests for bug fixes (regression tests)
- ✅ Keep tests focused and specific
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)
- ✅ Mock external dependencies
- ✅ Clean up after tests (afterEach, afterAll)
- ✅ Test edge cases and error scenarios
- ✅ Keep tests fast (< 30s for unit tests)

### DON'T:

- ❌ Skip writing tests
- ❌ Write tests that depend on each other
- ❌ Leave console.log statements in tests
- ❌ Test implementation details
- ❌ Write slow tests without good reason
- ❌ Commit failing tests
- ❌ Use real external APIs in tests
- ❌ Hardcode sensitive data in tests

## Troubleshooting

### Tests Failing Locally

1. **Check database connection**:
   ```bash
   npm run db:test
   ```

2. **Regenerate Prisma client**:
   ```bash
   npm run db:generate
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Clear node_modules and reinstall**:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Tests Passing Locally but Failing in CI

1. Check environment variables in CI
2. Verify database is accessible in CI
3. Check for timing issues (increase timeouts if needed)
4. Look for hardcoded paths or assumptions

### Slow Tests

1. Identify slow tests:
   ```bash
   npm run test:run -- --reporter=verbose
   ```

2. Optimize database operations
3. Use mocks instead of real services
4. Run tests in parallel (Vitest does this by default)

### Coverage Not Updating

1. Delete coverage directory:
   ```bash
   rm -rf coverage
   ```

2. Run coverage again:
   ```bash
   npm run test:coverage
   ```

### Import Errors

1. Check file paths are correct
2. Verify aliases in vitest.config.js
3. Ensure file extensions are included (.js)

### Database Errors in Tests

1. Verify DATABASE_URL is set
2. Check PostgreSQL is running
3. Run migrations: `npm run db:migrate`
4. Check test database exists

## Test Configuration

Tests are configured in `vitest.config.js`:

- **Environment**: jsdom (for DOM testing)
- **Globals**: true (no need to import describe, it, expect)
- **Setup**: tests/setup.js runs before all tests
- **Timeout**: 15s for E2E tests, 10s for setup/teardown
- **Coverage**: v8 provider with thresholds

## Useful Commands

```bash
# Development
npm run test                    # Watch mode
npm run test:ui                 # Visual UI

# Running Tests
npm run test:run                # All tests once
npm run test:integration        # Integration tests
npm run test:e2e                # E2E tests
npm run test:smoke              # Smoke tests

# Coverage
npm run test:coverage           # Generate coverage report

# Auditing
npm run test:audit-api          # Check API test coverage

# Database
npm run db:test                 # Test database connection
npm run db:migrate              # Run migrations
npm run db:generate             # Generate Prisma client
```

## Getting Help

- Check this README first
- Look at existing tests for examples
- Review [bugfixes/README.md](./unit/bugfixes/README.md) for regression tests
- Review [smoke/README.md](./smoke/README.md) for smoke tests
- Ask the team in Slack/Discord

## Contributing

When adding new features:

1. Write tests first (TDD) or alongside code
2. Ensure all tests pass locally
3. Check coverage hasn't decreased
4. Run `npm run test:audit-api` for API changes
5. Update this README if adding new test patterns

Remember: **Tests are not optional!** They protect our codebase and give us confidence to make changes.
