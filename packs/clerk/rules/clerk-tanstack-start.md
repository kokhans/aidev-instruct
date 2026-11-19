---
description: Clerk in TanStack Start with @clerk/tanstack-react-start request middleware and auth() in server functions.
globs: ["**/src/**/*.ts", "**/src/**/*.tsx"]
with: ["tanstack-start"]
---

# Clerk With TanStack Start

- Env vars are `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- `src/start.ts` registers `clerkMiddleware()` from `@clerk/tanstack-react-start/server` in `requestMiddleware` of `createStart`.
- Start adds no default CSRF middleware once that file exists, so it also registers `createCsrfMiddleware` with a filter for server function requests, ahead of `clerkMiddleware()`.
- `<ClerkProvider>` wraps the app inside `<body>` in `src/routes/__root.tsx`.
- Server functions call `await auth()` from `@clerk/tanstack-react-start/server` and throw a redirect or an error when `isAuthenticated` is false.
- Route protection calls such a server function from `beforeLoad`. Every server function that reads protected data still checks `auth()` itself.
