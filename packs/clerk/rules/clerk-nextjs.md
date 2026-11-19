---
description: "Clerk in Next.js App Router with @clerk/nextjs: proxy, auth(), auth.protect() and webhooks."
globs: ["**/proxy.ts", "**/middleware.ts", "**/app/**/*.ts", "**/app/**/*.tsx"]
with: ["nextjs"]
---

# Clerk With Next.js

- Env vars are `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Next.js 15.2.3 or later is required.
- `proxy.ts` (`middleware.ts` on Next.js 15) default-exports `clerkMiddleware()` with the documented `matcher` that skips Next.js internals and static files and includes `/(api|trpc)(.*)`.
- `createRouteMatcher()` is deprecated. Routes are not protected in the proxy; each resource checks auth where it reads data.
- `<ClerkProvider>` sits inside `<body>` in the root layout, not around `<html>`.
- Pages call `await auth.protect()`, or `await auth()` and `redirectToSignIn()` for custom handling. Pages that read auth need a `loading.tsx` or `<Suspense>` boundary under Cache Components.
- Server Functions call `await auth.protect()` (unauthenticated returns `401`) or check `isAuthenticated` from `await auth()` and throw.
- Route Handlers return `401` when `isAuthenticated` is false and `403` when `has()` fails. `auth.protect()` there answers `404`.
- Permission checks pass the permission to `auth.protect({ permission })` or call `has()` from `await auth()`.
- Machine-token requests are authenticated with `auth({ acceptsToken })` in the Route Handler.
- Webhook Route Handlers import `verifyWebhook` from `@clerk/nextjs/webhooks`, and their path is left out of any auth check.
