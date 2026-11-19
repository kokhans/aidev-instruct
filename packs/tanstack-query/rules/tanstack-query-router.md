---
description: TanStack Query as the data cache behind TanStack Router loaders.
globs: ["**/routes/**/*.ts", "**/routes/**/*.tsx", "**/router.tsx", "**/main.tsx"]
with: ["tanstack-router"]
---

# TanStack Query With TanStack Router

- The `QueryClient` goes in router context through `createRootRouteWithContext<{ queryClient: QueryClient }>()`.
- Loaders `await context.queryClient.query({ ...options, staleTime: 'static' })` for data the page needs, and components read the same options with `useSuspenseQuery`.
- Data that may arrive later starts in the loader without `await`: `void context.queryClient.query(options).catch(noop)`.
- `createRouter` sets `defaultPreloadStaleTime: 0`, so Query decides freshness and every preload reaches the Query cache.
- Search params that change the data go in `loaderDeps` and in the query key.
- The route `errorComponent` calls `reset` from `useQueryErrorResetBoundary` in an effect, so a retry or a later visit refetches.
- Mutations invalidate query keys. `router.invalidate()` is needed only for loader data held outside Query.
