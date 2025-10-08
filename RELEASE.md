# Release Guide

Guide for creating releases for hoosat-sdk with automatic CHANGELOG generation.

## 📋 Table of Contents

- [Conventional Commits](#conventional-commits)
- [Creating a Release](#creating-a-release)
- [Release Types](#release-types)
- [Commit Examples](#commit-examples)
- [Publishing Process](#publishing-process)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic CHANGELOG generation and version determination.

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat` | New feature | MINOR (0.X.0) |
| `fix` | Bug fix | PATCH (0.0.X) |
| `perf` | Performance improvement | PATCH |
| `refactor` | Code refactoring | - |
| `docs` | Documentation changes | - |
| `test` | Adding/changing tests | - |
| `build` | Build system changes | - |
| `ci` | CI/CD changes | - |
| `chore` | Other changes | - |
| `style` | Code formatting | - |

### Breaking Changes

For MAJOR version (X.0.0), add `BREAKING CHANGE:` in footer or `!` after type:

```bash
feat!: remove support for Node.js 18

BREAKING CHANGE: Node.js 20+ is now required
```

---

## 🚀 Creating a Release

### 1. Ensure All Commits Follow Conventional Commits

```bash
# Check recent commits
git log --oneline -n 10
```

### 2. Create Release (Automatic)

```bash
# Automatically determine version based on commits
npm run release

# Or explicitly specify release type
npm run release:patch  # 0.1.3 → 0.1.4
npm run release:minor  # 0.1.3 → 0.2.0
npm run release:major  # 0.1.3 → 1.0.0
```

The `npm run release` command automatically:
- ✅ Analyzes commits
- ✅ Determines new version
- ✅ Updates `package.json`
- ✅ Generates/updates `CHANGELOG.md`
- ✅ Creates git commit with changes
- ✅ Creates git tag (e.g., `v0.1.4`)

### 3. Review Changes

```bash
# View what changed
git show HEAD

# Check CHANGELOG.md
cat CHANGELOG.md
```

### 4. Push Changes and Tags

```bash
# Push commit and tags
npm run push:tags

# Or manually
git push --follow-tags origin main
```

### 5. Automatic Publication

GitHub Actions will automatically publish the package to NPM when a `v*` tag is pushed.

Or manually:
```bash
npm run publish:npm
```

---

## 📦 Release Types

### Patch Release (0.0.X)

**When:** Bug fixes, small improvements without new functionality

```bash
npm run release:patch
```

**Example commits:**
- `fix: correct fee calculation for edge case`
- `perf: optimize UTXO selection algorithm`

### Minor Release (0.X.0)

**When:** New functionality, backward compatible

```bash
npm run release:minor
```

**Example commits:**
- `feat: add support for Schnorr signatures`
- `feat(qr): add SVG export option`

### Major Release (X.0.0)

**When:** Breaking changes, incompatible API changes

```bash
npm run release:major
```

**Example commits:**
- `feat!: redesign event system API`
- `refactor!: rename HoosatNode to HoosatClient`

### First Release

**Only for the first project release:**

```bash
npm run release:first
```

---

## 📝 Commit Examples

### New Feature

```bash
# Simple feature
git commit -m "feat: add batch transaction support"

# Feature with scope
git commit -m "feat(crypto): add Schnorr signature support"

# Feature with body
git commit -m "feat: add QR code generation

Implement QR code generator for addresses and payment URIs.
Supports multiple formats: PNG, SVG, Data URL.
Closes #42"
```

### Bug Fix

```bash
# Simple bug
git commit -m "fix: correct UTXO change detection logic"

# Bug with issue reference
git commit -m "fix: prevent memory leak in event streaming

Properly cleanup event listeners on disconnect.
Fixes #123"
```

### Breaking Change

```bash
git commit -m "feat!: redesign event subscription API

BREAKING CHANGE: Event subscriptions now use client.events.subscribe()
instead of client.subscribeToUtxoChanges(). Update your code:

Before:
  await client.subscribeToUtxoChanges([address])
  client.on('utxoChange', handler)

After:
  await client.events.subscribeToUtxoChanges([address])
  client.events.on(EventType.UtxoChange, handler)"
```

### Documentation

```bash
git commit -m "docs: update API documentation for HoosatEventManager"
git commit -m "docs(readme): add examples for real-time streaming"
```

### Refactoring

```bash
git commit -m "refactor: extract fee calculation logic to separate class"
git commit -m "refactor(crypto): simplify signature verification"
```

### Tests

```bash
git commit -m "test: add tests for HoosatTxBuilder edge cases"
git commit -m "test(crypto): improve coverage for key generation"
```

---

## 🔄 Publishing Process

### Complete Release Process

```bash
# 1. Ensure all tests pass
npm test

# 2. Ensure code is formatted
npm run format:check

# 3. Check build
npm run build

# 4. Create release (dry-run to verify)
npm run release:dry

# 5. Create release (for real)
npm run release

# 6. Review changes
git log -1
cat CHANGELOG.md

# 7. Push changes
npm run push:tags

# 8. GitHub Actions will automatically publish the package
# Check: https://github.com/Namp88/hoosat-sdk/actions
```

### What Happens After Pushing Tags

1. **GitHub Actions** triggers on push tag `v*`
2. **Build** - project is built
3. **Publish to NPM** - published to npm registry
4. **GitHub Release** - release created on GitHub with CHANGELOG

### Verify Publication

```bash
# Check version in NPM
npm view hoosat-sdk version

# Check latest release on GitHub
# https://github.com/Namp88/hoosat-sdk/releases
```

---

## 🔍 Dry Run (Pre-Release Check)

Before a real release, you can always do a dry-run:

```bash
npm run release:dry
```

This shows:
- ✅ What the new version will be
- ✅ Which commits will go into CHANGELOG
- ✅ Which files will be changed
- ❌ Without creating commit and tag

---

## ⚠️ Troubleshooting

### Issue: "No commits since last release"

**Cause:** No commits of type `feat`, `fix`, `perf` since last release

**Solution:**
```bash
# Force create patch release
npm run release:patch

# Or minor release
npm run release:minor
```

### Issue: "Working directory not clean"

**Cause:** Uncommitted changes exist

**Solution:**
```bash
# Commit or discard changes
git status
git add .
git commit -m "chore: prepare for release"
```

### Issue: Tag Already Exists

**Cause:** Tag with this version already created

**Solution:**
```bash
# Delete local tag
git tag -d v0.1.4

# Delete remote tag
git push origin :refs/tags/v0.1.4

# Create release again
npm run release
```

### Issue: NPM Publish Failed

**Cause:** Insufficient permissions or incorrect token

**Solution:**
1. Check NPM_TOKEN in GitHub Secrets
2. Ensure token has publish permissions
3. Verify version is unique (not previously published)

---

## 📚 Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [standard-version Documentation](https://github.com/conventional-changelog/standard-version)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

## 🎯 Quick Reference

```bash
# Create release (automatic)
npm run release

# Check what will happen (dry-run)
npm run release:dry

# Create specific version
npm run release:patch   # 0.1.3 → 0.1.4
npm run release:minor   # 0.1.3 → 0.2.0
npm run release:major   # 0.1.3 → 1.0.0

# Push tags
npm run push:tags

# Publish to NPM manually
npm run publish:npm
```

---

**Happy releasing! 🚀**