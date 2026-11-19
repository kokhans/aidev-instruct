# aidev-instruct

Rules, skills and agents for AI coding tools, installed per tech stack. Guidance is written once and rendered in the format of each tool you use: GitHub Copilot, Claude Code, Cursor, OpenAI Codex, Google Antigravity, Kiro and Devin.

## Install

The CLI needs Node 22 or later. Run it in the project root with any package runner (`npx`, `pnpm dlx`, `bunx`), then commit the files it writes:

```bash
npx aidev-instruct@latest init -t copilot,claude -s nextjs-ssr,public-site -p zod
npx aidev-instruct@latest add drizzle-postgresql better-auth
```

- `init` takes flags only and asks no questions: `-t` targets (default `copilot,claude,cursor`), `-s` stacks and `-p` packs, each comma-separated. `-s` and `-p` are optional.
- Required packs come along: `nextjs-ssr` also installs `nextjs`, `react` and `typescript`.
- `add` and `stacks add` create the config with the default targets when `init` was skipped.

## Concepts

| Term | Meaning |
| --- | --- |
| Target | An AI coding tool the CLI writes files for, such as `copilot` or `claude` |
| Pack | Guidance for one technology: rules, skills and agents |
| Stack | A named set of packs, such as `nextjs-ssr` or `elysia-api` |
| Rule | Short guidance the tool loads for matching files |
| Skill | Deep guidance the tool loads when a task needs it |
| Agent | A subagent with its own instructions, such as `code-reviewer` |
| Integration | An item inside a pack that installs only with another pack, such as `better-auth-drizzle` |

## Packs

[docs/PACKS.md](docs/PACKS.md) lists every pack with its contents.

| Group | Examples |
| --- | --- |
| TypeScript tooling | `typescript`, `zod`, `biome`, `vitest`, `playwright`, `node`, `bun`, `pnpm` |
| React and UI | `react`, `tailwind`, `shadcn-ui`, `radix-ui`, `motion`, `redux`, `d3` |
| Web concerns | `seo`, `accessibility`, `i18n`, `web-security`, `web-performance`, `web-forms`, `web-auditor` |
| Consent and analytics | `cookie-consent`, `google-tag-manager`, `google-analytics`, `microsoft-clarity` |
| Frameworks | `nextjs`, `react-router`, `tanstack-start`, each with `-ssr` and `-spa` variants, and `vite` |
| TanStack | `tanstack-query`, `tanstack-router`, `tanstack-form`, `tanstack-table` and newer libraries |
| Data | `postgresql`, `drizzle`, `prisma`, `kysely`, `typeorm`, `mikro-orm`, `mongoose` |
| TypeScript backend | `elysia`, `better-auth`, `clerk`, `supabase`, `stripe`, `resend` |
| .NET | `csharp`, `dotnet`, `aspnetcore`, `efcore`, `signalr`, `aspire`, `dotnet-oss` |
| Power Platform | `dataverse`, `dataverse-plugins`, `pcf`, `dataverse-client` |
| Python, Go, Rust | `python`, `fastapi`, `go`, `go-echo`, `sqlc`, `rust`, `axum`, `rust-sqlx` |
| Infrastructure | `docker`, `github-actions`, `bicep`, `terraform`, `opentelemetry` |

- **Variants.** Mode packs such as `nextjs-spa` and `nextjs-ssr` conflict with each other, so a project picks one. The routing frameworks `react-router`, `tanstack-router` and `nextjs` conflict with each other too, unless each one gets its own `path`.
- **Integrations.** They follow the packs you install. With `drizzle` installed, `better-auth` also installs `better-auth-drizzle`, and `remove drizzle` removes it.
- **Commercial libraries.** `dotnet-oss` keeps .NET projects on open-source dependencies: it forbids commercial libraries such as AutoMapper, MediatR and MassTransit v9, and names free replacements.

## Stacks

