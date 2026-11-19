---
description: Zod schemas for TanStack Start server function input, server routes and environment variables.
globs: ["**/*.ts", "**/*.tsx", "**/vite.config.*"]
with: ["zod"]
---

# TanStack Start With Zod

- Server functions pass a Zod schema to `.validator(schema)`. The handler receives the parsed, typed `data`.
- POST server functions that accept `FormData` check `data instanceof FormData` in the validator, then parse `Object.fromEntries(data)` with the form's schema. The schema uses `z.coerce` for numbers and dates.
- Server routes parse the request body and webhook payloads with a schema and answer 400 on failure.
- The environment schema parses `process.env` inside a `createServerOnlyFn` helper that runs per request, never at module scope.
- Browser configuration is a separate schema for `import.meta.env.VITE_*` values.
