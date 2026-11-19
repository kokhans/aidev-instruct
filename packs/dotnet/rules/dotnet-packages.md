---
description: "NuGet for .NET projects: central package management, auditing, lock files and package sources."
globs: ["**/*.csproj", "**/Directory.Packages.props", "**/Directory.Build.props", "**/packages.lock.json", "**/nuget.config", "**/NuGet.config", "**/NuGet.Config"]
---

# .NET Packages

## Central Package Management

- `ManagePackageVersionsCentrally` `true` in `Directory.Packages.props`, `PackageVersion` items there, and `PackageReference` items without `Version`.
- `CentralPackageTransitivePinningEnabled` `true`, so a central version also wins for transitive dependencies. A library that ships as a package checks the extra dependencies `dotnet pack` then adds to its `.nuspec`.
- `VersionOverride` only with a comment that says why the project differs.
- `GlobalPackageReference` in `Directory.Packages.props` for analyzers and build tools every project uses.

## Auditing

- `NuGetAuditMode` is `all`, which audits transitive packages. It is the default from `net10.0`. Projects on older targets set it, and none lowers it to `direct`.
- With `TreatWarningsAsErrors`, a known vulnerability (`NU1901` to `NU1904`) fails the build.
- A vulnerable transitive package is fixed by updating the closest direct package first, then by pinning the fixed version centrally.
- `NuGetAuditSuppress` only for an advisory reviewed as not applicable, with the advisory URL and a comment.

## Lock Files and Sources

- `RestorePackagesWithLockFile` `true` for applications. CI restores with `--locked-mode`.
- `nuget.config` starts with `<clear />` in `packageSources`. With more than one feed, `packageSourceMapping` maps every package pattern to one source.
- Package sources set a minimum publish age, so `dotnet package add` and `dotnet package update` skip versions published in the last day: `dotnet nuget update source <name> --min-publish-age-hours 24`.

## Commands

- `dotnet package add <id>` and `dotnet package update <id>` instead of editing versions by hand.
- `dotnet package list --vulnerable --include-transitive` and `dotnet package list --outdated` for dependency reviews.
- `dotnet package update --vulnerable` moves vulnerable packages to the first fixed version.
- `dotnet nuget why <id>` shows which direct package pulls in a transitive one.
