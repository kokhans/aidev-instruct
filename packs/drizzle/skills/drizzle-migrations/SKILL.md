---
name: drizzle-migrations
description: Runs the Drizzle Kit migration workflow. Covers drizzle.config.ts, generating and reviewing SQL migrations, the migration folder layout, column renames, custom data migrations, adopting an existing database and applying migrations on deploy. Use when changing a Drizzle schema, writing a data migration, setting up migrations for a project or planning a deploy that changes the database.
---

# Drizzle Migrations

## Config

`drizzle.config.ts` at the project root:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "<the project's dialect>",
  schema: "<path or glob to schema files>",
  out: "drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- `dbCredentials` is needed for `migrate`, `push`, `pull` and `studio`, not for `generate`.
- `migrations: { table, schema }` renames the table that records applied migrations. Change it only before the first deploy.
- `drizzle-kit` runs through the project's package manager or a `package.json` script.

## Folder Layout

- A migration is `<out>/<index>_<name>.sql` next to `<out>/meta/_journal.json` and snapshots.

## Change the Schema

1. Run `drizzle-kit generate --name <what-changed>` after editing the schema.
2. Read the SQL. Check for dropped columns or tables, `NOT NULL` added to tables with rows, type changes that rewrite a table and missing indexes.
3. Apply locally with `drizzle-kit migrate`, then commit the schema change and the migration files together.

- `drizzle-kit check` detects conflicting migrations from parallel branches. Run it in CI.
- Database-specific safety rules for the generated SQL live in the dialect pack, such as `drizzle-postgresql`.

## Renames

- `generate` asks whether a new column or table is a rename of a removed one. An agent never guesses the answer.
- The agent asks the user to run `generate` in their terminal, or makes the rename its own change with nothing else in it.
- A wrong answer drops the old column and its data.

## Data Migrations

- `drizzle-kit generate --custom --name <name>` creates an empty migration for SQL that Drizzle Kit cannot derive: backfills, seed data, unsupported DDL.
- Large backfills run in batches, outside the migration, not as one statement over the whole table.

## Apply on Deploy

- Migrations run once per deploy, as a step before the new version takes traffic: `drizzle-kit migrate`.
- The runtime `migrate(db, { migrationsFolder })` from `drizzle-orm/<driver>/migrator` is for a single instance or tests. Several instances starting at once race on it.
- The deploy fails when a migration fails. The app never starts against a half-migrated schema.

## Existing Database

- `drizzle-kit pull` writes a TypeScript schema from the live database. Review it before the first `generate`.
- Before `migrate` runs against a database that already has the tables, check that the first migration does not try to create them again.

## Never

- `drizzle-kit push` against a shared, staging or production database.
- Editing or deleting a migration that has run anywhere outside your machine.
- Hand-editing `snapshot.json`.
