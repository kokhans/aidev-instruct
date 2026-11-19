# Private Feed

How a company ships its own packs and stacks to its projects. A feed is read by `feeds add` and every `update`, managed with the `feeds` command and created with `feed init`, `feed validate` and `feed release`. For every command and option, see [CLI.md](CLI.md).

## How It Works

A private feed is a normal GitHub repository, such as `acme/aidev-instruct`, with the same layout as the `aidev-instruct` repository. Nothing else is needed: no server, no build output, no NuGet or npm package.

| Who | Does |
| --- | --- |
| Feed maintainers | Change packs through pull requests, merge to `main`, and run the Release workflow when they decide to publish. A release is a git tag plus a GitHub release. |
| Projects | Add the feed once with `feeds add`. Every `update` installs the packs of the feed's latest release. |
| The company's GitHub admins | Give read access to the repository to the people and CI systems that use the feed, like for any private repository. |

```text
acme/aidev-instruct (private)                 a project
  pull request -> main                           .aidev-instruct.json: feed "acme"
  Release workflow -> tag v1.3.0                 aidev-instruct update
                      GitHub release v1.3.0  ->    reads the latest release with the token
                                                   writes acme-api rules, skills, agents
```

Official packs work differently:

| | Official packs | Private feed packs |
| --- | --- | --- |
| Where they live | Inside the npm package | In the company's GitHub repository |
| What decides the version | The CLI version | The feed's latest GitHub release |
| How new versions arrive | A new CLI release | The feed maintainers run the Release workflow |
| Names | `react`, `zod` | Always `<feed>-<name>`, such as `acme-api` |
| Token | None | The developer's own GitHub token, read from an environment variable |

## Create the Feed

1. Create an empty private repository, such as `acme/aidev-instruct`, and clone it.
2. In the clone, run:

```bash
npx aidev-instruct@latest feed init acme
```

3. Commit and push. `feed init` writes:

| File | Content |
| --- | --- |
| `feed.json` | `{ "name": "acme", "version": "1.0.0", "cli": ">=0.8.0" }` |
| `packs/acme-example/` | One example pack with one rule. Rename or delete it. |
| `stacks/` | Empty. Stack files go here. |
| `AGENTS.md` | The pack format, naming and writing style, so the company's own AI tools write packs correctly |
| `README.md` | How to add a pack, release, and use the feed |
| `.github/workflows/ci.yml` | Runs `feed validate` on every pull request |
| `.github/workflows/release.yml` | Run by hand: versions, tags and creates the GitHub release |

`feed.json`:

| Field | Meaning |
| --- | --- |
| `name` | The feed name. Every pack and stack name starts with `acme-`, so it never clashes with an official pack or another feed. |
| `version` | The feed release. `feed release` sets it. |
| `cli` | The CLI versions the feed supports. A CLI below that range stops with a message. |

A feed pack can require official packs, such as `"requires": ["react"]`. A project that installs `acme-react` gets `react` from the CLI.

## Change Packs

The same flow as any repository:

1. Create a branch, add or change files under `packs/` and `stacks/`.
2. Run `npx aidev-instruct@0.8.0 feed validate` locally, or let CI run it on the pull request.
3. Merge to `main`.

Merged changes reach no project until the next release.

## Release

When the maintainers decide to publish, they open the Actions tab of the repository, choose Release, and click Run workflow. It runs `feed release`, which:

1. Finds the last `v*` tag and compares `packs/` and `stacks/` with it.
2. Bumps each changed pack and stack:

| Change since the last tag | Bump |
| --- | --- |
| A rule, skill, reference or agent is deleted or renamed, `requires` changes, `conflicts` gains a pack, or `packVersions` gains a pack or narrows a range, or a stack loses a pack | major |
| A rule, skill, reference, agent or integration is added, `notes` or `latest` change, `packVersions` loses a pack or widens a range, or a stack gains a pack | minor |
| Only text, `description`, `tags` or `authors` change | patch |
| A new pack or stack | 1.0.0 |

3. Writes `CHANGELOG.md` for each changed pack and `stacks/CHANGELOG.md`, from the changes and the commit subjects.
4. Sets `version` in `feed.json` to the largest bump, commits `Release 1.3.0`, and tags `v1.3.0`.

The workflow then pushes the commit and the tag, and creates the GitHub release `v1.3.0`. From that moment, `update` in a project installs it.

