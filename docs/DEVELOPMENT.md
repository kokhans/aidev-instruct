# Development

How to work on this repository: the tools, the scripts, the sandbox, the tests and the release. For the CLI itself, see [CLI.md](CLI.md).

## Setup

- [Bun](https://bun.sh) for installs, scripts and the CLI build.
- Node 22 or later, which is what `engines.node` and CI require.
- `bun install` once.

## Source Layout

`src/` holds all reusable code: the CLI, the resolver, the registry and docs builders, and their helpers. `scripts/` holds repository entry points only: each file parses arguments, calls `src/`, prints the result and exits.

The npm package contains `dist/` only, so `src/` is not a promise that every file ships. `bun build` includes what the CLI imports.

| Module | Holds |
| --- | --- |
| `src/fs.ts` | `walk`, `readText`, `readJson`, `writeJson`, `pruneEmptyDirs` |
| `src/output.ts` | `style`, `print`, action and notice lines |
| `src/util.ts` | `unique`, `splitList`, `orList`, `entryJson` |
| `src/versions.ts` | The semver wrapper |
| `src/frontmatter.ts` | The YAML wrapper |
| `src/tar.ts` | The tarball wrapper |
| `src/templates.ts` | The Mustache renderer |
| `src/session.ts` | The options, the loaded packs and stacks, and the install |
| `src/commands/` | One module per command group: `init`, `add`, `remove`, `stacks`, `targets`, `update`, `status`, `check`, `clean`, `feeds`, `feed`, `info`, `doctor` and `list` |

`src/app.ts` holds `run(argv, io, context)` and the command registration, and no command body. `src/docs.ts` and `src/registry.ts` build the generated pages and `registry.json`; `scripts/docs.ts` and `scripts/registry.ts` write them.

Generated Markdown, YAML and JSON come from Mustache templates in `src/templates/`, rendered with `<% %>` tags and escaping off. The build copies them to `dist/templates/`, so the packed CLI and the tests render the same files.

## Scripts

| Script | Runs | Use when |
| --- | --- | --- |
| `bun run check` | Biome, `tsc --noEmit` and Vitest with 100% coverage of `src/` | Before every commit. CI runs it on Ubuntu, Windows and macOS |
| `bun run validate [pack...]` | `scripts/validate-packs.ts` | After changing a pack or stack |
| `bun run docs` | Regenerates `docs/PACKS.md`, `docs/STACKS.md` and the generated sections of `docs/CLI.md` | After changing packs, stacks, targets or environment variables |
| `bun run registry` | Writes `registry.json` for the website | After changing packs or stacks, or when the site needs it |
| `bun run release [--dry-run] [--bump <name>=<kind>] [--cli <kind>]` | Bumps changed packs and stacks, writes changelogs, commits and tags | To make a release |
| `bun run build` | Builds `src/cli.ts` into `dist/cli.js` and copies `src/templates` to `dist/templates` | Before `npm pack` or a publish |
| `bun run test` | Vitest without coverage | For a quick loop while editing |
| `bun run sandbox <command>` | The CLI from source against `sandbox/` | To try a command like a user |
| `bun run sandbox:package <command>` | Builds, runs `npm pack` and runs the packed CLI | To check the files npm publishes |
| `bun run sandbox:reset` | Deletes `sandbox/` | To start a session from scratch |

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:

| Job | Runs |
| --- | --- |
| `check` on Ubuntu, Windows and macOS | `bun install --frozen-lockfile` and `bun run check` |
| `package` | Builds, runs `npm pack`, and runs the packed CLI as `bun run sandbox:package` does, on Node 22, 24 and 26 |

- Actions use a version tag such as `actions/checkout@v7`.
- The workflow token is read-only, and a job adds only the permissions it needs.
- `.github/dependabot.yml` updates packages through the `bun` ecosystem, which reads `bun.lock`, and action SHAs through `github-actions`, weekly.

## Sandbox

`sandbox/` is a scratch project at the repository root. It is git-ignored and created on the first run.

A full session:

```bash
bun run sandbox:reset
bun run sandbox init -s react-router-spa -t copilot,claude,cursor,codex
bun run sandbox add drizzle-postgresql better-auth
bun run sandbox status
bun run sandbox check
bun run sandbox remove drizzle-postgresql
bun run sandbox clean
```

- Edit `sandbox/.aidev-instruct.json` by hand, then run `bun run sandbox status` or `update`.
- Change a generated file, then run `bun run sandbox update` to see the `skip` line, and `bun run sandbox update --orig` to see the `.orig` copy.
- `bun run sandbox:package init ...` runs the packed CLI, which is how CI checks the package on Node 22, 24 and 26.

### Sandbox Package

`scripts/sandbox-package.ts` builds the CLI, runs `npm pack --json` and runs the tarball with `npx --package` against `sandbox/`.

Use it when a change can break the published package: the build, the `files` list in `package.json`, the templates copied to `dist/`, or the `bin` entry. It runs the files npm publishes, not `src/`, so a missing file in the tarball fails here and nowhere else.

- The tarball name comes from `npm pack --json`, so no version is hardcoded.
- A successful run deletes the tarball. A failed run keeps it and prints its path, so the contents can be inspected.
- The arguments after the script name go to the packed CLI.

## Pack Changes

1. Add or change files under `packs/<pack>/` and `stacks/`. The format and writing style are in [AGENTS.md](../AGENTS.md); naming rules are in [PACK_NAMING.md](PACK_NAMING.md).
2. Run `bun run validate <pack>`.
3. Run `bun run docs` when a pack, stack or its metadata changed, and commit the regenerated files.
4. Try it in the sandbox with `bun run sandbox init -p <pack>` and read the generated files.
5. Run `bun run check`.

A new pack needs `version`, a `description`, at least one tag and at least one item. A pack that requires a pack with `latest` names a version, a pin or a range; `bun run validate` rejects a bare name. The validator fails a name that starts with another pack's name without requiring it.

## Docs

Pack and reference headings use Title Case; FAQ questions use sentence case.

One page owns each topic, and the other pages link to it instead of repeating it:

| Topic | Page |
| --- | --- |
| Commands, options, config, lock, target folders, environment variables, exclude, modified files | `docs/CLI.md` |
| Feed creation, release, tokens and use | `docs/PRIVATE_FEED.md` |
| npm package content, release pipeline and trusted publishing | `docs/PUBLISHING.md` |
| Pack and stack lists | `docs/PACKS.md`, `docs/STACKS.md` |
| Decisions and surprises | `docs/FAQ.md` |
| Repository work | `docs/DEVELOPMENT.md` |

- `docs/CLI.md` holds two generated sections, between `<!-- generated:targets:start -->` and `<!-- generated:targets:end -->`, and between `<!-- generated:env:start -->` and `<!-- generated:env:end -->`. `bun run docs` rewrites them from `TARGETS` and `ENV_VARS`, and `bun run check` fails when they are stale or the marker is missing.
- The content test fails when a reference table header appears on a page that does not own it, such as the target folder table on a page other than `docs/CLI.md`, and when a relative link points at a missing page or heading.

## Tests

| Path | Covers |
| --- | --- |
| `test/*.test.ts` | One file per unit: `app`, `cli`, `config`, `feeds`, `frontmatter`, `items`, `packs`, `release`, `render`, `scope`, `semver`, `sync`, `targets`, `versions` |
| `test/fixtures.ts` | A temporary project with fixture packs and stacks, used by most tests |
| `test/feed-fixtures.ts` | Tar archives and a fake GitHub for feed tests |
| `test/content.test.ts` | The shipped packs, stacks, docs and validator |

- Run one file: `npx vitest run test/sync.test.ts`.
- Run one test: `npx vitest run test/app.test.ts -t "init"`.
- Coverage must stay at 100% of `src/`. A new branch needs a test, including its error path.

## Manual Checks

Each target loads the files in its own folder. After `bun run sandbox init -t <targets>`, open `sandbox/` in the tool and edit a matching file:

| Tool | Confirm |
| --- | --- |
| GitHub Copilot in VS Code | A response's references list the `.github/instructions` file for the file type, and the agents menu shows `.github/agents` |
| Claude Code | `/memory` lists the loaded `.claude/rules` files, and `/agents` lists `.claude/agents` |
| Cursor | Settings, Rules lists the `.cursor/rules` files, and the agents menu lists `.cursor/agents` |
| Codex | A task on a `.tsx` file loads the `react-rules` skill from `.agents/skills` |
| Antigravity | The rules panel shows `.agents/rules`, and the subagent list shows `.agents/agents` |
| Kiro | Steering shows the `.kiro/steering` files, and the agent list shows `.kiro/agents` |
| Devin | Rules show the `.devin/rules` files, and the agent list shows `.devin/agents` |

## Feeds

A feed can be built and used from local folders, with no GitHub and no token:

```bash
mkdir feed-demo && cd feed-demo
bunx aidev-instruct@latest feed init demo
bunx aidev-instruct@latest feed validate

cd ../project
bunx aidev-instruct@latest feeds add demo ../feed-demo
bunx aidev-instruct@latest add demo-example
```

- `feed release` needs a git repository; run `git init`, commit and then `feed release --dry-run`.
- A GitHub feed needs a repository, a release and a token in the variable `tokenEnv` names. See [PRIVATE_FEED.md](PRIVATE_FEED.md).

## Release

1. Run `bun run release --dry-run` and check the plan.
2. Run `bun run release`. It commits `Release <version>` and tags `v<version>`.
3. Push with `git push --follow-tags`.
4. Create the GitHub release from the tag. `release.yml` publishes to npm through trusted publishing.

The version rules are in [PUBLISHING.md](PUBLISHING.md). A feed uses the same detection through `feed release`.
