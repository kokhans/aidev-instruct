---
name: dotnet-upgrade
description: "Moves a .NET repository to .NET 11 and its current tooling: SDK pin in global.json, target frameworks, Microsoft package versions, .sln to .slnx migration, shared MSBuild files, central package management, and VSTest or xUnit v2 to xUnit v3 on Microsoft.Testing.Platform. Use when upgrading the target framework or SDK, converting a solution to .slnx, introducing Directory.Build.props or Directory.Packages.props, or moving tests to Microsoft.Testing.Platform."
---

# .NET Upgrade

One upgrade is one change: SDK, target frameworks and Microsoft packages move together, and the build and tests pass before anything else changes.

## Workflow

1. Read the current state: `global.json`, every `TargetFramework` or `TargetFrameworks`, `LangVersion`, `Directory.Build.props`, `Directory.Packages.props`, `nuget.config`, the solution file and the test packages.
2. Confirm the SDK is installed with `dotnet --list-sdks`. .NET 11 ships with SDK `11.0.100`.
3. Set `global.json` to the new SDK. See [msbuild-files.md](references/msbuild-files.md) for the target shape of every shared file.
4. Move every project to `net11.0`. Prefer one `TargetFramework` in `Directory.Build.props` over a value per project. Libraries that multi-target keep their older frameworks. Projects that must stay on .NET Framework, such as Dataverse plug-ins, keep `net48`.
5. Remove `LangVersion` unless a preview feature is opted in on purpose.
6. Move `Microsoft.AspNetCore.*`, `Microsoft.EntityFrameworkCore.*` and `Microsoft.Extensions.*` packages to the matching major version. Remove every package reference that restore reports with `NU1510`: the shared framework already provides it.
7. Run `dotnet build`. Fix compiler breaking changes with the `csharp-15` skill, then new analyzer findings from `AnalysisLevel` `latest`.
8. Review the runtime and library breaking changes in the checklist below.
9. Convert the solution: `dotnet sln <name>.sln migrate`, build and test against the `.slnx`, then delete the `.sln` and update CI scripts and IDE settings that named it.
10. Move tests to xUnit v3 on Microsoft.Testing.Platform with [test-migration.md](references/test-migration.md).
11. Regenerate lock files with `dotnet restore --force-evaluate` when the repository commits `packages.lock.json`.
12. Run `dotnet build`, `dotnet test` and `dotnet format --verify-no-changes`. Update CI images and Dockerfiles to the new SDK and runtime tags.

## Breaking Changes to Check

| Area | Change |
| --- | --- |
| Hosting | `IHost.RunAsync` and `IHost.StopAsync` throw when a `BackgroundService` fails |
| Configuration | An empty string in a later configuration provider now overrides earlier providers |
| Dependency injection | Scope disposal aggregates exceptions |
| Packages | Some `Microsoft.Extensions` packages are part of the shared framework |
| Math | `Math.Round` and floating-point to `decimal` conversions are correctly rounded. Floating-point to small integer conversions saturate |
| Hardware | x86 and x64 need `x86-64-v2`. Arm64 ReadyToRun images target newer instruction sets and fall back to JIT on older CPUs |
| SDK | Restore no longer picks a higher version from the global packages folder |
| Compiler | `with(`, `union` and `closed` are contextual keywords, span collection expressions have a narrower safe context |

The full list lives at https://learn.microsoft.com/dotnet/core/compatibility/11, with ASP.NET Core and EF Core changes on their own pages.

## Done When

- `global.json`, every target framework and the Microsoft packages name the same .NET version.
- The repository has one `.slnx` and no `.sln`.
- `dotnet test` runs in Microsoft.Testing.Platform mode and every test module runs at least one test.
- The build has no new suppressions. Each remaining one has a justification.
