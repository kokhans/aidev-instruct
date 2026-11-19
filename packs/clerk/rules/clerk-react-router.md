---
description: Clerk in React Router framework mode with @clerk/react-router middleware, rootAuthLoader and getAuth.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx", "**/react-router.config.ts"]
with: ["react-router"]
---

# Clerk With React Router

- Env vars are `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- `app/root.tsx` exports `middleware = [clerkMiddleware()]` and a `loader` that returns `rootAuthLoader(args)`, both from `@clerk/react-router/server`.
- On React Router v7 the config sets `future: { v8_middleware: true }`, which `rootAuthLoader` requires.
- `<ClerkProvider loaderData={loaderData}>` wraps the app in the root component.
- Loaders and actions call `await getAuth(args)` from `@clerk/react-router/server` and redirect or throw a `401` response when `isAuthenticated` is false.
- Server imports come from `@clerk/react-router/server`. `@clerk/react-router/api.server` is removed.
- The full user record comes from `clerkClient(args).users.getUser(userId)` only when the session token lacks the data.
