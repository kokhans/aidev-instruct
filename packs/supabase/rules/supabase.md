---
description: Supabase clients, API keys, auth checks and generated types in TypeScript code.
globs: ["**/*.ts", "**/*.tsx"]
---

# Supabase

## Keys

- The browser and SSR clients use the publishable key (`sb_publishable_...`). Server-only code that must bypass RLS uses a secret key (`sb_secret_...`).
- Legacy `anon` and `service_role` JWT keys, deprecated by the end of 2026, are replaced by publishable and secret keys.
- A secret key never appears in client code, a public env prefix (`NEXT_PUBLIC_`, `VITE_`) or logs. Its use is limited to admin tasks with their own authorization check.
- A secret key bypasses RLS only without a user access token. Admin clients are separate clients with no user session, never an SSR client that reads cookies.

## Clients

- SSR frameworks use `@supabase/ssr`: `createBrowserClient` in the browser and `createServerClient` on the server. `@supabase/auth-helpers-*` packages are not used.
- The browser client is a singleton. The server client is created per request from that request's cookies, with only the `getAll` and `setAll` cookie methods.
- `setAll` also passes cache headers. They go on the response, so a CDN never caches one user's session for another.
- Session refresh runs in exactly one place per request. Refresh tokens are single-use, and refreshing twice signs the user out.

## Auth Checks

- Server code authorizes with `supabase.auth.getClaims()`, which verifies the JWT and refreshes a session close to expiry.
- `getUser()` is used only when the latest user record from the Auth server is needed.
- `getSession()` is never trusted in server code. The cookie it reads can be forged.
- Authorization data lives in `app_metadata`. `user_metadata` is editable by the user and never decides access.
- A change to `app_metadata` reaches `auth.jwt()` only after the token refreshes.

## Data Access

- Every query handles `{ data, error }`. Queries do not throw, so an unchecked `error` is lost.
- RLS is the access control for every client query. App code does not repeat row filters as security.
- Client queries select named columns, never `*` on tables that may gain sensitive columns.

## Types

- Types come from `supabase gen types` (TypeScript by default) against the local stack, or `--remote=<ref>` for a hosted project, into one committed file regenerated after each migration. `--local`, `--linked`, `--db-url`, `--project-ref` and `--project-id` are deprecated.
- Clients are typed with `createClient<Database>()` or the `Database` generic of the SSR helpers.
- Row types use the generated `Tables<"name">`, `TablesInsert<"name">` and `Enums<"name">` helpers. Query results use `QueryData<typeof query>`.

Database rules are in `supabase-database`.
