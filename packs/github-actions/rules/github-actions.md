---
description: GitHub Actions workflow security, dependency pinning, triggers, caching and concurrency.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/.github/workflows/actions.lock", "**/action.yml", "**/action.yaml", "**/.github/dependabot.yml"]
---

# GitHub Actions

## Permissions

- Every workflow sets `permissions: contents: read` at the top. Jobs that need more raise only what they use, such as `pull-requests: write` or `packages: write`.
- The repository default for `GITHUB_TOKEN` is read-only.
- `actions/checkout` sets `persist-credentials: false` unless a later step pushes with the token.

## Action Dependencies

- Repositories lock workflow dependencies in `.github/workflows/actions.lock`, generated with the `gh actions-lock` CLI extension and never edited by hand. The lockfile pins every action and its transitive actions, and satisfies the full-SHA pinning policy.
- Without a lockfile, every action is pinned to a full commit SHA from the action's own repository, with the version in a comment: `uses: owner/action@<sha> # v4.2.0`.
- Reusable workflows called through `jobs.<id>.uses` are not covered by the lockfile and are pinned to a full commit SHA in both cases.
- Dependabot updates the `github-actions` ecosystem. It regenerates matching lockfile entries in the same pull request.
- `.github/workflows/` is in `CODEOWNERS`.

## Untrusted Input

- Event data that a user controls (titles, bodies, branch names, commit messages) never appears as `${{ }}` inside `run`. It goes through `env:` and is read as `"$VAR"`.
- `pull_request_target` and `workflow_run` are avoided. When needed, they never check out or run pull request code, and use `workflow_run` to separate the privileged half.
- Artifacts from other workflows are treated as untrusted input.
- Public repositories never use self-hosted runners for pull requests.

## Secrets and Cloud Access

- Cloud access uses OIDC with `permissions: id-token: write` on the deploying job, and a federated credential scoped to the repository and environment. No long-lived cloud keys in secrets.
- Deploy jobs use an `environment` with protection rules, and secrets live in that environment.
- Values derived from secrets are masked with `::add-mask::`. Secrets are never stored as one JSON blob.

## Speed

- `actions/cache` keys use `hashFiles` on lockfiles, with `restore-keys` from most to least specific.
- Low-trust triggers (`pull_request_target`, `issue_comment`, `workflow_run`) keep their default read-only `cache-mode`, so they cannot poison the default branch cache. Workflows never set `cache-mode: write` or `write-only` on them.
- Release workflows set `cache-mode: none`.
- Pull request workflows set `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }`. Deploy workflows use a fixed group with `cancel-in-progress: false`.
- Every job sets `timeout-minutes`.

## Checks

- `actionlint` and `zizmor` lint workflow files in CI.
