# Design Document

## Overview

This design establishes a comprehensive test infrastructure that enforces quality standards through automated coverage thresholds, pre-commit hooks, CI/CD pipelines, and organized test structures. The solution builds upon the existing Vitest setup and adds missing components identified in the test coverage analysis.

## Architecture

### High-Level Components

```
Test Infrastructure
├── Configuration Layer
│   ├── vitest.config.js (enhanced with thresholds)
│   ├── .husky hooks (pre-commit, pre-push, commit-msg)
│   └── .github/workflows (CI/CD pipelines)
├── Test Suites
│   ├── Unit Tests (existing)
│   ├── Integration Tests (existing)
│   ├── E2E Tests (existing)
│   ├── Smoke Tests (new)
│   └── Regression Tests (new structure)
├── Coverage System
│   ├── Threshold Enforcement
│   ├── Report Generation
│   └── Coverage Tracking
└── Documentation
    ├── tests/README.md
    ├── tests/smoke/README.md
    └── tests/unit/bugfixes/README.md
```

### Integration Points

- **Vitest**: Core test runner with coverage via @vitest/coverage-v8
- **Husky**: Git hooks for pre-commit/pre-push validation
- **GitHub Actions**: CI/CD automation
- **Prisma**: Database setup for integration tests
- **ESLint/Prettier**: Code quality checks

## Components and Interfaces

### 1. Enhanced Vitest Configuration

**File**: `vitest.config.js`

**Enhancements**:
```javascript
coverage: {
  reporter: ['text', 'json', 'html', 'json-summary'],
  exclude: [
    'node_modules/**',
    'tests/**',
    'build/**',
    '**/*.config.js',
    '**/*.config.ts',
    '.svelte-kit/**',
    'static/**'
  ],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80
  }
}
```

**Behavior**:
- Fails test run if any threshold not met
- Generates multiple report formats for different consumers
- Excludes non-application code from coverage calculation

### 2. Smoke Test Suite

**Directory**: `tests/smoke/`

**Structure**:
```
tests/smoke/
├── README.md
├── health-check.test.js
├── api-availability.test.js
└── database-connection.test.js
```

**health-check.test.js**:
```javascript
describe('Health Check', () => {
  it('should start application without errors', async () => {
    // Verify critical modules load
    // Check environment variables
    // Validate configuration
  });
});
```

**api-availability.test.js**:
```javascript
describe('API Availability', () => {
  const criticalEndpoints = [
    '/api/auth/login',
    '/api/sessions',
    '/api/courses',
    '/api/chat'
  ];
  
  criticalEndpoints.forEach(endpoint => {
    it(`should respond to ${endpoint}`, async () => {
      // Basic connectivity check
    });
  });
});
```

**database-connection.test.js**:
```javascript
describe('Database Connection', () => {
  it('should connect to database', async () => {
    // Test Prisma connection
    // Verify schema is up to date
  });
});
```

**Execution Time**: < 30 seconds total

### 3. Regression Test Structure

**Directory**: `tests/unit/bugfixes/`

**Structure**:
```
tests/unit/bugfixes/
├── README.md
├── issue-123-session-timeout.test.js
├── issue-456-enrollment-duplicate.test.js
└── voice-recognition-language-detection.test.js
```

**README.md Template**:
```markdown
# Regression Tests

This directory contains tests for previously fixed bugs to prevent regressions.

## Naming Convention
- GitHub issues: `issue-{number}-{short-description}.test.js`
- Other bugs: `{descriptive-name}.test.js`

## Test Structure
Each test should:
1. Reference the original bug report
2. Reproduce the bug scenario
3. Verify the fix works
4. Include edge cases

## Example
See issue-123-session-timeout.test.js for a complete example.
```

**Test Template**:
```javascript
/**
 * Regression test for Issue #123
 * Bug: Users were logged out prematurely
 * Fix: Corrected token expiration calculation
 * Date: 2024-01-15
 */
describe('Issue #123: Session Timeout', () => {
  it('should not expire session prematurely', async () => {
    // Test implementation
  });
  
  it('should expire session after correct duration', async () => {
    // Test implementation
  });
});
```

### 4. Pre-commit Hooks

**Files**: `.husky/pre-commit`, `.husky/pre-push`, `.husky/commit-msg`

**pre-commit**:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint staged files
echo "📝 Linting..."
npx lint-staged || exit 1

# Run fast unit tests only
echo "🧪 Running unit tests..."
npm run test:run tests/unit || exit 1