| Stack | For |
| --- | --- |
| `nextjs-ssr`, `nextjs-spa` | Next.js with server rendering, or as a static single-page app |
| `react-router-ssr`, `react-router-spa` | React Router framework mode |
| `tanstack-start-ssr`, `tanstack-start-spa` | TanStack Start with Query and Form |
| `public-site` | Add-on for public sites: SEO, performance, consent, release audit |
| `elysia-api` | Elysia, Drizzle on PostgreSQL, better-auth |
| `aspnetcore-api` | ASP.NET Core, OpenAPI, EF Core on PostgreSQL, open-source dependencies only |
| `fastapi-api`, `go-echo-api`, `axum-api` | APIs in Python, Go and Rust |

An admin panel uses `react-router-spa` alone. A marketing site uses `nextjs-ssr` with `public-site`. [docs/STACKS.md](docs/STACKS.md) lists every stack's packs.

### Monorepos

Give each stack or pack the folder it applies to, and rule file patterns are prefixed with it:

```json
{
  "targets": ["copilot", "claude", "cursor"],
  "stacks": [
    { "name": "react-router-spa", "path": "apps/web" },
    { "name": "elysia-api", "path": "apps/api" }
  ],
  "packs": [
    { "name": "docker", "path": ["apps/web", "apps/api"] },
    { "name": "csharp", "version": "14", "path": "legacy" },
    { "name": "csharp", "version": "15", "path": "apps" }
  ]
}
```

The Elysia rule then applies to `apps/api/**/*.ts` only, and a pack both stacks use applies to both folders. Install once at the repository root: tools read their rule folders only there.

- `path` is one folder or a list of folders.
- An entry is identified by its name and version, so two versions of one pack can run in different folders.
- `add react --path apps/web,apps/admin` writes one entry with a list. Repeat `--path` to add more folders.

## Targets

Seven tools are targets: GitHub Copilot, Claude Code, Cursor, OpenAI Codex, Google Antigravity, Kiro, and Devin Desktop (formerly Windsurf) with Devin CLI. `aidev-instruct targets` lists them, and `targets add` and `targets remove` change them later.

