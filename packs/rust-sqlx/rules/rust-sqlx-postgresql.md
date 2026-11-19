---
description: SQLx with PostgreSQL for pool sizing, arrays, bulk writes, enums, JSONB, type mapping, error codes and LISTEN/NOTIFY.
globs: ["**/*.rs", "**/migrations/*.sql"]
with: ["postgresql"]
---

# SQLx With PostgreSQL

## Connections

- `PgPoolOptions::new().max_connections(n)`. `n` times the number of instances stays below the server's `max_connections` minus other clients.
- `PgConnectOptions` builds the connection from parts when the URL would need escaping. `options()` values are escaped by SQLx since 0.9.

## Queries

- Parameters are `$1`, `$2`. A list filter is `WHERE id = ANY($1)` bound to a slice (`&ids[..]`), never a generated `IN (...)`. `NOT IN` is `!= ALL($1)`, not `!= ANY($1)`.
- Bulk inserts bind one array per column: `INSERT INTO t (a, b) SELECT * FROM UNNEST($1::text[], $2::int8[])`. The casts are required because `UNNEST` is generic.
- Generated values come back through `RETURNING`. Upserts use `ON CONFLICT ... DO UPDATE`.
- A parameter whose type inference fails gets an explicit cast in SQL (`$1::uuid`) or `value as _` in the macro arguments.

## Types

| PostgreSQL | Rust |
| --- | --- |
| `uuid` | `uuid::Uuid` (feature `uuid`) |
| `timestamptz` | `chrono::DateTime<Utc>` or `time::OffsetDateTime` |
| `jsonb` | `sqlx::types::Json<T>` (feature `json`) |
| `numeric` | `rust_decimal::Decimal` or `bigdecimal::BigDecimal` |
| `text[]`, `int8[]` | `Vec<String>`, `Vec<i64>` |
| enum type | `#[derive(sqlx::Type)]` with `#[sqlx(type_name = "status", rename_all = "snake_case")]` |

- Newtypes with `#[derive(sqlx::Type)]` get `PgHasArrayType` generated in 0.9. A manual impl is deleted, or the derive takes `#[sqlx(no_pg_array)]`.
- `chrono` and `time` are never both enabled.

## Errors

- `DatabaseError::code()` returns the SQLSTATE. The application maps `23505` (unique) and `23503` (foreign key) to its own conflict errors, and retries `40001` (serialization failure).
- Constraint names from `constraint()` decide which field the error message names.

## Notifications and Locks

- `PgListener` handles `LISTEN`/`NOTIFY` and reconnects on its own. Notifications sent while it was disconnected are lost, so a listener that uses `try_recv()` reloads state when it returns `None`.
- `PgAdvisoryLock` guards work that one instance at a time may run.
