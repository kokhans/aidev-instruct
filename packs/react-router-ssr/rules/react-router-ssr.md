---
description: React Router framework mode with server rendering, covering loaders, actions, middleware, headers, streaming, status codes, server-only code and prerendering.
globs: ["**/*.ts", "**/*.tsx", "**/react-router.config.*"]
---

# React Router With Server Rendering

## Loaders and Actions

- `loader` and `action` run on the server. Data for the `<h1>`, main content and `meta` is awaited. Other promises are returned unawaited and rendered with `<Await>` inside `<Suspense>`.
- Loaders and actions receive the raw `request` and a normalized `url`. Path checks use `url.pathname`; `request.url` ends in `.data` on client navigations.
- Missing records `throw data('Not found', { status: 404 })`. The status reaches the response because loaders run before the shell streams.
- Actions return `data({ errors, values }, { status: 400 })` on invalid input and `redirect()` on success. Loaders revalidate after every action.
- Resource routes are modules with a `loader` or `action` and no default export. They return a `Response` for external consumers.

## Server-Only Code

- Secrets and database clients live in `.server.ts` files or `.server/` folders. A client import fails the build.
- Browser values use `import.meta.env.VITE_*`. Server code reads `process.env` inside server-only modules.

## Middleware

- Server middleware is `export const middleware: Route.MiddlewareFunction[]`. It returns the `Response` from `next()` and sets headers on it.
- `next()` is called at most once, never throws and always returns a `Response`. No `try/catch` around it.
- Server middleware always runs for document requests, but on client navigations only when a `loader` or `action` runs on the server. Add a `loader` returning `null` to force it.
- `throw redirect(url)` before `next()` stops the chain before any loader runs.
- Custom servers seed values in `getLoadContext` with a `RouterContextProvider`. `AppLoadContext` is removed.

## Headers

- The route `headers` export sets per-route headers. Only the deepest route's headers are sent; merge `parentHeaders` explicitly.
- Headers passed to `data()` are sent only when the route's `headers` export forwards them from `loaderHeaders`.
- `Set-Cookie` from parent loaders and actions is kept automatically.
- Public pages send a short `Cache-Control` with `stale-while-revalidate`. Personalized pages send `private, no-store`.
- CDN, cache and rewrite rules that match data requests handle `/path.data`, `/path/_.data` for trailing-slash URLs and `/_.data` for the root.

## Rendering and Output

- `react-router reveal` creates `entry.server.tsx` when the project needs a custom one.
- `prerender` in `react-router.config.ts` renders known paths at build. Prerendered HTML has no per-request values such as nonces.
