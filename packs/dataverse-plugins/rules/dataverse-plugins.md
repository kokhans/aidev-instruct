---
description: Dataverse plug-ins and custom workflow activities on .NET Framework 4.8 with C# 7.3, sandbox limits, pipeline stages and plug-in packages.
globs: ["**/*.cs", "**/*.csproj"]
---

# Dataverse Plug-Ins

## Target

- Plug-in and custom workflow activity assemblies target .NET Framework 4.6.2 to 4.8. New and rebuilt projects use `net48`. An assembly that targets .NET Core or a later .NET is never registered: Dataverse does not support it.
- `pac plugin init` writes an SDK-style project that already targets `net48` and references `Microsoft.CrmSdk.CoreAssemblies`, `Microsoft.PowerApps.MSBuild.Plugin` and `Microsoft.NETFramework.ReferenceAssemblies`. Never lower `TargetFramework`.
- Every .NET Framework target defaults to C# 7.3. Projects keep the default `LangVersion`: a newer language version than the target's default is unsupported.
- Projects reference `Microsoft.CrmSdk.CoreAssemblies`, plus `Microsoft.CrmSdk.Workflow` for workflow activities. The sandbox provides these assemblies, so they never ship.
- Code never depends on the `System.Text.Json` version it compiles against. The sandbox may load another one unless the package ships it.

## Packaging

- Dependencies ship in a plug-in package: a NuGet package that `pac plugin init` projects build on every build. Microsoft does not support ILMerge.
- Start with a plug-in package from day one. `pac plugin init --skip-signing` creates the project.
- Every project in a package is SDK-style and targets .NET Framework. Unmanaged code is not allowed.
- Signing is optional in a package. Once one assembly is signed, every assembly it depends on must be signed.
- A plain assembly registered without a package must be strong-name signed.
- Each assembly stays under 16 MB. Plug-in classes share one assembly until it nears that size.
- Custom workflow activities cannot use plug-in packages. They ship as signed single assemblies.
- A package's name and version never change after the first upload. An update that removes a type used by a step is rejected: unregister the step first.

## Code

- Plug-in classes are stateless. Dataverse caches one instance and runs it on many threads, so fields hold only constants and constructor configuration, never context, services or per-call data.
- Services come from the `IServiceProvider` passed to `Execute`, or from the `PluginBase` that `pac plugin init` generates. A codebase uses one of the two styles.
- Data access uses the `IOrganizationService` from `IOrganizationServiceFactory`. Never the Web API, never `ServiceClient`, never a second authentication.
- No threads, `Parallel`, `Task.Run` or fire-and-forget work. No `ExecuteMultipleRequest`, `ExecuteTransactionRequest` or bulk messages from plug-in code.
- Expected failures throw `InvalidPluginExecutionException` with a plain-text message. Other exceptions are caught, traced and rethrown as `InvalidPluginExecutionException`.
- `ITracingService.Trace` records what happened. Trace on errors and decisions, not on every loop iteration.
- `InputParameters["Target"]` is never replaced with an early-bound entity: that throws `SerializationException`.
- Outbound HTTP sets an explicit timeout and closes the connection (`HttpClient.Timeout`, `DefaultRequestHeaders.ConnectionClose = true`).

## Time

- A message operation, including every synchronous and asynchronous plug-in it triggers, must finish within 2 minutes. Past that, Dataverse throws `TimeoutException` and rolls the operation back.
- A synchronous plug-in takes at most 2 seconds. Longer work runs in an asynchronous PostOperation step or outside Dataverse.
- Retrieve only the columns needed. Pre and post images replace a `Retrieve` of the target record.

For registration, pipeline stages, images, bulk messages, packages and tests, use the `dataverse-plugin-development` skill.
