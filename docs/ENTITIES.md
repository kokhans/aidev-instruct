# Entities

Every file with a fixed shape: who writes it, which fields are required, and what reads each field. Use it to review a field before changing or removing it.

## Files

| File | Written by | Read by |
| --- | --- | --- |
| `packs/<pack>/pack.json` | Pack author, and `bun run release` for `version` | `loadPacks`, `validatePacks`, `registry` |
| `packs/<pack>/rules/<name>.md` | Pack author | `readRule`, `render` |
| `packs/<pack>/skills/<name>/SKILL.md` | Pack author | `readSkill`, `render` |
| `packs/<pack>/agents/<name>.md` | Pack author | `readAgent`, `render` |
| `stacks/<name>.json` | Maintainer, and `bun run release` for `version` | `loadStacks`, `requestsFor`, `registry` |
| `feed.json` | `feed init`, and `feed release` for `version` | `readFeedManifest`, `validateFeedManifest` |
| `.aidev-instruct.json` | `init`, `add`, `remove`, `stacks`, `targets`, or hand | `readConfig` |
| `.aidev-instruct.lock.json` | Every install and `clean` | `readLock`, `status`, `doctor` |
| `.aidev-instruct/` | The project | `listItems` with `local` as the pack name |
| `registry.json` | `bun run registry` | The website only, never the CLI |

## Pack

`packs/<name>/pack.json`. The folder name must equal `name`.

| Field | Type | Required | Default | Note |
| --- | --- | --- | --- | --- |
| `name` | string | yes | | `loadPacks` throws when it differs from the folder name |
| `description` | string | yes | `""` | The validator wants 10 characters or more; `list`, `info`, the registry and the website show it |
| `version` | string | yes | `""` | Semantic version; only a release writes it |
| `tags` | string[] | yes | `[]` | At least one, lowercase, a letter first, then letters, digits and dashes; the website filters by them |
| `authors` | string[] | no | `[]` | Shown by `info` and the website |
| `requires` | string[] | no | `[]` | `name` or `name@version`; a pack with `latest` is required with a version |
| `conflicts` | string[] | no | `[]` | Both packs list each other |
| `packVersions` | object | no | `{}` | Release version range of a pack in `requires`, such as `{"dotnet": ">=1.4.2"}` |
| `notes` | string[] | no | `[]` | Printed after the pack is installed for the first time; backticks must close |
| `latest` | string | no | none | The technology version a project gets when it names none; an exact version |

```json
{
  "name": "react",
  "description": "React 19 components, actions and effects.",
  "version": "1.0.0",
  "tags": ["react", "ui"],
  "requires": [],
  "conflicts": ["react-16"]
}
```

Unknown fields are ignored. There is no JSON Schema yet.

## Rule

`rules/<name>.md`. The file name is the item name, and it must be kebab-case.

| Field | Required | Default | Note |
| --- | --- | --- | --- |
| `description` | yes | | Written into each target's frontmatter |
| `globs` | no | `[]` | `[]` applies to every file; one glob per entry, no braces |
| `with` | no | `[]` | Packs that must be installed for the rule to apply |
| `version` | no | none | Exact `19` or a range such as `>=16 <20` |

The body has one H1, uses Title Case, and stays within 60 lines including the frontmatter. `with` and `version` are removed from the file the CLI writes.

## Skill

`skills/<name>/SKILL.md`. The frontmatter `name` must equal the folder.

| Field | Required | Default | Note |
| --- | --- | --- | --- |
| `name` | yes | | Kebab-case, equal to the folder name |
| `description` | yes | | Says what the skill does and when to load it, up to 1024 characters |
| `with` | no | `[]` | Packs that must be installed for the skill to apply |
| `version` | no | none | Exact or range, as on a rule |

`SKILL.md` stays within 200 lines. Other files in the folder are references, linked from `SKILL.md`, one level deep.

## Agent

`agents/<name>.md`. The frontmatter `name` must equal the file name.

| Field | Required | Default | Note |
| --- | --- | --- | --- |
| `name` | yes | | Kebab-case, equal to the file name |
| `description` | yes | | Says the recurring job |
| `tools` | no | `[]` | Comma-separated Claude Code names: `Read`, `Grep`, `Glob`, `Bash`, `Edit`, `Write`, `WebFetch`, `WebSearch` |
| `readonly` | no | `false` | A read-only agent cannot list `Edit` or `Write` |
| `with` | no | `[]` | Packs that must be installed for the agent to apply |
| `version` | no | none | Exact or range, as on a rule |

