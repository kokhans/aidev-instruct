---
description: PostgreSQL schema design for any ORM or raw SQL, covering column types, keys, constraints, indexes, query shape and schema changes.
globs: ["**/*.sql", "**/*.prisma", "**/migrations/**", "**/Migrations/**", "**/*schema*", "**/*entity*"]
---

# PostgreSQL

## Types

| Data | Type | Avoid |
| --- | --- | --- |
| Points in time | `timestamptz` | `timestamp`, which silently drops the offset |
| Text | `text`, or `varchar(n)` only when the limit is a business rule | `char(n)` |
| Money and exact decimals | `numeric(p, s)` | `money`, `real`, `double precision` |
| Integer keys | `bigint GENERATED ALWAYS AS IDENTITY` | `serial`, `bigserial` |
| UUID keys | `uuid` with `DEFAULT uuidv7()` (PostgreSQL 18), which is time-ordered | random v4 keys on large, insert-heavy tables |
| Documents | `jsonb` | `json`, and `jsonb` for data that is joined or constrained on its own |
| Fixed value sets | `text` with a `CHECK`, or a lookup table | an enum whose values may be removed: enum values cannot be dropped |

- Case-insensitive values use a nondeterministic ICU collation or a unique index on `lower(col)`. Nondeterministic collations support `LIKE` since PostgreSQL 18, but not `ILIKE`, `SIMILAR TO` or regex.
- Generated columns are `VIRTUAL` by default since PostgreSQL 18. Write `STORED` when the column is indexed or unique (virtual columns cannot be), uses user-defined functions or types, or is read far more than written.

## Constraints

- Columns are `NOT NULL` unless null has a meaning.
- Every relationship is a declared foreign key with an explicit `ON DELETE`.
- Invariants live in the database as `UNIQUE`, `CHECK` and foreign keys. Application validation never replaces them.
- Uniqueness among live rows of a soft-deleted table is a partial unique index `WHERE deleted_at IS NULL`.
- Non-overlapping periods use `WITHOUT OVERLAPS` on a range column (PostgreSQL 18, needs `btree_gist` for scalar columns).

## Indexes

- Every foreign key column gets an index. PostgreSQL does not create one, and deletes on the parent scan the child without it.
- Composite index order follows the query: equality columns first, then range or sort columns.
- Partial indexes (`WHERE`) cover hot subsets such as active rows. `INCLUDE (cols)` enables index-only scans.
- `jsonb` containment uses GIN, with `jsonb_path_ops` when only `@>` is queried. `LIKE '%x%'` uses a `pg_trgm` GIN index.
- BRIN fits only very large append-only tables whose values follow insert order, such as event timestamps.
- Every index slows writes. Indexes with `idx_scan = 0` in `pg_stat_user_indexes` get dropped.

## Queries

- Deep pagination is keyset (`WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC`), not `OFFSET`.
- Time ranges are half-open: `>= start AND < end`, never `BETWEEN`.
- `NOT EXISTS` replaces `NOT IN (subquery)`, which returns no rows once the subquery yields a null.
- Upserts use `INSERT ... ON CONFLICT`. Never select-then-insert.
- Transactions stay short and never wait on network calls.

## Schema Changes

- Old and new application versions run against the same schema during a deploy. Every change is backward compatible with the running version.
- Migration sessions set `lock_timeout` (for example `5s`), so a blocked `ALTER TABLE` fails instead of stalling every query queued behind it.
- Indexes on live tables are created with `CREATE INDEX CONCURRENTLY`, which cannot run inside a transaction block.
- Step-by-step changes, lock levels and backfills: `postgresql-migrations` skill. Slow queries and `EXPLAIN`: `postgresql-performance` skill.

## Access

- The application connects as a role that does not own the tables and is not a superuser.
- Row-level security needs `ENABLE ROW LEVEL SECURITY` with policies. Owners bypass it unless the table also has `FORCE ROW LEVEL SECURITY`.
