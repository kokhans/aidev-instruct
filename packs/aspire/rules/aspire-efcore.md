---
description: EF Core migrations and DbContext registration in an Aspire AppHost and its services.
globs: ["**/*.cs"]
with: ["efcore"]
---

# Aspire with EF Core

## Migrations

- Services never call `Database.MigrateAsync()` at startup. A dedicated resource applies migrations and other services wait for it.
- Stable pattern: a worker project that runs `MigrateAsync` inside the execution strategy, then calls `IHostApplicationLifetime.StopApplication()`. The AppHost references the database from it, and every service that uses the database adds `WaitForCompletion(migrations)`.
- One migration worker per database.
- A migration bundle published as a container runs as a job, not a long-running service: `PublishAsAzureContainerAppJob()` on Azure Container Apps.

## Registration

- Services register the context through the provider's Aspire client integration with the AppHost database resource name.
- Contexts that need provider options the integration cannot set are registered the standard way, then enriched with the integration's `Enrich...DbContext<T>()`.
- The integration's health check reports the database in `/health`. Remove a duplicate `AddDbContextCheck<T>()` for the same context.
