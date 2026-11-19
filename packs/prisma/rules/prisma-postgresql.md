---
description: Prisma ORM on PostgreSQL, covering the pg adapter, pooling, PgBouncer, native types, indexes and SQL that Prisma Migrate cannot generate.
globs: ["**/*.prisma", "**/prisma.config.ts", "**/prisma7.config.ts", "**/*.ts"]
with: ["postgresql"]
---

# Prisma on PostgreSQL

## Connection

- The client uses `new PrismaPg({ connectionString })` from `@prisma/adapter-pg`. The `pg` pool owns the connections.
- Pool settings go to `PrismaPg`: `max` (default 10), `connectionTimeoutMillis` (default 0, which waits forever, so set it, for example to 5000) and `idleTimeoutMillis` (default 10 seconds).
- Behind PgBouncer, the adapter gets the pooled URL and `datasource.url` in the config file gets the direct URL that the CLI uses for migrations.
- PgBouncer runs in transaction mode with `max_prepared_statements` above 0. Never add `pgbouncer=true` with PgBouncer 1.21 or later.

## Types

| Field | Attribute |
| --- | --- |
| Point in time | `DateTime @db.Timestamptz(6)`. Without it, `DateTime` maps to `timestamp(3)`, which has no time zone |
| UUID key | `String @id @default(uuid(7)) @db.Uuid` |
| Money | `Decimal @db.Decimal(p, s)`, read as `Prisma.Decimal` |
| Large integers | `BigInt`, read as JavaScript `bigint` |
| Document | `Json`, filtered with `path` and `string_contains` or `array_contains` |

## Indexes

- Every relation scalar field gets `@@index([field])`. Prisma does not add one on PostgreSQL.
- GIN and other methods: `@@index([data(ops: JsonbPathOps)], type: Gin)`. Also `Gist`, `SpGist`, `Brin`, `Hash`.
- Partial indexes need the `partialIndexes` preview feature: `@@index([email], where: raw("\"deletedAt\" IS NULL"))`, or the object form `where: { published: true }`. Without it, write them in SQL.
- Several Postgres schemas use `schemas = [...]` in the datasource and `@@schema` on models.

## SQL Prisma Cannot Generate

- Extensions, views, triggers, partial indexes without the preview feature and `CHECK` constraints go into a `prisma migrate dev --create-only` migration as SQL.
- `CREATE INDEX CONCURRENTLY` needs Prisma 7.4 or later and goes alone in its own `--create-only` migration, so a failed build affects nothing else.
- Views are a preview feature, and Migrate never creates them. Their SQL lives in a migration.
