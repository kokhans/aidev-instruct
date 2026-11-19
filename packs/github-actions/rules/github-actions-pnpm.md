---
description: pnpm setup and store caching in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["pnpm"]
---

# GitHub Actions for pnpm

- `pnpm/setup` installs pnpm 11 or later from `packageManager` or `devEngines.packageManager`, and the runtime from `devEngines.runtime` or the Node.js version file, in one step without `actions/setup-node`. Workflows do not repeat the versions.
- `require-lockfile: true` makes its automatic install run `pnpm install --frozen-lockfile`.
- `cache: true` caches the store. It is off by default.
- Projects on pnpm 10 or older use `pnpm/action-setup` before `actions/setup-node`, with the store cached by only one of them, and run `pnpm install --frozen-lockfile` as a separate step.
