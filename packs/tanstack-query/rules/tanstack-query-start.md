---
description: TanStack Query with TanStack Start, covering the SSR query integration, per-request clients, server functions as query functions and streaming.
globs: ["**/router.tsx", "**/routes/**/*.ts", "**/routes/**/*.tsx"]
with: ["tanstack-start"]
---

# TanStack Query With TanStack Start

- `getRouter()` creates a new `QueryClient` per request, puts it in router context and calls `setupRouterSsrQueryIntegration({ router, queryClient })` from `@tanstack/react-router-ssr-query`.
- The integration renders `QueryClientProvider`. Do not add a second one; pass `wrapQueryClient: false` only when the app keeps its own provider.
- `queryFn` calls a server function. It never fetches the app's own HTTP endpoints.
- Queries from loader prefetches and `useSuspenseQuery` run during SSR and stream to the client. Plain `useQuery` runs only in the browser, so its content is missing from the server HTML.
- Queries that must stay out of the HTML payload set `meta: { ssr: false }` and are excluded with `dehydrateOptions.shouldDehydrateQuery`.
- A `redirect()` thrown from a query or mutation becomes a router navigation through the integration (`handleRedirects`, on by default).
