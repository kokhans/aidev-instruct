# Spec

## Backlog

| Prefix | Use |
| --- | --- |
| `FEAT` | A new or changed behavior of the CLI or the packs |
| `BUG` | Wrong behavior to fix |
| `CHORE` | Build, CI, release and dependencies, with no change in behavior |
| `DOCS` | Documentation only |

Items are listed in implementation order. Implemented items were removed on 2026-11-19; their behavior is documented in `README.md`, `docs/CLI.md`, `docs/FAQ.md`, `docs/DEVELOPMENT.md`, `docs/PUBLISHING.md` and `docs/PRIVATE_FEED.md`.

| Status | Meaning |
| --- | --- |
| Draft | Not approved; still being specified |
| New | Approved, not started |
| In Progress | Being implemented |
| Verification | Implemented, but need manual verification |
| Done | All acceptance criteria met, `bun run check` passes |

| Item | Title | Description | Status |
| --- | --- | --- | --- |
| [FEAT-28](#feat-28-feed-init-documentation) | Feed Init Documentation | Generate feed docs from templates, linked to the official docs | Draft |
| [CHORE-4](#chore-4-first-npm-publish) | First npm Publish | The npm name and the trusted publisher | Verification |
| [CHORE-5](#chore-5-release-workflow) | Release Workflow | Publishing through GitHub OIDC, no token | Verification |
| [FEAT-22](#feat-22-website) | Website | Vercel site at `aidev-instruct.dev` with a Builder | Draft |
| [BUG-1](#bug-1-exclude-the-projects-own-items) | Exclude the Project's Own Items | `exclude` skips the items in `.aidev-instruct/`, though both pages say it drops them | New |
| [BUG-2](#bug-2-agent-names-must-be-safe-file-names) | Agent Names Must Be Safe File Names | A frontmatter `name` with `..` writes outside the project | New |
| [BUG-3](#bug-3-lock-paths-must-stay-inside-the-project) | Lock Paths Must Stay Inside the Project | A hand-edited lock makes `clean --force` delete any file | New |
| [BUG-4](#bug-4-a-missing-feed-token-looks-like-an-offline-github) | A Missing Feed Token Looks Like an Offline GitHub | The cache fallback hides the unset token variable | New |
| [BUG-5](#bug-5-the-feed-cache-is-used-without-a-check) | The Feed Cache Is Used Without a Check | An interrupted download and a changed source both count as a cache hit | New |
| [BUG-6](#bug-6-right-the-remove-message) | Right the Remove Message | A pack kept by another config entry prints an empty reason | New |
| [DOCS-1](#docs-1-documentation-drift) | Documentation Drift | Five places disagree with the code or with each other | New |
| [DOCS-2](#docs-2-community-files) | Community Files | No security policy, contribution guide or templates | New |
| [FEAT-29](#feat-29-world-class-pack-content) | World-Class Pack Content | Rebuild every rule, skill and agent from current official sources | New |
| [FEAT-30](#feat-30-target-format-verification) | Target Format Verification | Check all seven target formats against the vendor docs | New |
| [FEAT-31](#feat-31-cross-feed-dependencies) | Cross-Feed Dependencies | Let a pack require a pack from another configured feed | New |
| [FEAT-32](#feat-32-pinned-feed-releases) | Pinned Feed Releases | Hold a feed at a release instead of always taking the latest | New |
| [FEAT-33](#feat-33-feed-request-hardening) | Feed Request Hardening | Timeouts, retries, rate limits, size limits and a verified download | New |
| [FEAT-34](#feat-34-config-and-manifest-schemas) | Config and Manifest Schemas | Ship JSON Schemas and reject unknown config fields | New |
| [FEAT-35](#feat-35-stricter-pack-validation) | Stricter Pack Validation | Close the format gaps the validator lets through | New |
| [FEAT-36](#feat-36-release-safety) | Release Safety | Refuse a dirty tree, commit only release files, keep the promised changelog | New |
| [FEAT-37](#feat-37-machine-readable-output) | Machine-Readable Output | Add `--json` and `--quiet` to the commands CI parses | New |
| [FEAT-38](#feat-38-explain-a-file) | Explain a File | `explain <file>` shows the pack and item that wrote it | New |
| [CHORE-6](#chore-6-toolchain-and-ci-hardening) | Toolchain and CI Hardening | Pin Bun, audit dependencies, scan workflows and keep one maintainer skill | New |

The items from BUG-1 to CHORE-6 come from a full review on 2026-11-20 of `src/`, `packs/`, `stacks/`, `docs/`, `.github/` and the generated output.

### FEAT-28: Feed Init Documentation

`feed init` writes an `AGENTS.md` with a short, inlined pack format. It does not link to the official pack format, naming rules or private feed guide, and it drifts from them. The content is also hardcoded in `feedFiles()`.

Decision:

- `feed init` writes `AGENTS.md` and `README.md` from the Mustache templates.
- Both link to the official docs at the exact CLI release:
  - `https://github.com/kokhans/aidev-instruct/blob/v<version>/AGENTS.md`
  - `https://github.com/kokhans/aidev-instruct/blob/v<version>/docs/PACK_NAMING.md`
  - `https://github.com/kokhans/aidev-instruct/blob/v<version>/docs/CLI.md`
  - `https://github.com/kokhans/aidev-instruct/blob/v<version>/docs/PRIVATE_FEED.md`
  A feed pins the CLI in `feed.json`, so the links match the format that release validates.
- `AGENTS.md` keeps only what is specific to a feed: the `<feed>-` prefix, `feed validate` before a pull request, the Release workflow, no hand-edited versions, and the writing style essentials. Everything else is a link.
- `README.md` has: what the repository is, add a pack, validate, release, use the feed, and the links.
- The example pack uses the required `tags` and a `latest` only if it has versioned items.
- The CI and release workflows stay templates, with `actions/checkout@v7`, `actions/setup-node@v7`, Node 24 and the exact CLI version.
- `docs/PRIVATE_FEED.md` shows the new `AGENTS.md` as a file table row, not a full copy.

Acceptance Criteria:

- `aidev-instruct feed init acme` writes `AGENTS.md` and `README.md` with links to the tag for the running CLI version, not to `main`.
- Every link returns 200 for a released tag.
- The generated `AGENTS.md` has one H1 and Title Case headings for the feed sections.
- `feed validate` passes in the generated feed.
- The packed CLI writes the same bytes as the source CLI.
- The templates are under `src/templates/feed/` and contain no business logic.

### CHORE-4: First npm Publish

A trusted publisher is set in the package's settings on npmjs.com, so the package must exist first. A maintainer publishes the first version by hand.

Checked 2026-11-18: `npm view aidev-instruct` answers HTTP 404, so the name is free, and `package.json` has the `repository` field that npm compares at publish time. Everything else needs the npm account, so the item stays In Progress.

Acceptance Criteria:

- `aidev-instruct` is free on npm, or another name is chosen and the README follows.
- `package.json` has `"repository": { "type": "git", "url": "git+https://github.com/kokhans/aidev-instruct.git" }`. npm rejects a trusted publish when `repository.url` does not match the repository exactly.
- From a clean checkout, after `bun run check` and `bun run build`: `npm publish --access public`.
- In the package's settings on npmjs.com, under Trusted publishing, a GitHub Actions publisher with organization or user `kokhans`, repository `aidev-instruct` and workflow filename `release.yml`. Fields are case-sensitive, and npm checks them only at publish time.
- Allowed actions include `npm publish`. Publishers created after 2026-09-03 allow only `npm stage publish` by default.
- The first release through CHORE-5 runs within 2 days, because an unused trusted publisher expires after 2 days.
- After that release succeeds: Publishing access is "Require two-factor authentication and disallow tokens", and every npm token used for the package is revoked.

### CHORE-5: Release Workflow

npm revoked classic tokens on 2025-12-09 and plans to stop publishing with tokens around January 2027. Releases use trusted publishing: npm trusts this one workflow through GitHub's OIDC, so no npm token is stored anywhere.

To release:

1. Run `bun run release` on `main` and push the commit and tag with `git push --follow-tags`.
2. Create a GitHub release from the tag, with generated release notes.
3. `release.yml` publishes to npm.

Acceptance Criteria:

- `.github/workflows/release.yml` runs when a release is published, on a GitHub-hosted runner (`ubuntu-latest`). npm does not support self-hosted runners for trusted publishing.
- It is a standalone workflow, not called through `workflow_call`, because npm checks the name of the calling workflow.
- It fails when the tag does not match `version` in `package.json`.
- The permissions are `contents: read` and `id-token: write`.
- `actions/setup-node` uses Node 24 and `registry-url: https://registry.npmjs.org`. Trusted publishing needs npm 11.5.1 or later and Node 22.14.0 or later, and Node 24 ships a recent enough npm.
- It runs `bun install --frozen-lockfile`, `bun run check`, `bun run build` and `npm publish`, with no `NODE_AUTH_TOKEN`.
- The published package shows provenance on npmjs.com. npm adds it without `--provenance` when the repository and the package are both public.

### FEAT-22: Website

`aidev-instruct.dev` is the public site for the packs and stacks in this repository. It is a static site on Vercel, built from the official `registry.json`, and it never calls the CLI at runtime.

| Page | Route | Shows |
| --- | --- | --- |
| Home | `/` | Search over packs and stacks, a tag filter and the Builder |
| Packs | `/packs` | Every pack with its `tags` and `latest` |
| Pack | `/packs/<name>` | Description, `version` and changelog, `latest`, versioned items such as `csharp-15`, `csharp-14` and `csharp-7-3`, requires, conflicts, notes, authors, the install command and a link to its folder on GitHub |
| Stacks | `/stacks` | Every stack with its packs |
| Stack | `/stacks/<name>` | Its packs with version pins such as `csharp@7.3`, and the install command |
| Builder | `/builder` | Targets, stacks, packs, folders and versions, with conflicts shown at once. It gives the `init -t ... -s ... -p ...` command, or a `.aidev-instruct.json` download when a folder or a version is set, because the flags cannot express those |
| FAQ | `/faq` | `docs/FAQ.md`, rendered at build time |
| Feeds | `/feeds` | How to create and use a private feed: `feed init`, releases, the `<feed>-` prefix and tokens, from `docs/PRIVATE_FEED.md` |
| Schemas | `/schemas/*.json` | JSON Schemas for `pack.json`, `feed.json`, stack files and the config. `init` writes `$schema` into the config, so editors complete and check fields |
| Contribute | `/contribute` | Adding a pack or stack through a pull request, the validation commands and the MIT default |

- `bun run registry` writes `registry.json` with every pack and stack, its items, versions and metadata. The build runs it first. The site reads only this file, `docs/FAQ.md` and `docs/PRIVATE_FEED.md`.
- The Builder imports the CLI resolver from `src/`, so conflict and version checks match the CLI. Private feeds stay out of the Builder, because the site cannot know a project's feeds; `/feeds` shows the config instead. Tags and `versionKind` come from `registry.json`.
- Search is a plain filter over names, descriptions and tags. About 100 packs need no search library.
- Built with our own `react-router-spa` stack plus `tailwind`, `shadcn-ui` and `seo`, so the site also tests those packs. `prerender` writes static HTML for every page, and the build writes `sitemap.xml` and `robots.txt`.
- Vercel deploys from its Git integration: a push to `main` deploys production, and a pull request gets a preview URL. There is no `pages.yml` and no `CNAME`.
- The Vercel project serves `aidev-instruct.dev` and redirects `www` to it. `.dev` requires HTTPS, and Vercel issues a managed certificate for both names.
- The build runs on Node 24, the same version CHORE-5 uses for release.
- `vercel.json` sets a long cache for hashed assets and security headers for every response:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

Acceptance Criteria:

- Every page in the table builds as static HTML at its route, with the content listed, plus `sitemap.xml` and `robots.txt`.
- The Builder reports conflicts through the CLI resolver before it shows a command, and gives the config download when a folder or a version is set.
- Vercel deploys `main` to production and every pull request to a preview, and serves `aidev-instruct.dev` with `www` redirected.
- `vercel.json` sets the headers above, and the build runs on Node 24.
- CI builds the site, and tests cover the registry reader and the Builder's use of the resolver.

### BUG-1: Exclude the Project's Own Items

`exclude` drops pack items but not items in `.aidev-instruct/`. `docs/CLI.md` and `docs/FAQ.md` say it drops both, so a local item cannot be dropped without deleting it.

Decision:

- `selectItems` applies `exclude` to the final list, after a local item replaces a pack item.
- An entry counts as used when it matches a pack item or a local item, so it is not reported as unused.
- `docs/CLI.md` and `docs/FAQ.md` keep their wording, which then matches.

Acceptance Criteria:

- `exclude: ["agents/web-auditor"]` drops a `web-auditor` agent from `.aidev-instruct/agents/`.
- A test covers a local item, a pack item and an entry that matches neither.

### BUG-2: Agent Names Must Be Safe File Names

`render` builds target paths from the `name` in an agent's frontmatter, not from its file name. An agent with `name: ../x` writes outside the project. `feed validate` does not run at install, so a feed can carry one, and a local item can too.

Decision:

- `readAgent` requires `name` to match the file name and a kebab-case pattern.
- Rule and skill names use the same pattern, so every rendered path stays inside its target folder.
- A bad name fails `update` before any file is written, and names the file.
- `render` resolves each output path and rejects one that leaves the project root.

Acceptance Criteria:

- A pack with an agent `name` containing `/`, `\` or `..` fails the command and writes nothing.
- A test renders into a temporary root and asserts that no path escapes it.

### BUG-3: Lock Paths Must Stay Inside the Project

`sync` reads `files` from the lock and deletes `join(root, path)` when the hash matches or `--force` is set. A lock edited by hand or in a pull request can name `../x`, and `clean --force` deletes it. The lock is committed, so a reviewed pull request is one path for this.

Decision:

- `readLock` rejects a `files` path that `normalizePath` rejects: absolute, a drive letter or `..`.
- `sync` compares every resolved path with `relative(root, full)` and refuses one that starts with `..` before it reads, writes or deletes.
- The error names the lock file and the path, and nothing is deleted in that run.

Acceptance Criteria:

- A lock with `"files": { "../x": ... }` fails `clean` and `update`, and the file outside the project stays.
- A test covers read, write and delete.

### BUG-4: A Missing Feed Token Looks Like an Offline GitHub

`resolveFeed` reads the token inside the `try` that falls back to the cache on any error. With `tokenEnv` unset and a cached release, `update` and `doctor` print "GitHub is unreachable" and use old files instead of naming the variable to set. `doctor` shows it as a warning, so a broken setup looks healthy.

Decision:

- The token is read before the network `try`, so a missing variable fails with its own message.
- The fallback catches network and HTTP errors only, and names the error it fell back from.
- `doctor` prints a failed `Feeds` check with the variable as the fix.

Acceptance Criteria:

- With the variable unset and a cached release, the command fails and names the variable.
- `doctor` exits 1 for an unset variable.

### BUG-5: The Feed Cache Is Used Without a Check

A release counts as cached when its folder exists. An interrupted download leaves a folder that every later run trusts, and a feed whose `source` changed still reads the previous repository's release until an `update` succeeds.

Decision:

- A release downloads into `<commit>.tmp-<pid>` and is renamed to `<commit>` after `feed.json` parses.
- A cache hit requires `feed.json` in the folder.
- The lock records the feed `source`. A different source ignores the cached release.
- The commit from the API must be 40 or 64 lowercase hex characters before it becomes a folder name.

Acceptance Criteria:

- An interrupted download leaves no usable cache, and the next run downloads again.
- Changing `source` never reads the old repository's files.
- A test covers an archive without `feed.json` and a commit that is not hex.

### BUG-6: Right the Remove Message

After `remove`, a pack that another entry in `packs` still lists prints `csharp stays installed: .`, because the reason list holds only stacks and `requiredBy`.

Decision:

- The reason list adds `config` when another entry still names the pack.
- With no reason the line is not printed.

Acceptance Criteria:

- Removing one of two `csharp` entries names the entry that keeps it.
- Removing both prints no `stays installed` line.

### DOCS-1: Documentation Drift

Five places disagree with the code or with each other. Each is a small fix, but a reader trusts the page and gets a wrong result.

| Page | Says | Code |
| --- | --- | --- |
| `docs/CLI.md`, `clean` | Removes a section an older version wrote into `AGENTS.md` | Writes and deletes the files in the lock only, and `AGENTS.md` says the CLI never touches that file |
| `docs/CLI.md`, Global Options | Lists `--dir`, `-h`, `-v` and `--dry-run` | Every command also accepts `--orig` and `--force` |
| `docs/PRIVATE_FEED.md` | A feed pack can require `"react"` | `feed validate` rejects a bare name for a pack with `latest` and asks for `react@>=19` |
| `docs/DEVELOPMENT.md`, Source Layout | A table of modules | The table omits `feeds`, `sync`, `validate`, `release`, `targets`, `items`, `packs`, `config` and `scope`, and names `docs` and `registry` only in the paragraph below it |
| `SPEC.md`, CHORE-4 | "The item stays In Progress" | The table says `Verification` |

Decision:

- Remove the `AGENTS.md` sentence from `clean`. The CLI never writes that file.
- Add `--orig` and `--force` to the global options table.
- Change the feed example to `"requires": ["react@>=19"]`, and say that a pack with `latest` is always required with a version.
- Name every module in `src/` in the Development table, or mark the table as a selection.
- Change the CHORE-4 sentence to `Verification`.
- Add a test that scans `docs/`, `README.md` and `SPEC.md` for an em dash, so the writing style holds outside packs.

Acceptance Criteria:

- No page names a `clean` behavior the code lacks.
- Every option every command accepts appears in `docs/CLI.md`.
- The `feed validate` example passes in a generated feed.
- The docs test fails on an em dash.

### DOCS-2: Community Files

The repository has no `SECURITY.md`, no `CONTRIBUTING.md` and no issue or pull request templates, so a vulnerability report has no private channel and a first contribution has no path.

Decision:

- `SECURITY.md` gives a private reporting channel and the supported versions.
- `CONTRIBUTING.md` points to `AGENTS.md` for packs and `docs/DEVELOPMENT.md` for code, and states the MIT default.
- Issue forms for a pack proposal and a bug, and a pull request template that lists `bun run validate`, `bun run docs` and `bun run check`.
- `.github/CODEOWNERS` names the maintainer for `packs/`, `stacks/` and `src/`.

Acceptance Criteria:

- A vulnerability can be reported privately without opening a public issue.
- A pull request shows the template, and the new issue page offers both forms.

### FEAT-29: World-Class Pack Content

The 94 packs hold 217 rules, 33 skills and 2 agents. They are good, but each was written at a different time from a different source, and nothing checks that a rule is the best current guidance for its technology. The goal is that a developer installing any pack gets the strongest available guidance, in the shape that costs the fewest tokens.

Decision:

- One pass per pack, in `requires` order, so a pack can link to a rule that already exists.
- Sources, in this order: the official documentation for the current stable version, the standard the technology implements (WCAG 2.2, OWASP ASVS, RFC 9110 and 9111, Core Web Vitals, ECMA-262), the package's release notes and migration guide, then the strongest community guidance. A blog post or a forum answer is not a source.
- Record every source URL and the date it was checked in the pack `CHANGELOG.md`, in the release that ships the change.
- A rule holds decisions and non-obvious constraints, at most 60 lines, with one H1. The main rule is named after the pack. Depth moves into a skill.
- A skill holds a workflow, a table or references, under 200 lines in `SKILL.md`, with `references/` for depth and a description that says when to load it.
- An agent has one recurring job, a read-only report and the smallest tool list that job needs. Add `security-reviewer` and `migration-planner`; keep `code-reviewer` and `web-auditor`.
- One owner per topic. Guidance lives in the most specific pack, and every other pack links to it instead of restating it.
- Versions come from the `pack-versions` skill. No `latest`, pin or range without a doc URL in the changelog.
- A deprecated API appears only in a line that forbids it.

Acceptance Criteria:

- Every pack has an unversioned main rule named after the pack, unless every statement depends on the version.
- Every rule is at most 60 lines, and every `SKILL.md` at most 200 with every reference linked from the skill.
- Every pack `CHANGELOG.md` lists the sources and dates for its current version.
- A read of the generated files for the seven targets finds one owner per topic and no contradiction.
- `bun run validate`, `bun run docs` and `bun run check` pass, and every stack installs in the sandbox without a conflict.

### FEAT-30: Target Format Verification

The CLI writes files for seven tools, and each tool changes its folders and frontmatter between releases. The formats rest on the manual checks in `docs/DEVELOPMENT.md`, and no page links the vendor documentation that defines them. The Codex agent `.toml`, the Kiro `fileMatchPattern` list, the Claude `.claude/rules` `paths` key and the Devin folders have no URL in the repository at all.

Decision:

- For every target, add a table to `docs/DEVELOPMENT.md` with the vendor documentation URL and the date it was checked, next to Manual Checks.
- Fix a folder, frontmatter key, skill layout or tool name the documentation does not support. Drop a kind for a target that has no project folder for it, and say so in `docs/CLI.md`.
- Add a target only when the vendor reads rules with file patterns, skills and agents from project folders.
- A test asserts that each target writes only inside its three folders.

Acceptance Criteria:

- The table lists a URL for all seven targets, checked within the last six months.
- Codex, Antigravity, Kiro and Devin have a confirmed folder and frontmatter for each kind.
- Every row of Manual Checks passes in the named tool.

### FEAT-31: Cross-Feed Dependencies

A feed pack can require official packs and packs from its own feed only. A company that splits guidance across two feeds, such as a platform feed and a team feed, cannot let one depend on the other, and `feed validate` rejects the name. The resolver already merges every configured feed, so only validation and the config shape stand in the way.

Decision:

- `feed.json` gains an optional `feeds` list of the feed names it may depend on, such as `["beta"]`.
- `requires`, `conflicts`, `with` and `packVersions` may name a pack whose prefix is one of those feeds or an official pack.
- The project config lists every feed the resolved packs need. Resolution fails before writing and names the missing feed.
- `feed validate` treats a listed feed's pack as an external dependency it cannot read, and reports it as a note. A name that matches no listed prefix is still an error.
- A feed cannot depend on itself. Names stay unique, and the existing origin check keeps one provider per name.
- `feed init --feed beta` writes the list, so a new feed starts with its dependency declared.
- `init` gains `--feeds <list>`, so a project can add feeds and packs in one command instead of `feeds add` creating a config that `init` then refuses.

Acceptance Criteria:

- A pack in `acme` requires `beta-api`. With both feeds configured, `update` installs both and the lock records both releases.
- Without the `beta` feed, the command fails and names `beta`.
- `feed validate` passes in both feeds and fails a name with no matching prefix.
- `doctor` fails a config that misses a feed a pack requires.

### FEAT-32: Pinned Feed Releases

`update` always takes the latest release of a feed. The lock records the release it used but cannot hold one back, so a team that needs a tested feed release has no way to stay on it.

Decision:

- A feed entry takes an optional `tag`, such as `{ "name": "acme", "source": "github:acme/aidev-instruct", "tag": "v1.2.0" }`.
- `feeds add --tag <tag>` sets it, and `feeds add --tag latest` clears it.
- With a `tag`, `update` and `check` read that release and ignore newer ones. A tag whose commit no longer matches is an error, not a notice.
- The lock records the tag, the commit and the source.

Acceptance Criteria:

- `update` with `tag: "v1.2.0"` installs that release while `v1.3.0` exists.
- Removing the tag moves the feed to the latest release on the next `update`.
- `status` prints the pinned tag.

### FEAT-33: Feed Request Hardening

Feed requests have no timeout, no retry and no size limit. A stalled response hangs `update`, a rate limit reads as a plain HTTP 403, and the archive is read into memory whole.

Decision:

- Every request has a 30 second timeout and is aborted after it.
- Network errors, `5xx` and `429` retry three times with backoff, and `429` honors `Retry-After`.
- `401`, `403` and `404` fail at once with a message that names the token variable, the rate limit and the repository.
- Requests send `X-GitHub-Api-Version`, so a GitHub default change cannot alter a response.
- An archive over 20 MB or with more than 5000 entries fails before extraction.
- The cache root follows `XDG_CACHE_HOME` before the default `~/.cache/aidev-instruct`.

Acceptance Criteria:

- A hanging response fails the command in about 30 seconds with a retry notice.
- A rate-limited response names the limit and the variable to set.
- A 30 MB archive fails with its size and writes nothing.

### FEAT-34: Config and Manifest Schemas

A typo in `.aidev-instruct.json`, such as `packages` for `packs`, is ignored and then dropped by the next write. Editors cannot complete a field or catch a wrong type.

Decision:

- Ship a JSON Schema for `pack.json`, `feed.json`, a stack file and `.aidev-instruct.json` under `docs/schemas/`, and serve them at `/schemas/*.json` as FEAT-22 plans.
- `init` writes `$schema` into the config, and the reader accepts it.
- The reader rejects an unknown field and names it, instead of dropping it on the next write.
- `bun run validate` names the schema for each manifest it rejects.

Acceptance Criteria:

- An editor validates the config and completes every field from the schema.
- `{"packages": []}` fails with a message naming `packages`.
- The four schemas pass a schema check in CI and match the reader.

### FEAT-35: Stricter Pack Validation

The validator misses format errors that the loader already rejects, or reports them badly, so `bun run validate` and an install disagree.

Decision:

- A pack needs at least one rule, skill or agent, as `docs/DEVELOPMENT.md` already says.
- `notes`, `requires` and `conflicts` must be lists in the validator too. Today a string is iterated character by character and reported as one unknown pack per character, while `loadPacks` rejects the same pack with one message. `tags` and `authors` are already checked.
- A config stack entry rejects `version`, which `requestsFor` ignores.
- An agent `tools` value is checked in both forms, comma-separated and a YAML list, and a read-only agent cannot list `Edit` or `Write` in either.
- A pack with a rule `x` and a skill `x-rules` fails, because Codex writes both to `.agents/skills/x-rules`.
- A skill file that is not text fails, because the renderer reads it as UTF-8 and would corrupt it.
- An invalid `pack.json` is reported as a problem for that pack, not as a stack trace for the whole run, and a pack folder with a symlink cycle fails instead of hanging.
- A stack file needs a `description` and at least one pack.

Acceptance Criteria:

- Each rule has a test with a fixture pack and a message that names the file and field.
- `bun run validate` on the shipped packs is unchanged.

### FEAT-36: Release Safety

`bun run release` and `feed release` run `git add -A` and commit everything in the working tree, including unrelated edits and generated files. They also write a changelog that `docs/PUBLISHING.md` and `docs/PRIVATE_FEED.md` describe as holding the subjects of the commits that touched the folder. `gitSource` already returns those subjects and nothing calls it.

Decision:

- Refuse to run with a dirty working tree unless `--allow-dirty` is passed.
- Stage only the manifests, changelogs and `package.json` the plan writes, never `git add -A`.
- Call the existing `ReleaseSource.commits` and add the subjects of the commits that touched each folder to its changelog entry, as both pages promise. Drop the method if that decision is reversed.
- Accept only a `v<semver>` tag, and keep the `package.json` check in `release.yml`.
- `release.yml` runs in an `npm` environment with a required reviewer.

Acceptance Criteria:

- An unrelated changed file is neither staged nor committed.
- A changelog entry holds the detected changes and the commit subjects.
- A dirty tree stops the command with a message that names `--allow-dirty`.

### FEAT-37: Machine-Readable Output

CI and the future website parse text written for people. A wording change breaks them, and `check` output is read by eye.

Decision:

- `--json` on `list`, `info`, `status`, `check`, `doctor`, `feeds` and `update`, with a stable shape and a `schemaVersion` field.
- Exit codes stay as they are, and text output stays the default.
- `--quiet` drops the project line and the notices, so a CI log holds the changes only.

Acceptance Criteria:

- `check --json` gives the changes and a `clean` flag.
- Text output with no flag is unchanged.
- The shapes are documented in `docs/CLI.md` and covered by a test.

### FEAT-38: Explain a File

A developer who opens a generated rule cannot tell which pack and item wrote it, which version, or why the pack is installed. The lock records the pack behind each file and why each pack is installed, but not the item, and nothing prints any of it.

Decision:

- `aidev-instruct explain <file>` prints the pack, the item, the target and the reason the pack is installed.
- The lock stores the pack and the hash of each file, not the item. `explain` re-renders the current selection to find the item, so the lock format does not change, and prints the pack alone with a note when the file is not in that render, such as a file left from an older pack version.
- `aidev-instruct explain --all` groups every locked file by pack.
- It never writes, and it fails on a file the lock does not own.

Acceptance Criteria:

- `explain .github/instructions/react.instructions.md` names `react`, the rule and `required by react-router`.
- A file left from an older pack version prints its pack and says the item is unknown.
- `explain --all` covers every entry in the lock and nothing else.

### CHORE-6: Toolchain and CI Hardening

The toolchain is not pinned, CI runs no dependency audit and no workflow scan, and the maintainer skill exists twice, byte for byte.

Decision:

- `package.json` pins `packageManager` to a Bun version, and CI uses that version.
- CI runs `bun audit`, `zizmor` on the workflows and CodeQL for the TypeScript sources.
- Actions are pinned by commit SHA with a version comment, and Dependabot keeps them current.
- Dependabot groups the weekly updates, so one pull request holds the routine bumps.
- Keep one copy of `.github/skills/pack-versions` or generate the other, and add a test that fails when the copies differ.

Acceptance Criteria:

- A fresh clone installs the same Bun version as CI.
- `bun audit` and `zizmor` run on every pull request.
- The maintainer skill exists once, or a test keeps the copies equal.
