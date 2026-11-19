---
name: postgresql-migrations
description: Plans and reviews PostgreSQL schema changes that run against a live database without downtime. Covers lock levels of ALTER TABLE operations, lock and statement timeouts, expand and contract steps for adding, renaming and dropping columns, NOT NULL and foreign keys with NOT VALID, concurrent indexes, type changes, enums and batched backfills. Use when writing or reviewing a migration, whatever ORM generated it, or planning a deploy that changes the database.
---

# PostgreSQL Migrations

## Lock Levels

`ALTER TABLE` takes `ACCESS EXCLUSIVE`, which blocks reads and writes, unless listed otherwise. With several subcommands in one statement, the strictest lock wins.

| Operation | Lock | Cost |
| --- | --- | --- |
| `ADD COLUMN` without a default, or with a non-volatile default | `ACCESS EXCLUSIVE` | Metadata only |
| `ADD COLUMN` with a volatile default, a stored generated column, an identity column or a domain type with constraints | `ACCESS EXCLUSIVE` | Rewrites the table and its indexes |
| `ADD COLUMN ... GENERATED ALWAYS AS (...) VIRTUAL` | `ACCESS EXCLUSIVE` | Metadata only |
| `DROP COLUMN` | `ACCESS EXCLUSIVE` | Metadata only, space returns as rows are rewritten |
| `ALTER COLUMN TYPE` | `ACCESS EXCLUSIVE` | Rewrites unless the types are binary coercible (`varchar` to `text`, a larger `varchar(n)`) |
| `SET NOT NULL` | `ACCESS EXCLUSIVE` | Full scan, skipped when a valid `CHECK (col IS NOT NULL)` exists. Validates an existing `NOT VALID` not-null constraint (PostgreSQL 18) |
| `ADD CONSTRAINT` (`CHECK` or `NOT NULL`) with `NOT VALID` | `ACCESS EXCLUSIVE` | Metadata only |
| `VALIDATE CONSTRAINT` | `SHARE UPDATE EXCLUSIVE` | Full scan, reads and writes continue |
| `ADD FOREIGN KEY` | `SHARE ROW EXCLUSIVE` on both tables, also with `NOT VALID` | Full scan unless `NOT VALID` |
| `CREATE INDEX` | `SHARE` | Blocks writes for the whole build |
| `CREATE INDEX CONCURRENTLY` | `SHARE UPDATE EXCLUSIVE` | Two table scans, writes continue |
| `ATTACH PARTITION` | `SHARE UPDATE EXCLUSIVE` on the parent, `ACCESS EXCLUSIVE` on the partition and the default partition | Scans the partition unless a matching `CHECK` exists, and scans the default partition |

## Timeouts

- Every migration session runs `SET lock_timeout = '5s'` first. Even a metadata-only change waits behind long transactions, and every later query on the table waits behind it.
- A migration that hits the lock timeout is retried later, never rerun without the timeout.
- Long data steps set `statement_timeout` for the session. Neither timeout goes in `postgresql.conf`, where it affects every session.

## Zero-Downtime Steps

Each row is a sequence of separate deploys. The application changes between steps.

| Change | Steps |
| --- | --- |
| Add a required column | Add it nullable or with a constant default, backfill, then add `NOT NULL` as below |
| Add `NOT NULL` (PostgreSQL 18) | `ADD CONSTRAINT <name> NOT NULL <col> NOT VALID`, then `VALIDATE CONSTRAINT <name>` |
| Add `NOT NULL` (before 18) | `ADD CONSTRAINT <name> CHECK (<col> IS NOT NULL) NOT VALID`, `VALIDATE CONSTRAINT`, `SET NOT NULL` (no scan), then drop the check |
| Add a foreign key | `ADD CONSTRAINT ... FOREIGN KEY ... NOT VALID`, then `VALIDATE CONSTRAINT` |
| Add a unique constraint | `CREATE UNIQUE INDEX CONCURRENTLY`, then `ADD CONSTRAINT <name> UNIQUE USING INDEX <index>` (not on partitioned tables) |
| Rename a column or table | Add the new one, write both, backfill, read the new one, stop writing the old one, then drop it |
| Change a column type with a rewrite | Same as a rename: new column, dual writes, backfill, switch reads, drop the old one |
| Drop a column | Stop reading and writing it, deploy, then drop it |
| Drop a table | Stop using it, deploy, then drop it |

- ORMs that select every mapped column fail once a mapped column is dropped, so the mapping goes first.

## Concurrent Indexes

- `CREATE INDEX CONCURRENTLY` and `REINDEX CONCURRENTLY` cannot run inside a transaction block. They go alone in a migration that the tool runs without a transaction.
- A failed concurrent build leaves an `INVALID` index that still slows writes, and a failed unique build still enforces uniqueness. Find it with `SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid`, then `DROP INDEX CONCURRENTLY` and retry, or run `REINDEX INDEX CONCURRENTLY`.
- A partitioned parent does not support `CONCURRENTLY`. Build each partition's index concurrently, create the parent index with `ON ONLY`, then attach the partition indexes.
- `IF NOT EXISTS` makes a rerun safe, but an existing invalid index also satisfies it. Check validity after the run.

## Enums

- A value added with `ALTER TYPE ... ADD VALUE` inside a transaction cannot be used until that transaction commits.
- Enum values cannot be removed or reordered. Removing one means a new type and a column type change.

## Backfills

- Backfills run in batches by key range (`WHERE id > $last ORDER BY id LIMIT 5000`), each in its own transaction, never one `UPDATE` over the whole table.
- Backfill SQL is idempotent (`WHERE new_col IS NULL`, `ON CONFLICT DO NOTHING`), so a partial run can be repeated.
- Large backfills run outside the migration tool, so they do not hold its transaction or locks open.

## Review Checklist

- Destructive operations (`DROP`, type changes, renames) are absent, or are the last step of an expand and contract sequence.
- No statement rewrites or fully scans a large table while holding `ACCESS EXCLUSIVE`.
- New foreign key columns have indexes.
- The migration sets `lock_timeout`.
- The previous application version still works against the new schema.