echo "✅ Pre-commit checks passed!"
```

**pre-push**:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push checks..."

# Full test suite
echo "🧪 Running all tests..."
npm run test:run || exit 1

# Coverage check
echo "📊 Checking coverage..."
npm run test:coverage || exit 1

# Build verification
echo "🏗️ Verifying build..."
npm run build || exit 1

echo "✅ Ready to push!"
```

**commit-msg**:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
npx --no -- commitlint --edit ${1}
```

**commitlint.config.js**:
```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 
      'refactor', 'test', 'chore'
    ]],
    'subject-case': [2, 'never', ['upper-case']]
  }
};
```

### 5. CI/CD Pipeline

**File**: `.github/workflows/ci.yml`

**Stages**:

1. **Code Quality** (parallel)
   - ESLint check
   - Prettier format check
   - TypeScript check (if applicable)

2. **Testing** (sequential after quality)
   - Unit tests
   - Integration tests (with PostgreSQL service)
   - E2E tests
   - Coverage report generation
   - Coverage threshold validation

3. **Build** (sequential after testing)
   - Production build
   - Build size check
   - Artifact upload

4. **Security** (parallel with testing)
   - npm audit
   - Secret scanning

**PostgreSQL Service Configuration**:
```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test_db
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

**Coverage Upload**:
```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
    fail_ci_if_error: true

- name: Check coverage threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

### 6. API Endpoint Test Coverage Audit

**Tool**: Custom script `scripts/audit-api-coverage.js`

**Purpose**: Verify all API endpoints have required test coverage

**Algorithm**:
1. Scan `src/routes/api/` for all `+server.js` files
2. Extract HTTP methods (GET, POST, PUT, DELETE)
3. Search test files for corresponding tests
4. Check for required test scenarios:
   - Success (200/201)
   - Authentication (401)
   - Authorization (403)
   - Validation (400)
   - Server error (500)
5. Generate coverage report

**Output**:
```
API Endpoint Coverage Audit
============================

✅ /api/sessions
   ✅ GET - All scenarios covered
   ✅ POST - All scenarios covered

⚠️  /api/courses
   ✅ GET - All scenarios covered
   ❌ POST - Missing: 403 (authorization)
   
❌ /api/admin/users
   ❌ GET - Missing: 400 (validation), 500 (error)
   
