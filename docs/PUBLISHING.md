# Publishing

The npm package and the release pipeline. How a company ships its own packs: [PRIVATE_FEED.md](PRIVATE_FEED.md). Every command and option: [CLI.md](CLI.md). Nothing is published yet.

## What Is Published

One npm package, `aidev-instruct`. Packs and stacks are inside it.

| Published | Content |
| --- | --- |
| `dist/cli.js` | The CLI, built from `src/` into one file for Node |
| `packs/` | Every pack: `pack.json`, rules, skills, agents and `CHANGELOG.md` |
| `stacks/` | Every stack file and `CHANGELOG.md` |
| `package.json`, `README.md`, `LICENSE` | Added by npm to every package |

Not published: `src/`, `test/`, `scripts/`, `docs/` and `sandbox/`. `files` in `package.json` decides this.

- The CLI has no runtime dependencies. Installing it adds one package.
- For official packs, one CLI version always writes the same files, because its packs are inside it. `aidev-instruct 0.6.0` with the same config gives the same result on every machine.
- A pack change reaches users only through a new CLI release.

## How a Release Happens

Nobody writes versions or change files by hand. A script compares the repository with the last release tag and decides.

| Step | Who | What |
| --- | --- | --- |
| 1. Change | Contributor | A pull request changes packs, stacks or `src/`. |
| 2. CI | `ci.yml` | Runs `bun run check` on Ubuntu, Windows and macOS, and runs the packed CLI on Node 22, 24 and 26. |
| 3. Merge | Maintainer | Merges to `main`. Nothing is published yet. Changes collect until the next release. |
| 4. Plan | Maintainer | `bun run release --dry-run` prints every pack and stack that changed since the last `v*` tag, with its new version. |
| 5. Release commit | Maintainer | `bun run release` bumps the versions, writes the changelogs, sets the CLI version, commits `Release 0.7.0`, and tags `v0.7.0`. Then `git push --follow-tags`. |
| 6. GitHub release | Maintainer | Creates a release from the tag, with generated release notes. |
| 7. Publish | `release.yml` | Checks that the tag matches `package.json`, runs `bun run check` and `bun run build`, then `npm publish`. |

### How the Script Picks a Version

`bun run release` diffs `packs/` and `stacks/` between the last tag and `main`:

| Change since the last tag | Pack bump | Stack bump |
| --- | --- | --- |
| A rule, skill, reference or agent is deleted or renamed. `requires` changes. `conflicts` gains a pack. `packVersions` gains a pack or narrows a range. | major | |
| A pack is removed from the stack | | major |
| A rule, skill, reference, agent, versioned item or `with` integration is added. `notes` or `latest` change. `packVersions` loses a pack or widens a range. | minor | |
| A pack is added to the stack | | minor |
| Only the text of existing files, `description`, `tags` or `authors` change | patch | patch |
| A new pack or stack | 1.0.0 | 1.0.0 |

```text
$ bun run release --dry-run
Changes since v0.6.0:
  react             1.4.2 -> 1.5.0  minor  added skill react-forms
  zod               2.0.1 -> 2.0.2  patch  rules/zod.md changed
  react-router-spa  1.1.0 -> 2.0.0  major  removed pack responsive
CLI               0.6.0 -> 0.7.0  (largest pack or stack bump)
```

- The CLI gets the largest pack or stack bump, and a patch bump when only `src/` changed. `--cli <bump>` raises it.
- The script cannot see guidance reversed in plain text. `--bump react=major` raises a bump. Overrides never lower one.
- Each changelog entry is the change the script found plus the subjects of the commits that touched the folder.

### Publishing Without a Token

Step 7 uses npm trusted publishing:

- npm trusts only `release.yml` in `kokhans/aidev-instruct`, through GitHub's OIDC. No npm token is stored anywhere.
- npm adds provenance, so npmjs.com shows which commit and workflow built each version.
- The first version is published by hand once, because a trusted publisher can only be set on a package that exists.
