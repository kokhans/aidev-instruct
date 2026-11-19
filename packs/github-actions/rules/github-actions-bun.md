---
description: Bun toolchain setup and install in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["bun"]
---

# GitHub Actions for Bun

- `oven-sh/setup-bun` reads the version from `packageManager` or `engines.bun` in `package.json`, or from `bun-version-file`. Without either it installs `latest`, so the project pins one.
- Installs run `bun ci`, which fails when `package.json` and `bun.lock` disagree.
- `actions/cache` caches `~/.bun/install/cache` keyed on `hashFiles('bun.lock')`. `node_modules` is never cached.
