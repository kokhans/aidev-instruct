# Test Migration

## From `xunit` v2 to `xunit.v3`

1. Test projects target `net8.0` or later. .NET Framework test projects target 4.7.2 or later.
2. Replace `xunit` with `xunit.v3` and `xunit.assert` with `xunit.v3.assert`. Remove `xunit.abstractions`. Keep `xunit.analyzers`.
3. Set `OutputType` to `Exe`: v3 test projects are executables.
4. Change `async void` tests to return `Task` or `ValueTask`. v3 fails them at run time.
5. `IAsyncLifetime` now returns `ValueTask` and inherits `IAsyncDisposable`. xUnit calls only `DisposeAsync` when a type implements both disposal interfaces.
6. `ITestOutputHelper` lives in the `Xunit` namespace.
7. `CollectionBehavior`, `TestCaseOrderer`, `TestCollectionOrderer` and `TestFramework` take a `typeof(...)` instead of name strings.
8. Pass `TestContext.Current.CancellationToken` to async calls. The `xUnit1051` analyzer reports the missing ones.

## VSTest to Microsoft.Testing.Platform

1. Add `"test": { "runner": "Microsoft.Testing.Platform" }` to `global.json`.
2. Remove `TestingPlatformDotnetTestSupport`, `TestingPlatformCaptureOutput` and `TestingPlatformShowTestsFailure`.
3. Set `UseMicrosoftTestingPlatformRunner` `true` for test projects.
4. Rewrite `dotnet test` calls:

| VSTest mode | MTP mode |
| --- | --- |
| `dotnet test MyApp.sln` | `dotnet test --solution MyApp.slnx` |
| `dotnet test Tests.csproj` | `dotnet test --project Tests.csproj` |
| `dotnet test path/Tests.dll` | `dotnet test --test-modules path/Tests.dll` |
| `dotnet test -- --report-xunit-trx` | `dotnet test --report-xunit-trx` |
| `--filter "FullyQualifiedName~Orders"` | `--filter-class`, `--filter-method` or `--filter-query` |
| `--collect "XPlat Code Coverage"` with Coverlet | `--coverage` with `Microsoft.Testing.Extensions.CodeCoverage` |
| `--logger trx` | `--report-xunit-trx` |
| `.runsettings` | `testconfig.json` and `xunit.runner.json` |

5. Replace `coverlet.collector`, a VSTest data collector, with `Microsoft.Testing.Extensions.CodeCoverage`.
6. Remove `Microsoft.NET.Test.Sdk` and `xunit.runner.visualstudio` once every IDE and CI agent runs MTP.
7. Run `dotnet test`. Exit code 8 on a module means it ran zero tests: fix discovery or filters. Add `--minimum-expected-tests` in CI, because the run as a whole still passes when only some modules are empty.
