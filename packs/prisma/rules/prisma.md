---
description: Prisma ORM, covering the version to install, generator, config file, client setup, queries, transactions, raw SQL and migrations.
globs: ["**/*.prisma", "**/prisma.config.ts", "**/prisma7.config.ts", "**/*.ts"]
---

# Prisma

## Version

- The stable major is 7. The next major is a release candidate, yet the `latest` npm tag of `prisma` installs it, and its CLI does not read `schema.prisma`. Install `prisma@7` and pin `"prisma": "^7"` and `"@prisma/client": "^7"`. One-off and CI commands run the `prisma@7` package.
- A project already on the release candidate follows its docs. Never mix the two APIs.
- Requirements: Node 20.19 or later, TypeScript 5.4 or later, ESM (`"type": "module"`).

## Setup

- The generator is `provider = "prisma-client"` with an explicit `output`. Code imports the client from that output path. `prisma-client-js` is deprecated.
- Connection URLs live in the config file, via `defineConfig` from `prisma/config` and `env("DATABASE_URL")`, never as `url` in the schema. Prisma 7.10 and later create `prisma7.config.ts` and read it before `prisma.config.ts`, so it can sit next to a release-candidate config.
- `.env` is not loaded automatically. The config file and the app entry import `dotenv/config`, except on Bun, which loads `.env` itself.
- `PrismaClient` always takes a driver adapter: `new PrismaClient({ adapter })`.
- One `PrismaClient` per process, created once and imported. Each instance opens its own pool.
- `prisma migrate dev` and `prisma db push` no longer run `prisma generate` or seeds. Run `prisma generate` after every schema change and `prisma db seed` explicitly.

## Queries

- Reads use `select` for the fields they need, or `omit` for a few to drop. `include` loads whole related rows and is used only when they are needed.
- Typed fragments use `satisfies Prisma.UserSelect`. `Prisma.validator` does not exist in the `prisma-client` generator.
- Cross-cutting behavior uses client extensions (`$extends` with a `query` hook). `$use` middleware is removed.

## Transactions

- Dependent writes use `$transaction(async (tx) => ...)`, and every query inside uses `tx`. The default timeout is 5 seconds, so no network calls happen inside.
- Independent writes that must succeed together use the batch form `$transaction([...])`.
- Lost updates are prevented with a version column checked in the `where` of the update, or a stricter `isolationLevel`.

## Raw SQL

- `$queryRaw` and `$executeRaw` take a tagged template or `Prisma.sql`, which become parameters. `$queryRawUnsafe` and `$executeRawUnsafe` never receive user input.
- TypedSQL (`prisma/sql` files, `prisma generate --sql`, `$queryRawTyped`) is still a preview feature. Use it only when the project enables `typedSql`.

## Migrations

- `prisma migrate dev` is for development only: it can reset the database. `prisma migrate deploy` applies migrations in every other environment, as a deploy step before the new version takes traffic.
- `prisma migrate dev --create-only` writes the SQL without applying it. Review every migration, and edit it for anything Prisma cannot express.
- `prisma db push` is only for a local prototype database.
- An applied migration is never edited. An existing database is baselined with `prisma migrate diff --from-empty --to-schema <schema> --script` into `0_init`, then `prisma migrate resolve --applied 0_init`.
- The migrations folder and `migration_lock.toml` are committed.
