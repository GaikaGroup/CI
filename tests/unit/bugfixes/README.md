# Regression Tests

This directory contains tests for previously fixed bugs to prevent regressions. Every bug fix should have a corresponding test that verifies the fix and prevents the bug from reoccurring.

## Purpose

Regression tests ensure that:

- Fixed bugs don't reappear in future code changes
- Bug fixes are properly documented with test cases
- Edge cases discovered during bug fixes are covered
- The codebase maintains stability over time

## Naming Convention

### For GitHub Issues

```
issue-{number}-{short-description}.test.js
```

Examples:

- `issue-123-session-timeout.test.js`
- `issue-456-enrollment-duplicate.test.js`
- `issue-789-voice-language-detection.test.js`

### For Other Bugs

```
{descriptive-name}.test.js
```

Examples:

- `voice-recognition-language-detection.test.js`
- `course-enrollment-race-condition.test.js`
- `chat-message-ordering.test.js`

## Test Structure

Each regression test should include:

1. **Bug Reference**: Link to issue or description of the bug
2. **Bug Description**: What was the problem?
3. **Fix Description**: How was it fixed?
4. **Test Scenario**: Reproduce the bug scenario
5. **Verification**: Verify the fix works
6. **Edge Cases**: Test related edge cases

### Template

```javascript
/**
 * Regression test for Issue #123
 *
 * Bug: Users were logged out prematurely due to incorrect token expiration
 * Fix: Corrected token expiration calculation in AuthService
 * Date: 2024-01-15
 * PR: #124
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../../src/lib/services/AuthService.js';

describe('Issue #123: Session Timeout Bug', () => {
  beforeEach(() => {
    // Setup test environment
  });

  it('should not expire session prematurely', async () => {
    // Test that reproduces the original bug scenario
    const session = await AuthService.createSession(userId);

    // Wait for a short time (less than expiration)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Session should still be valid
    const isValid = await AuthService.validateSession(session.token);
    expect(isValid).toBe(true);
  });

  it('should expire session after correct duration', async () => {
    // Test that session expires at the right time
    const session = await AuthService.createSession(userId, { expiresIn: 2 });

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 2100));

    // Session should now be expired
    const isValid = await AuthService.validateSession(session.token);
    expect(isValid).toBe(false);
  });

  it('should handle edge case: session at exact expiration time', async () => {
    // Test edge case discovered during bug fix
    // ...
  });
});
```

## When to Add Regression Tests

Add a regression test when:

- Fixing a bug reported by users
- Fixing a bug found during development
- Fixing a bug found by other tests
- Discovering an edge case that wasn't covered

## Process for Adding Regression Tests

1. **Before fixing the bug**:
   - Write a test that reproduces the bug
   - Verify the test fails (confirms bug exists)

2. **While fixing the bug**:
   - Fix the bug in the source code
   - Ensure the test now passes

3. **After fixing the bug**:
   - Add edge case tests
   - Document the bug and fix in test comments
   - Commit test with the bug fix

## Best Practices

### DO:

- ✅ Write tests that clearly reproduce the bug
- ✅ Include detailed comments explaining the bug
- ✅ Reference the issue number or bug report
- ✅ Test edge cases related to the bug
- ✅ Keep tests focused and specific
- ✅ Use descriptive test names

### DON'T:

- ❌ Skip writing tests for "small" bugs
- ❌ Write vague or generic tests
- ❌ Forget to document what bug is being tested
- ❌ Test multiple unrelated bugs in one file
- ❌ Leave commented-out code
- ❌ Skip edge cases

## Examples

### Example 1: Authentication Bug

```javascript
/**
 * Regression test for Issue #234
 * Bug: Users with email containing '+' character couldn't log in
 * Fix: Updated email validation regex in AuthService
 */
describe('Issue #234: Email Validation Bug', () => {
  it('should allow login with email containing plus sign', async () => {
    const email = 'user+test@example.com';
    const result = await AuthService.login(email, 'password');
    expect(result.success).toBe(true);
  });

  it('should allow registration with email containing plus sign', async () => {
    const email = 'newuser+test@example.com';
    const result = await AuthService.register(email, 'password');
    expect(result.success).toBe(true);
  });
});
```

### Example 2: Race Condition Bug

```javascript
/**
 * Regression test for Issue #345
 * Bug: Concurrent enrollment requests created duplicate enrollments
 * Fix: Added database unique constraint and transaction handling
 */
describe('Issue #345: Enrollment Race Condition', () => {
  it('should prevent duplicate enrollments from concurrent requests', async () => {
    const userId = 'user123';
    const courseId = 'course456';

    // Simulate concurrent enrollment requests
    const requests = [
      EnrollmentService.enroll(userId, courseId),
      EnrollmentService.enroll(userId, courseId),
      EnrollmentService.enroll(userId, courseId)
    ];

    const results = await Promise.allSettled(requests);

    // Only one should succeed
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success);
    expect(successful).toHaveLength(1);

    // Verify only one enrollment exists
    const enrollments = await EnrollmentService.getUserEnrollments(userId);
    const courseEnrollments = enrollments.filter((e) => e.courseId === courseId);
    expect(courseEnrollments).toHaveLength(1);
  });
});
```

### Example 3: Data Validation Bug

```javascript
/**
 * Regression test for Issue #456
 * Bug: Course creation accepted invalid duration values
 * Fix: Added proper validation in CourseService
 */
describe('Issue #456: Course Duration Validation', () => {
  it('should reject negative duration', async () => {
    const result = await CourseService.create({
      name: 'Test Course',
      duration: -10
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('duration');
  });

  it('should reject zero duration', async () => {
    const result = await CourseService.create({
      name: 'Test Course',
      duration: 0
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid duration', async () => {
    const result = await CourseService.create({
      name: 'Test Course',
      duration: 30
    });
    expect(result.success).toBe(true);
  });
});
```

## Running Regression Tests

```bash
# Run all regression tests
npm run test:run tests/unit/bugfixes

# Run specific regression test
npm run test:run tests/unit/bugfixes/issue-123-session-timeout.test.js

# Run with coverage
npm run test:coverage tests/unit/bugfixes
```

## Maintenance

- Review regression tests periodically
- Remove tests for code that no longer exists
- Update tests when related code is refactored
- Keep test documentation up to date

## Questions?

If you're unsure whether to add a regression test, ask yourself:

- Could this bug happen again?
- Is this an edge case we should always test?
- Would this test help prevent similar bugs?

If the answer to any of these is "yes", add the regression test!
