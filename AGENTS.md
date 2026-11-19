# aidev-instruct

Packs of rules, skills and agents for AI coding tools. The `aidev-instruct` CLI renders the packs a project chooses into the folders and formats of each target: GitHub Copilot, Claude Code, Cursor and the others in `src/targets.ts`.

## Repository Layout

```
packs/<pack>/
  pack.json                 name, description, requires, conflicts, notes
  rules/<rule>.md           short, loaded by file pattern
  skills/<skill>/SKILL.md   loaded on demand
  skills/<skill>/references/*.md
  agents/<agent>.md         subagents
stacks/<stack>.json         named sets of packs
src/                        CLI source (TypeScript)
test/                       Vitest tests
docs/                       PACKS.md and STACKS.md
```

## Scope

- Packs hold agent guidance only: how to use a technology well.
- Never prescribe folder layout, project architecture or scaffolding. Never create or edit application files.
- The CLI never touches `CLAUDE.md`, `AGENTS.md` or settings files in a target project. Each target gets files only in its own folders.

## Version Control

- The agent never runs `git commit` or `git push`. A developer reviews the changes and commits and pushes by hand.

## Packs

```json
{
  "name": "react-router-spa",
  "description": "React Router framework mode as a single-page app: clientLoader, clientAction and a static build.",
  "version": "1.0.0",
  "tags": ["react", "react-router", "spa"],
  "requires": ["react-router"],
  "conflicts": ["react-router-ssr"]
}
```

- `name` matches the folder.
- `version` is the pack release version. `bun run release` bumps it from the changes since the last tag; never edit it by hand.
- `tags` is a required list of at least one search term, such as `react` or `spa`: lowercase, a letter first, then letters, digits and dashes. The website filters by tags.
- Optional `authors` credit contributors on the website. `latest` is the exact technology version a pack gets when nothing else chooses one; it is required when the pack has versioned items.
- `requires` lists packs that are always needed with this one. Use it only for real dependencies, never to pull in an integration. A pack with `latest` is named with a pin (`react@16`) or a range (`react@>=19`); a bare name is valid only for a pack without versions, and the validator checks it.
- Optional `packVersions` maps a pack in `requires` to a range of that pack's release version, such as `{"dotnet": ">=1.4.2"}`. Resolution fails when the CLI ships a version outside the range.
- `conflicts` lists packs that cannot be installed together in the same folder, such as the SPA and SSR packs of one framework, or two routing frameworks. The other pack lists the conflict too, and the validator checks it.
- Optional `notes`: lines the CLI prints under "Next steps" after install, such as a follow-up command. A command goes in backticks, so the CLI can color it.
- Rule, skill and agent names are unique across all packs, because they share one folder in the target project.

A stack file in `stacks/` has `name`, `description`, `version` and `packs`. `bun run release` bumps its `version` too.

`bun run registry` writes `registry.json` from the shipped packs and stacks for the website. A private feed has no registry: a project reads its `feed.json`.

## Naming

Full rules and the order to apply them: [docs/PACK_NAMING.md](docs/PACK_NAMING.md).

| Case | Name | Examples |
| --- | --- | --- |
| Language, runtime, platform, database, tool or service | The name developers use | `go`, `csharp`, `postgresql`, `stripe` |
| Mode or database variant | `<pack>-<variant>` | `nextjs-spa`, `drizzle-postgresql` |
| Member of a product family, or an add-on for one framework | `<family>-<name>` | `tanstack-query`, `aspnetcore-openapi` |
| Cloud-managed version of a pack | `<cloud>-<pack>` | `azure-signalr` |
| Library for one language with a unique name | Its own name | `zod`, `axum`, `gqlgen`, `sqlc` |
| Library for one language with an ambiguous name | `<language pack>-<name>` | `go-echo`, `rust-sqlx` |
| Concern that spans technologies | Plain name, or `web-<concern>` | `seo`, `web-security` |
| Integration item | `<pack>-<other pack>` | `better-auth-drizzle`, `gqlgen-echo` |
| Agent | Role noun | `code-reviewer`, `web-auditor` |

- A language prefix only tells two names apart. It never groups packs.
- A pack whose name starts with `<other pack>-` or ends with `-<other pack>` requires that pack. The validator checks it.
- Never put a version in a pack name. A versioned rule or skill is named `<pack>-<version>`, with hyphens for dots: `csharp-15`, `csharp-7-3`.

## Versions

- A pack with items for several technology versions sets `"latest"` in `pack.json`, an exact version, and each versioned item sets `version` in its frontmatter. The validator checks the name of an exact item, `<pack>-<version>` with hyphens for dots.
- An item can set a range instead, such as `version: ">=16 <20"`. It applies wherever the pack's version is inside the range, and its name is free.
- An unversioned item holds only guidance that is true for every supported version. A versioned item is complete for its version.
- The config or a stack version wins over a `requires` pin, and a pin wins over `latest`. A range never chooses; it fails the command when the chosen version does not fit.
- `requires` can pin a version: `"requires": ["csharp@7.3"]`. A project's config version wins over the pin.
- A range sets a minimum: `"requires": ["react@>=18"]`. The resolved version must satisfy it, and a violation names both the range and the version found.

