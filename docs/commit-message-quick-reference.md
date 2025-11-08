# Commit Message Quick Reference

## Format

```
<type>(<scope>): <subject>
```

## Common Types

| Type       | When to Use        | Version  | Example                       |
| ---------- | ------------------ | -------- | ----------------------------- |
| `feat`     | New feature        | MINOR ⬆️ | `feat(chat): add voice mode`  |
| `fix`      | Bug fix            | PATCH ⬆️ | `fix(auth): resolve timeout`  |
| `docs`     | Documentation      | PATCH ⬆️ | `docs: update README`         |
| `style`    | Code formatting    | PATCH ⬆️ | `style: format with prettier` |
| `refactor` | Code restructuring | PATCH ⬆️ | `refactor: simplify logic`    |
| `test`     | Add/update tests   | PATCH ⬆️ | `test: add unit tests`        |
| `chore`    | Maintenance        | PATCH ⬆️ | `chore: upgrade deps`         |
| `perf`     | Performance        | PATCH ⬆️ | `perf: optimize query`        |
| `ci`       | CI/CD changes      | PATCH ⬆️ | `ci: add coverage`            |
| `build`    | Build system       | PATCH ⬆️ | `build: update vite`          |

## Common Scopes

- `auth` - Authentication
- `chat` - Chat system
- `courses` - Course management
- `db` - Database
- `api` - API endpoints
- `ui` - User interface
- `docs` - Documentation
- `tests` - Test suite

## Examples

### ✅ Good

```bash
feat(chat): add voice streaming support
fix(auth): resolve session timeout issue
docs: update API documentation
chore: upgrade dependencies to latest
refactor(chat): simplify message handling
test: add voice service unit tests
perf(db): optimize course query performance
```

### ❌ Bad

```bash
Add voice streaming          # Missing type
feat: Add voice streaming    # Subject should be lowercase
feat(chat): add voice.       # No period at end
Feat(chat): add voice        # Type must be lowercase
add voice streaming          # Missing type
```

## Breaking Changes

Add `!` after type or use `BREAKING CHANGE:` footer:

```bash
feat(api)!: redesign authentication

BREAKING CHANGE: Auth now requires OAuth2 tokens
```

## Rules

1. ✅ Type must be lowercase
2. ✅ Subject must be lowercase
3. ✅ No period at end
4. ✅ Use imperative mood ("add" not "added")
5. ✅ Keep header ≤100 characters

## Quick Test

```bash
# Test your commit message
echo "feat(test): test message" | npx commitlint
```

## More Info

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.
