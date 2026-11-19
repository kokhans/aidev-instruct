---
description: Supabase SSR auth in React Router framework mode with @supabase/ssr in loaders and actions.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx"]
with: ["react-router"]
---

# Supabase With React Router

- Env vars are `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` without a prefix. The root `loader` returns both to the client, which is safe for the publishable key only.
- Loaders and actions create a `createServerClient` per request from the `Cookie` header, collect the cookies and cache headers `setAll` passes and return them with the response. The cache headers (`Cache-Control`, `Expires`, `Pragma`) stop a CDN from serving one user's session to another.
- Components create the browser client with `createBrowserClient` from the values the root loader returned.
- Each loader and action that reads protected data calls `getClaims()` and redirects or throws a `401` response when it fails.
