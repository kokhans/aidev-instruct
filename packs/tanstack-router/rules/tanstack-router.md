---
description: TanStack Router rules for React, covering file-based routes, type registration, loaders, caching, search params, navigation, preloading and not-found handling.
globs: ["**/*.ts", "**/*.tsx"]
---

# TanStack Router

## Setup

- File-based routing through `tanstackRouter({ target: 'react', autoCodeSplitting: true })` from `@tanstack/router-plugin/vite`, placed before `react()`. TanStack Start projects get it from the Start plugin instead.
- `routeTree.gen.ts` is generated. Never edit it, and exclude it from Biome.
- The router type is registered once with `declare module '@tanstack/react-router' { interface Register { router: typeof router } }`.
- `createRouter` sets `defaultPreload: 'intent'` and `scrollRestoration: true`. The `<ScrollRestoration />` component is deprecated.
- Shared dependencies such as the auth state or a query client go in router context through `createRootRouteWithContext<Context>()`, never in module globals.

## Loaders and Caching

- Route data loads in `loader`. `beforeLoad` runs first, serially from parent to child, and holds auth checks and context additions.
- Protected routes throw `redirect({ to: '/login', search: { redirect: location.href } })` from `beforeLoad`.
- A loader that reads search params declares them in `loaderDeps` and reads them from `deps`, never from `location`. Return only the params it uses, so unrelated changes do not reload it.
- Route data is stale immediately (`staleTime: 0`) and preloaded data stays fresh for 30 seconds. Raise `staleTime` per route for data that changes rarely.
- Components read `Route.useLoaderData()`, `Route.useParams()` and `Route.useSearch()`. Code-split files use `getRouteApi('/path')`.

## Search Params

- Every route that reads search params declares `validateSearch` with a schema. Defaults and fallbacks keep a malformed URL usable instead of throwing.
- Filters, tabs, sorting and pagination live in search params, not in component state.
- Updates use the functional form: `navigate({ search: (prev) => ({ ...prev, page: 2 }) })`.
- `search.middlewares` with `retainSearchParams` and `stripSearchParams` keep shared params and drop defaults from URLs.

## Navigation and Types

- Links use `<Link to>` with typed `params` and `search`. Plain `<a>` only for external URLs and files.
- Hooks pass `from: Route.fullPath` or `strict: false`. A narrow `from` keeps type checking fast.
- Reusable link targets are built with `linkOptions()`.

## Head and Errors

- Missing records `throw notFound()` from the loader. The root route defines `notFoundComponent` and `errorComponent`; the default `notFoundMode` is `'fuzzy'`.
- `NotFoundRoute` and the router's `notFoundRoute` option are deprecated.
- Route `head()` returns `meta`, `links`, `styles` and `scripts`. The root renders `<HeadContent />` in `<head>` and `<Scripts />` in `<body>`. A nested `title`, or `meta` with the same `name` or `property`, replaces the parent's.
