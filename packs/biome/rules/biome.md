---
description: Biome for linting, formatting and import sorting, with one config per repository.
globs: ["**/biome.json", "**/biome.jsonc", "**/package.json", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.css", "**/*.json"]
---

# Biome

## Setup

- Biome lints, formats and sorts imports. No ESLint, Prettier or their plugins and configs next to it. `biome migrate eslint --write` and `biome migrate prettier --write` port an old config before it is deleted.
- One `biome.json` at the repository root. A nested config sets `"extends": "//"`.
- `$schema` points to `./node_modules/@biomejs/biome/configuration_schema.json`, so it always matches the installed version.
- After a Biome upgrade, `biome migrate --write` updates the config.
- `vcs` is enabled with `clientKind: "git"` and `useIgnoreFile: true`, so Biome skips what Git ignores.
- `files.includes` drops generated output with force-ignore patterns such as `"!!**/dist"`, so the scanner never indexes it.
- `assist.actions.source.organizeImports` is `"on"`.

## Rules

- Domains such as `react`, `next`, `test`, `playwright`, `drizzle` and `tanstackQuery` turn on by themselves from `package.json` dependencies.
- `linter.domains` enables `project` (import cycles, undeclared dependencies) and `types` (floating promises, type-aware rules) only when the project wants them. Both scan the whole project, which slows linting.
- Rule changes live in `biome.json`. `overrides` scope them to files such as tests or generated code.
- Nursery rules are not covered by semantic versioning. Enable one by name, never the whole group.
- A suppression names the rule and the reason: `// biome-ignore lint/suspicious/noExplicitAny: <reason>`. `biome-ignore-all` covers a file and `biome-ignore-start` with `biome-ignore-end` cover a range.

## Commands

- `biome check --write` formats, applies safe fixes and sorts imports. `--unsafe` fixes are reviewed one by one.
- CI runs `biome ci`, which never writes and prints GitHub annotations on GitHub Actions.
- `biome explain <rule>` shows what a rule does before changing its level.
- `biome inspect config` shows the resolved configuration after `extends` and `overrides`, with `--path <file>` for one file.
