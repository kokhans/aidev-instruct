---
description: TanStack Query in the Next.js App Router, covering per-request clients, prefetching in Server Components, HydrationBoundary and streaming.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx"]
with: ["nextjs"]
---

# TanStack Query With Next.js

- A shared `getQueryClient()` returns a new client on the server for every request and one cached client in the browser. The provider is a Client Component that calls it.
- The default `staleTime` is above zero, so the browser does not refetch data that just arrived from the server.
- Server Components prefetch with `queryClient.query(options)`: awaited to block, or `void ... .catch(noop)` to stream.
- `<HydrationBoundary state={dehydrate(queryClient)}>` wraps the Client Components that read the data with `useSuspenseQuery`.
- Streaming pending queries needs `dehydrate.shouldDehydrateQuery` to include `query.state.status === 'pending'` next to `defaultShouldDehydrateQuery`.
- Server Components only prefetch. They never render data from `queryClient.query`, because Query cannot revalidate a Server Component.
- `queryFn` never calls a Server Action, because Server Actions run serially and can leave queries pending. Server Actions serve as `mutationFn` only.
