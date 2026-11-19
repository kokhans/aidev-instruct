# CLI Reference

`aidev-instruct` writes rules, skills and agents for AI coding tools into a project. This page documents every command, option, file and environment variable. For an overview, see [README.md](../README.md).

## Usage

```text
npx aidev-instruct@latest <command> [arguments] [options]
```

The CLI needs Node 22 or later. It has no runtime dependencies and writes plain Markdown, so a project needs it only to run the commands.

| Way | Command | Use when |
| --- | --- | --- |
| No install | `npx aidev-instruct@latest update` | Projects without `package.json`, such as .NET or Go, or one-off use |
| Pinned version, no install | `npx aidev-instruct@0.1.0 update` | The same, but every developer and CI run the same version |
| Dev dependency | `npm install --save-dev aidev-instruct`, then `npm exec aidev-instruct update` | Node projects: the version is pinned in `package.json` and its lockfile, and update bots see new releases |

- `npx` with a package name and no version can reuse an older copy from its cache. Name `@latest` or an exact version, or install the CLI as a dev dependency.
- `pnpm dlx` and `bunx` work the same way as `npx`.
- `.aidev-instruct.lock.json` records the CLI version that wrote the files, and `status` prints `Installed with 0.1.0. This CLI is 0.2.0.` when they differ.

## Global Options

| Option | Takes | Default | Does |
| --- | --- | --- | --- |
| `--dir <path>` | A folder | The current folder | Works on another project folder |
| `-h`, `--help` | | | Prints the help text, which lists every command |
| `-v`, `--version` | | | Prints the CLI version |
| `--dry-run` | | off | Prints what would change without writing |

Every command exits `0` on success and `1` on an error. `check` and `doctor` also exit `1` when they find a problem.

## Commands

### `init`

```text
aidev-instruct init [-t <list>] [-s <list>] [-p <list>] [--path <folder>] [--dry-run]
```

| Argument | Required | Meaning |
| --- | --- | --- |
| `-t`, `--targets <list>` | No | Comma-separated targets, default `copilot,claude,cursor` |
| `-s`, `--stacks <list>` | No | Comma-separated stacks |
| `-p`, `--packs <list>` | No | Comma-separated packs, installed in addition to the packs of the stacks |
| `--path <folder>` | No | Folder the stacks and packs apply to. Repeat it or pass a comma-separated list for several folders |

Creates `.aidev-instruct.json` and `.aidev-instruct.lock.json`, then installs the packs of the stacks and the listed packs with their requirements. It never asks a question. An unknown or conflicting name fails before anything is written. Pack names without `-p` are an error that shows the `-p` form.

Output:

```text
Project: /path/to/project

create  .github/instructions/react.instructions.md
...
Created .aidev-instruct.json and .aidev-instruct.lock.json.

Next steps
  react: Add the React Doctor skill for your agents: npx react-doctor@latest install
```

Exit `0` when the files are written, `1` when the config exists or a name is unknown, conflicting or missing.

### `list`

```text
aidev-instruct list
```

Shows every pack with its description and requirements, marked `*` installed, `+` installed as a requirement, `>` pending add and `-` pending remove. With feeds in the config, a feed column shows where each pack comes from.

Exit `0` always.

### `add`

```text
aidev-instruct add <pack...> [--path <folder>] [--version <version>] [--dry-run]
```

Adds packs to `packs` in the config and installs them with their requirements. Creates the config with the default targets when the project has none.

- `name@version` and `--version` choose the technology version, which is stored as a separate `version` field. The config wins over a `requires` pin, and a pin wins over the pack's `latest`.
- A `requires` range fails the command before it writes when the chosen version does not fit, and names the folder to separate with `--path`. A pack that ships versions is named with a pin or a range in `requires`; `bun run validate` rejects a bare name.
- An entry is identified by its name and version. Adding the same identity again merges its folders, and a different version adds a new entry.

Exit `0` after the install, `1` when a name is unknown or no name is given.

### `remove`

```text
aidev-instruct remove <pack...> [--path <folder>] [--force] [--orig] [--dry-run]
```

Removes packs from `packs` in the config and deletes their files. A pack that a stack or another pack still needs stays installed, and the command names that stack or pack.

