# Release process

This project uses a release script to bump the version in `package.json` and roll the changelog, following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Usage

```bash
pnpm run release            # patch bump (0.0.41 -> 0.0.42)
pnpm run release minor      # minor bump (0.0.41 -> 0.1.0)
pnpm run release major      # major bump (0.0.41 -> 1.0.0)
pnpm run release 1.2.3      # explicit version
```

### Flags

| Flag        | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `--dry-run` | Print the changes without writing any files.                 |
| `--force`   | Release even if the `[Unreleased]` section has no entries.   |

Flags can be combined with any bump type, e.g. `pnpm run release minor --dry-run`.

## What the script does

Running `pnpm run release` (see [`scripts/release.js`](../scripts/release.js)):

1. **Bumps `package.json`** — updates the `"version"` field, preserving the file's formatting.
2. **Rolls `CHANGELOG.md`** — moves everything under `## [Unreleased]` into a new `## [x.y.z] - YYYY-MM-DD` section (dated today), leaving a fresh empty `[Unreleased]` section at the top.
3. **Updates the comparison links** at the bottom of the changelog — points `[unreleased]` at the new version and adds the `[x.y.z]: .../compare/vOLD...vNEW` line.

The script does **not** commit anything. It prints the follow-up git commands when it finishes.

## Workflow

1. While developing, add your changes to the `## [Unreleased]` section of `CHANGELOG.md`:

   ```markdown
   ## [Unreleased]

   ### Add

   - New feature description

   ### Fix

   - Bug fix description
   ```

2. When you're ready to cut a release, run:

   ```bash
   pnpm run release
   ```

3. Commit the release:

   ```bash
   git add package.json CHANGELOG.md
   git commit -m "release: 0.0.42"
   ```

## Guardrails

- The script **aborts if `[Unreleased]` is empty**, so you can't cut a release with no changelog entries. Use `--force` to override.
- Invalid arguments (anything that isn't `major`, `minor`, `patch`, or an `x.y.z` version) exit with an error.
- Use `--dry-run` to preview the new version, changelog section, and links before writing anything.
