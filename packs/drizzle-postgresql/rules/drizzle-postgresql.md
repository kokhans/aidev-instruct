---
description: Drizzle ORM on PostgreSQL, covering drivers, pg-core column types, indexes, row-level security and migration limits.
globs: ["**/*.ts", "**/drizzle/**/*.sql"]
---

# Drizzle on PostgreSQL

## Driver

- `drizzle-orm/node-postgres` with a `pg` `Pool`, or `drizzle-orm/postgres-js` with `postgres`. Both run on Node and Bun.
- `drizzle-orm/bun-sql` runs only on Bun, so code that tests under Node (Vitest) cannot load it.
- Serverless platforms use the provider driver the Drizzle docs list (`neon-http`, `neon-serverless` and others).

## Columns

| Need | pg-core |
| --- | --- |
| Integer key | `bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity()`, not `serial` |
| UUID key | ``uuid().primaryKey().default(sql`uuidv7()`)`` on PostgreSQL 18, `.defaultRandom()` before it |
| Point in time | `timestamp({ withTimezone: true }).defaultNow()` |
| Money | `numeric({ precision, scale })`, a string in TypeScript by default |
| Document | `jsonb().$type<T>()`, typed but not validated at runtime |
| Fixed values | `text().$type<"a" \| "b">()` with a `check()`, or `pgEnum` when values are never removed |

- `bigint` with `mode: "number"` is safe only below `Number.MAX_SAFE_INTEGER`. Use `mode: "bigint"` when keys can exceed it.
- Postgres schemas other than `public` use `pgSchema("name").table(...)`.

## Indexes and Constraints

- The third argument of `pgTable` returns an array of indexes and constraints.
- Every foreign key column gets `index().on(col)`.
- Partial indexes use ``.where(sql`...`)``. GIN and other methods use `.using("gin", col)`. Operator classes use `.op("jsonb_path_ops")`.
- ``check(name, sql`...`)`` holds invariants. `unique().nullsNotDistinct()` treats nulls as equal.

## Row-Level Security

- Policies are `pgPolicy(name, { as, for, to, using, withCheck })` in the table's third argument, with roles from `pgRole`.
- Tables enable RLS with `.enableRLS()`.

## Migrations

- `drizzle.config.ts` uses `dialect: "postgresql"`. Applied migrations are recorded in `drizzle.__drizzle_migrations`.
- The migrator, also behind `drizzle-kit migrate`, applies all pending migrations in one transaction, with no option to turn it off. A generated `CREATE INDEX CONCURRENTLY` (from `.concurrently()`) fails there.
- A concurrent index on a large table is created by running `CREATE INDEX CONCURRENTLY IF NOT EXISTS` before the deploy and checking `pg_index.indisvalid`, with the generated migration edited to `CREATE INDEX IF NOT EXISTS` so it finds the index done.
- Generated SQL is checked against the `postgresql-migrations` skill before it is committed.