## Integrations

An item that applies only when another pack is installed declares it with `with` in its frontmatter. It lives in the pack it extends and is named `<pack>-<other pack>`.

```markdown
---
description: better-auth with the Drizzle adapter.
globs: ["**/*.ts"]
with: ["drizzle"]
---
```

- The CLI installs the item only when every pack in `with` is installed, and removes it when one is removed.
- `with` works on rules, on `SKILL.md` and on agents. The CLI strips it from the files it writes.
- Never write "With X" sections inside a rule. Move them into an integration item.

## Rules

```markdown
---
description: React 19 conventions for components, data, actions and effects.
globs: ["**/*.tsx", "**/*.jsx"]
---

# React
```

- `globs` scopes the rule. Omit it only for guidance that applies to every file. Use one glob per entry, no braces.
- The CLI renders each rule once per target in that target's format, and prefixes globs with a folder when a project scopes the pack to one.
- Codex has no rules with file patterns, so the CLI writes each rule as a `<rule>-rules` skill whose description ends with its globs. `description` must make sense on its own.
- Keep a rule under 60 lines. Move depth into a skill and name that skill at the end of the rule.
- State decisions and non-obvious constraints. Skip what a capable model already does by default.

## Skills

- Agent Skills format: `skills/<name>/SKILL.md` with `name` (matches the folder, lowercase letters, digits and hyphens) and `description`.
- `description` says what the skill does and when to use it, in the third person, under 1024 characters.
- Keep `SKILL.md` under 200 lines. Put depth in `references/` and link each file from `SKILL.md`, one level deep.

## Agents

- Claude Code format: `name`, `description`, `tools` (comma-separated Claude Code names). Each target gets its own copy with mapped tool names, so use only tools the tool tables in `src/targets.ts` list.
- Review and audit agents are read-only and report findings. They never edit files. They set `readonly: true`.

## Writing Style

- One H1 per file. Headings use Title Case.
- No em dashes. Use a colon, comma or full stop.
- One rule per bullet, in plain present tense: "Server code validates every request." Add the reason only when it is not obvious.
- No introductions, summaries, filler or motivational text.
- Package, file, API and command names go in backticks.
- Commands name the binary without a runner (`drizzle-kit generate`, not `bunx drizzle-kit generate`). Only the `bun` and `pnpm` packs name their own commands.
- Use "latest stable" over pinned versions, unless a version decides the rule.
- Tables for mappings and comparisons. Code samples only when shorter than the prose they replace.

## Keeping Packs Current

- Write from the current official documentation, never from memory. Check the latest stable version and its breaking changes before writing a rule.
- Fill `latest`, `requires` and item versions with the `pack-versions` skill, and record the source in the pack changelog.
- Prefer the APIs the official docs recommend today. Name deprecated APIs only to forbid them.
- Recommend open-source libraries. Name a commercial one only to say what replaces it.

## Stack Decisions

| Area | Choice |
| --- | --- |
| TypeScript tooling | Any package manager, Bun and pnpm as opt-in packs. Biome for lint and format, Vitest and Playwright for tests |
| Frontend | React 19 with React Compiler, Tailwind CSS v4, Next.js, TanStack Start or React Router, each as SPA or SSR |
| .NET | .NET 11, C# 15, `.slnx` solutions, ASP.NET Core minimal APIs, built-in validation, OpenAPI with Swagger UI, EF Core, xUnit v3 on Microsoft.Testing.Platform, open-source dependencies only with `dotnet-oss` |
| TypeScript backend | Elysia, Drizzle, better-auth |
| Database | PostgreSQL |

## Commands

- `bun install`: install dependencies
- `bun run check`: Biome, type check, and tests with 100% coverage of `src/`, pack validation and a docs check
- `bun run validate [pack...]`: pack format, writing style and cross-references
- `bun run docs`: regenerate `docs/PACKS.md` and `docs/STACKS.md` after changing packs or stacks
- `bun run registry`: write `registry.json` for the website
- `bun run release [--dry-run] [--bump <name>=<major|minor|patch>] [--cli <kind>]`: bump the packs and stacks that changed since the last `v*` tag, write their changelogs, set the CLI version, commit `Release <version>` and tag it
- `bun run build`: build the CLI into `dist/`
- `bun run sandbox <command>`: run the CLI from source against `sandbox/`

## CLI Files in a Target Project

- `.aidev-instruct.json`: config with `targets`, `stacks`, `packs`, `exclude` and `modified`. Stacks and packs take an optional folder `path`.
- `.aidev-instruct.lock.json`: written on every install with the CLI version, resolved packs with their folders, local overrides and each file's pack and hash. Hashes protect files changed by hand.
- `.aidev-instruct/`: the project's own `rules/`, `skills/` and `agents/` in pack format. An item with a pack item's kind and name replaces it. `exclude` in the config drops pack items by name or `kind/name`.

## Documentation

- A change that adds a limit or changes default behavior adds or updates an entry in `docs/FAQ.md` in the same change: the question as the heading, the short answer, the reason, and how to handle it.
- A change to a command, option or file format updates `docs/CLI.md` in the same change.
- Working on this repository: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
