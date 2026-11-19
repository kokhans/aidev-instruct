---
description: .NET SDK setup, NuGet caching and test runs in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["dotnet"]
---

# GitHub Actions for .NET

- `actions/setup-dotnet` installs the SDK from `global-json-file: global.json`. Workflows do not repeat the version.
- NuGet caching uses `cache: true`, which needs committed `packages.lock.json` files. `cache-dependency-path` points to them when they are not in the root.
- Restore runs with `dotnet restore --locked-mode`, then build and test with `--no-restore`.
- `DOTNET_CLI_TELEMETRY_OPTOUT` and `DOTNET_NOLOGO` are set at workflow level.
- Test results and coverage files are uploaded as artifacts with `if: failure()` or `always()`.
