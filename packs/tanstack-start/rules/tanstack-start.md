---
description: TanStack Start rules shared by SSR and SPA mode, covering the Vite plugin, server functions, middleware, CSRF, server routes, import protection and environment variables.
globs: ["**/*.ts", "**/*.tsx", "**/vite.config.*"]
---

# TanStack Start

## Setup

- `@tanstack/react-start` with `tanstackStart()` from `@tanstack/react-start/plugin/vite`, placed before `react()`. Start requires Vite 8 and Node.js 22.12+.
- `src/router.tsx` exports `getRouter()`, which returns a new router on every call.
- React Server Components are experimental in Start. Pages render with loaders and server functions.

## Execution Model

- Code is isomorphic by default. Loaders run on the server for the first request and in the browser on navigation.
- Database access, secrets and other server work live in server functions that loaders and components call. Loaders never import server-only modules.
- `createServerOnlyFn` wraps helpers that must never run in the browser. `createClientOnlyFn` and `<ClientOnly fallback>` cover browser-only code. `createIsomorphicFn().server(...).client(...)` covers values that differ by environment.

## Server Functions

- Reads use `createServerFn()` (GET), writes use `createServerFn({ method: 'POST' })`. `FormData` input is allowed only on POST.
- Every server function chains `.validator()` before `.handler()`. `.inputValidator()` was removed in the first stable release. Callers pass input as `{ data }`.
- The handler checks authentication and authorization itself. Server functions are public endpoints.
- Components call server functions through `useServerFn`, so thrown `redirect()` and `notFound()` reach the router.
- `setResponseStatus`, `setResponseHeader(s)`, `getRequest` and `getRequestHeader` come from `@tanstack/react-start/server`. They override the status and headers of a returned `Response`.
- `setResponseHeader('set-cookie', ...)` replaces every outgoing cookie. Add one with `setCookie` or `appendResponseHeader`.

## Middleware and CSRF

- Global middleware lives in `src/start.ts`: `createStart(() => ({ requestMiddleware, functionMiddleware }))`. Request middleware runs for every request, including SSR, server routes and server functions.
- Defining `src/start.ts` removes the automatic CSRF protection for server functions. Add `createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === 'serverFn' })` to `requestMiddleware`.
- Request middleware sets headers on `(await next()).response` and returns a `Response` to short-circuit.
- Context passed between middleware and handlers is typed through the middleware chain, never through module globals.

## Server Routes

- Endpoints for webhooks, feeds and external consumers are server routes: `createFileRoute(path)({ server: { handlers: { GET, POST } } })`. A dot in the path is escaped in the file name, as in `sitemap[.]xml.ts`.
- Server routes that accept cross-site POSTs verify a signature or shared secret. Same-origin ones add `createCsrfMiddleware()` to `server.middleware`.

## Server-Only Code and Environment

- Import protection denies `*.server.*` files in the client and `*.client.*` files on the server. Files without the suffix mark themselves with `import '@tanstack/react-start/server-only'` or `client-only`.
- Barrels never mix server-only and client-safe exports.
- `process.env` is read inside handlers, middleware and other per-request code, never at module scope: edge runtimes inject env at request time.
- Browser values use the `VITE_` prefix and are public.
