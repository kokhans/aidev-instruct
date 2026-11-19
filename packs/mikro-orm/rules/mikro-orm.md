---
description: MikroORM, covering entity definitions, the request-scoped EntityManager, unit of work, transactions, queries and migrations.
globs: ["**/*.ts", "**/mikro-orm.config.ts"]
---

# MikroORM

## Version

- MikroORM is native ESM, needs Node 22.17 or later, TypeScript 5.8 or later and `moduleResolution` set to `nodenext`, `node20` or `bundler`.
- Kysely replaced Knex: the SQL package is `@mikro-orm/sql`, and raw access is `em.getKysely()`.
- Removed in 7 and never used: `persistAndFlush`, `removeAndFlush`, `MikroORM.initSync`, string entity references, awaiting a QueryBuilder directly and automatic `.env` loading.

## Entities

- Entities use `defineEntity` with a class, the style the docs recommend. Decorators, when a project already uses them, come from `@mikro-orm/decorators/es` or `/legacy`.
- ES decorators have no reflection, so every scalar property declares its type explicitly, unless the project uses `TsMorphMetadataProvider`.
- Nullability is declared, never inferred from `cascade`.
- Entities updated after a read set `version: true` for optimistic locking.

## EntityManager

- Each request gets its own forked `EntityManager`: `RequestContext.create(orm.em, next)` as the last middleware, after body parsers.
- Jobs, queues and scripts use `@CreateRequestContext()` or `orm.em.fork()`. `allowGlobalContext` is only for tests.
- The identity map lives as long as the fork. Long-running loops fork per batch or call `em.clear()`.

## Unit of Work

- `em.create(Entity, data)` creates and marks for persistence. `em.persist(entity)` adds existing objects. `em.flush()` writes all changes in one transaction.
- `em.transactional(async (em) => ...)` uses the `em` it receives. Nested calls create savepoints.
- Pessimistic locks (`LockMode.PESSIMISTIC_WRITE`) need an open transaction.

## Queries

- Relations load explicitly with `populate`, and the result type is `Loaded<Entity, "relation">`.
- `fields` narrows columns. Primary keys are always selected, and a foreign key left out breaks its relation.
- `findOneOrFail` replaces null checks when absence is an error. `em.getReference` links rows without loading them.
- `upsert` and `upsertMany` need a primary key or unique field in the data.
- QueryBuilder results come from `execute()` or `getResult()`.

## Migrations

- `mikro-orm migration:create` writes a migration from entity changes and updates the snapshot, which is committed. Review the SQL before committing.
- `mikro-orm migration:up` applies migrations as a deploy step. `mikro-orm migration:check` fails CI when entities and migrations differ.
- `mikro-orm schema:update` is for local debugging, never a deploy.
- `safe: true` in the migrations config blocks generated table and column drops.
