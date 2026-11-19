---
description: pnpm as package manager with workspaces, catalogs, build-script approval and supply-chain settings.
globs: ["**/package.json", "**/pnpm-workspace.yaml", "**/pnpm-lock.yaml", "**/.npmrc"]
---

# pnpm

## Packages

- pnpm installs packages and runs scripts. Never `npm`, `yarn`, `bun` or `npx`. `pnpm exec` runs a project binary, `pnx` (alias `pnpm dlx`) a one-off package.
- `package.json` pins pnpm: `packageManager` with an exact version, or `devEngines.packageManager` with a range. pnpm switches to the pinned version.
- `pnpm-lock.yaml` is committed and never edited by hand. Change `package.json` and run `pnpm install`.
- CI runs `pnpm install`, which switches to frozen-lockfile mode on its own and fails when the lockfile is out of date. Never `--no-frozen-lockfile` in CI.

## Settings

- pnpm settings live in `pnpm-workspace.yaml`, even in a single-package repository. `.npmrc` holds only registry, auth, TLS and proxy settings, and `package.json` has no `pnpm` field.
- pnpm reports unknown keys in `pnpm-workspace.yaml`: an error when the running pnpm satisfies the project's pin, a warning otherwise. Check a setting name against the docs before adding it.
- Transitive versions are pinned with `overrides` in `pnpm-workspace.yaml`.
- Missing peer or dependency declarations of a third-party package are fixed with `packageExtensions`, not by hoisting.

## Supply Chain

- Dependency build scripts run only for packages set to `true` in `allowBuilds`. `pnpm approve-builds <pkg>` records the decision, and `pnpm approve-builds !<pkg>` denies one. Every approval is reviewed: it runs code at install time.
- `strictDepBuilds` stays on, so an unreviewed build script fails the install. Never `dangerouslyAllowAllBuilds`.
- `minimumReleaseAge` holds back new versions, in minutes. The default `1440` is one day, and `10080` waits a week. `minimumReleaseAgeExclude` lists packages that skip the wait, such as an urgent security fix.
- `trustPolicy: no-downgrade` fails the install when a version has weaker trust evidence (trusted publisher, provenance) than an earlier release.
- `blockExoticSubdeps` stays on, so transitive dependencies never come from Git or tarball URLs.

## Workspaces

- `pnpm-workspace.yaml` lists `packages`. Internal dependencies use `workspace:*`.
- Shared versions live in `catalog` (or named `catalogs`) and packages reference them with `catalog:`. `catalogMode: strict` keeps `pnpm add` inside the catalog.
- Scripts run across packages with `pnpm -r run <script>` or `pnpm --filter <pattern> run <script>`. `--filter "...[origin/main]"` limits a run to changed packages and their dependents.
- A dependency is declared in the package that imports it. Never rely on hoisting.
