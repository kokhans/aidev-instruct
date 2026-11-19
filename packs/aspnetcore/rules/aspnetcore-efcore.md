---
description: ASP.NET Core with EF Core for endpoint data access, database health checks, concurrency errors and integration tests against a real database.
globs: ["**/*.cs"]
with: ["efcore"]
---

# ASP.NET Core with EF Core

## Endpoints

- Handlers inject the `DbContext` and pass the request `CancellationToken` to every async EF call.
- Read endpoints project straight to the response DTO with `Select`. They never load entities to map them.
- `DbUpdateConcurrencyException` becomes a 409 problem details response, from the handler or an `IExceptionHandler`.
- Unique constraint violations become 409. The database index is the guarantee, never a check before insert.

## Health

- Readiness checks the database with `AddDbContextCheck<T>()` from `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore`, tagged `ready`.
- Liveness never touches the database.

## Integration Tests

- Tests run against the production database engine in a container. Never the EF Core in-memory provider or SQLite as a stand-in.
- The fixture applies the real migrations once with `Database.MigrateAsync()`, so the suite also tests them.
- Tests seed through the API or a scoped context from `factory.Services.CreateScope()`. Tracked entities are never shared between the test and the app.
- Database state is asserted through a fresh context after the response.
- Each test creates rows with unique keys, or the fixture resets tables between tests with `Respawn`. Tests that reset a shared database run in one collection.
