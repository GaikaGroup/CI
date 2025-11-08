# Contributing to AI Tutor Platform

This document outlines the Git workflow and best practices for contributing to this project.

## Table of Contents

- [Branching Strategy](#branching-strategy)
- [Commit Messages](#commit-messages)
- [Pushing and Synchronizing](#pushing-and-synchronizing)
- [Pull Requests](#pull-requests)
- [Tagging and Releases](#tagging-and-releases)
- [Pre-commit Checks](#pre-commit-checks)
- [GitHub SSH Setup](#github-ssh-setup)

## Branching Strategy

We follow a structured branching model:

### Main Branches

- **main**: Always production-ready. Protected with branch rules requiring PR reviews and passing CI.
- **development**: Integration branch where features accumulate before release.

### Feature Branches

- Create a new branch for each feature, bug fix, or improvement.
- Branch naming convention:
  - `feature/ISSUE-123-add-login` for new features
  - `bugfix/404-page-not-found` for bug fixes
  - `docs/update-readme` for documentation changes
  - `refactor/clean-up-auth` for code refactoring
- Keep branches short-lived: merge or close within days, not months.

### Release/Hotfix Branches

- `release/v1.4.0` for release stabilization
- `hotfix/2.1.1` for immediate production bug fixes

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation. Your commit messages directly affect version bumps and release notes.

### Structure

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

- **type**: Determines version bump (see table below)
- **scope**: Optional, subsystem or module (e.g., `auth`, `chat`, `ui`, `db`)
- **summary**: Imperative mood, ≤100 chars: "add login button", not "Added" or "Adding"
- **body**: Optional, explain "why" more than "what", wrap at ~72 chars
- **footer**: Optional, reference issues or breaking changes

### Commit Types and Version Impact

| Type       | Description             | Version Bump      | Example                                     |
| ---------- | ----------------------- | ----------------- | ------------------------------------------- |
| `feat`     | New feature             | **MINOR** (1.x.0) | `feat(chat): add voice streaming`           |
| `fix`      | Bug fix                 | **PATCH** (1.0.x) | `fix(auth): resolve session timeout`        |
| `docs`     | Documentation only      | **PATCH** (1.0.x) | `docs: update API documentation`            |
| `style`    | Code style/formatting   | **PATCH** (1.0.x) | `style: format with prettier`               |
| `refactor` | Code refactoring        | **PATCH** (1.0.x) | `refactor(chat): simplify message handling` |
| `test`     | Add/update tests        | **PATCH** (1.0.x) | `test: add voice service tests`             |
| `chore`    | Maintenance tasks       | **PATCH** (1.0.x) | `chore: upgrade dependencies`               |
| `perf`     | Performance improvement | **PATCH** (1.0.x) | `perf(db): optimize query performance`      |
| `ci`       | CI/CD changes           | **PATCH** (1.0.x) | `ci: add coverage reporting`                |
| `build`    | Build system changes    | **PATCH** (1.0.x) | `build: update vite config`                 |
| `revert`   | Revert previous commit  | **PATCH** (1.0.x) | `revert: undo feature X`                    |

### Breaking Changes

To indicate a breaking change (triggers **MAJOR** version bump):

**Option 1: Footer**

```
feat(api): redesign authentication endpoints

BREAKING CHANGE: Authentication endpoints now require OAuth2 tokens
instead of API keys. Update your client code accordingly.
```

**Option 2: ! in type**

```
feat(api)!: redesign authentication endpoints

Authentication endpoints now require OAuth2 tokens instead of API keys.
```

### Scope Examples

Common scopes in this project:

- `auth` - Authentication module
- `chat` - Chat system and voice features
- `courses` - Course management
- `db` - Database and migrations
- `api` - API endpoints
- `ui` - User interface components
- `docs` - Documentation
- `tests` - Test suite

### Complete Examples

**Feature with scope:**

```
feat(chat): add multilingual waiting phrases

Implements waiting phrases in English, Russian, and Spanish with
automatic language detection. Phrases are synthesized sentence by
sentence for smooth user experience.

Closes #456
```

**Bug fix:**

```
fix(auth): prevent session timeout during active use

Users were being logged out while actively using the application.
Now the session is refreshed on each API call.

Fixes #789
```

**Documentation:**

```
docs: add GraphRAG architecture guide

Explains the knowledge graph structure, document processing pipeline,
and query mechanisms for developers.
```

**Breaking change:**

```
feat(api)!: redesign course enrollment endpoints

BREAKING CHANGE: Course enrollment now uses POST /api/courses/:id/enroll
instead of PUT /api/enrollments. The response format has also changed
to include enrollment status and timestamp.

Migration guide: See docs/migration-v2.md

Closes #123
```

**Chore:**

```
chore: upgrade dependencies to latest versions

Updates all npm packages to their latest stable versions.
No breaking changes in dependencies.
```

### Commit Message Validation

Your commits are automatically validated using commitlint:

- ✅ **Valid**: `feat(chat): add voice streaming`
- ❌ **Invalid**: `Add voice streaming` (missing type)
- ❌ **Invalid**: `Feat(chat): add voice streaming` (type must be lowercase)
- ❌ **Invalid**: `feat(chat): Add voice streaming` (subject must be lowercase)
- ❌ **Invalid**: `feat(chat): add voice streaming.` (no period at end)

If your commit message is invalid, the pre-commit hook will reject it with helpful error messages.

### Tips for Good Commit Messages

1. **Use imperative mood**: "add feature" not "added feature" or "adding feature"
2. **Be specific**: "fix login button alignment" not "fix bug"
3. **Keep it concise**: Summary should be ≤100 characters
4. **Explain why, not what**: The diff shows what changed; explain why it was necessary
5. **Reference issues**: Use "Closes #123" or "Fixes #456" to auto-close issues
6. **One logical change per commit**: Don't mix unrelated changes

### Troubleshooting Commit Messages

**Error: "type may not be empty"**

```bash
# Wrong
git commit -m "add new feature"

# Correct
git commit -m "feat: add new feature"
```

**Error: "subject may not be empty"**

```bash
# Wrong
git commit -m "feat:"

# Correct
git commit -m "feat: add new feature"
```

**Error: "subject must not be sentence-case"**

```bash
# Wrong
git commit -m "feat: Add new feature"

# Correct
git commit -m "feat: add new feature"
```

**Error: "subject may not end with period"**

```bash
# Wrong
git commit -m "feat: add new feature."

# Correct
git commit -m "feat: add new feature"
```

## Pushing and Synchronizing

Keep your local and remote repos in sync to avoid painful merges:

### Fetch & Rebase / Merge Often

```bash
git fetch origin
git rebase origin/development   # or `git merge`, per team convention
```

### Push to Your Branch Only

```bash
git push origin feature/ISSUE-123-add-login
```

### Force-Push with Care

- Only on branches you exclusively own
- Never `--force` on shared branches (unless everyone agrees)
- Use `--force-with-lease` for safer force pushes:
  ```bash
  git push --force-with-lease origin feature/ISSUE-123-add-login
  ```

## Pull Requests

A smooth code review process:

### Small, Focused PRs

- Aim for <300–400 lines of diff
- One logical change per PR

### Descriptive PR Titles & Descriptions

- Title: Follow commit message format `<type>(<scope>): <summary>`
- Description:
  - Summarize purpose and approach
  - Include any special instructions for reviewers
  - Link related issues

### Automated Checks

- CI must pass (lint, tests, security scans)
- Code style enforced with linters or formatters

### Review Etiquette

- Ask questions gently; praise good design
- Address feedback promptly
- Use GitHub's suggestion feature for small changes

## Tagging and Releases

Make versions explicit:

### Semantic Versioning

- `vMAJOR.MINOR.PATCH`
  - MAJOR: incompatible API changes
  - MINOR: backwards-compatible functionality
  - PATCH: backwards-compatible bug fixes

### Tags

```bash
git tag -a v1.2.3 -m "Release v1.2.3: Add export feature"
git push origin v1.2.3
```

### Changelogs

- Update CHANGELOG.md with each release
- Group changes by type (Features, Bug Fixes, etc.)

## Pre-commit Checks

Before pushing, ensure:

- [ ] Branch named correctly
- [ ] Code compiles, tests pass locally
- [ ] Up-to-date with target branch (rebased/merged)
- [ ] Commits cleanly formatted
- [ ] PR description covers "what" and "why"

By following these conventions, you'll keep the repository organized, the history meaningful, and collaboration frictionless.

## GitHub SSH Setup

This project uses SSH for secure GitHub authentication. Follow these steps to set up SSH for GitHub:

### 1. Check for Existing SSH Keys

First, check if you already have SSH keys:

```bash
ls -la ~/.ssh
```

Look for files named `id_rsa.pub`, `id_ed25519.pub`, or similar.

### 2. Generate a New SSH Key (if needed)

If you don't have an SSH key, generate one:

```bash
# Using Ed25519 algorithm (recommended)
ssh-keygen -t ed25519 -C "your_email@example.com"

# OR using RSA (if Ed25519 is not supported)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Follow the prompts to complete the process. It's recommended to use a passphrase for added security.

### 3. Add Your SSH Key to the SSH Agent

Start the SSH agent:

```bash
eval "$(ssh-agent -s)"
```

Add your private key to the SSH agent:

```bash
ssh-add ~/.ssh/id_ed25519  # or id_rsa if you used RSA
```

### 4. Add Your SSH Key to GitHub

Copy your public key to the clipboard:

```bash
# For macOS
pbcopy < ~/.ssh/id_ed25519.pub  # or id_rsa.pub

# For Linux
xclip -sel clip < ~/.ssh/id_ed25519.pub  # or id_rsa.pub

# For Windows (Git Bash)
cat ~/.ssh/id_ed25519.pub | clip  # or id_rsa.pub
```

Then:

1. Go to GitHub → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Add a descriptive title
4. Paste your key
5. Click "Add SSH key"

### 5. Test Your SSH Connection

Verify your connection to GitHub:

```bash
ssh -T git@github.com
```

You should see a message like: "Hi username! You've successfully authenticated, but GitHub does not provide shell access."

### 6. Configure Repository to Use SSH

If your repository is already using HTTPS, switch to SSH:

```bash
# Check current remote URL
git remote -v

# Change from HTTPS to SSH
git remote set-url origin git@github.com:GaikaGroup/CI.git
```

### 7. Push Using SSH

Now you can push to GitHub without entering your username and password:

```bash
git push origin your-branch-name
```

For more detailed information, refer to [GitHub's official documentation on SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).
