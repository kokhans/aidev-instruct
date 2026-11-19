---
description: TypeORM on PostgreSQL, covering column types, identity keys, indexes, concurrent index migrations and pg pool options.
globs: ["**/*.ts"]
with: ["postgresql"]
---

# TypeORM on PostgreSQL

## Columns

- Integer keys use `@PrimaryGeneratedColumn("identity", { generatedIdentity: "ALWAYS" })`, not the `increment` (serial) default.
- Points in time use `type: "timestamptz"`, also on `@CreateDateColumn` and `@UpdateDateColumn`.
- Documents use `type: "jsonb"`. Money uses `type: "numeric"` with `precision` and `scale`.
- `bigint` and `numeric` come back as strings. Entity properties are typed `string`, or a column `transformer` converts them explicitly.
- Enums use `type: "enum"`. Adding a value generates `ALTER TYPE ... ADD VALUE`. Removing one generates a type swap with a cast, which fails while rows still hold the removed value, so a data migration runs first.

## Indexes

- Every foreign key column gets an `@Index()`. PostgreSQL does not create one.
- `@Index({ where: "..." })` creates a partial index. The `type` option selects GIN, GiST, BRIN or hash.
- Expression and `pg_trgm` indexes are written in a migration, with `@Index({ synchronize: false })` on the entity so the generator does not drop them.
- `@Index({ concurrent: true })` and any `CREATE INDEX CONCURRENTLY` run in a migration with `transaction = false`, with `migrationsTransactionMode` set to `each` or `none`.

## Connection

- `extra` passes options to the `pg` pool, such as `extra.max`. Every instance's pool together stays below the server's connection limit.
