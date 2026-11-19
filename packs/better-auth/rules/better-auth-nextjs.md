---
description: better-auth in Next.js App Router, covering the route handler, cookies in server actions, proxy checks and server-side sessions.
globs: ["**/*.ts", "**/*.tsx"]
with: ["nextjs"]
---

# Better Auth with Next.js

- The handler is a catch-all route handler at the auth base path (`app/api/auth/[...all]/route.ts`) exporting `toNextJsHandler(auth)` from `better-auth/next-js`.
- `nextCookies()` from `better-auth/next-js` is the last plugin, so auth calls from server actions set cookies.
- Server components, server actions and route handlers check the session with `auth.api.getSession({ headers: await headers() })`. Server components cannot set cookies.
- `getSessionCookie` from `better-auth/cookies` in `proxy.ts` is an optimistic redirect only: it checks that a cookie exists, not that it is valid. Every page and action that needs auth checks the session itself.
