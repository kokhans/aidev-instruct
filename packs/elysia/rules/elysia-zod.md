---
description: Zod schemas in Elysia routes through Standard Schema, with OpenAPI output and file checks.
globs: ["**/*.ts"]
with: ["zod"]
---

# Elysia with Zod

- Zod schemas go straight into route `body`, `query`, `params`, `headers` and `response` through Standard Schema. Use them for schemas shared with a Zod frontend or other Zod code. Elysia-only schemas stay on `t`.
- OpenAPI needs the Zod converter: `openapi({ mapJsonSchema: { zod: z.toJSONSchema } })`.
- Query and path values arrive as strings. Zod schemas coerce them explicitly with `z.coerce.number()` and similar. Elysia's automatic coercion is documented only for `t` schemas.
- Standard Schema cannot check a file's real content type. File fields add `z.file().refine((file) => fileType(file, "image/png"))` with `fileType` from `elysia`.
