---
description: Projects that target .NET 11 (net11.0) for the target framework, language version, project defaults, Microsoft package versions and shared framework packages.
globs: ["**/*.csproj", "**/*.props", "**/*.targets"]
version: "11"
---

# .NET 11

- Projects target `net11.0`, set once in `Directory.Build.props`. .NET 11 is a Standard Term Support release, supported until November 14, 2028.
- The default language version is C# 15. No `LangVersion`.
- `Directory.Build.props` sets `Nullable` `enable` and `ImplicitUsings` `enable`.
- `Microsoft.AspNetCore.*`, `Microsoft.EntityFrameworkCore.*` and `Microsoft.Extensions.*` packages use major version 11.
- .NET 11 moves some `Microsoft.Extensions.*` libraries into the shared framework. Restore reports an explicit reference to one as `NU1510`: remove it. A project that also targets an older framework keeps it.
- `NuGetAuditMode` defaults to `all`.
- x86 and x64 hosts need the `x86-64-v2` instruction set. Older CPUs fail at startup.
