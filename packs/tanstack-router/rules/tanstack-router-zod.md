---
description: Zod schemas for TanStack Router search params and path params.
globs: ["**/routes/**/*.ts", "**/routes/**/*.tsx"]
with: ["zod"]
---

# TanStack Router With Zod

- Zod schemas go straight into `validateSearch`. No `@tanstack/zod-adapter`, which exists for the previous major.
- Every search field has `.default()` so links can omit it, and `.catch()` so a malformed value falls back instead of rendering the error component.
- Numbers and booleans in search params arrive already parsed from JSON. Use `z.number()`, not `z.coerce.number()`.
- Path params that must match a format are checked in `params.parse` with `schema.safeParse`, and `params.stringify` turns the parsed value back into a string. Returning `false` from `params.parse` to fall through to the next route is experimental.
- One schema per route lives next to the route. Shared filter schemas are composed with `.extend()`.
