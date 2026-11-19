---
description: Clerk authentication and authorization in TypeScript apps, with server-side checks and webhooks.
globs: ["**/*.ts", "**/*.tsx"]
---

# Clerk

## Versions

- Projects use the current `@clerk/*` SDKs on Node.js 20.9 or later. Upgrades run through the `@clerk/upgrade` CLI.
- `@clerk/react` replaces `@clerk/clerk-react`. Types import from the SDK's `/types` entry point or `@clerk/shared/types`, not `@clerk/types`.
- `<SignedIn>`, `<SignedOut>` and `<Protect>` are gone. UI gates use `<Show when="signed-in">`, `<Show when="signed-out">` or `<Show when={{ permission: "..." }}>`.
- Redirect props are `fallbackRedirectUrl`, `forceRedirectUrl` and their sign-up variants. `afterSignInUrl`, `afterSignUpUrl` and `redirectUrl` are removed.

## Keys

- The publishable key is public and carries the framework prefix. `CLERK_SECRET_KEY` stays on the server and never gets a public prefix.
- Passing `secretKey` to `clerkMiddleware()` at runtime also requires `CLERK_ENCRYPTION_KEY`, a 32-byte random value.

## Authentication

- `clerkMiddleware()` protects no route by itself. It only makes auth state available.
- Every resource that reads or changes protected data checks auth on the server: pages, loaders, Server Functions, Route Handlers and API endpoints. A layout check never replaces a page check.
- Client checks (`useAuth`, `useUser`, `<Show>`) shape the UI only. `<Show>` hides content but its children still ship to the browser, so sensitive data is never rendered under it.
- Server checks read `isAuthenticated` and `userId` and return `401` or redirect to sign-in when the user is signed out.

## Authorization

- Checks use `has()` on the server, with Permissions over Roles and Features over Plans.
- Server-side `has()` sees only Custom Permissions (`org:<feature>:<permission>`). System Permissions are checked through the Role.
- Permission checks need an Active Organization. With Billing on, a Permission counts only when the Organization's Plan includes its Feature.
- Signed in but not permitted returns `403`.

## Tokens

- `getToken()` throws `ClerkOfflineError` when offline (checked with `ClerkOfflineError.is(error)`) and `clerk_runtime_not_browser` outside the browser. Callers catch both.
- Backend token checks use `verify()` from `@clerk/backend`, which replaces `verifyToken()`, `verifyAccessToken()` and `verifySecret()`.

## User Data

- Data in the session token (`userId`, `orgId`, claims) is read from the token, not synced to a local table.
- A local user table exists only when the app must show other users' data. It is keyed by the Clerk user ID and filled by webhooks.
- Extra data under 1.2 KB can live in metadata exposed in the session token. Larger data lives in the app database.

## Webhooks

- Webhook handlers call `verifyWebhook(req)` with `CLERK_WEBHOOK_SIGNING_SECRET` before any work and stay outside auth checks.
- Handlers upsert by Clerk ID and tolerate duplicate and out-of-order events. A `2xx` stops retries.
