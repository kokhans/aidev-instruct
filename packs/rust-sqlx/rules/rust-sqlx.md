---
description: SQLx with compile-time checked queries, offline mode, pools, transactions, migrations and database tests.
globs: ["**/*.rs", "**/migrations/*.sql", "**/sqlx.toml", "**/Cargo.toml"]
---

# SQLx

## Setup

- SQLx uses separate runtime and TLS features, such as `runtime-tokio` and `tls-rustls-aws-lc-rs`, plus the database feature. The combined features like `runtime-tokio-rustls` are gone.
- Only the features in use: `macros`, `migrate`, `derive`, `uuid`, `chrono` or `time`, `json`.
- `sqlx.toml` (feature `sqlx-toml`, on in `sqlx-cli`) holds per-crate settings such as a renamed `DATABASE_URL` and global type overrides.

## Queries

- Static SQL uses the checked macros: `query!`, `query_as!`, `query_scalar!`. Runtime `query_as::<_, T>()` with `#[derive(FromRow)]` only for SQL that is built at runtime.
- Values are always bind parameters. Never `format!` a value into SQL.
- Runtime `query*()` functions take `&'static str` or `AssertSqlSafe(...)`. `AssertSqlSafe` wraps only SQL assembled from trusted fragments, and `QueryBuilder` with `push_bind` builds dynamic filters.
- Wrong nullability inference, common with outer joins and expressions, is fixed with column aliases: `"id!"`, `"note?"`, `"total: i64"`.
- `fetch_optional` handles a missing row as `None`. `fetch_one` turns it into `Error::RowNotFound`.
- Constraint violations are read from `err.as_database_error()` with `is_unique_violation()` or `is_foreign_key_violation()`, never by matching message text.

## Offline Mode

- `cargo sqlx prepare -- --all-targets` writes query metadata to `.sqlx/`, which is committed. Workspaces add `--workspace`.
- The metadata is regenerated after any query or migration change.
- CI builds with `SQLX_OFFLINE=true` and runs `cargo sqlx prepare --check -- --all-targets` against a migrated database.

## Pools and Transactions

- One pool per database, built at startup with `max_connections` and `acquire_timeout`, and shared by cloning. Never a connection per request.
- `pool.begin()` starts a transaction, queries run on `&mut *tx`, and `tx.commit().await?` ends it. Dropping an uncommitted transaction rolls back.
- Data functions take a connection or executor argument, so callers decide between pool and transaction.
- No transaction stays open across an external call or user wait.

## Migrations

- `sqlx migrate add <name>` creates a migration. `-r` on the first migration makes the set reversible.
- An applied migration is never edited: SQLx checksums it. A fix is a new migration.
- `sqlx::migrate!()` embeds the migrations. They run once per deploy before the app serves traffic.

## Tests

- `#[sqlx::test]` gives each test its own database with migrations applied and an injected pool. `fixtures("users")` loads seed SQL from `fixtures/`.
- `DATABASE_URL` for tests is a superuser connection to a test server, because the test driver creates and drops databases. Failed tests leave their database for inspection until the next run.
