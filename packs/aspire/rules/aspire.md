---
description: Aspire AppHost resources, service defaults, client integrations, parameters, local runs with the aspire CLI and deployment.
globs: ["**/*.cs", "**/*.csproj", "**/aspire.config.json", "**/apphost.run.json"]
---

# Aspire

## AppHost

- The AppHost describes resources and their relationships in code. It holds no app logic and is never deployed itself.
- Keep the existing AppHost form: `apphost.cs` file-based or an `AppHost.csproj` project. Never convert one into the other unasked.
- Hosting packages (`Aspire.Hosting.*`) go in the AppHost only. `aspire add <integration>` adds them.
- .NET projects join with `AddDotnetProject("name", "<path>")`. `AddProject<T>` and the `Aspire.AppHost.Sdk` project SDK are deprecated.
- Resource names are short, lowercase and stable. Services read connections by those names.
- `WithReference(resource)` injects connection details and service discovery. Never hard-code URLs or connection strings between resources.
- `WaitFor(resource)` delays start until a dependency is healthy. `WaitForCompletion(resource)` waits for a resource that runs to completion, such as a migration job.
- Data stores that keep data across runs use `WithDataVolume()`.
- `WithExternalHttpEndpoints()` only on resources that users or other systems reach from outside.

## Parameters and Secrets

- Secrets are `AddParameter("name", secret: true)` and are set with `aspire secret` or user secrets. Never literal values in the AppHost.
- Deployment supplies parameter values through the environment (`Parameters__name`) or the deployment tool.

## Service Defaults

- Every service project calls `builder.AddServiceDefaults()`. It configures OpenTelemetry, default health checks, service discovery and HttpClient resilience.
- The service defaults project holds only that shared extension code, never models or business logic.
- `app.MapDefaultEndpoints()` maps `/health` and `/alive` in Development only. Production health endpoints are mapped by the app with their own exposure rules.
- Telemetry goes out over OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, which the AppHost and deployment targets provide.

## Client Integrations

- Services use client packages (`Aspire.*`, such as `Aspire.Npgsql`) with `builder.Add...("name")`. The name matches the AppHost resource.
- Client integrations add health checks, retries and telemetry. Their settings live under `Aspire:<Integration>` in configuration.
- An app that must configure the client itself registers it the standard way and calls the integration's `Enrich...` method when one exists.

## Running

- `aspire run` starts the AppHost and the dashboard. `aspire start` runs it in the background, `aspire stop` stops it.
- `aspire describe` and `aspire logs` inspect a running AppHost from the terminal.
- `aspire doctor` checks the environment when a run fails before any resource starts.

For setup, deployment targets and the workflow to add Aspire to an existing solution, use the `aspire-apphost` skill.
