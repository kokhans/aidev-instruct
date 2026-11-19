---
description: Drizzle tables turned into Zod schemas for request bodies and forms.
globs: ["**/*.ts", "**/*.tsx"]
with: ["zod"]
---

# Drizzle with Zod

- Zod schemas for table rows come from the table: `createInsertSchema`, `createSelectSchema` and `createUpdateSchema`. Never a hand-written copy of the columns.
- Import them from `drizzle-zod`.
- A callback refines a generated field and keeps its type and nullability: `{ name: (s) => s.max(100) }`. Passing a Zod schema replaces the field, nullability included.
- Request schemas `pick` or `omit` from the generated schema, so server-set columns (`id`, timestamps, owner) never come from the client.
- `createSchemaFactory({ coerce: { date: true } })` coerces dates in form and query input.