- `feed release --dry-run` shows the plan without changing anything.
- `--bump acme-api=major` raises a bump when a text change reverses guidance, which the command cannot detect.
- The first release, with no `v*` tag yet, tags the version in `feed.json` as it is: `v1.0.0`.
- With nothing changed since the last tag, `feed release` exits 1 and the workflow stops.
- A release can also be made locally: `feed release`, then `git push --follow-tags`, then create the GitHub release from the tag.

`release.yml`, as `feed init` writes it:

```yaml
name: Release
on:
  workflow_dispatch:
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - name: Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          npx aidev-instruct@<version> feed release
          git push --follow-tags
          gh release create "$(git describe --tags --abbrev=0)" --generate-notes
```

- `fetch-depth: 0` fetches the tags, so `feed release` finds the last one.
- With branch protection on `main`, the workflow needs a GitHub App token that may push, instead of `github.token`.

## Compatibility

- `feed.json`'s `cli` range is the fence. A CLI that does not satisfy it refuses the feed with both versions.
- A feed is read at its latest release only. A release that raises the floor hides older releases a running CLI could have used; there is no fallback, so raise the floor only when the feed needs the newer CLI.
- Official packs ship inside the CLI. A pack that depends on a specific release version of an official pack declares `packVersions`, such as `{"dotnet": ">=1.4.2"}`, and resolution fails when the CLI ships an older one.
- Feed packs follow the same technology-version rules as official packs: a pack with `latest` is required with a pin or a range, and `feed validate` checks it against the `latest` of the official packs in the CLI. A range that excludes that `latest` fails.
- `conflicts` may name official packs one-sidedly; the official pack cannot list a private name. Overlapping folders are refused, and separate `--path` folders are allowed.
- A pack cannot `requires` a pack from another feed. Keep dependent packs in one feed; cross-feed packs are planned.

## Use the Feed in a Project

```bash
aidev-instruct feeds add acme github:acme/aidev-instruct --tokenEnv ACME_FEED_TOKEN
aidev-instruct add acme-api
```

`feeds add` checks that the repository can be read and has a release, then saves:

```json
{
  "feeds": [
    { "name": "acme", "source": "github:acme/aidev-instruct", "tokenEnv": "ACME_FEED_TOKEN" }
  ]
}
```

- `github:acme/aidev-instruct` is not a URL anyone can open. It names the repository. The CLI calls the GitHub API with the token to find the latest release and download it.
- `update` installs a newer release when there is one. `check` exits 1 when the feed has a newer release than the lock.
- The lock records the release tag and its commit, so every developer installs the same files until the next `update`.

## Tokens

The feed repository is private, so GitHub answers only requests with a token of someone who can read it.

| Question | Answer |
| --- | --- |
| What is `tokenEnv`? | The name of an environment variable, such as `ACME_FEED_TOKEN`. The config is committed, so it holds only the name, never the token. |
| Who uses the token? | The CLI. Each time it calls GitHub for this feed, it reads the variable and sends the token to `api.github.com`. It never writes the token anywhere. |
| Whose token is it? | Each developer's own. GitHub checks that this person can read `acme/aidev-instruct`. |
| Who manages access? | The company's GitHub admins, through repository or team access. Removing someone from the team stops their feed access. Nobody hands out tokens. |
| Which token works? | A fine-grained personal access token with Contents: Read on the repository, or the GitHub CLI's token. |

Setting the variable:

| Where | How |
| --- | --- |
| Developer with the GitHub CLI | `export ACME_FEED_TOKEN=$(gh auth token)` in `~/.bashrc` or `~/.zshrc` |
| Developer on PowerShell | `$env:ACME_FEED_TOKEN = gh auth token` in the PowerShell profile |
| Developer without the GitHub CLI | Create a fine-grained token on GitHub with Contents: Read on `acme/aidev-instruct`, and set the variable to it |
| GitHub Actions in another repository | The built-in `github.token` cannot read another private repository. Use a GitHub App installed on the feed repository and `actions/create-github-app-token`, or an organization secret with a fine-grained token, and set `ACME_FEED_TOKEN` from it on the step that runs the CLI. |

- When the variable is not set, the CLI stops and names the variable. `doctor` reports it too.
- The CLI does not read `.env` files.

## Test Locally

A feed can be used from a folder, with no release and no token:

```bash
cd ~/src/acme-aidev-instruct
npx aidev-instruct@0.8.0 feed validate
npx aidev-instruct@0.8.0 feed release --dry-run

cd ~/src/some-project
npx aidev-instruct@0.8.0 feeds add acme ../acme-aidev-instruct
npx aidev-instruct@0.8.0 add acme-api
```

A folder source reads the files as they are in the folder, including changes that are not committed.
