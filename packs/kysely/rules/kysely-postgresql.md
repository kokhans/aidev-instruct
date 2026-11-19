---
description: Kysely on PostgreSQL, covering the dialect, numeric types, JSON relation helpers, upserts and concurrent indexes in migrations.
globs: ["**/*.ts", "**/kysely.config.ts"]
with: ["postgresql"]
---

# Kysely on PostgreSQL

## Dialect

- `new PostgresDialect({ pool: new Pool({ connectionString, max }) })` with `pg`. `PostgresJSDialect` from `kysely-postgres-js` is the alternative for `postgres` or Bun `SQL`.
- `pg` returns `bigint` (`int8`) and `numeric` as strings. The `DB` types say `string`, or a `pg.types.setTypeParser` converts them and the types follow. `kysely-codegen --numeric-parser` matches the generated `numeric` types to the parser. `int8` types are adjusted by hand.

## Queries

- Nested relations use `jsonArrayFrom` and `jsonObjectFrom` from `kysely/helpers/postgres`, with `.$notNull()` when the related row always exists.
- Upserts use `.onConflict((oc) => oc.column("email").doUpdateSet({ ... }))`, never a select followed by an insert.
- Writes that need the row back use `.returning([...])` or `.returningAll()`.
- Large `IN` lists become `= any(${array})` with one array parameter.

## Migrations

- `CREATE INDEX CONCURRENTLY` fails inside the migrator's transaction. It goes in a migration of its own, applied in a separate run with `disableTransactions`.
- Operator classes and expression indexes that the schema builder cannot express go through the `sql` template with `.execute(db)`.
