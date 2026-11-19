---
description: better-auth in TanStack Start, covering the server route, the cookie plugin and session checks in beforeLoad and server functions.
globs: ["**/*.ts", "**/*.tsx"]
with: ["tanstack-start"]
---

# Better Auth with TanStack Start

- A splat server route at the auth base path (`src/routes/api/auth/$.ts`) defines `server.handlers` for `GET` and `POST` that return `auth.handler(request)`.
- `tanstackStartCookies()` from `better-auth/tanstack-start` is the last plugin, so auth calls from server functions set cookies.
- Server functions check the session with `auth.api.getSession({ headers: getRequestHeaders() })`, with `getRequestHeaders` from `@tanstack/react-start/server`.
- Protected routes call such a server function in `beforeLoad` and redirect without a session. The server function is the check. `beforeLoad` only routes.
