---
description: TanStack Query rules for React, covering query option factories, keys, freshness, the queryClient.query API, suspense queries, mutations and invalidation.
globs: ["**/*.ts", "**/*.tsx"]
---

# TanStack Query

## Client

- One `QueryClient` per browser session, created once outside render. On a server, a new `QueryClient` per request.
- The `QueryClient` sets a default `staleTime` above zero, so data is not refetched right after it loads or hydrates.

## Queries

- Every query is a `queryOptions()` factory that owns its key, `queryFn` and `staleTime`. Loaders, prefetches and components share the same factory.
- Keys are arrays that start with the entity and include every input: `['posts', { page, tag }]`. A value used in `queryFn` and missing from the key is a bug.
- `queryFn` passes the `signal` it receives to `fetch` or the API client, so cancelled queries abort.
- Components read with `useSuspenseQuery(options)` inside `<Suspense>` and an error boundary. `useQuery` is for optional data that may render a loading state.
- `select` derives data per component. Never copy query data into state.
- Paginated lists keep the previous page on screen with `placeholderData: keepPreviousData`.
- Dependent queries pass `enabled` or `skipToken`, never a conditional hook call.

## Imperative Reads

- `queryClient.query(options)` replaces `fetchQuery`, and `queryClient.query({ ...options, staleTime: 'static' })` replaces `ensureQueryData`. `queryClient.infiniteQuery` does the same for infinite queries.
- Prefetches call `void queryClient.query(options).catch(noop)` with `noop` from `@tanstack/react-query`.
- `fetchQuery`, `prefetchQuery`, `ensureQueryData` and their infinite variants are deprecated and never used in new code.
- `queryClient.query` does not retry by default. Set `retry` where a retry is safe.

## Mutations

- `useMutation` wraps the write call as `mutationFn`. Validation and authorization stay on the server.
- `onSuccess` invalidates the affected keys with `queryClient.invalidateQueries({ queryKey })`, or writes the returned entity with `setQueryData`.
- Optimistic updates use `onMutate` to cancel queries, snapshot and `setQueryData`, `onError` to restore the snapshot and `onSettled` to invalidate. Simple cases render `variables` while `isPending` instead.
- Mutation keys (`mutationKey`) and `useMutationState` show pending writes in other components.

## Errors

- Suspense query errors reach the nearest error boundary. Its retry calls `reset` from `useQueryErrorResetBoundary`, so queries refetch on the next render.
- Global error toasts come from `QueryCache` and `MutationCache` `onError`, not from each component.
