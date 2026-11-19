# FAQ

Decisions that limit something, differ from a tool's default behavior, or can surprise a developer, with what to do about each.

## What happens to a file I changed by hand?

The CLI skips it and reports it, so your edit is never lost.

Each file the CLI writes is recorded with its hash in `.aidev-instruct.lock.json`. When a file no longer matches its hash, `update` leaves it alone and prints `skip ... (changed by hand ...)`.

- `--orig` saves your version as `<file>.orig` and writes the new one. Compare the two, merge what you need, then delete the `.orig`. Set `"modified": "orig"` in the config to make this the default.
- `--force` writes the new version and keeps no copy.
- An existing `.orig` is never overwritten: the file stays skipped until you delete it.
- Add `*.orig` to `.gitignore`.

## Which files does the CLI never touch?

`CLAUDE.md`, `.vscode/settings.json` and every other settings file of a tool.

Those files hold the developer's own choices, and a generated change to them would be hard to review or undo. The CLI writes only into the rule, skill and agent folders of the selected targets, plus its config and lock.

- When a tool needs a setting, such as turning off a folder it reads twice, the README shows the setting and you add it yourself.
- Put project-wide instructions in `CLAUDE.md` or `AGENTS.md` by hand.

## Why does a skill apply outside the folder I gave a pack?

A pack with `path` scopes its rules to that folder, but skills and agents have no file patterns, so they apply to the whole project.

Rules are loaded by file pattern, so the CLI prefixes each glob with the folder: `**/*.ts` becomes `apps/api/**/*.ts`. Skills are loaded by their description, and agents are started by name or by task, so no tool can limit them to a folder.

- A skill's description names its technology, so an agent uses it only for matching work.
- To drop a skill or agent entirely, add its name to `exclude`.

## Why did an item appear or disappear when I added or removed another pack?

It is an integration item. An item with `with` in its frontmatter is installed only when every pack it names is installed, and deleted when one of them is removed.

For example, `better-auth-drizzle` belongs to `better-auth` and has `with: ["drizzle"]`. It is written only when both packs are installed, and `remove drizzle` deletes it. With folders, it applies only where both packs apply.

- Integration items keep each rule free of "if you also use X" sections.
- `docs/PACKS.md` lists every integration item under "With".

## Why does the config list only my stack?

The config keeps what you chose, and the lock records what the CLI resolved from it, including why each pack is installed.

`init -s react-router-spa` writes one stack to `.aidev-instruct.json` and every pack it installs to `.aidev-instruct.lock.json`. Each locked pack has a `from` field:

| Source | Meaning |
| --- | --- |
| `stacks` | A stack in the config lists the pack |
| `requiredBy` | An installed pack names it in `requires` |
| `config` | `packs` in the config lists it |

`status` prints the source next to every installed pack, such as `required by react-router` or `stack react-router-spa`, and `remove` names the stack or pack that keeps a pack installed.

- Do not copy a stack's packs into `packs` to make them visible. The copy freezes them: a stack that gains a pack in a new release would not add it.
- A pack can have several sources, such as `config` and `requiredBy`.

## How do I change or drop an item from a pack?

Add it to `.aidev-instruct/` to replace it, or name it in `exclude` to drop it.

| Goal | How |
| --- | --- |
| Drop an item | Add its name to `exclude`, or `rules/<name>` when a skill has the same name. |
| Change an item | Copy it into `.aidev-instruct/rules/`, `skills/` or `agents/` under the same name and edit it. Your copy replaces the pack's. |
| Add your own | Put it in `.aidev-instruct/` in pack format. It is written for every target. |

- When a pack changes an item you replaced, `update` and `status` print a note so you can merge the change by hand.
- An `exclude` entry that matches nothing is reported as unused.

## What can I exclude?

Rules, skills and agents, by name, from a pack and from `.aidev-instruct/`. Not packs, stacks or folders.

An item is one rule, skill or agent: what the CLI writes as one file or one skill folder. An entry is a name, `kind/name` where the kind is `rules`, `skills` or `agents`, or a name with `*` for any characters within one segment:

| Entry | Drops |
| --- | --- |
| `tanstack-query` | The rule, the skill and the agent named `tanstack-query` |
| `rules/tanstack-*` | Every rule whose name starts with `tanstack-`, and nothing else |
| `agents/web-auditor` | The `web-auditor` agent |

