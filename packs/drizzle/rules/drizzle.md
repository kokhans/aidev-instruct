---
description: Drizzle ORM for any database, covering versions, client, schema, relations, queries, transactions and migrations.
globs: ["**/*.ts", "**/drizzle/**/*.sql"]
---

# Drizzle

## Versions

- The stable line is 0.x with `relations()` per table and `drizzle({ client, schema })`. The next major is a release candidate and is not adopted until stable.
- Code follows the installed major of `drizzle-orm` and `drizzle-kit`, which share it.

## Client and Schema

- Tables use the dialect's table function (`pgTable`, `mysqlTable`, `sqliteTable`). Column names come from the object keys unless named explicitly.
- snake_case columns use `casing: "snake_case"` on the client and in `drizzle.config.ts`.
- Row types come from tables: `typeof users.$inferSelect` and `typeof users.$inferInsert`. Never hand-written parallel interfaces.
- `$onUpdate` and `$defaultFn` run in the ORM only. Values every writer must get are database defaults.

## Relations and Reads

- Nested reads use `db.query.<table>.findMany({ with })`. Joins, aggregates and bulk writes use the `select`, `insert`, `update` and `delete` builders.
- `columns` lists the fields a read needs. Wide rows are never loaded to read one field.

## Writes and Transactions

- Upserts use `onConflictDoUpdate({ target, set })` or the dialect's equivalent.
- Inside `db.transaction(async (tx) => ...)`, every query uses `tx`, never `db`. `tx.rollback()` throws to roll back.
- Raw SQL goes through the `sql` template, which parameterizes values. `sql.raw` never receives user input.
- Hot queries are prepared once with `.prepare()` and `sql.placeholder("name")`.
- Column helpers come from `getTableColumns`.

## Migrations

- `drizzle-kit generate` turns schema changes into SQL migrations, which are reviewed and committed. `drizzle-kit migrate` applies them.
- `drizzle-kit push` is only for a local prototype database, never a shared or production one.
- An applied migration is never edited. Fixes are new migrations.
- Workflow, renames, data migrations and deployment: `drizzle-migrations` skill.