- `--path` removes only those folders. An entry left with no folder is deleted.

Exit `0` after the change, `1` when there is no config.

### `stacks`

```text
aidev-instruct stacks
aidev-instruct stacks add <stack...> [--path <folder>] [--dry-run]
aidev-instruct stacks remove <stack...> [--path <folder>] [--dry-run]
```

`stacks` lists every available stack, marking the ones in the config. `stacks add` and `stacks remove` change `stacks` in the config and install or delete the files of the stack's packs. A stack entry is identified by its name, so adding it again for another folder keeps one entry with both folders.

Exit `0` after the change, `1` for an unknown action or name, or when `stacks remove` runs without a config.

### `targets`

```text
aidev-instruct targets
aidev-instruct targets add <target...>
aidev-instruct targets remove <target...>
```

`targets` lists the seven targets and the default. The other two change `targets` in the config and install or delete files for them.

Exit `0` after the change, `1` for an unknown action or target, or when the last target would be removed.

### `update`

```text
aidev-instruct update [--force] [--orig] [--dry-run]
```

Installs what the config lists with this CLI version. For every feed it reads the latest GitHub release, downloads and caches it, and records the tag and commit in the lock. Prints each changed pack version, such as `react 1.4.2 -> 1.5.0 (minor)`.

A CLI older than the one that wrote the lock refuses to install and says which two versions it sees. `--force` downgrades: it prints `Downgrade 1.1.0 -> 1.0.0, removing 2 files: ...` before writing, then applies the normal rules, with `--orig` keeping a hand-edited copy as `<path>.orig` first.

A project that never updates keeps working with the files it has. A Node project with the dev dependency learns about a new version from Dependabot or Renovate, like for any other package.

1. Run `update` with the new version: `npx aidev-instruct@latest update`, or bump the dev dependency first.
2. The CLI writes the new files, deletes files of removed items, and skips files changed by hand.
3. Review the diff, then commit the files, the config and the lock together.

Exit `0` after the install, `1` without a config or when a feed cannot be read.

### `status`

```text
aidev-instruct status
```

Prints the installed packs with the reason each is installed (`stack <name>`, `required by <pack>` or `config`), the installed targets, pending config changes, and files changed by hand. It also prints the release each feed is read at. It never writes.

Exit `0` always.

### `check`

```text
aidev-instruct check
```

Computes what `update` would do without writing: config entries not installed yet, files changed or deleted by hand, pack content that differs from the lock, and a feed release newer than the lock. Prints each change.

Exit `0` when everything matches, `1` when anything would change. Use it as a CI step with the CLI version pinned.

### `clean`

```text
aidev-instruct clean [--force] [--orig] [--dry-run]
```

Deletes every file the lock lists, removes the section an older version wrote into `AGENTS.md`, and deletes the lock. It keeps the config and `.aidev-instruct/`, so `update` restores everything. Files changed by hand are skipped unless `--force` or `--orig` is set.

Exit `0` after the clean, `1` or nothing to clean without a lock.

### `feeds`

```text
aidev-instruct feeds
aidev-instruct feeds add <name> <source> [--tokenEnv <variable>] [--dry-run]
aidev-instruct feeds remove <name> [--dry-run]
```

`feeds` prints each feed in the config with its source, its token variable and whether that variable is set, and the release the lock holds. It never prints a token.

`feeds add` accepts `github:<owner>/<repo>`, `https://github.com/<owner>/<repo>` (saved as `github:`) or a folder path. The name is kebab-case and not `official`. The variable name uses capital letters, digits and underscores. It reads the feed once before saving: `feed.json` must have the same name, and this CLI must be in its `cli` range. It installs nothing. A name already in the config replaces its source and token variable.

`feeds remove` fails while the config still lists packs or stacks from that feed, and names them.

Exit `0` after the change, `1` for an invalid name, an unreadable feed or a feed still in use.

### `feed init`

```text
aidev-instruct feed init <name>
```

Creates a feed layout in the current folder: `feed.json`, an example pack, `AGENTS.md`, `README.md`, `stacks/` and the two GitHub workflows. It writes nothing outside the current folder and never overwrites a file.

Exit `0` after writing, `1` when the name is invalid or any target file exists.

### `feed validate`

