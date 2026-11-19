---
description: Elysia route schemas generated from Drizzle tables with TypeBox.
globs: ["**/*.ts"]
with: ["drizzle"]
---

# Elysia with Drizzle

- Route schemas for table rows come from the table with `createInsertSchema` and `createSelectSchema`, never a hand-written copy of the columns.

| Drizzle | Elysia | Import |
| --- | --- | --- |
| 0.x | 1.4 | `drizzle-typebox` |
| v1 | 1.4 | `drizzle-orm/typebox-legacy`, built on `@sinclair/typebox` |
| v1 | 2 | `drizzle-orm/typebox`, built on `typebox` 1.x |

- A generated schema is assigned to a variable before it is used inside `t.Object`, `t.Omit` or `t.Pick`. Nesting the call directly makes TypeScript fail with "Type instantiation is possibly infinite".
- Request schemas omit server-set columns (`id`, timestamps, owner) with `t.Omit`.
- Field refinements go in the second argument: `createInsertSchema(users, { email: t.String({ format: "email" }) })`.
- Elysia and the Drizzle generator share one TypeBox copy. `overrides` (or `resolutions`) in `package.json` pins `@sinclair/typebox` to the version `elysia` resolves, inside Elysia's peer range `>=0.34 <1`. The version in the Elysia docs example is below that range.
