---
description: Projects that target .NET 10 (net10.0) for the target framework, language version, project defaults and Microsoft package versions.
globs: ["**/*.csproj", "**/*.props", "**/*.targets"]
version: "10"
---

# .NET 10

- Projects target `net10.0`, set once in `Directory.Build.props`. .NET 10 is a Long Term Support release, supported until November 14, 2028.
- The default language version is C# 14. No `LangVersion`: C# 15 features need `net11.0`.
- `Directory.Build.props` sets `Nullable` `enable` and `ImplicitUsings` `enable`.
- `Microsoft.AspNetCore.*`, `Microsoft.EntityFrameworkCore.*` and `Microsoft.Extensions.*` packages use major version 10.
- `NuGetAuditMode` defaults to `all`.
- The project builds with the latest SDK. Only `TargetFramework` and the Microsoft package versions stay on 10.
