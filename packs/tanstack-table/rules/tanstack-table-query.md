---
description: TanStack Table with server-side data loaded through TanStack Query.
globs: ["**/*.tsx", "**/*.ts"]
with: ["tanstack-query"]
---

# TanStack Table With TanStack Query

- Sorting, filters and pagination state from the table goes into the query key, so each combination is its own cache entry.
- The query sets `placeholderData: keepPreviousData`, so the current page stays visible while the next one loads.
- The table receives `data: query.data?.rows ?? emptyRows` with a module-scope `emptyRows`, so the reference stays stable while loading.
- `rowCount` comes from the response. `manualSorting`, `manualFiltering` and `manualPagination` are on.
- `getRowId` uses the record ID, so selection survives refetches.
- When the state lives in the URL, the router's search params own it and feed both the query key and the table's controlled `state`.
