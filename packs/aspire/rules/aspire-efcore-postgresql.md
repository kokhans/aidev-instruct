---
description: "PostgreSQL with EF Core in Aspire: the AppHost resource and the Npgsql EF Core client integration."
globs: ["**/*.cs"]
with: ["efcore-postgresql"]
---

# Aspire with EF Core and PostgreSQL

- The AppHost adds `AddPostgres("postgres").WithDataVolume()` and a database with `.AddDatabase("appdb")` from `Aspire.Hosting.PostgreSQL`. Services reference the database, not the server.
- The container image tag matches the production PostgreSQL major version.
- Services use `Aspire.Npgsql.EntityFrameworkCore.PostgreSQL`: `builder.AddNpgsqlDbContext<AppDbContext>("appdb")`. The name matches the database resource.
- A context that needs `UseNpgsql` options such as `MapEnum<T>()` is registered with `AddDbContextPool<T>` and `UseNpgsql(builder.Configuration.GetConnectionString("appdb"), ...)`, then `builder.EnrichNpgsqlDbContext<AppDbContext>()`.
- Integration settings live under `Aspire:Npgsql:EntityFrameworkCore:PostgreSQL`. `DisableRetry` turns off the integration's retries when the context configures its own.
- Each context type gets its own `AddNpgsqlDbContext<T>("name")` and resolves by type. Per-context settings live under `Aspire:Npgsql:EntityFrameworkCore:PostgreSQL:<ContextTypeName>`.
