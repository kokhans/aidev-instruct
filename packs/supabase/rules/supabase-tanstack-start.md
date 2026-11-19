---
description: Supabase SSR auth in TanStack Start with @supabase/ssr in server functions.
globs: ["**/src/**/*.ts", "**/src/**/*.tsx"]
with: ["tanstack-start"]
---

# Supabase With TanStack Start

- Env vars are `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. A secret key never gets the `VITE_` prefix.
- The browser client reads `import.meta.env`. The server client reads `process.env`, which the Start server runtime fills from `.env.local`.
- Server functions create a `createServerClient` per request, reading and writing cookies through Start's server cookie helpers.
- Route protection calls a server function from the layout route's `beforeLoad`, and that server function calls `getClaims()`.
- Every server function that reads protected data calls `getClaims()` itself. `beforeLoad` does not guard direct calls to a server function.
