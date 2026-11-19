---
description: better-auth with its built-in Kysely adapter sharing the app's Kysely instance and migrations.
globs: ["**/*.ts"]
with: ["kysely"]
---

# Better Auth with Kysely

- better-auth uses Kysely internally. It shares the app's instance with `database: { db, type: "postgres" }` (or the project's dialect), so there is one pool.
- One tool owns the schema. When the app migrates with Kysely, `auth generate` writes the auth SQL, which becomes a Kysely migration. `auth migrate`, which applies changes directly, is used only when auth tables have no other migrations.
