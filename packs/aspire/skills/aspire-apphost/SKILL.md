---
name: aspire-apphost
description: Adds Aspire to a .NET solution and maintains the AppHost. Covers aspire init, the file-based and project AppHost forms, modeling projects, containers, databases and parameters, service defaults, startup order, the dashboard and CLI inspection, agent setup, and deployment with aspire publish and aspire deploy to Docker Compose, Kubernetes, Azure Container Apps or App Service. Use when introducing Aspire, adding a resource or integration, debugging local orchestration, or preparing a deployment.
---

# Aspire AppHost

## Adding Aspire

1. Install the CLI from aspire.dev and run `aspire doctor`.
2. Run `aspire init` at the repository root. With a `.slnx` or `.sln` it creates a project AppHost and adds it to the solution. Without one it creates a file-based `apphost.cs`. Both get an `aspire.config.json`.
3. Add a service defaults project when the AppHost has none: `dotnet new aspire-servicedefaults -n <App>.ServiceDefaults`. Reference it from every service and call `builder.AddServiceDefaults()` and `app.MapDefaultEndpoints()`.
4. Model each service with `AddDotnetProject("api", "../Api/Api.csproj")` from `Aspire.Hosting.Dotnet`. It takes a project file, a folder with one project, or a file-based `.cs` app, in both AppHost forms. `AddProject<Projects.Api>` is deprecated.
5. Add infrastructure with `aspire add <integration>` and wire it with `WithReference` and `WaitFor`.
6. Replace hard-coded connection strings and URLs in services with client integrations or `ConnectionStrings:<name>` reads.
7. Run `aspire run` and check every resource reaches `Running` or `Finished` in the dashboard.

`aspire agent init` configures the Aspire plugin for GitHub Copilot, Claude Code or OpenCode. MCP configuration is opt-in.

Aspire needs .NET 10 or later for the AppHost. A project AppHost uses `Microsoft.NET.Sdk` with package references to `Aspire.Hosting.AppHost` and `Aspire.Hosting.Dotnet`. `Aspire.AppHost.Sdk` is obsolete (ASPIRE012): move off it when the AppHost is touched.

## Modeling

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var apiKey = builder.AddParameter("payments-api-key", secret: true);

var postgres = builder.AddPostgres("postgres").WithDataVolume();
var db = postgres.AddDatabase("appdb");
var cache = builder.AddRedis("cache");

var api = builder.AddDotnetProject("api", "../Api/Api.csproj")
    .WithReference(db).WaitFor(db)
    .WithReference(cache).WaitFor(cache)
    .WithEnvironment("Payments__ApiKey", apiKey)
    .WithExternalHttpEndpoints();

builder.Build().Run();
```

- Containers without an integration use `AddContainer("name", "image", "tag")` with explicit endpoints.
- `WithEnvironment` passes plain settings. Secrets always come from parameters.
- Frontends and other languages use their hosting integrations, such as `AddViteApp`, and receive service URLs through `WithReference`.
- `WithComputeEnvironment` picks a target when the AppHost declares more than one compute environment.

## Startup Order

| Need                                    | API                   |
| --------------------------------------- | --------------------- |
| Start after a dependency is healthy     | `WaitFor`             |
| Start after a job finishes successfully | `WaitForCompletion`   |
| Connection details only, no ordering    | `WithReference` alone |

Health of a dependency comes from its integration's health checks. A service that waits forever usually references a resource whose health check fails: check it in the dashboard.

## Inspecting a Run

- The dashboard shows resources, logs, traces and metrics. Telemetry from services appears only when they call `AddServiceDefaults()`.
- `aspire describe` lists resources and their state, `aspire logs` streams logs, `aspire otel` reads logs, traces and spans.
- `aspire resource` runs a resource command, such as `restart`, without stopping the AppHost.
- `aspire stop` ends a background run started with `aspire start`.

## Deployment

- A deployment target is a compute environment resource in the AppHost, added through its hosting integration:

| Target                   | Package                                                       |
| ------------------------ | ------------------------------------------------------------- |
| Docker Compose           | `Aspire.Hosting.Docker`, `AddDockerComposeEnvironment("env")` |
| Kubernetes               | `Aspire.Hosting.Kubernetes`                                   |
| Azure Container Apps     | `Aspire.Hosting.Azure.AppContainers`                          |
| Azure Kubernetes Service | `Aspire.Hosting.Azure.Kubernetes`                             |
| Azure App Service        | `Aspire.Hosting.Azure.AppService`                             |

- `--environment` selects the run environment such as `Staging` or `Production`, separate from the compute environment.
- Infrastructure changes go through `ConfigureInfrastructure` or publisher callbacks in the AppHost. Generated files are overwritten on the next publish.
- Jobs that run once, such as migrations, publish as jobs: `PublishAsAzureContainerAppJob()` on Azure Container Apps.

## Review

Flag on review:

- Connection strings, ports or URLs hard-coded in services or in `appsettings.json` when the AppHost provides them.
- Secrets passed as literal strings to `WithEnvironment`.
- `WaitFor` on a migration job instead of `WaitForCompletion`.
- Mixed `Aspire.*` package versions.
- `AddProject<T>` or `Aspire.AppHost.Sdk` in new AppHost code.
- `MapDefaultEndpoints()` changed to expose health endpoints outside Development without access rules.