```text
aidev-instruct feed validate
```

Checks `feed.json`: a kebab-case `name`, a semantic `version` and a valid `cli` range. It checks every pack and stack like `bun run validate`, and fails a name that does not start with `<feed>-`. A feed pack may require an official pack such as `react`.

Output is one line per problem, then `No problems.` or the count. Exit `0` without problems, `1` with any.

### `feed release`

```text
aidev-instruct feed release [--bump <name>=<major|minor|patch>] [--dry-run]
```

Compares `packs/` and `stacks/` with the last `v*` tag, bumps each changed pack and stack, writes changelogs, sets the feed version in `feed.json` to the largest bump, commits `Release <version>` and tags `v<version>`. A repository without a tag tags the version in `feed.json` as it is.

Exit `0` after the release, `1` when nothing changed.

### `info`

```text
aidev-instruct info <pack or stack>
```

Prints one pack or stack from the official packs and every feed in the config, without writing. A pack shows its feed, description, tags, `latest`, versioned items, `requires`, `conflicts`, notes, authors and install command. A stack shows its feed, packs and install command.

Exit `0` when found, `1` for an unknown name, with the feeds it searched.

### `doctor`

```text
aidev-instruct doctor
```

Checks Node, the config, names from two feeds, the feeds and their tokens, the cache, the lock and the project's own items. Prints one line per check, `pass`, `warn` or `fail`, and a fix for every warning and failure. It never writes.

| Check | Fails when | Warns when |
| --- | --- | --- |
| Node | The version is below `engines.node` | |
| Config | The file is invalid or names an unknown target | |
| Names | One name comes from two feeds | |
| Feeds | A token variable is unset, the token cannot read the repository, the feed has no release, or its `cli` range excludes this CLI | GitHub is unreachable, so the cached release is used |
| Cache | A release the lock needs is not cached and GitHub cannot be reached | A release the lock needs is not cached |
| Lock | The config and the lock disagree | A file was changed by hand |
| Local items | An item in `.aidev-instruct/` is invalid | |

Exit `0` when no check fails, `1` when one does.

## Config File

`.aidev-instruct.json` holds what the project chooses:

```json
{
  "targets": ["copilot", "claude"],
  "feeds": [{ "name": "acme", "source": "github:acme/aidev-instruct", "tokenEnv": "ACME_FEED_TOKEN" }],
  "stacks": [{ "name": "react-router-spa", "path": "apps/web" }],
  "packs": [
    "docker",
    { "name": "react", "path": ["apps/web", "apps/admin"] },
    { "name": "csharp", "version": "14", "path": "legacy" },
    { "name": "csharp", "version": "15", "path": "apps" },
    { "name": "acme-api", "feed": "acme" }
  ],
  "exclude": ["tanstack-*"],
  "modified": "orig"
}
```

| Field | Meaning |
| --- | --- |
| `targets` | Tools to write files for |
| `feeds` | Private feeds: `name`, `source`, optional `tokenEnv` |
| `stacks`, `packs` | A name, or `{ "name": "...", "path": "apps/web" }`. `path` is one folder or a list, and applies to the packs of a stack too. An entry is identified by its name and version: the same identity merges its folders, and a different version adds a new entry. A pack entry also takes a technology `version` and an optional `feed` assertion |
| `exclude` | Item names, or `kind/name`, never installed. `*` matches within a name |
| `modified` | `keep` (default) or `orig`, for files changed by hand |

## Lock File

`.aidev-instruct.lock.json` records what is installed. Never edit it.

| Field | Meaning |
| --- | --- |
| `lockfileVersion` | `1` |
| `version` | The CLI version that wrote the files |
| `targets` | Targets installed |
| `packs` | Each installed pack: `requires`, `version`, `paths` when it does not cover the project, and `from` (`stacks`, `requiredBy`, `config`) |
| `feeds` | The release each GitHub feed is read at: `tag` and `commit` |
| `overrides` | Local items that replace a pack item, with the pack item's hash |
| `files` | Every file the CLI owns, with its pack and hash |

Every entity the CLI reads or writes, field by field, with what reads each one: [ENTITIES.md](ENTITIES.md).

## Local Items

