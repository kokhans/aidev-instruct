---
description: Node.js toolchain setup and caching in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["node"]
---

# GitHub Actions for Node.js

- `actions/setup-node` reads the version from the project's file with `node-version-file` (`.nvmrc`, `.node-version` or `package.json`). Workflows do not repeat the version.
- npm caching is automatic when `packageManager` or `devEngines.packageManager` in `package.json` names npm. Yarn sets `cache: yarn`. Release and other privileged workflows set `package-manager-cache: false`.
- npm installs with `npm ci`, which fails when `package.json` and the lockfile disagree.
- `registry-url` is set only with a real `NODE_AUTH_TOKEN`, or with npm trusted publishing over OIDC for releases.
- A version matrix covers only the Node.js versions the package supports.
