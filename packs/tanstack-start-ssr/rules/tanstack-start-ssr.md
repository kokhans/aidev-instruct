---
description: TanStack Start with server rendering, covering selective SSR, streaming loaders, head tags in the first HTML, status codes, response headers and prerendering.
globs: ["**/*.ts", "**/*.tsx", "**/vite.config.*"]
---

# TanStack Start With Server Rendering

## Rendering

- Content routes keep the default `ssr: true`.
- `ssr: 'data-only'` runs `beforeLoad` and `loader` on the server and renders the component in the browser. `ssr: false` runs everything in the browser. Neither goes on a page that crawlers index.
- A child route can only make its parent's SSR setting more restrictive, never less.
- `defaultSsr` in `createStart` changes the default for the whole app.

## Loaders and Head

- Loaders await the data that the `<h1>`, main content and `head()` need. Below-the-fold data starts without `await` and streams.
- `head({ loaderData })` builds tags from awaited loader data. Streamed, unawaited data never feeds metadata.
- The root route renders `<HeadContent />` inside `<head>` and `<Scripts />` at the end of `<body>`.

## Status Codes and Redirects

- Missing records throw `notFound()` from the loader. Start answers 404 and renders the nearest `notFoundComponent`.
- Redirects throw `redirect({ to })`. Permanent moves pass `statusCode: 301`.
- Server functions adjust the current response with `setResponseStatus` and `setResponseHeader`.

## Headers and Caching

- Route-level response headers, such as `Cache-Control`, come from the route `headers()` option.
- Public pages send a short `Cache-Control` with `stale-while-revalidate`. Personalized pages send `private, no-store`.
- Hashed Vite assets get the immutable policy from the host or server preset, never from route code.

## Prerendering

- `tanstackStart({ prerender: { enabled: true, crawlLinks: true } })` renders known pages to static HTML at build. `failOnError` stays on.
- `pages` lists routes that crawling cannot discover. `filter` excludes personalized routes.
- Prerendered pages carry no per-request values, so they never depend on cookies or request headers.