- It never drops a pack, a stack or a folder: use `remove`, `stacks remove`, or a `path` that leaves the folder out.
- It never edits a pack's `requires`, `conflicts` or `with`. To drop an integration item such as `better-auth-drizzle`, remove the pack named in its `with`, here `drizzle`.
- An entry that matches nothing is printed as unused, and any other prefix fails with `Unknown exclude kind "packs". Use rules/, skills/ or agents.`
- Every form, with examples: [CLI.md](CLI.md#exclude).

## Which Node version does the CLI need?

Node 22 or later.

Node 20 reached end of life on 30 April 2026, so CI tests the CLI on Node 22, 24 and 26 only, and `engines.node` is `>=22`. The files the CLI writes need no Node at all: a .NET, Go or Python project only needs Node to run the CLI.

- Check with `node --version`.
- Without Node in the project, run the CLI once with `npx aidev-instruct@latest update` on a machine that has it.

## Why does npx run an older version?

`npx` uses a local install when the project has one, and otherwise its cache. It does not ask npm for the latest version on every run, so a command without a version can run a copy it downloaded months ago.

A version, `@latest` or a dev dependency fixes it:

| Fix | Command | Effect |
| --- | --- | --- |
| Name the latest version | `npx aidev-instruct@latest update` | `npx` asks npm for the newest version on each run |
| Name an exact version | `npx aidev-instruct@0.1.0 update` | Every developer and CI run the same version |
| Install a dev dependency | `npm install --save-dev aidev-instruct`, then `npm exec aidev-instruct update` | `npx` finds the local copy first, and the version is in `package.json` and its lockfile |

- The CLI cannot refresh the npx cache: the cache belongs to npm.
- `bunx` and `pnpm dlx` follow the same rule. Name `@latest` or an exact version with them too.

## Which versions does an item apply to?

Each pack can ship items for several versions of its technology, and each item says which versions it covers.

- No `version` in the frontmatter: the item applies on every version.
- An exact version, such as `19`: the item applies only on 19, and it is named `<pack>-19`.
- A range, such as `>=16 <20`: the item applies everywhere inside the range. The name is free but unique.

The chosen version comes from the config or a stack first, then a `requires` pin, then the pack's `latest`. A `requires` range never chooses a version; it fails the command when the chosen one does not fit. More: [README](../README.md#technology-versions).

## Why did adding a pack change another pack's files?

Adding a pack that pins a version changes that version for every pack in the same folders. In one folder, adding Next.js (React 19) and PCF (React 16) replaced the React 19 rules with React 16 ones.

- The packs declare a version now: `nextjs` requires `react@>=19`, `pcf` pins `react@16`. Adding the second pack stops before writing anything: `Pack nextjs requires react >=19 ..., but react is on version 16 there. Give each one its own folder with --path.`
- Give each side its own folder, such as `--path apps/web` and `--path src/controls`. Each folder gets the rules for its version.
- A config or stack version wins over a pack pin, and a pin wins over `latest`. `add` prints the files it changes, and `status` shows the version each pack is on.

## Which environment variables does the CLI read?

Four: `NO_COLOR`, `FORCE_COLOR`, `AIDEV_INSTRUCT_CACHE`, and the variable each feed names in `tokenEnv`.

| Variable | Where the name comes from | Read by |
| --- | --- | --- |
| `NO_COLOR` | A cross-tool standard, no-color.org | Every command |
| `FORCE_COLOR` | A Node convention | Every command |
| `AIDEV_INSTRUCT_CACHE` | This CLI | Every command that reads a feed |
| The variable named by `tokenEnv` | The config, one name per feed | `feeds add` and every command that reads a feed |

- `NO_COLOR` and `FORCE_COLOR` keep their standard names. Node reads them for its terminal styling, and a prefix would break every tool that honors the standard.
- `AIDEV_INSTRUCT_CACHE` is ours, so it carries the CLI prefix.
- `tokenEnv` is a name the company chooses in the config, so it has no fixed prefix: each feed has its own variable and its own secret, and a prefix would force a second secret under a new name.
- The CLI does not read `.env` files. Set the variable in the shell, in the CI environment or in the operating system.
- What each variable does: [CLI.md](CLI.md#environment-variables).

## Which tools are targets?

GitHub Copilot, Claude Code, Cursor, OpenAI Codex, Google Antigravity, Kiro and Devin: the tools that read rules scoped by file patterns, skills and subagents from their own project folders.

Each target needs all three kinds without an index file, an `AGENTS.md` section or a settings change. Codex is the one exception: it has no rules with file patterns, but it loads skills by their description, so each rule becomes a skill for it.

- Of the other tools, Gemini CLI, OpenCode, Kilo Code, Augment Code, Junie, Amp, Zed and Cline still read skills from `.agents/skills` or `.claude/skills`. Select `codex`, `antigravity` or `claude` to write those folders.

## Why does Codex show rules as skills?

Codex has no rules that load by file pattern, so the CLI writes each rule as `.agents/skills/<rule>-rules/SKILL.md`. Codex loads it when a task matches its description, which ends with the rule's file patterns.

- The `-rules` suffix keeps a rule apart from a pack skill of the same name, such as the rule `tanstack-ai` and the skill `tanstack-ai`.
- Codex lists skills at startup within a small budget, about 2% of the context window, and shortens descriptions beyond it. With many packs, exclude rules you do not need.
- Antigravity also reads `.agents/skills`, so with `codex` and `antigravity` it sees each rule twice: as its own rule and as the skill.

## Why does a tool load an item twice?

Some tools read other tools' folders as well as their own, and every target writes its own copy. The copies have the same text, so they cost tokens but never conflict.

| Tool | Duplicates | Fix |
| --- | --- | --- |
| Copilot in VS Code | Rules, agents and skills with `claude` | VS Code settings in the README |
| Copilot CLI | Rules with `claude`. Agents and skills with the same name load once. | None documented |
| Cursor | Skills with `claude`, `codex` or `antigravity` | Cursor Settings, Agents, Third-Party Imports |
| Devin | Skills and agents with `codex` or `antigravity`, and items of other selected targets through config import | `read_config_from` in `.devin/config.json` |
| JetBrains Junie | Loads the `antigravity` rules and agents in `.agents/` as agents | Leave out `antigravity` |

## Why can't I install two frameworks together?

Two routing frameworks give conflicting rules for the same files, such as `clientLoader` and `loader`, so they cannot cover the same folder.

`react-router`, `tanstack-router` and `nextjs` conflict with each other, and the mode packs of one framework conflict with each other. A conflict is an error only where the folders overlap: a pack for the whole project overlaps every folder.

Two sites in one repository each get their own folder:

```json
{
  "targets": ["copilot", "claude"],
  "stacks": [
    { "name": "react-router-spa", "path": "src/spa-website" },
    { "name": "react-router-ssr", "path": "src/ssr-website" }
  ],
  "packs": []
}
```

- The error names the overlapping folder: `Packs react-router-spa and react-router-ssr cannot be installed together in src/app. Give each one its own folder with --path.`
- `init -s react-router-spa --path src/spa-website` and `stacks add react-router-ssr --path src/ssr-website` write that config.
- `tanstack-start` requires `tanstack-router`, so it conflicts with the other frameworks through it.
- The validator fails when a conflict is listed in one pack but not in the other.

## Why does a project get `csharp-15` but not `csharp-14`?

An item named for a version serves only that version. A project on C# 15 gets `csharp` and `csharp-15`, never `csharp-14`.

A pack names its `latest` version, which a project gets by default. A config entry such as `{ "name": "csharp", "version": "14" }` or a pin in another pack, such as `"requires": ["csharp@7.3"]`, picks another one. The config wins over a pin.

- Unversioned items hold for every supported version.
- A version without items installs the unversioned items only.
- One pack cannot have two versions in overlapping folders, because most tools cannot exclude a folder from a glob. Give each version its own `path`.

## Why do some packs refuse to install next to another?

`requires` can set a minimum: `"requires": ["react@>=18"]`. The pack installs only where the version the project gets satisfies the range; a pin such as `csharp@7.3` still picks the version.

- `pcf` pins `react@16`, so `motion`, `redux`, `react-email`, `shadcn-ui` and `tanstack-query` refuse the same folder.
- The error names the pack, the range and the version it found: `Pack motion requires react >=18 in the whole project, but react is on version 16 there. Give each one its own folder with --path.`
- Splitting the folders fixes it: the component project keeps `react@16` and the app takes the latest.

## Can a read-only agent change files?

Only Cursor enforces read-only by itself. Elsewhere it holds while the tool asks before each shell command, or in a read-only sandbox.

`code-reviewer` and `web-auditor` need a shell for `git diff`, tests and linters, and a shell can also write files. Their text lists the commands they may run, and every copy ends with a read-only sentence, but only Cursor's `readonly: true` blocks writes.

- Claude Code, Copilot, Antigravity, Kiro and Devin: keep command approval on for these agents.
- Codex: run review sessions in the `read-only` sandbox mode, because an agent file cannot change the sandbox.
- The validator rejects a read-only agent that lists `Edit` or `Write`.

## Why does `init` not ask which targets to use?

`init` takes flags only and never asks a question, so the same command works in a terminal, a script and CI, and the website builder can write it for you.

```bash
aidev-instruct init -t copilot,claude -s nextjs-ssr -p zod,stripe
```

- `-t` defaults to `copilot,claude,cursor`. `-s` and `-p` are optional, so a project can pick only stacks, only packs, or both.
- Pack names without `-p`, such as `init zod`, are an error that shows the `-p` form.
- An unknown target, stack or pack, or two conflicting packs, fail before anything is written.

## What license applies to a pack I contribute?

MIT, like the rest of the repository.

This repository is the only public store for packs and stacks, so a pack or stack carries no `license`, `publisher` or `homepage` field. A pack has a `version` and `tags`; optional `authors` credit contributors.

- A contribution is accepted through a pull request, and the repository's MIT license covers it.
- A private feed is not covered by this license: its company owns its own repository.

## Why does a pack have its own version?

Every pack and stack has a release version, separate from the CLI version and from the technology version in `latest`.

`bun run release` compares `packs/` and `stacks/` with the last `v*` tag and bumps only what changed: a removed item, a changed `requires` or a new conflict is major, an added item or a changed `notes` or `latest` is minor, text and metadata are patch. `--dry-run` prints the plan.

- Official packs travel inside the npm package, so a project that pins the CLI version gets exactly the files that version shipped.
- The lock records the version of every installed pack. `check` and `update` print a move such as `react 1.4.2 -> 1.5.0 (minor)`.
- A pack cannot see guidance reversed in plain text, so `--bump <name>=<major>` raises a bump before the release.
- A private feed tags its own release, so its packs move when the feed maintainers run the Release workflow.

## What happens if I run an older CLI?

`update`, `add`, `remove`, `stacks` and `targets` refuse to write when the lock was written by a newer CLI, so a stale npx cache cannot silently revert newer rules and skills. `check` exits 1 with the same message and `status` prints it.

- To keep the newer files, run the newer CLI: `npx aidev-instruct@1.1.0 update`.
- To downgrade on purpose, pass `--force`. `update` names the files it removes first, and `--orig` keeps a hand-edited copy as `<path>.orig`.

## Can one feed depend on another?

No. A pack can `requires` official packs and packs from its own feed, and `feed validate` rejects any other name. Cross-feed packs are not supported today because each feed is validated on its own. Keep dependent packs in one feed. More: [PRIVATE_FEED.md](PRIVATE_FEED.md#compatibility).

## How does a private feed work?

A feed is a company's GitHub repository with the layout of this repository: `feed.json`, `packs/` and `stacks/`. It is versioned by its GitHub releases, not by npm.

- `update` reads the latest release of every feed in the config, downloads it, caches it by commit, and records the tag and commit in the lock.
- Only `update` moves a feed to a newer release. `add`, `remove`, `stacks`, `targets` and `status` use the release the lock records. `check` exits 1 when a feed has a newer release.
- Every pack and stack from a feed starts with `<feed>-`, such as `acme-api`, so it never clashes with an official pack.
- `tokenEnv` is the name of an environment variable, never the token. Each developer sets their own token, and the company manages access through GitHub repository or team access. The CLI sends the token only to `api.github.com` and never writes it.
- A downloaded release is cached under `~/.cache/aidev-instruct` or `AIDEV_INSTRUCT_CACHE`. When GitHub cannot be reached, `update` uses the cache and prints a notice.

