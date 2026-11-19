---
description: Bun as package manager, script runner and runtime.
globs: ["**/package.json", "**/bunfig.toml", "**/bun.lock", "**/*.ts", "**/*.tsx", "**/*.js"]
---

# Bun

## Packages

- Bun installs packages and runs scripts. Never `npm`, `yarn`, `pnpm` or `npx`. `bunx` runs package binaries.
- `bun.lock` is committed and never edited by hand. Change `package.json` and run `bun install`.
- CI installs with `bun ci`, which equals `bun install --frozen-lockfile` and fails when `package.json` and `bun.lock` disagree. Bun never freezes the lockfile on its own in CI.
- Dependency lifecycle scripts run only for packages in `trustedDependencies`. Every addition is reviewed: it runs code at install time.
- `minimumReleaseAge` under `[install]` in `bunfig.toml` holds back freshly published versions, in seconds: `259200` is three days. `minimumReleaseAgeExcludes` lists packages that skip the wait.
- Transitive versions are pinned with `overrides`.
- `bun outdated`, `bun audit` and `bun why <pkg>` inspect dependencies. `bun update` also updates transitive dependencies.
- Workspaces share versions through `catalog` or `catalogs` in the `workspaces` object of the root `package.json`, referenced with `catalog:`.

## Scripts

- `bunx --bun <cli>` runs a CLI with a Node shebang on the Bun runtime. Without `--bun` it runs on Node when Node is installed.
- Workspaces run scripts with `bun run --filter <pattern> <script>`.

## Runtime

- Web APIs first, then Bun APIs, then `node:` modules with the prefix.
- `Bun.*` APIs and `bun:*` modules appear only in code that always runs on Bun. Code that also runs elsewhere keeps them behind one module.
- Bun loads `.env` files itself. No `dotenv`. Under `--bun` Bun acts as `node` and loads none unless `--env-file` is passed.
- Built-in APIs replace small dependencies where they fit: `Bun.password`, `Bun.sql`, `Bun.s3`, `Bun.file`, `bun:sqlite`.
