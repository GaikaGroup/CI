# GitHub Repository Setup for Automated Releases

This document outlines the required GitHub repository settings for the automated release system to work properly.

## Required Permissions

The Release Please GitHub Action requires specific permissions to create releases and pull requests.

### Workflow Permissions

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Scroll to **Workflow permissions**
4. Select **Read and write permissions**
5. Check **Allow GitHub Actions to create and approve pull requests**
6. Click **Save**

**Why this is needed:**

- Release Please needs to create pull requests for releases
- It needs to update files (CHANGELOG.md, package.json)
- It needs to create git tags and GitHub releases

## Branch Protection Rules

Configure branch protection for the `main` branch to ensure quality:

### Recommended Settings

1. Go to **Settings** → **Branches**
2. Click **Add rule** or edit existing rule for `main`
3. Configure the following:

**Branch name pattern:** `main`

**Protect matching branches:**

- ✅ Require a pull request before merging
  - ✅ Require approvals: 1 (or more for larger teams)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - Add required status checks:
    - `quality` (Code Quality job from CI)
    - `test` (Tests job from CI)
    - `build` (Build job from CI)
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings

**Allow force pushes:**

- ✅ Enable for: `release-please--branches/*` (Release Please bot branches)

**Allow deletions:**

- ❌ Disabled

### Why These Settings?

- **Pull request requirement**: Ensures all changes are reviewed
- **Status checks**: Prevents broken code from being merged
- **Conversation resolution**: Ensures all review comments are addressed
- **Force push allowance for Release Please**: The bot needs to update release PRs

## Release Please Bot Access

The Release Please action runs as GitHub Actions bot, which has automatic access. No additional configuration needed.

### Verify Bot Access

After your first release PR is created, verify:

1. Check that the PR was created by `github-actions[bot]`
2. Verify the PR contains updates to:
   - `CHANGELOG.md`
   - `package.json` (version field)
   - `.release-please-manifest.json`
3. Ensure the PR can be merged (no permission errors)

## Testing the Setup

### 1. Make a Test Commit

Create a test commit with conventional format:

```bash
git checkout -b test/release-please-setup
echo "test" > test.txt
git add test.txt
git commit -m "feat: test release please setup"
git push origin test/release-please-setup
```

### 2. Create and Merge PR

1. Create a pull request to `main`
2. Wait for CI to pass
3. Merge the PR

### 3. Verify Release PR Creation

Within a few minutes, Release Please should:

1. Analyze the merged commit
2. Create a new PR titled "chore(main): release 1.1.0" (or similar)
3. The PR should contain:
   - Updated CHANGELOG.md with your test feature
   - Updated package.json with new version
   - Updated .release-please-manifest.json

### 4. Merge Release PR

1. Review the release PR
2. Merge it to `main`
3. Release Please will automatically:
   - Create a GitHub release
   - Create a git tag (e.g., `v1.1.0`)
   - Publish release notes

### 5. Verify Release

1. Go to **Releases** page on GitHub
2. Verify the new release is published
3. Check that release notes include your test feature
4. Verify the git tag was created

## Troubleshooting

### Release PR Not Created

**Possible causes:**

1. **No releasable commits**: Only `chore`, `ci`, or `build` commits don't trigger releases
   - **Solution**: Make a `feat` or `fix` commit

2. **Workflow permissions insufficient**
   - **Solution**: Check Settings → Actions → General → Workflow permissions
   - Ensure "Read and write permissions" is selected
   - Ensure "Allow GitHub Actions to create and approve pull requests" is checked

3. **Workflow file not in main branch**
   - **Solution**: Ensure `.github/workflows/release-please.yml` is committed to `main`

4. **Workflow disabled**
   - **Solution**: Go to Actions tab, find "Release Please" workflow, enable it

### Release PR Created But Can't Merge

**Possible causes:**

1. **Branch protection blocking bot**
   - **Solution**: Add `release-please--branches/*` to force push allowances

2. **Required status checks failing**
   - **Solution**: Fix the failing checks or temporarily disable them for testing

3. **Insufficient permissions**
   - **Solution**: Verify workflow permissions (see above)

### Release Not Published After Merging Release PR

**Possible causes:**

1. **Workflow didn't trigger on merge**
   - **Solution**: Check Actions tab for workflow run
   - Manually trigger workflow if needed (Actions → Release Please → Run workflow)

2. **Permission to create releases denied**
   - **Solution**: Verify "Read and write permissions" in workflow settings

3. **Tag already exists**
   - **Solution**: Delete the existing tag and re-run the workflow

### Checking Workflow Logs

1. Go to **Actions** tab
2. Click on "Release Please" workflow
3. Click on the latest run
4. Expand job steps to see detailed logs
5. Look for errors or warnings

## Security Considerations

### Secrets Management

- Never commit API keys or secrets to the repository
- Use GitHub Secrets for sensitive configuration
- The Release Please action doesn't require additional secrets

### Bot Permissions

- The GitHub Actions bot has limited permissions by default
- It can only access the repository it's running in
- It cannot access other repositories or organization settings

### Branch Protection

- Always protect your `main` branch
- Require reviews for all changes
- Enable status checks to prevent broken releases

## Maintenance

### Regular Checks

- **Monthly**: Review release history and ensure all releases are properly documented
- **Quarterly**: Audit workflow permissions and branch protection rules
- **Annually**: Review and update release process documentation

### Updating Release Please

The Release Please action is automatically updated by GitHub. To use a specific version:

```yaml
- uses: google-github-actions/release-please-action@v4.0.0 # Pin to specific version
```

Check [Release Please releases](https://github.com/googleapis/release-please/releases) for updates.

## Additional Resources

- [Release Please Documentation](https://github.com/googleapis/release-please)
- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Support

If you encounter issues not covered in this guide:

1. Check the [Release Please Issues](https://github.com/googleapis/release-please/issues)
2. Review GitHub Actions logs for detailed error messages
3. Consult the team's internal documentation
4. Contact the DevOps team for assistance
