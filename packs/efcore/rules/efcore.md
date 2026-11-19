---
description: EF Core context lifetime, modeling, queries, writes, concurrency and migrations, for any database provider.
globs: ["**/*.cs"]
---

# EF Core

## Context

- `AddDbContextPool<T>` registers the context. It is scoped: never a singleton, never shared across threads or parallel awaits.
- Singletons and background services create short-lived contexts from `IDbContextFactory<T>`.
- Code uses the `DbContext` directly. `DbSet<T>` already is the repository: no generic repository over it.
- No lazy loading. Never `UseLazyLoadingProxies`.
- The provider's retrying execution strategy is on. Explicit transactions then run inside `Database.CreateExecutionStrategy().ExecuteAsync`.
- `EnableSensitiveDataLogging` and `EnableDetailedErrors` only in Development.

## Modeling

- Values without identity map as complex types: `ComplexProperty`, `ComplexCollection`, and `ToJson()` for a JSON column. Owned entity types only in existing models.
- Primitive collections are configured with `PrimitiveCollection`, never `Property`.
- Keys set in code use `Guid.CreateVersion7()`, which keeps index inserts ordered.

## Reads

- Read queries project to DTOs with `Select`. A projection needs no `Include` and is never tracked.
- Queries that return entities for reading use `AsNoTracking()`.
- Never query inside a loop. Load related rows in one query with `Include`, a projection or `ids.Contains(x.Id)`.
- `AsSplitQuery()` when a query includes more than one collection navigation.
- Every list query is bounded with `Take`. Deep pages use keyset pagination, not large `Skip` values.
- Async operators with the `CancellationToken`: `ToListAsync(ct)`, `FirstOrDefaultAsync(ct)`, `AnyAsync(ct)`.
- Stream with `AsAsyncEnumerable()`, never `ToAsyncEnumerable()`.
- Raw SQL uses `FromSql`, `SqlQuery` or `ExecuteSqlAsync` with interpolated parameters. Never `FromSqlRaw` with concatenated input.
- Soft delete and tenancy use named query filters: `HasQueryFilter("SoftDelete", ...)`, bypassed per query with `IgnoreQueryFilters(["SoftDelete"])`.

## Writes

- One `SaveChangesAsync` per unit of work. It already runs in a transaction.
- Set-based changes use `ExecuteUpdateAsync` and `ExecuteDeleteAsync`. They skip the change tracker and run immediately.
- Rows edited concurrently carry a concurrency token. `DbUpdateConcurrencyException` becomes a 409 or a reload and retry, never a silent overwrite.
- Timestamps are stored as UTC: `DateTimeOffset` with a zero offset, or `DateTime` of kind `Utc`.

## Migrations

- Every model change gets `dotnet ef migrations add <Name>`. Review the generated code and its SQL before committing.
- A migration applied to a shared database is never edited. Add a new one.
- A merge conflict on the latest migration ID in the model snapshot means two branches added migrations. Remove one and regenerate it on top of the other.
- Production applies migrations with `dotnet ef migrations script --idempotent` or a `dotnet ef migrations bundle`, not `Database.MigrateAsync()` at app startup.
- The startup project references `Microsoft.EntityFrameworkCore.Design` directly with `PrivateAssets` `all`. `.config/dotnet-ef.json` holds the default `project`, `startupProject` and `context`.
- Seed data with `UseSeeding` and `UseAsyncSeeding`, or `HasData` for fixed reference rows.

## Testing

- Integration tests run on the production database engine. Never the in-memory provider, or SQLite as a stand-in for another engine.

For query tuning, bulk writes, compiled queries and concurrency, use the `efcore-performance` skill.
