---
description: EF Core with PostgreSQL through Npgsql for provider setup, enums, timestamps, xmin concurrency, JSON, arrays and errors.
globs: ["**/*.cs"]
---

# EF Core with PostgreSQL

## Provider

- Provider is `Npgsql.EntityFrameworkCore.PostgreSQL`, on the same major version as EF Core. Never mix majors. EF Core moves to a new major only once a stable provider for it ships.
- `UseNpgsql(connectionString, npgsql => ...)` holds provider options: `MapEnum<T>()`, `EnableRetryOnFailure()`, `SetPostgresVersion()`.
- `SetPostgresVersion(major, minor)` is set when the server is older than the provider's default target, so EF never emits SQL the server lacks.
- An app that builds its own `NpgsqlDataSource` maps enums and plugins on the `NpgsqlDataSourceBuilder` and again in `UseNpgsql`.
- Npgsql pools connections. `Maximum Pool Size` times the number of app instances stays below the server's `max_connections`.

## Types

- `DateTimeOffset` and UTC `DateTime` map to `timestamptz`. Writing a `DateTime` of another kind or a non-zero offset throws.
- `timestamp` without time zone only holds wall-clock values that have no zone.
- .NET enums map to PostgreSQL enums with `MapEnum<T>("name")`. Adding a value needs a migration. Renaming one needs `ALTER TYPE ... RENAME VALUE` in the migration.
- Primitive collections (`string[]`, `List<int>`) map to PostgreSQL arrays. `Contains` translates to `= ANY(...)`.
- Complex types with `ToJson()` map to `jsonb`. Data that is queried, joined or constrained on its own belongs in columns, not JSON.
- Integer keys use identity columns, the Npgsql default.
- Case-insensitive lookups use a `citext` column or a nondeterministic collation, never `ToLower()` in queries.

## Concurrency

- The concurrency token is the PostgreSQL `xmin` system column: a `uint` property with `[Timestamp]`, or `IsRowVersion()`. No column is added.

## Errors

- A unique violation surfaces as `DbUpdateException` with an inner `PostgresException` whose `SqlState` is `PostgresErrorCodes.UniqueViolation`. Map it to 409.
- Foreign key violations use `PostgresErrorCodes.ForeignKeyViolation`. Match on `SqlState` and `ConstraintName`, never on message text.
- Retries come from `EnableRetryOnFailure()`, which retries transient Npgsql errors only.

## Queries

- Pattern search uses `EF.Functions.ILike` with an index that supports it. A leading wildcard needs a `pg_trgm` GIN index or full-text search.
- Raw SQL that LINQ cannot express (`ON CONFLICT`, `LATERAL`, window functions) goes through `FromSql`, `SqlQuery` or `ExecuteSqlAsync` with interpolated parameters.

## Testing

- Integration tests run on PostgreSQL from `Testcontainers.PostgreSql`, with the image tag on the production major version.

For indexes, JSON queries, full-text search, bulk `COPY` and upserts, use the `efcore-postgresql-features` skill.
