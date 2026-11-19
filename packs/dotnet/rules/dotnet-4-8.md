---
description: Projects that target .NET Framework 4.8 (net48), such as Dataverse plug-ins, for the project file, language version, analyzers, missing APIs and packages.
globs: ["**/*.csproj", "**/*.props", "**/*.targets", "**/*.cs"]
version: "4.8"
---

# .NET Framework 4.8

## Project

- An SDK-style project with `<TargetFramework>net48</TargetFramework>`, built with the latest .NET SDK.
- Building `net48` needs no Windows targeting pack: the SDK restores the .NET Framework reference assemblies as NuGet packages, because `AutomaticallyUseReferenceAssemblyPackages` defaults to `true`.
- .NET Framework 4.8 follows the support lifecycle of the Windows version it runs on. 4.6.2 support ends on January 12, 2027, so projects on 4.6.2 to 4.7.2 move to 4.8.
- The language version is C# 7.3. No `LangVersion`, `Nullable` or `ImplicitUsings`: nullable reference types need C# 8, and implicit usings need C# 10 and .NET 6.
- `EnableNETAnalyzers` `true`, because the .NET code quality rules run by default only for .NET 5 and later.
- `NuGetAuditMode` `all`, because older targets default to `direct`.

## Missing APIs

| Missing | Use instead |
| --- | --- |
| `ArgumentNullException.ThrowIfNull` and the other throw helpers | `if (value == null) throw new ArgumentNullException(nameof(value));` |
| `DateOnly`, `TimeOnly` | `DateTime` with `.Date`, `TimeSpan` for a time of day |
| `System.Threading.Lock` | `lock` on a `private readonly object` |
| `TimeProvider` | `Microsoft.Bcl.TimeProvider` |
| `HashCode` | `Microsoft.Bcl.HashCode` |
| `Span<T>`, `Memory<T>` | `System.Memory` |
| `ValueTask` | `System.Threading.Tasks.Extensions` |
| `Channel<T>` | `System.Threading.Channels` |
| `System.Text.Json` | The `System.Text.Json` package |
| `IHttpClientFactory` | `Microsoft.Extensions.Http` |

## Packages

- The packages above and the `Microsoft.Extensions.*` packages still target .NET Framework 4.6.2 in their latest stable version.
- Every package adds assemblies that the host must load next to the project's own. Check that the host allows them before adding one.
- A package whose latest major drops .NET Framework stays on the last major that supports it, with a comment that names the reason.
