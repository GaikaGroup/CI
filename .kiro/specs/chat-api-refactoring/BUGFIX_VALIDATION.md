# Bug Fix: Request Validation Logic Error

## Issue

The chat API was returning **400 Bad Request** errors for valid requests due to a logic error in the `RequestValidatorService`.

### Error in Console

```
POST http://localhost:3014/api/chat 400 (Bad Request)
Error: Failed to send message: Bad Request
```

### Root Cause

In `src/lib/modules/chat/services/RequestValidatorService.js`, line 52:

```javascript
// WRONG - uses AND (&&) instead of OR (||)
if (requestBody.content === undefined && requestBody.content === null) {
  return {
    valid: false,
    error: 'Missing required field: content'
  };
}
```

This condition can **never** be true because `content` cannot be both `undefined` AND `null` at the same time. This caused the validation to incorrectly pass when content was missing, leading to downstream validation failures.

## Fix

### Fix 1: Content validation logic

Changed the logical operator from `&&` (AND) to `||` (OR):

```javascript
// CORRECT - uses OR (||)
if (requestBody.content === undefined || requestBody.content === null) {
  return {
    valid: false,
    error: 'Missing required field: content'
  };
}
```

Now the validation correctly rejects requests when content is either `undefined` OR `null`.

### Fix 2: Allow null for optional fields

The frontend sends `provider: null` and `model: null` when not specified, but the validator was rejecting `null` values. Fixed by allowing `null` for optional fields:

```javascript
// CORRECT - allows null for optional fields
if (
  requestBody.provider !== undefined &&
  requestBody.provider !== null &&
  typeof requestBody.provider !== 'string'
) {
  return {
    valid: false,
    error: 'Field "provider" must be a string'
  };
}
```

Same fix applied to `model` field.

## Testing

### Added Tests

Added test cases to ensure both fixes work:

```javascript
// Test for content validation
it('should reject undefined content', () => {
  const request = {};
  const result = service.validateRequiredFields(request);
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Missing required field: content');
});

it('should reject null content', () => {
  const request = { content: null };
  const result = service.validateRequiredFields(request);
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Missing required field: content');
});

// Test for optional fields accepting null
it('should accept null provider', () => {
  const request = { content: 'Hello', provider: null };
  const result = service.validateFieldTypes(request);
  expect(result.valid).toBe(true);
});

it('should accept null model', () => {
  const request = { content: 'Hello', model: null };
  const result = service.validateFieldTypes(request);
  expect(result.valid).toBe(true);
});
```

### Test Results

All 38 tests in `RequestValidatorService.test.js` pass:

```
✓ tests/unit/chat/services/RequestValidatorService.test.js (38)
  ✓ RequestValidatorService (38)
    ✓ validateRequest (6)
    ✓ validateRequiredFields (6)  ← Including new tests
    ✓ validateFieldTypes (20)
    ✓ normalizeRequest (6)
```

## Impact

- **Before**: Chat API returned 400 errors for valid requests
- **After**: Chat API correctly validates requests and processes messages

## Files Changed

1. `src/lib/modules/chat/services/RequestValidatorService.js` - Fixed validation logic
2. `tests/unit/chat/services/RequestValidatorService.test.js` - Added test coverage

## Verification

To verify the fix works in the application:

1. Start the dev server: `npm run dev`
2. Navigate to a chat session
3. Send a message (e.g., `/explain теорема пифагора`)
4. The message should be processed successfully without 400 errors

## Related

This fix is part of the chat API refactoring effort documented in:

- `.kiro/specs/chat-api-refactoring/requirements.md`
- `.kiro/specs/chat-api-refactoring/design.md`
- `.kiro/specs/chat-api-refactoring/tasks.md`
