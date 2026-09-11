# Previous profile implementation (archived)

This directory is a **frozen backup** of the GitHub profile that this repository used
before it was redesigned into the terminal-style SVG profile generator.

- **Archived on:** 2026-09-11
- **Backup branch:** `legacy-profile` → commit `245223e416f65c44afdd0f1a507b4114ac17a9d0`

## What is preserved here

| Path in this archive | Original path in the repository | What it was |
| --- | --- | --- |
| `README.old.md` | `README.md` | The old profile README (capsule-render banner, shields.io badges, typing SVG, skillicons grid, `github-readme-stats` pinned repo cards, snake contribution graph). |
| `.github/workflows/snake.yml` | `.github/workflows/snake.yml` | The `Generate Snake` workflow (`Platane/snk@v3`), scheduled every 12 hours, which rendered the contribution-snake SVGs and pushed them to `main`. |
| `dist/github-contribution-grid-snake.svg` | `dist/github-contribution-grid-snake.svg` | Last generated light-mode snake animation. |
| `dist/github-contribution-grid-snake-dark.svg` | `dist/github-contribution-grid-snake-dark.svg` | Last generated dark-mode snake animation. |

The explanatory file you are reading is `README.md`; the original profile README kept its
content under `README.old.md` so that both can live in this single archive directory.

## Workflows in this directory are backups only

GitHub Actions only executes workflow files that live in `.github/workflows/` **at the
repository root**. `archive/previous-profile/.github/workflows/snake.yml` is therefore
inert: it is never scheduled, never triggered and never run. It exists so the old
automation can be read and restored verbatim.

Do not copy it back to the root unless you actually want the snake workflow running again,
and do not run both it and `.github/workflows/update-profile.yml` expecting them to manage
the same files.

## How to restore the old profile

### Option A — restore from this archive (recommended, keeps history linear)

```bash
cp archive/previous-profile/README.old.md README.md
mkdir -p dist .github/workflows
cp archive/previous-profile/dist/*.svg dist/
cp archive/previous-profile/.github/workflows/snake.yml .github/workflows/snake.yml
git rm -f .github/workflows/update-profile.yml
git add README.md dist .github/workflows
git commit -m "Restore previous profile implementation"
```

Optionally also remove the generator that replaced it:

```bash
git rm -r --cached generated src docs/PROFILE_GENERATOR.md
rm -rf generated src node_modules docs/PROFILE_GENERATOR.md
rm -f package.json pnpm-lock.yaml tsconfig.json vitest.config.ts eslint.config.js .prettierrc.json profile.config.ts
git commit -am "Remove terminal profile generator"
```

### Option B — restore from the backup branch

```bash
git checkout legacy-profile -- README.md dist .github/workflows/snake.yml
git rm -f .github/workflows/update-profile.yml
git commit -m "Restore previous profile implementation from legacy-profile"
```

Or inspect the old state without changing anything:

```bash
git switch --detach legacy-profile
```

The `legacy-profile` branch points at the exact commit that was `main` before the redesign,
so nothing from the old implementation is lost even if this directory is deleted.
