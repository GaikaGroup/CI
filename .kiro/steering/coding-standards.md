---
inclusion: always
---

# Coding Standards

## File Naming

- Components: `PascalCase.svelte` (e.g., `ChatInterface.svelte`)
- Services: `camelCase.js` (e.g., `courseService.js`)
- Utilities: `camelCase.js` (e.g., `slugify.js`)
- API routes: `+server.js` or `+page.server.js`
- Tests: `*.test.js` (e.g., `slugify.test.js`)

## Code Organization

### Svelte Components
```svelte
<script>
  // 1. Imports
  import { onMount } from 'svelte';
  
  // 2. Props
  export let data;
  
  // 3. State
  let loading = false;
  
  // 4. Reactive statements
  $: displayData = data?.items || [];
  
  // 5. Functions
  function handleClick() {
    // ...
  }
  
  // 6. Lifecycle
  onMount(() => {
    // ...
  });
</script>

<!-- 7. Template -->
<div>
  {#if loading}
    <p>Loading...</p>
  {:else}
    <p>{displayData.length} items</p>
  {/if}
</div>

<!-- 8. Styles -->
<style>
  /* Component-specific styles */
</style>
```

### Services
```javascript
/**
 * Service description
 */
export class MyService {
  /**
   * Method description
   * @param {string} param - Parameter description
   * @returns {Promise<Object>} Result description
   */
  static async myMethod(param) {
    try {
      // Implementation
      return { success: true, data };
    } catch (error) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  }
}
```

## Error Handling

### API Responses
Always return consistent format:
```javascript
// Success
return { success: true, data: result };

// Error
return { success: false, error: 'Error message' };
```

### Try-Catch Blocks
```javascript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}
```

### User-Facing Errors
- Show friendly error messages
- Log technical details to console
- Provide recovery options when possible

## Async/Await

- Always use async/await instead of .then()
- Handle errors with try-catch
- Use Promise.all() for parallel operations

```javascript
// Good
const [users, courses] = await Promise.all([
  getUsers(),
  getCourses()
]);

// Avoid
getUsers().then(users => {
  getCourses().then(courses => {
    // ...
  });
});
```

## Comments

### When to Comment
- Complex algorithms
- Non-obvious business logic
- API integrations
- Workarounds or hacks

### When NOT to Comment
- Obvious code
- Self-explanatory variable names
- Simple operations

```javascript
// Bad: Obvious comment
// Increment counter by 1
counter++;

// Good: Explains WHY
// Use exponential backoff to avoid rate limiting
await delay(Math.pow(2, retryCount) * 1000);
```

## Imports

### Order
1. External libraries
2. Internal modules
3. Components
4. Utilities
5. Types/constants

```javascript
// External
import { onMount } from 'svelte';
import { goto } from '$app/navigation';

// Internal modules
import { authStore } from '$modules/auth/stores';
import CourseService from '$lib/services/CourseService';

// Components
import Button from '$shared/components/Button.svelte';

// Utilities
import { slugify } from '$lib/utils/slugify';
```

## Naming Conventions

### Variables
- `camelCase` for variables and functions
- `UPPER_SNAKE_CASE` for constants
- Descriptive names, avoid abbreviations

```javascript
// Good
const userEnrollments = [];
const MAX_RETRY_ATTEMPTS = 3;

// Avoid
const usrEnr = [];
const max = 3;
```

### Functions
- Use verbs: `get`, `set`, `create`, `update`, `delete`
- Boolean functions: `is`, `has`, `can`, `should`

```javascript
// Good
function getCourse(id) { }
function isEnrolled(userId, courseId) { }
function canEditCourse(user, course) { }

// Avoid
function course(id) { }
function enrolled(userId, courseId) { }
```

### Components
- PascalCase
- Descriptive, not generic

```javascript
// Good
<CourseCard />
<EnrollmentButton />

// Avoid
<Card />
<Button />
```

## Performance

### Avoid Unnecessary Re-renders
```svelte
<!-- Good: Reactive only when needed -->
$: filteredItems = items.filter(item => item.active);

<!-- Avoid: Reactive on every change -->
$: allData = { items, users, courses, sessions };
```

### Lazy Loading
```javascript
// Good: Load on demand
const { default: HeavyComponent } = await import('./HeavyComponent.svelte');

// Avoid: Load everything upfront
import HeavyComponent from './HeavyComponent.svelte';
```

## Security

### Never Expose Secrets
- Use environment variables
- Never commit API keys
- Validate all user input

### Sanitize User Input
```javascript
// Good
const sanitized = input.trim().toLowerCase();

// Avoid
const query = `SELECT * FROM users WHERE name = '${userInput}'`;
```

## Accessibility

- Use semantic HTML
- Add ARIA labels when needed
- Ensure keyboard navigation
- Test with screen readers

```svelte
<!-- Good -->
<button aria-label="Close dialog" on:click={close}>
  <CloseIcon />
</button>

<!-- Avoid -->
<div on:click={close}>X</div>
```
