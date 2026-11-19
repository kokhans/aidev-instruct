---
description: better-auth setup, CLI, session checks and security settings.
globs: ["**/*.ts", "**/*.tsx"]
---

# Better Auth

## Setup

- One `betterAuth({ ... })` instance in server-only code. `BETTER_AUTH_SECRET` (at least 32 characters) and `BETTER_AUTH_URL` come from the validated server environment. The base URL is set, never inferred from requests.
- The CLI is the `auth` package: `auth generate`, `auth migrate` (built-in Kysely adapter only), `auth upgrade`, `auth secret`. `@better-auth/cli` is deprecated.
- Adding or removing a plugin reruns `auth generate`, because plugins add tables and fields.
- Plugins split into their own packages use them: `@better-auth/api-key`, `@better-auth/oauth-provider` (replaces the removed `oidcProvider`), `@better-auth/mcp`.
- Clients use `createAuthClient` from `better-auth/react` in React and `better-auth/client` elsewhere.
- Errors are checked with `isAPIError(error)` from `better-auth/api`, not `instanceof APIError`, which fails across duplicate `better-call` copies.

## Sessions

- Server code checks the session with `auth.api.getSession({ headers })`, never by reading the cookie.
- `session.cookieCache` saves database reads, but a revoked session stays valid until the cache `maxAge` ends. Sensitive actions pass `query: { disableCookieCache: true }`.
- `session.freshAge` (counted from session creation) guards sensitive account changes. Never set it to `0`, which disables the check.
- With `secondaryStorage` (such as Redis), sessions live there. `session.storeSessionInDatabase: true` keeps a database copy when sessions must be listed or audited.

## Security

- `trustedOrigins` lists every frontend origin. The base URL is trusted by default.
- Never set `advanced.disableCSRFCheck` or `advanced.disableOriginCheck`.
- Direct `auth.api.*` calls skip origin checks, CSRF checks and rate limiting, even with the browser's headers. Custom routes that call them and change state check `Origin`, validate redirect URLs and rate limit themselves.
- Rate limiting is on in production and stored in memory per instance. Several instances use `rateLimit.storage` set to `"database"` or `"secondary-storage"`.
- Behind a proxy, `advanced.ipAddress.ipAddressHeaders` names the proxy's header and `trustedProxies` lists its addresses. The default `x-forwarded-for` is spoofable.
- Secrets rotate with versioned keys in `secrets` or `BETTER_AUTH_SECRETS` (`2:new,1:old`). The first key encrypts, the rest still decrypt.
