---
description: MikroORM on PostgreSQL, covering type mapping, UUID keys, JSON queries, indexes and concurrent index migrations.
globs: ["**/*.ts", "**/mikro-orm.config.ts"]
with: ["postgresql"]
---

# MikroORM on PostgreSQL

## Types

- The driver is `@mikro-orm/postgresql`. Dates map to `timestamptz` and are read and written in UTC (`forceUtcTimezone` is on by default).
- JSON properties map to `jsonb` and are queried with nested objects, which become `->>` expressions. Arrays inside JSON use `$elemMatch`.
- UUID keys use `defaultRaw("uuidv7()")` on PostgreSQL 18, `defaultRaw("gen_random_uuid()")` before it.
- Enum arrays use `p.enum(() => Role).array()`.

## Indexes

- Every foreign key property gets an index. PostgreSQL does not create one.
- Index options: `type` (`gin`, `gist`, `brin`, `hash`), `where` for partial indexes, `include` for covering indexes, `expression` for anything else.
- A JSON path is indexed with `properties: "meta.key"`.

## Migrations

- `CREATE INDEX CONCURRENTLY` goes alone in a migration whose `isTransactional()` returns `false`. `allOrNothing` defaults to `true` and wraps the whole run in one transaction, so that run also sets `migrations.allOrNothing: false`.
