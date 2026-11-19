---
description: Zod schemas for Next.js environment variables, Server Actions and Route Handlers.
globs: ["**/*.ts", "**/*.tsx", "**/next.config.*"]
with: ["zod"]
---

# Next.js With Zod

- One environment module parses `process.env` with Zod and is imported by `next.config.ts`, so `next build` fails on a missing or invalid variable.
- The environment module splits server and `NEXT_PUBLIC_` values. The server part imports `server-only`.
- Each Server Action parses `FormData` or its arguments with the form's shared schema before any other work. Failures return field errors as a plain object, such as `z.flattenError(error).fieldErrors`.
- `FormData` values arrive as strings. The schema uses `z.coerce` for numbers and dates, so the same schema validates on the client.
- Route Handlers parse the request body, search params and webhook payloads with a schema and answer 400 on failure.
