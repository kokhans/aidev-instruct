---
description: Next.js with a server, covering Cache Components, Partial Prefetching, caching and revalidation, Server Actions, Proxy and status codes.
globs: ["**/*.ts", "**/*.tsx", "**/next.config.*"]
---

# Next.js With a Server

## Config

- `next.config.ts` sets `cacheComponents: true` and `partialPrefetching: true`. Leaving `partialPrefetching` unset logs a warning.
- Cache Components require the Node.js runtime. No `runtime` export in any segment.
- Route segment `dynamic`, `revalidate`, `fetchCache` and `experimental_ppr` are removed under Cache Components. `'use cache'` and `<Suspense>` decide what is static.

## Rendering

- Request-time reads (`cookies()`, `headers()`, `params`, `searchParams`, uncached fetches) sit inside `<Suspense>`, in the component that needs the value, never at the top of a layout.
- The LCP element and the `<h1>` stay outside every boundary, so they are in the prerendered shell.
- `await connection()` before per-request values such as `Date.now()` or `Math.random()`.
- `export const ensureStatic = 'shell'`, `'prefetch'` or `'navigation'` makes the build fail when request-time rendering sneaks into that stage of a route.
- `generateMetadata` is static or `'use cache'`. Runtime reads in it defer metadata to request time and raise a build error on otherwise static pages.
- `await prefetch()` keeps the runtime work below it out of the App Shell. `await navigation()` also keeps it out of per-link prefetches.

## Caching

- Every `'use cache'` scope calls `cacheLife` with a named profile, so the lifetime is explicit.
- `'use cache'` scopes never call `cookies()` or `headers()`, even through helpers. Read them outside and pass plain values in.
- Arguments and return values are serializable. `URL` and class instances are not; return `metadataBase` as a string.
- CMS reads use `cacheTag` with `cacheLife('max')`. Webhooks call `revalidateTag(tag, 'max')`, or `revalidateTag(tag, { expire: 0 })` when stale content must never be served.
- `revalidateTag` always gets its second argument: the one-argument form is deprecated. Prefer tags over `revalidatePath`.
- Server Actions call `updateTag` when the user must see their own write, and `refresh()` for uncached data.
- The default in-memory cache does not persist across serverless instances. `'use cache: remote'` stores entries in a shared cache handler.

## Data and Mutations

- Route Handlers serve feeds, webhooks and external consumers only. Pages read data in Server Components.
- Mutations are Server Actions in `'use server'` modules. Each one validates input and checks authentication and authorization itself.
- Never fetch data through a Server Action. Reads belong to Server Components or a client query library.

## Proxy

- `proxy.ts` exports `proxy`. `middleware.ts` is deprecated; migrate with the `middleware-to-proxy` codemod.
- Proxy handles per-request work only: nonces, host checks, request-time 404s. Static redirects and headers live in `next.config.ts`.
- Proxy is never the security boundary. Server Actions are POSTs to the page route, so a matcher change silently removes coverage.
- `'use cache'` has no effect in Proxy, and `cacheLife` or `cacheTag` throw there.

## Status Codes

- Missing records call `notFound()`. Once streaming has started the status stays 200 and `notFound()` only adds `noindex`.
- When a dynamic route must answer 404, Proxy checks the slug against a fast index and returns a 404 before rendering.
