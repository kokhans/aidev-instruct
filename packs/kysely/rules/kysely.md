---
description: Kysely query builder, covering database types, the instance, queries, raw SQL safety, transactions and migrations.
globs: ["**/*.ts", "**/kysely.config.ts"]
---

# Kysely

## Version

- The next minor is beta on the `next` tag and is not adopted until stable.
- Kysely is ESM only, needs Node 22 and TypeScript 5.4 or later, and imports `Migrator` and `FileMigrationProvider` from `kysely/migration`.
- `sql.value` and `sql.literal` are removed. Use `sql.val` and `sql.lit`.

## Types

- The `DB` interface is generated from the database with `kysely-codegen`, or from a Prisma schema with `prisma-kysely`. It is regenerated after every migration, never edited by hand.
- Database-set columns are `Generated<T>`. Columns whose select, insert and update types differ use `ColumnType<S, I, U>`.
- Row types come from `Selectable<T>`, `Insertable<T>` and `Updateable<T>`.
- Types match what the driver returns at runtime. Kysely never converts values.

## Instance

- One `Kysely<DB>` per process, closed with `await db.destroy()` on shutdown.
- `CamelCasePlugin` maps snake_case columns when the generated types use camelCase, configured the same way in both.

## Queries

- Single rows use `executeTakeFirstOrThrow()` when absence is an error, `executeTakeFirst()` otherwise.
- Optional clauses use `$if(condition, (qb) => ...)`. Reused fragments use `$call` or helper functions that take an `ExpressionBuilder`.
- `$narrowType` on a query and `$notNull` on an expression fix result types that the query guarantees but Kysely cannot infer.
- Values in the `sql` template become parameters. `sql.raw`, `sql.ref`, `sql.id`, `sql.table` and `sql.lit` never receive unchecked input: they inject SQL.
- Dynamic column names come from an allow list typed against `DB`.

## Transactions

- `db.transaction().execute(async (trx) => ...)`, and every query inside uses `trx`. Isolation is set with `.setIsolationLevel(...)`.
- `db.startTransaction().execute()` gives a controlled transaction with `commit`, `rollback`, `savepoint`, `rollbackToSavepoint` and `releaseSavepoint`, for flows that cannot fit one callback. It always ends in `commit` or `rollback`.

## Migrations

- Migration files export `up` and `down` that take `Kysely<any>`, never the app's `DB` type, because the schema changes over time.
- Files run in name order. Names start with a sortable timestamp. A migration older than the last applied one is an error unless `allowUnorderedMigrations` is set.
- `kysely-ctl` with `kysely.config.ts` runs them: `kysely migrate make <name>`, `kysely migrate latest`, `kysely migrate down`.
- On databases with transactional DDL, one run of the migrator is one transaction. A failing migration rolls back the earlier ones in that run.
- There is no per-migration opt-out. Statements that cannot run in a transaction need `disableTransactions`, passed to the `Migrator` or to that one run. In `kysely.config.ts` it applies to every run.
- Migrations run once per deploy as a step before the new version takes traffic. The migrator's lock makes concurrent runs safe.
- An applied migration is never edited. Fixes are new migrations.
