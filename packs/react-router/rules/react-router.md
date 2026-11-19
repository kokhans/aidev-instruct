---
description: React Router framework mode rules shared by server and SPA apps, covering setup, route modules, typegen, meta tags, forms, fetchers and errors.
globs: ["**/*.ts", "**/*.tsx", "**/react-router.config.*"]
---

# React Router

## Setup

- React Router in framework mode with `reactRouter()` from `@react-router/dev/vite`. It needs Node.js 22.22+, React 19.2.7+ and Vite 7+, and ships ESM only.
- General APIs import from `react-router`, DOM APIs such as `HydratedRouter` and `RouterProvider` from `react-router/dom`. `react-router-dom` no longer exists.
- v7 `future` flags are gone: middleware, the Vite Environment API, pass-through requests and trailing-slash-aware `.data` URLs are always on. `splitRouteModules` is a top-level option, on by default.
- Routes are declared in `app/routes.ts` with `route`, `index`, `layout` and `prefix`, or `flatRoutes()` from `@react-router/fs-routes` when the project uses file-based routes.
- Route modules use generated types from `./+types/<route>`. Type checking runs `react-router typegen && tsc`.
- RSC, API-only mode (`ssr: 'unstable_api-only'`) and custom route discovery are unstable. Use them only as a deliberate project choice.

## Route Modules

- Components read `loaderData`, `actionData` and `params` from `Route.ComponentProps`, not from hooks.
- Route modules are never named `.server` or `.client`: the build fails.
- The root renders `<Links />`, `<ScrollRestoration />` and `<Scripts />`. Stylesheets and font preloads go in the `links` export.
- `clientLoader` and `clientAction` hold browser-only data and mutations. `HydrateFallback` renders while a `clientLoader` runs on first load.
- `clientMiddleware` runs on every client navigation and fetcher call. Its `next()` result is read-only.

## Meta Tags

- Pages render React 19 `<title>`, `<meta>` and `<link rel="canonical">` elements, as the docs recommend over the `meta` export. React hoists them into `<head>`.
- One shared component renders a page's tag set. Only page routes render it, because React does not dedupe tags from parent and child routes.
- The root renders only site-wide tags such as `charset`, `viewport` and `theme-color`.
- The `ErrorBoundary` renders the error title and `<meta name="robots" content="noindex" />`.
- Never mix these elements with the `meta` export and `<Meta />`.

## Forms and Navigation

- Mutations submit through `<Form method="post">` or `fetcher.Form`. Mutations that must not navigate use `useFetcher()`.
- Filters and search use `<Form method="get">`, so state lives in the URL.
- `<Form defaultShouldRevalidate={false}>` skips revalidation for submissions that change nothing on screen.
- Links to resource routes use `<a>` or `<Link reloadDocument>`.
- View transitions use React's `<ViewTransition>`. The `viewTransition` props, `useViewTransitionState` and the `NavLink` transitioning state are deprecated since 8.5.

## Errors and Context

- The root `ErrorBoundary` branches on `isRouteErrorResponse(error)` to render the branded 404 and 500 pages.
- A splat route `route('*', ...)` turns unmatched URLs into the branded 404.
- Request-scoped values travel through `createContext`, `context.set` and `context.get`, never through module globals.

Mode rules: `react-router-ssr` or `react-router-spa`.