Summary: 15/20 endpoints fully covered (75%)
```

### 7. Test Documentation

**File**: `tests/README.md`

**Sections**:
- Test structure overview
- Running tests (all commands)
- Writing new tests (patterns and examples)
- Debugging tests
- Coverage requirements
- CI/CD integration
- Troubleshooting

**File**: `tests/smoke/README.md`

**Content**:
- Purpose of smoke tests
- When to run them
- How to add new smoke tests
- Deployment integration

## Data Models

### Coverage Report Schema

```typescript
interface CoverageReport {
  total: {
    lines: { pct: number; covered: number; total: number };
    functions: { pct: number; covered: number; total: number };
    branches: { pct: number; covered: number; total: number };
    statements: { pct: number; covered: number; total: number };
  };
  files: {
    [filepath: string]: {
      lines: { pct: number };
      functions: { pct: number };
      branches: { pct: number };
      statements: { pct: number };
    };
  };
}
```

### API Endpoint Test Coverage Schema

```typescript
interface EndpointCoverage {
  path: string;
  method: string;
  scenarios: {
    success: boolean;      // 200/201
    auth: boolean;         // 401
    authorization: boolean; // 403
    validation: boolean;   // 400
    error: boolean;        // 500
  };
  testFiles: string[];
}
```

## Error Handling

### Coverage Threshold Failures

**Scenario**: Coverage falls below threshold

**Handling**:
1. Vitest fails with clear error message
2. Shows which files have low coverage
3. Displays current vs. required percentages
4. Blocks commit/push via hooks
5. Fails CI/CD pipeline

**Recovery**: Add tests to increase coverage

### Pre-commit Hook Failures

**Scenario**: Lint, format, or test failures

**Handling**:
1. Display specific errors
2. Suggest fix commands
3. Block commit
4. Preserve staged changes

**Recovery Options**:
- Fix issues and retry
- Use `--no-verify` flag (discouraged)

### CI/CD Pipeline Failures

**Scenario**: Tests fail in CI

**Handling**:
1. Mark PR as failing
2. Display test results in PR
3. Link to detailed logs
4. Prevent merge

**Recovery**: Fix tests locally and push

### Database Connection Failures in Tests

**Scenario**: Cannot connect to test database

**Handling**:
1. Check DATABASE_URL environment variable
2. Verify PostgreSQL service is running
3. Retry with exponential backoff
4. Fail gracefully with clear message

**Recovery**: Fix database configuration

## Testing Strategy

### Unit Tests
- **Target**: 80%+ coverage
- **Scope**: Individual functions, services, utilities
- **Mocking**: External dependencies mocked
- **Speed**: < 30 seconds total

### Integration Tests
- **Target**: All API endpoints
- **Scope**: API routes with database
- **Mocking**: Minimal (real database, mock external APIs)
- **Speed**: < 60 seconds total

### E2E Tests
- **Target**: Critical user flows
- **Scope**: Full application workflows
- **Mocking**: None (real environment)
- **Speed**: < 30 seconds total

### Smoke Tests
- **Target**: Deployment verification
- **Scope**: Basic functionality checks
- **Mocking**: None
- **Speed**: < 30 seconds total

### Regression Tests
- **Target**: All fixed bugs
- **Scope**: Bug reproduction scenarios
- **Mocking**: As needed
- **Speed**: Part of unit test suite

## Performance Considerations

### Test Execution Time

**Current State**:
- Unknown (needs measurement)

**Target State**:
- Unit tests: < 30 seconds
- All tests: < 2 minutes

**Optimization Strategies**:
1. Run tests in parallel (Vitest default)
2. Use test.concurrent for independent tests
3. Optimize database setup/teardown
4. Cache dependencies in CI
5. Skip slow tests in pre-commit (run in pre-push)

### CI/CD Pipeline Optimization

**Strategies**:
1. Cache node_modules
2. Cache Prisma client generation
3. Run quality checks in parallel
4. Use matrix strategy for multiple Node versions (if needed)
5. Fail fast on critical errors

### Coverage Report Generation

**Optimization**:
- Generate HTML reports only in CI (not locally)
- Use json-summary for quick threshold checks
- Upload to Codecov asynchronously

## Migration Plan

### Phase 1: Configuration (Day 1)
1. Update vitest.config.js with thresholds
2. Measure current coverage
3. Adjust thresholds if needed (temporary lower values)

### Phase 2: Smoke Tests (Day 1-2)
1. Create tests/smoke/ directory
2. Implement health-check.test.js
3. Implement api-availability.test.js
4. Implement database-connection.test.js
5. Add npm script

### Phase 3: Regression Structure (Day 2)
1. Create tests/unit/bugfixes/ directory
2. Write README with guidelines
3. Migrate existing bug-related tests

### Phase 4: Pre-commit Hooks (Day 2-3)
1. Update .husky/pre-commit
2. Create .husky/pre-push
3. Create .husky/commit-msg
4. Add commitlint.config.js
5. Test hooks locally

### Phase 5: CI/CD Pipeline (Day 3-4)
1. Create .github/workflows/ci.yml
2. Configure PostgreSQL service
3. Add coverage upload
4. Test pipeline on feature branch

### Phase 6: API Coverage Audit (Day 4-5)
1. Create audit script
2. Run audit
3. Identify gaps
4. Create issues for missing tests

### Phase 7: Documentation (Day 5)
1. Write tests/README.md
2. Write tests/smoke/README.md
3. Update main README.md
4. Create examples

### Phase 8: Gradual Coverage Improvement (Ongoing)
1. Add tests for uncovered code
2. Increase thresholds incrementally
3. Target 80% coverage within 2 weeks

## Rollback Strategy

If issues arise:

1. **Coverage thresholds too strict**: Temporarily lower thresholds
2. **Pre-commit hooks blocking work**: Disable specific checks
3. **CI pipeline failing**: Revert workflow file
4. **Tests too slow**: Increase timeouts temporarily

All changes are configuration-based and easily reversible.

## Success Metrics

1. **Coverage**: 80%+ lines, functions, statements; 75%+ branches
2. **Test Speed**: Unit < 30s, All < 2min
3. **CI Success Rate**: > 95% (excluding legitimate failures)
4. **API Coverage**: 100% of endpoints have all 5 test scenarios
5. **Regression Prevention**: 0 reoccurring bugs with existing tests
6. **Developer Experience**: < 5 seconds for pre-commit checks

## Future Enhancements

1. **Visual Regression Testing**: Screenshot comparison for UI
2. **Performance Testing**: Load testing for API endpoints
3. **Mutation Testing**: Verify test quality with Stryker
4. **Test Analytics**: Track test flakiness and execution trends
5. **Parallel Test Execution**: Distribute tests across multiple machines
6. **Contract Testing**: API contract validation with Pact
