---
description: sqlc with PostgreSQL and pgx v5, covering driver settings, pools, nullable and UUID types, arrays, batches, COPY and error codes.
globs: ["**/*.sql", "**/sqlc.yaml", "**/sqlc.yml", "**/sqlc.json", "**/*.go"]
with: ["postgresql"]
---

# `sqlc` with PostgreSQL

## Driver

- `gen.go` sets `sql_package: "pgx/v5"`. `database/sql` with `lib/pq` is not used for new code.
- Applications share one `*pgxpool.Pool` from `pgxpool.New(ctx, url)`, created in `main` and closed on shutdown. Pool size is set with `pool_max_conns` in the URL or `MaxConns`, sized against the server's connection limit.
- `pgxpool.New` does not connect. Startup calls `pool.Ping(ctx)` to fail fast.
- Transactions use `pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error { ... queries.WithTx(tx) ... })`, which commits on `nil` and rolls back on error.
- `:one` queries return `pgx.ErrNoRows` when nothing matches. Callers check it with `errors.Is`.

## Types

- `emit_pointers_for_null_types: true` maps nullable text, integer and boolean columns to Go pointers instead of `pgtype.*` wrappers.
- With `pgx/v5`, sqlc generates `pgtype.Timestamptz` and `pgtype.UUID` even for `NOT NULL` columns, and that option does not change them. Overrides map them to `time.Time` and the standard library `uuid.UUID` (Go 1.27), with pointers for nullable columns. pgx v5 encodes and scans `uuid.UUID` through its `[16]byte` underlying type:

```yaml
overrides:
  - db_type: "pg_catalog.timestamptz"
    go_type: { import: "time", type: "Time" }
  - db_type: "pg_catalog.timestamptz"
    nullable: true
    go_type: { import: "time", type: "Time", pointer: true }
  - db_type: "uuid"
    go_type: { import: "uuid", type: "UUID" }
  - db_type: "uuid"
    nullable: true
    go_type: { import: "uuid", type: "UUID", pointer: true }
```

- Money and exact decimals stay `numeric` (generated as `pgtype.Numeric`), never `float8` or `float64`.
- `jsonb` columns with a known shape map to a Go struct through a `column` override.
- PostgreSQL enums generate a string type with constants. `emit_enum_valid_method: true` adds `Valid()` for input checks.

## Queries

- Lists of values pass as one array: `WHERE id = ANY(@ids::bigint[])`. `sqlc.slice` is for engines without array parameters and is not used with PostgreSQL.
- Optional filters cast the nullable parameter: `WHERE (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))`.
- Writes that need the stored row use `RETURNING` with `:one` instead of a second query.
- Bulk inserts use `:copyfrom`, which runs PostgreSQL `COPY`. Many small statements in one round trip use `:batchexec`, `:batchone` or `:batchmany`.

## Errors

- Constraint violations are read with `errors.AsType[*pgconn.PgError](err)` and matched on `Code` (`23505` unique, `23503` foreign key) and `ConstraintName`, then translated to application errors.
