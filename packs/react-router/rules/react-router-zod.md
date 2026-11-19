---
description: Zod validation of form data, params, search params and environment in React Router.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx", "**/vite.config.*"]
with: ["zod"]
---

# React Router With Zod

- Each `action` or `clientAction` parses `await request.formData()` with the form's shared schema. Failures return `data({ errors, values }, { status: 400 })` with `z.flattenError(error).fieldErrors`.
- `FormData` values arrive as strings. The schema uses `z.coerce` for numbers and dates.
- Loaders parse `params` and `url.searchParams` with a schema and throw a 404 or 400 response on failure instead of trusting the URL.
- One environment module parses `process.env` with Zod in server-only code. `vite.config.ts` imports it, so a missing value fails the build.
