---
name: rtk-query
description: "Builds and reviews RTK Query API slices: endpoint definitions, base queries with auth, cache tags, conditional and polled queries, optimistic and pessimistic updates, infinite queries and code generation from OpenAPI. Use when adding endpoints, fixing stale or over-fetched data, or generating an API slice from an OpenAPI document."
---

# RTK Query

## API Slice

- One `createApi` per backend base URL, imported from `@reduxjs/toolkit/query/react` for generated hooks.
- Large APIs start with an empty `endpoints: () => ({})` and add endpoints per feature with `api.injectEndpoints`.
- The API slice is added to the store through `combineSlices` or its `reducerPath`, and `api.middleware` is concatenated to the default middleware.
- `setupListeners(store.dispatch)` runs once when `refetchOnFocus` or `refetchOnReconnect` is used.
- Each endpoint declares result and argument types: `build.query<Post, string>`, `build.mutation<Post, NewPost>`.
- Response data is validated or narrowed in `transformResponse` when the backend is not typed end to end.

## Base Query

- `fetchBaseQuery` with `baseUrl` and `prepareHeaders` adds auth headers from state or a token getter.
- Token refresh wraps the base query: on a 401, refresh once, retry the original request, and log out when the refresh fails. A mutex such as `async-mutex` makes concurrent 401s share one refresh: requests wait for a refresh in progress, and only the first 401 starts one.
- `retry` wraps the base query. Endpoints that are not idempotent set `extraOptions: { maxRetries: 0 }`, and a 401 bails out with `retry.fail`.

## Cache Tags

| Endpoint | Tags |
| --- | --- |
| List query | `[...result.map(({ id }) => ({ type: "Post", id })), { type: "Post", id: "LIST" }]` |
| Item query | `[{ type: "Post", id }]` |
| Create | `[{ type: "Post", id: "LIST" }]` |
| Update or delete | `[{ type: "Post", id }]` |

- `tagTypes` lists every tag type on the API.
- Invalidation and refetch is the default after mutations. Manual cache writes are the exception listed below.
- Tags without IDs invalidate every query of that type. Use them only when that is the intent.

## Using Queries

- Components read data from the generated hooks (`useGetPostQuery`), never from `useEffect` plus `dispatch`.
- `skipToken` skips a query until its argument exists: `useGetPostQuery(id ?? skipToken)`.
- `selectFromResult` picks the slice of data a component needs, so it re-renders less.
- `isLoading` is the first load, `isFetching` any request. Show a skeleton for the first and keep stale data visible during the second.
- `pollingInterval` polls only while a component is subscribed. `skipPollingIfUnfocused: true` on the hook skips polls while the window is unfocused and needs `setupListeners`. With shared subscriptions, it applies only when every polling subscriber sets it.
- `api.util.prefetch` or `usePrefetch` loads data on hover or before navigation.
- Errors are narrowed with a type guard for `FetchBaseQueryError` before reading `status` and `data`.

## Manual Cache Updates

Only inside `onQueryStarted`, for one of these cases:

| Case | Pattern |
| --- | --- |
| Instant feedback | Optimistic: `dispatch(api.util.updateQueryData(...))`, then `await queryFulfilled`, `patchResult.undo()` on failure |
| Server returns the new entity | Pessimistic: `await queryFulfilled`, then `updateQueryData` with the returned data |
| Seed an item cache from a create | `api.util.upsertQueryData` with the created entity |
| One entity in several cached lists | `api.util.selectInvalidatedBy` to find entries, then update each by `endpointName` |

- `updateQueryData` changes only existing entries. `upsertQueryData` creates or replaces one.
- When many optimistic mutations overlap, invalidate the tags on failure instead of calling `undo`, which can race.

## Infinite Queries

- `build.infiniteQuery<ResultType, QueryArg, PageParam>` with `infiniteQueryOptions`: `initialPageParam` and `getNextPageParam` are required, `getPreviousPageParam` and `maxPages` optional.
- `getNextPageParam` returns `undefined` when there is no next page.
- `query` receives `{ queryArg, pageParam }`.
- The generated hook is `use<Name>InfiniteQuery`. Data is `data.pages`. Check `isFetching` or await the previous call before calling `fetchNextPage` again.
- `maxPages` bounds memory for long feeds.

## Code Generation

- `@rtk-query/codegen-openapi` generates endpoints from an OpenAPI document into an empty API slice.
- The config sets `schemaFile`, `apiFile`, `apiImport`, `outputFile`, `exportName` and `hooks: true`. Relative paths resolve from the config file's folder.
- Generated files are never edited by hand. Regenerate after every API change.
- `tag: true` generates tags from the OpenAPI operation tags, without IDs, so mutations over-invalidate. Add ID-based `providesTags` and `invalidatesTags` with `api.enhanceEndpoints` after generation. `endpointOverrides` in the config replaces or removes the generated tags of one endpoint.

## Review Checklist

1. Every query provides tags and every mutation invalidates the narrowest tags that cover its change.
2. No component fetches with `useEffect` or stores query results in a slice.
3. Optimistic updates roll back or invalidate on failure.
4. Conditional queries use `skipToken`, not a placeholder argument.
5. Generated code is untouched and the codegen config is committed.
