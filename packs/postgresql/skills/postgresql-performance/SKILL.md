---
name: postgresql-performance
description: Diagnoses slow PostgreSQL queries and connection problems. Covers reading EXPLAIN ANALYZE plans, finding expensive queries with pg_stat_statements and auto_explain, choosing B-tree, partial, covering, GIN, trigram and BRIN indexes, query shape and sizing connection pools with PgBouncer. Use when a query or endpoint is slow, when reviewing indexes, or when the database runs out of connections.
---

# PostgreSQL Performance

## Find the Slow Queries

- `pg_stat_statements` ranks queries. It needs `shared_preload_libraries = 'pg_stat_statements'` (restart), `compute_query_id` set to `auto` or `on`, and `CREATE EXTENSION pg_stat_statements`.
- Sort by `total_exec_time` first: a fast query called a million times often costs more than one slow report.
- `auto_explain` logs plans of statements slower than `auto_explain.log_min_duration`. `auto_explain.log_analyze` stays off in production unless its overhead is measured.

## Read a Plan

- Run `EXPLAIN (ANALYZE, BUFFERS)` on the exact SQL the application sends, with realistic parameters and production-like data. PostgreSQL 18 includes `BUFFERS` with `ANALYZE` by default.
- `ANALYZE` executes the statement. Writes go inside `BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;`.
- Time per node is `actual time` multiplied by `loops`.
- `EXPLAIN (GENERIC_PLAN)` shows the plan of a parameterized statement without values. It cannot be combined with `ANALYZE`.

| Signal | Meaning | Usual fix |
| --- | --- | --- |
| Estimated rows far from actual rows | Stale or missing statistics | `ANALYZE <table>`, or `CREATE STATISTICS` for correlated columns |
| `Seq Scan` with a high `Rows Removed by Filter` | No usable index | An index matching the filter |
| `Index Scan` with many `Heap Fetches` | Index-only scan not possible | `INCLUDE` columns, vacuum the table |
| `Sort` with `external merge` | Sort spills to disk | An index matching `ORDER BY`, or more `work_mem` for that query |
| `Nested Loop` with a high `loops` count | Per-row lookup | An index on the inner join key, or the ORM's N+1 fix |
| High `shared read` in `Buffers` | Data comes from disk | A smaller index, fewer columns, a better filter |

## Choose an Index

| Query | Index |
| --- | --- |
| Equality and range on scalar columns, `ORDER BY` | B-tree, equality columns first |
| A hot subset (`status = 'active'`, `deleted_at IS NULL`) | Partial B-tree with that `WHERE` |
| A hot query reading a few extra columns | B-tree with `INCLUDE (cols)` |
| `jsonb @>` containment | GIN with `jsonb_path_ops` |
| `jsonb` key existence (`?`) | GIN with the default `jsonb_ops` |
| Arrays (`@>`, `&&`) | GIN |
| `LIKE '%x%'`, `ILIKE`, regex, fuzzy match | GIN with `gin_trgm_ops` from `pg_trgm` |
| Full-text search | GIN on a stored generated `tsvector` column |
| A huge append-only table filtered by time | BRIN |
| Ranges, exclusion constraints, geometry | GiST |

- A function in the `WHERE` (`lower(email)`) needs an expression index on the same expression.
- B-tree skip scan (PostgreSQL 18) lets a multicolumn index serve queries without its leading column when that column has few distinct values. It does not replace a dedicated index for a hot query.

## Query Shape

- `SELECT` lists the needed columns. `SELECT *` defeats index-only scans and widens every row.
- Exact counts on large tables are slow. Show "more results", or use `reltuples` estimates, when an exact total is not required.
- `IN` with thousands of literals becomes `= ANY($1)` with one array parameter.

## Connections

- Each connection is a server process. `max_connections` defaults to 100 and changing it needs a restart.
- The sum of every application instance's pool size stays below `max_connections` minus reserved and admin connections.
- Many instances or serverless functions connect through PgBouncer in transaction mode. Transaction mode keeps no session state: no `SET` without `LOCAL`, no session advisory locks, no `LISTEN`.
- PgBouncer tracks protocol-level prepared statements in transaction mode through `max_prepared_statements`: added in 1.21, default 200 since 1.24, and 0 turns it off. SQL-level `PREPARE` is not tracked.
- Sessions idle in a transaction hold locks and block vacuum. Application roles set `idle_in_transaction_session_timeout`, with `transaction_timeout` as a backstop. `transaction_timeout` never goes in `postgresql.conf`, where it affects every session.

## Maintenance Signals

- Tables with many dead tuples (`n_dead_tup` in `pg_stat_user_tables`) and an old `last_autovacuum` get per-table autovacuum settings, not `VACUUM FULL`.
- Indexes with `idx_scan = 0` over a full business cycle are dropped.
