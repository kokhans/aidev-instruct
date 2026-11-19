---
description: xUnit v3 on Microsoft.Testing.Platform for .NET test projects.
globs: ["**/*Tests/**/*.cs", "**/*Tests.cs", "**/*Tests.csproj", "**/testconfig.json", "**/xunit.runner.json", "**/global.json"]
---

# .NET Testing

## Runner

- Tests use xUnit v3: the `xunit.v3` package, latest stable, which runs on Microsoft.Testing.Platform (MTP) v2. Test projects set `OutputType` to `Exe`.
- `dotnet test` runs in MTP mode: `"test": { "runner": "Microsoft.Testing.Platform" }` in `global.json`. `TestingPlatformDotnetTestSupport` is the setting for older SDKs and is removed.
- `UseMicrosoftTestingPlatformRunner` `true`, so the test executable takes the MTP command line, the same options as `dotnet test`.
- Remove `Microsoft.NET.Test.Sdk` and `xunit.runner.visualstudio` once every IDE and CI agent runs MTP.
- `dotnet test` takes `--solution <file>.slnx`, `--project <file>.csproj` or `--test-modules <glob>`. A positional path names a project, never a solution.
- Filters are xUnit options: `--filter-class`, `--filter-method`, `--filter-namespace`, `--filter-trait`, `--filter-query`. VSTest `--filter` expressions do not apply.
- Coverage comes from `Microsoft.Testing.Extensions.CodeCoverage` with `--coverage`. TRX reports come from `--report-xunit-trx`.
- A module that runs zero tests exits with code 8, but `dotnet test` fails only when the whole run finds none. CI sets `--minimum-expected-tests` so a broken filter or discovery fails the run.
- Platform settings live in `testconfig.json` and xUnit settings in `xunit.runner.json`. `.runsettings` files do not apply.
- CI bounds a run with `--timeout` and `--maximum-failed-tests`, and keeps reports apart with `--results-directory-layout per-module`.

## Tests

- Every async call in a test gets `TestContext.Current.CancellationToken`.
- Async setup and teardown use `IAsyncLifetime`. Expensive shared resources use `IClassFixture<T>`, `ICollectionFixture<T>` or `[assembly: AssemblyFixture(typeof(T))]`.
- Tests run in parallel and in any order. No shared mutable static state.
- Time-dependent code is tested with `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing`, never real delays.
- Assertions use xUnit `Assert` unless the project already has an open-source assertion library.
