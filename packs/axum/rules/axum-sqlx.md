---
description: Axum handlers with SQLx for pool state, error mapping, transactions, readiness and router tests against a real database.
globs: ["**/*.rs"]
with: ["rust-sqlx"]
---

# Axum With SQLx

- The pool is a field of `AppState`. Handlers extract `State` and run queries on `&state.db`. Never an `Extension` or a global pool.
- `From<sqlx::Error> for AppError` maps `RowNotFound` to 404, unique and foreign key violations to 409, and everything else to a logged 500.
- A handler that writes several rows opens one transaction, runs every write on it and commits before building the response.
- By choice, `sqlx::Error::PoolTimedOut` maps to 503, not 500: the pool is saturated, not broken, and the client may retry.
- The readiness endpoint runs `SELECT 1` on the pool with a short timeout. Liveness never touches the database.
- Router tests take the pool from `#[sqlx::test]`, build the router with it and call it with `oneshot`. Each test gets a fresh, migrated database.