- Each target writes only to its own folders, whatever other targets are selected. Every folder is in [docs/CLI.md](docs/CLI.md#target-folders).
- Codex has no rules with file patterns, but it loads a skill when a task matches its description. Each rule becomes a `<rule>-rules` skill whose description ends with the rule's file patterns.
- `codex` and `antigravity` share `.agents/skills`, and each skill is written there once.
- Agent tool names are mapped to each tool's names, such as `Read` to `read` for Copilot and `view_file` for Antigravity.
- Of the other tools, Gemini CLI, OpenCode, Zed and Cline read skills from `.agents/skills` or `.claude/skills`. Select `codex`, `antigravity` or `claude` to write those folders.

`code-reviewer` and `web-auditor` are read-only, and some tools read another tool's folders as well. What each tool enforces: [docs/FAQ.md](docs/FAQ.md). Copilot in VS Code with `-t copilot,claude` can also read `.claude`, so a developer who sees duplicates adds these settings by hand. The CLI never writes `.vscode/settings.json`.

```json
{
  "chat.instructionsFilesLocations": { ".github/instructions": true, ".claude/rules": false },
  "chat.agentFilesLocations": { ".github/agents": true, ".claude/agents": false },
  "chat.agentSkillsLocations": { ".github/skills": true, ".claude/skills": false, ".agents/skills": false },
  "chat.useClaudeMdFile": false
}
```

Whether a project value replaces VS Code's default list or merges with it is not documented and is not checked yet.

### Technology Versions

A pack declares the technology versions its guidance holds for. `latest` in `pack.json` is the exact version a pack gets when nothing else chooses one, and items can carry a `version` that applies on some versions only. `csharp` has `csharp` for every version, plus `csharp-15`, `csharp-14` and `csharp-7-3`. A project gets the unversioned items and the items that match its version.

| Config | Installed |
| --- | --- |
| `"packs": ["csharp"]` | `csharp`, `csharp-15` (the pack's `latest`) |
| `"packs": [{ "name": "csharp", "version": "14" }]` | `csharp`, `csharp-14` |
| `"packs": ["dataverse-plugins"]`, which requires `csharp@7.3` | `csharp`, `csharp-7-3` |

- A version in the config or a stack wins over a `requires` pin, and a pin wins over `latest`.
- A `requires` entry pins a version, such as `csharp@7.3`, or requires a range, such as `react@>=19`. A range never chooses a version; it fails the command when the chosen version does not fit, and names the folder to separate with `--path`.
- A pack that ships versions is always required with a version. A bare name is only for a pack without `latest`, and `bun run validate` checks it.
- An item's `version` is exact (`19`, named `<pack>-19`), a range (`>=16 <20`, any unique name), or absent for every version.
- One pack cannot have two versions in overlapping folders. Give each version its own `path`.

## Config and Lock

`.aidev-instruct.json` is the config: targets, stacks and packs, each with an optional folder, plus `exclude` and `modified`. `.aidev-instruct.lock.json` records what is installed: the CLI version, the resolved packs with their folders and the reason each is installed, local overrides, and the source pack and hash of every file.

- Edit the config by hand, or with `add`, `remove`, `stacks` and `targets`. Never edit the lock.
- After a hand edit, `status` shows what is pending, and `update` installs it.
- Commit both. Every field: [docs/CLI.md](docs/CLI.md#config-file). Every entity the CLI reads or writes, field by field: [docs/ENTITIES.md](docs/ENTITIES.md).

## Commands

`init` creates the config and the lock and installs what it lists. `add`, `remove`, `stacks` and `targets` change the config and the files. `update` installs what the config lists with this CLI version, `status` shows what is installed and pending, `check` fails when files do not match the config, and `clean` removes every file the CLI wrote.

Every command with its options, the config and lock fields, the target folders and the environment variables: [docs/CLI.md](docs/CLI.md).

## Private Feeds

A company can serve its own packs and stacks from a private GitHub repository. One command adds it:

```bash
npx aidev-instruct@latest feeds add acme github:acme/aidev-instruct --tokenEnv ACME_FEED_TOKEN
```

`tokenEnv` names an environment variable that holds a GitHub token, never the token itself. Every pack and stack from a feed starts with `<feed>-`, such as `acme-api`. Creating, releasing and using a feed: [docs/PRIVATE_FEED.md](docs/PRIVATE_FEED.md).

## Customizing

Change the config or the `.aidev-instruct/` folder, then run `update`.

- Drop a rule, skill or agent: add its name to `exclude`. Use `rules/<name>` when a skill has the same name, and `*` for a group such as `tanstack-*`. An entry that matches nothing is reported. Details: [docs/CLI.md](docs/CLI.md#exclude).
- Add an item of your own: put it in `.aidev-instruct/rules/`, `skills/` or `agents/` in pack format. It is written for every target, and `with` works there too.
- Change a pack item: copy it into `.aidev-instruct/` under the same name and edit it. Your copy replaces the pack's, and `update` and `status` report a later change to the pack item so you can merge it.
- A generated file you edited is skipped and reported. `--orig` keeps your version as `<file>.orig`, and `--force` overwrites. Details: [docs/CLI.md](docs/CLI.md#files-changed-by-hand).

Commit `.aidev-instruct/`.

## Updating

```bash
npx aidev-instruct@latest update
```

Review the diff and commit.

`npx` can run an older cached copy when the version is left out, so name `@latest` or an exact version. Why, and the other fixes: [docs/FAQ.md](docs/FAQ.md#why-does-npx-run-an-older-version).

### Checking in CI

`check` fails the build when the files do not match the config and the CLI version: a pack added to the config but not installed, a generated file changed or deleted by hand, or pack content that changed.

```yaml
- run: npx aidev-instruct@0.1.0 check
```

Pin the version the project uses, so a new release does not fail every build.

## FAQ

Decisions that limit something or differ from a tool's defaults, with what to do about each: [docs/FAQ.md](docs/FAQ.md).

## Contributing

Pack format and writing style: [AGENTS.md](AGENTS.md). A pack or stack you contribute is MIT licensed, like the rest of the repository.

## Development

Setup, scripts, the sandbox, tests, manual checks per tool and the release: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
