---
description: Supabase SSR auth in Next.js App Router with @supabase/ssr and a proxy that refreshes sessions.
globs: ["**/proxy.ts", "**/middleware.ts", "**/app/**/*.ts", "**/app/**/*.tsx", "**/lib/supabase/**"]
with: ["nextjs"]
---

# Supabase With Next.js

- Env vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A secret key never gets the `NEXT_PUBLIC_` prefix.
- Client Components use a `createBrowserClient` helper. Server Components, Server Functions and Route Handlers use a `createServerClient` helper built on `await cookies()`.
- In Server Components `setAll` cannot write cookies. The helper wraps it in `try`/`catch`, and the proxy does the writing.
- `proxy.ts` (`middleware.ts` before Next.js 16) creates a server client, calls `getClaims()` and returns the response that `setAll` built, with its cookies and cache headers. Any other response it returns copies those cookies.
- The proxy `matcher` skips static assets and image files.
- The proxy only refreshes the session. Every page, Server Function and Route Handler that reads protected data checks `getClaims()` itself.
- Pages that read the session render dynamically and are never cached by ISR or a CDN.
