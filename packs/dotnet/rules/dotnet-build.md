---
description: .NET SDK pinning, .slnx solutions, shared MSBuild properties, analyzers and formatting, for every target framework.
globs: ["**/*.csproj", "**/*.props", "**/*.targets", "**/*.slnx", "**/*.sln", "**/*.slnf", "**/global.json", "**/.editorconfig", "**/.globalconfig"]
---

# .NET Build

## SDK

- Every project builds with the latest stable SDK, also when it targets an older framework. The target framework decides the language version and the APIs.
- `global.json` pins the full SDK `version`, such as `11.0.100`, with `rollForward` `latestFeature`. Developers and CI build with the same major and minor version.
- A repository that commits `packages.lock.json` uses `rollForward` `disable` instead, so an SDK update never changes the lock files unnoticed.
- `global.json` selects the test runner: `"test": { "runner": "Microsoft.Testing.Platform" }`.
- An upgrade moves `global.json`, every `TargetFramework` and the Microsoft package versions in one change.

## Solutions

- Solutions are `.slnx` files. `dotnet new sln` creates one.
- An existing `.sln` is converted with `dotnet sln <name>.sln migrate`. The `.sln` is deleted once `dotnet build` and `dotnet test` pass against the `.slnx`. Never keep both.
- Projects join a solution with `dotnet sln add`. Subsets use a solution filter: `dotnet new slnf --name <name>.slnf`, then `dotnet sln <name>.slnf add <project>`.

## Shared Properties

- `Directory.Build.props` holds what every project shares. A project file sets only what differs.
- `TreatWarningsAsErrors` `true`.
- `AnalysisLevel` `latest` and `AnalysisMode` `Recommended` turn on the .NET code quality rules.
- `EnforceCodeStyleInBuild` `true`, so `IDE` rules set in `.editorconfig` fail the build.
- `GenerateDocumentationFile` `true`. The build reports unused usings (`IDE0005`) only with it on. Add `CS1591` to `NoWarn` when public members need no XML docs.
- `.editorconfig` owns rule severities. Configuration that must apply everywhere goes in `.globalconfig`.
- Never silence a rule for a whole file with `#pragma`.
- `ContinuousIntegrationBuild` `true` when `CI` is `true`, for deterministic builds.
- No `LangVersion` and no preview features in shipping code.

## Commands

- `dotnet build` and `dotnet test` pass locally before a change is done.
- `dotnet format` fixes style. CI runs `dotnet format --verify-no-changes`.

For moving a repository to a new .NET version, use the `dotnet-upgrade` skill.
