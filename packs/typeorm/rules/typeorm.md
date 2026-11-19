---
description: TypeORM, covering the DataSource, entities, relations, repositories, QueryBuilder, transactions and migrations.
globs: ["**/*.ts"]
---

# TypeORM

## Version

- TypeORM needs Node 20 or later. Code written for the previous major is upgraded with the `@typeorm/codemod` `v1` transform and the official upgrade guide.
- Removed in 1.0 and never used: `Connection`, `createConnection`, the global `getRepository`, `getManager` and `createQueryBuilder`, `findByIds`, `@EntityRepository`, `getCustomRepository`, `TYPEORM_*` environment variables and `ormconfig.env`.

## DataSource

- One `DataSource` per process, configured in code from validated environment values, `initialize()`d at startup and `destroy()`ed on shutdown.
- `synchronize` is `false` everywhere except a throwaway local database. Production schema changes go through migrations.
- Repositories come from `dataSource.getRepository(Entity)`. Custom methods use `Repository.extend({ ... })`.

## Entities and Relations

- Relations load explicitly per query with `relations` or a QueryBuilder join. Entities do not set `eager: true` and do not use lazy (`Promise`) relations, which hide queries.
- Non-nullable `ManyToOne` and owning `OneToOne` relations load with an inner join, so their foreign keys are `NOT NULL` in the database.
- `@VersionColumn` adds optimistic concurrency to entities updated after a read.

## Queries

- Find options use object syntax for `select` and `relations`. Their string-array forms and the `join` option are removed.
- `where` values are never `null` or `undefined`: TypeORM throws. Null checks use `IsNull()`, and optional filters are left out of the object.
- That check does not cover QueryBuilder `.where()`, `.andWhere()` or `.orWhere()`, which still need their own null checks.
- `findBy` with `In(ids)` replaces `findByIds`. `exists()` replaces `exist()`.
- `save` reads before it writes. Bulk inserts and upserts use `insert`, `upsert` or QueryBuilder with `orIgnore()` or `orUpdate()`.
- Pessimistic locks use `pessimistic_write` with `setOnLocked("skip_locked")` or `"nowait"` inside a transaction.

## Transactions

- `dataSource.transaction(async (manager) => ...)`, and every query inside uses `manager`, never a repository or manager from outside.
- A manual `QueryRunner` calls `connect()`, `startTransaction()`, then commit or rollback, and `release()` in `finally`.

## Migrations

- `typeorm migration:generate -d <data-source> <path/name>` writes a migration from entity changes. Review the SQL before committing.
- `typeorm migration:run -d <data-source>` applies them as a deploy step. TypeScript sources run through `typeorm-ts-node-esm` or compiled JavaScript.
- `migrationsRun: true` is used only with a single instance.
- `migrationsTransactionMode` defaults to `all`, one transaction for the run. In `all` mode, a migration that sets `transaction` makes the run throw, so `transaction = false` needs `each` or `none`.
- An applied migration is never edited. Fixes are new migrations.
