# Automated Releases Setup Checklist

Use this checklist to complete the setup of the automated release system.

## ✅ Local Setup (Completed)

- [x] Release Please workflow created (`.github/workflows/release-please.yml`)
- [x] Release Please configuration created (`.release-please-config.json`)
- [x] Release manifest initialized (`.release-please-manifest.json`)
- [x] Commitlint configuration created (`.commitlintrc.json`)
- [x] Husky commit-msg hook updated
- [x] README.md updated with version badge
- [x] CONTRIBUTING.md updated with commit guidelines
- [x] Package.json scripts added
- [x] Documentation created

## 🔧 GitHub Repository Setup (To Do)

### Step 1: Enable Workflow Permissions

- [ ] Go to your repository on GitHub
- [ ] Navigate to **Settings** → **Actions** → **General**
- [ ] Scroll to **Workflow permissions**
- [ ] Select **"Read and write permissions"**
- [ ] Check **"Allow GitHub Actions to create and approve pull requests"**
- [ ] Click **Save**

### Step 2: Configure Branch Protection (Recommended)

- [ ] Go to **Settings** → **Branches**
- [ ] Click **Add rule** (or edit existing rule for `main`)
- [ ] Set **Branch name pattern** to `main`
- [ ] Enable **"Require a pull request before merging"**
  - [ ] Set required approvals (recommend: 1)
  - [ ] Enable **"Dismiss stale pull request approvals when new commits are pushed"**
- [ ] Enable **"Require status checks to pass before merging"**
  - [ ] Check **"Require branches to be up to date before merging"**
  - [ ] Add required status checks: `quality`, `test`, `build`
- [ ] Enable **"Require conversation resolution before merging"**
- [ ] Under **"Allow force pushes"**, enable for `release-please--branches/*`
- [ ] Click **Save changes**

### Step 3: Update README Badge (Optional)

- [ ] Replace `yourusername/ai-tutor-platform` in README.md with your actual GitHub username/repo
- [ ] Commit the change:
  ```bash
  git commit -m "docs: update version badge with correct repo URL"
  ```

## 🧪 Testing the Setup

### Test 1: Commit Message Validation

- [ ] Try making an invalid commit (should be rejected):
  ```bash
  git commit --allow-empty -m "invalid commit"
  ```
- [ ] Try making a valid commit (should succeed):
  ```bash
  git commit --allow-empty -m "feat(test): test commit validation"
  ```

### Test 2: Release PR Creation

- [ ] Create a test branch:
  ```bash
  git checkout -b test/release-system
  ```
- [ ] Make a test change:
  ```bash
  echo "test" > test-release.txt
  git add test-release.txt
  git commit -m "feat(test): test automated release system"
  ```
- [ ] Push and create PR:
  ```bash
  git push origin test/release-system
  ```
- [ ] Create PR to `main` on GitHub
- [ ] Wait for CI to pass
- [ ] Merge the PR
- [ ] Wait 1-2 minutes
- [ ] Check if Release Please created a release PR (should be titled "chore(main): release 1.1.0")

### Test 3: Release Publication

- [ ] Review the release PR created by Release Please
- [ ] Verify CHANGELOG.md includes your test feature
- [ ] Verify package.json version was bumped to 1.1.0
- [ ] Merge the release PR
- [ ] Wait 1-2 minutes
- [ ] Go to **Releases** page on GitHub
- [ ] Verify new release v1.1.0 was published
- [ ] Verify release notes include your test feature
- [ ] Verify git tag v1.1.0 was created

### Test 4: Cleanup

- [ ] Delete the test file:
  ```bash
  git checkout main
  git pull
  git rm test-release.txt
  git commit -m "chore: remove test file"
  git push origin main
  ```

## 📚 Team Onboarding

- [ ] Share `docs/commit-message-quick-reference.md` with the team
- [ ] Add link to CONTRIBUTING.md in team documentation
- [ ] Conduct a team meeting to explain the new process
- [ ] Practice with a few test commits as a team
- [ ] Monitor first few releases to ensure everyone understands

## 🎯 Success Criteria

You'll know the setup is complete when:

- ✅ Invalid commit messages are rejected by pre-commit hook
- ✅ Valid commit messages are accepted
- ✅ Release Please creates release PRs automatically
- ✅ Merging release PRs publishes GitHub releases
- ✅ CHANGELOG.md is updated automatically
- ✅ Version numbers are bumped correctly
- ✅ Git tags are created for each release
- ✅ Team members understand the commit message format

## 📖 Reference Documents

- **Quick Reference**: `docs/commit-message-quick-reference.md`
- **Detailed Guide**: `CONTRIBUTING.md`
- **Setup Instructions**: `docs/github-release-setup.md`
- **Implementation Summary**: `docs/automated-releases-summary.md`

## 🆘 Troubleshooting

If something doesn't work:

1. Check GitHub Actions logs (Actions tab → Release Please workflow)
2. Verify workflow permissions are enabled
3. Ensure branch protection allows Release Please bot
4. Review `docs/github-release-setup.md` troubleshooting section
5. Check [Release Please Issues](https://github.com/googleapis/release-please/issues)

## 📝 Notes

- The first release after setup will be v1.1.0 (or v1.0.1 depending on commit types)
- Only `feat` and `fix` commits trigger releases
- `chore`, `ci`, `build` commits may not trigger releases
- Breaking changes (with `!` or `BREAKING CHANGE:`) trigger major version bumps
- You can manually trigger the workflow from Actions tab if needed

---

**Setup Date:** ******\_\_\_******  
**Completed By:** ******\_\_\_******  
**First Release:** ******\_\_\_******
