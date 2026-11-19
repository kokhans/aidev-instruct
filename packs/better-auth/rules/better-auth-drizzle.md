---
description: better-auth with the Drizzle adapter, generated auth tables and Drizzle Kit migrations.
globs: ["**/*.ts"]
with: ["drizzle"]
---

# Better Auth with Drizzle

- The database is `drizzleAdapter(db, { provider })` from `@better-auth/drizzle-adapter`, with `provider` set to `"pg"`, `"mysql"` or `"sqlite"`.
- `advanced.database.joins: true` lets the adapter load related rows in one query.
- `auth generate` writes the auth tables into the Drizzle schema. `drizzle-kit generate` and `drizzle-kit migrate` then migrate them. `auth migrate` does not work with this adapter.
- Tables with different names map through the adapter's `schema` option or `usePlural`, never by renaming generated columns by hand.
