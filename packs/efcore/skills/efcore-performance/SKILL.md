---
name: efcore-performance
description: Finds and fixes slow EF Core data access on any relational provider. Covers measuring SQL, projections, N+1 queries, split queries, pagination, compiled queries and models, context pooling, set-based updates, bulk inserts, concurrency tokens and transactions. Use when a query or endpoint is slow, when writing queries over large tables or bulk writes, or when reviewing EF Core code for performance.
---

# EF Core Performance

## References

| File | Covers |
| --- | --- |
| [queries.md](references/queries.md) | Projections, loading related data, split queries, pagination, compiled queries, query shape |
| [writes.md](references/writes.md) | Change tracking cost, set-based updates, bulk inserts, concurrency, transactions |

Database plans, indexes and provider types belong to the provider and database packs.

## Workflow

1. Measure before changing code. Never tune a query without seeing its SQL and its plan.
2. Capture the SQL: `query.ToQueryString()` for one query, or the `Microsoft.EntityFrameworkCore.Database.Command` log category at `Information` in Development.
3. Count round trips per request. More than a handful for one endpoint usually means N+1.
4. Run the SQL through the database's plan tool against realistic data volumes. Look for full scans on large tables, row estimate errors and sorts spilling to disk.
5. Fix in this order: fetch less (projection, filter, `Take`), fewer round trips (`Include`, batching), better plan (index), then EF overhead (no tracking, compiled query, pooling).
6. Verify with the same measurement. Keep a benchmark or an integration test that guards the fix when the gain matters.

## Tag Queries

- `TagWith("Orders: list by customer")` adds a SQL comment, so slow queries in database statistics and logs trace back to code.
- Tag every query on a hot path.

## Common Findings

| Symptom | Cause | Fix |
| --- | --- | --- |
| One query per row in a loop | N+1 | `Include`, a projection with nested collection, or `Contains` on collected IDs |
| Huge result rows, duplicated parents | Several collection `Include`s in one query | `AsSplitQuery()` or a narrower projection |
| Whole entities loaded for a list screen | No projection | `Select` into a DTO |
| Slow deep pages | `Skip` with a large offset | Keyset pagination on an indexed column |
| Slow `SaveChanges` with many rows | Tracking thousands of entities | `ExecuteUpdateAsync`, `ExecuteDeleteAsync` or the provider's bulk copy |
| Query compiles on every call | Inline constants or a dynamic shape | Parameters instead of constants, or `EF.CompileAsyncQuery` |
| Index not used | Function or cast on the column | Rewrite the predicate or add an expression index |
| High memory per request | Tracking on read paths | `AsNoTracking()` or a projection |

## Context Overhead

- `AddDbContextPool<T>` reuses context instances. The context then has only a `DbContextOptions<T>` constructor and no per-request state in fields.
- Startup with very large models (hundreds of entity types): generate a compiled model with `dotnet ef dbcontext optimize` and regenerate it after every model change.
- Build-time generation of compiled models and precompiled queries is set with `EFScaffoldModelStage` and `EFPrecompileQueriesStage` (`build` or `publish`). `PublishAot` turns it on for publish. `EFOptimizeContext` no longer exists.
- Keep contexts short-lived. A long-lived context accumulates tracked entities and slows every `DetectChanges`.

## Review

Flag on review:

- Queries inside `foreach`, or navigation access in a loop over query results.
- `ToList()` or `AsEnumerable()` before `Where`, `Select` or `Count`, which moves work to the client.
- `Count() > 0` instead of `Any()`.
- Tracking queries on read-only paths.
- Unbounded list queries.
- Sync EF operators (`ToList`, `First`, `SaveChanges`) in async code.
- `FromSqlRaw` or `ExecuteSqlRaw` with string concatenation.
