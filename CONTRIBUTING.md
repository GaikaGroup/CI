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

Clear, consistent commit messages make history useful:

### Structure
```
<type>(<scope>): <short summary>

[optional longer description…]
```

- **type**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, etc.
- **scope**: subsystem or file, e.g. `auth`, `ui`, `db`
- **summary**: imperative, ≤50 chars: "Add login button", not "Added" or "Adding"

### Body (if needed)
- Wrap at ~72 chars
- Explain "why" more than "what"
- Reference issues: "Closes #123" or "Fixes JIRA-456"

### Examples
```
feat(auth): add "Remember me" toggle

Persists user preference in localStorage so they stay logged in across
browser restarts. Closes #789.
```

```
fix(ui): correct button alignment on mobile

Buttons were overlapping on small screens due to incorrect flex settings.
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