`.aidev-instruct/rules/`, `skills/` and `agents/` hold the project's own items in pack format. An item with a pack item's kind and name replaces it, for every target. A local item takes `with` like a pack item. Commit the folder.

## Exclude

`exclude` drops items by name: rules, skills and agents, from a pack or from `.aidev-instruct/`.

```json
{ "exclude": ["tailwind-biome", "rules/tanstack-*", "agents/web-auditor"] }
```

- An entry is a name, or `kind/name` where `kind` is `rules`, `skills` or `agents`. Use the kind when a rule, a skill and an agent share a name.
- `*` matches any characters within one name segment: `tanstack-*` matches `tanstack-query` and its rule, skill and agent, and `rules/tanstack-*` matches only the rules.
- An entry that matches nothing is reported as unused.
- Any other prefix is an error: `Unknown exclude kind "packs". Use rules/, skills/ or agents.`

`exclude` never drops a pack, a stack or a folder. Use `remove` or `stacks remove` for a pack or a stack, and a `path` that leaves the folder out for a folder. It never edits a pack's `requires`, `conflicts` or `with` either: to drop an integration item such as `better-auth-drizzle`, remove `drizzle`.

## Files Changed by Hand

Each file is recorded with a hash. When an install would change or delete a file that no longer matches:

| `modified` | Result |
| --- | --- |
| `keep` (default) | The file stays, and the command reports it as skipped |
| `orig` | The version is saved as `<file>.orig` and the new version is written |

`--orig` applies `orig` for one run. `--force` writes the new version without keeping a copy. An existing `.orig` is never overwritten.

## Target Folders

Every target writes only to its own folders, whatever other targets are selected. A target that shares a folder, such as `codex` and `antigravity` in `.agents/skills`, writes each file there once.

<!-- generated:targets:start -->
| Target | Rules | Skills | Agents |
| --- | --- | --- | --- |
| `copilot` | `.github/instructions` | `.github/skills` | `.github/agents` |
| `claude` | `.claude/rules` | `.claude/skills` | `.claude/agents` |
| `cursor` | `.cursor/rules` | `.cursor/skills` | `.cursor/agents` |
| `codex` | `.agents/skills` | `.agents/skills` | `.codex/agents` |
| `antigravity` | `.agents/rules` | `.agents/skills` | `.agents/agents` |
| `kiro` | `.kiro/steering` | `.kiro/skills` | `.kiro/agents` |
| `devin` | `.devin/rules` | `.devin/skills` | `.devin/agents` |
<!-- generated:targets:end -->

Codex has no rules with file patterns, but it loads a skill when a task matches its description. Each rule becomes a `<rule>-rules` skill in `.agents/skills` whose description ends with the rule's file patterns.

## Feeds and Tokens

```json
{
  "feeds": [{ "name": "acme", "source": "github:acme/aidev-instruct", "tokenEnv": "ACME_FEED_TOKEN" }]
}
```

- `source` is `github:<owner>/<repo>` or a folder path. A folder path is read as it is, with no token and no release.
- `tokenEnv` is the name of an environment variable that holds a GitHub token, never the token. The CLI reads the variable each time it calls GitHub, sends the token only to `api.github.com`, and never writes it anywhere.
- A released feed is downloaded once per user and cached by commit under `AIDEV_INSTRUCT_CACHE`, or `~/.cache/aidev-instruct` when that variable is unset.
- Every pack and stack from a feed starts with `<feed>-`.
- A feed is read at the release the lock records. `update` moves it to the newer release, downloads it and writes the new files; `check` exits `1` while a newer release exists. A feed release needs no new CLI version.
- When GitHub cannot be reached, `update` uses the cache and prints a notice.

## Environment Variables

<!-- generated:env:start -->
| Variable | Read by | Does |
| --- | --- | --- |
| `NO_COLOR` | Every command | Turns color off when set, whatever its value |
| `FORCE_COLOR` | Every command | Turns color on when the output is not a terminal |
| `AIDEV_INSTRUCT_CACHE` | Every command that reads a feed | The cache root for downloaded releases, default `~/.cache/aidev-instruct` |
| The variable named by `tokenEnv` | `feeds add` and every command that reads a feed | The GitHub token for a private feed |
<!-- generated:env:end -->