Each target maps the Claude Code tool names. A tool the target has no equivalent for is dropped, and a name with no mapping fails the render.

## Stack

`stacks/<name>.json`. The file name is the stack name.

| Field | Required | Default | Note |
| --- | --- | --- | --- |
| `name` | yes | | Must equal the file name |
| `description` | yes | `""` | The registry and the website show it; the validator does not check it yet |
| `version` | yes | `""` | Semantic version; only a release writes it |
| `packs` | yes | `[]` | Entries are `name` or `name@version`; the validator does not require one yet |

```json
{
  "name": "nextjs-spa",
  "description": "Next.js as a single-page app.",
  "version": "1.0.0",
  "packs": ["nextjs-spa"]
}
```

## Feed

`feed.json` at the root of a feed repository.

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| `name` | string | yes | Kebab-case; must equal the name in the project config |
| `version` | string | yes | Semantic version, set by `feed release`; a project installs the git tag, not this field |
| `cli` | string | yes | A range such as `>=0.1.0`; a CLI outside it refuses the feed |

## Config

`.aidev-instruct.json`.

| Field | Type | Default | Note |
| --- | --- | --- | --- |
| `targets` | string[] | `copilot`, `claude`, `cursor` | Any of the seven target ids |
| `feeds` | object[] | `[]` | `name`, `source`, and an optional `tokenEnv` |
| `stacks` | entry[] | `[]` | A stack name, or an entry with folders |
| `packs` | entry[] | `[]` | A pack ref, or an entry with folders and a version |
| `exclude` | string[] | `[]` | A name, or `kind/name`; `*` matches within a name |
| `modified` | string | `keep` | `keep` or `orig` |

An entry is a string, or an object with these fields:

| Field | Type | Default | Note |
| --- | --- | --- | --- |
| `name` | string | | The pack or stack, or `name@version` in a string entry |
| `path` | string or string[] | whole project | Must stay inside the project |
| `version` | string | none | Technology version; beats a `requires` pin |
| `feed` | string | none | Asserts the feed the item comes from |

Unknown fields are ignored today and dropped on the next write.

## Lock

`.aidev-instruct.lock.json`. The CLI writes it and `clean` deletes it. Never edit it.

| Field | Note |
| --- | --- |
| `lockfileVersion` | `1`; `readLock` rejects any other value |
| `version` | The CLI version that wrote the files; `status` compares it |
| `targets` | The targets that were installed |
| `packs` | One entry per installed pack, keyed by name |
| `feeds` | The release each GitHub feed was read at, keyed by feed name |
| `overrides` | Local items that replace a pack item, keyed by `kind/name` |
| `files` | Every file the CLI owns, keyed by path |

| Nested entry | Fields | Note |
| --- | --- | --- |
| `packs.<name>` | `requires`, `paths`, `version`, `from` | `paths` is written only when the pack does not cover the project; `from` holds `stacks`, `requiredBy` and `config` |
| `feeds.<name>` | `tag`, `commit` | `update` reads the release at `commit` and warns when a tag moves |
| `overrides.<kind>/<name>` | `pack`, `hash` | The pack item the local item replaces, and its hash at the last install |
| `files.<path>` | `pack`, `hash` | The pack behind the file and the hash of the content written |

## Registry

`registry.json` is generated for the website by `bun run registry`, and the CLI never reads it.

| Field | Note |
| --- | --- |
| `packs[]` | `name`, `description`, `version`, `tags`, `authors`, `latest`, `requires`, `conflicts`, `notes`, and `items[]` with `kind`, `name`, `with`, and `version` with `versionKind` of `exact` or `range` |
| `stacks[]` | `name`, `description`, `version` and `packs` |

## Fields Worth Reviewing

Fields that are written more often than they are read.

| Field | Where | Why it is a candidate |
| --- | --- | --- |
| `requires` | `lock.packs` | Written by `sync` and checked by `readLock`, then never read. The manifests answer the same question |
| `from` | `lock.packs` | Read only by `status`, and it can be rebuilt from the config and the manifests |
| `version` | `feed.json` | Only validated and rewritten by `feed release`; the git tag decides what installs |
| `authors` | `pack.json` | Read only by `info` and the website |
| `notes` | `pack.json` | Printed only when a pack is installed for the first time |
| `modified` | config | Two values, and `--orig` and `--force` already cover a single run |
| `registry.json` | repository root | Generated, and only the website reads it |
