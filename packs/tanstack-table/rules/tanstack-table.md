---
description: TanStack Table rules for React, covering useTable, tableFeatures, row model factories, column helpers, store-backed state, rendering and server-side data.
globs: ["**/*.tsx", "**/*.ts"]
---

# TanStack Table

## Setup

- Tables use `useTable` from `@tanstack/react-table` v9. `useReactTable` is the v8 name, and `useLegacyTable` from `@tanstack/react-table/legacy` is a deprecated migration aid only.
- Every table declares `features` with `tableFeatures({...})` at module scope: only the features it uses, such as `rowSortingFeature` and `rowPaginationFeature`.
- Row models are slots on the same object, after their feature: `sortedRowModel: createSortedRowModel()`, `filteredRowModel: createFilteredRowModel()`, `paginatedRowModel: createPaginatedRowModel()`. The core row model is automatic.
- Sort, filter and aggregation functions are registered one by one (`sortFns: { alphanumeric: sortFn_alphanumeric }`). The full `sortFns`, `filterFns` and `aggregationFns` registries are deprecated.
- `stockFeatures` is only for prototypes: it bundles every feature.
- Apps with several tables share features and cell components through `createTableHook`, which returns `useAppTable` and `createAppColumnHelper`.

## Columns and Data

- Columns use `createColumnHelper<typeof features, Row>()` and `columnHelper.columns([...])`, which keeps each column's value type.
- `data` and `columns` keep stable references: module scope, query data or compiled components. A new array every render rebuilds row models and resets state.
- `getRowId` returns a stable record ID whenever rows can be selected, expanded or reordered.
- Methods on rows, cells, columns and headers are called on their object (`row.getValue('name')`). Destructuring them loses `this`.

## State

- State lives in a TanStack Store. Read it from `table.state`; `table.getState()` and the `onStateChange` option are gone.
- Starting values go in `initialState`. Changes go through feature APIs such as `table.setSorting()` and `table.nextPage()`.
- State the app must own uses external `atoms`, or controlled `state` with `on[Slice]Change` for simple cases.
- Large tables pass a narrow selector as the second argument of `useTable`, or `() => null`, and read state lower down with `table.Subscribe` or `useSelector(table.atoms.<slice>)`.
- With React Compiler, a nested component that receives only table objects and reads changing state through their methods wraps that read in `Subscribe`.

## Rendering

- Headers, cells and footers render with `<table.FlexRender header={header} />` and `<table.FlexRender cell={cell} />`.
- Markup is a real `<table>` with `<thead>`, `<th scope="col">` and sortable headers as buttons that expose `aria-sort`.

## Server-Side Data

- Sorting, filtering and pagination done by the API set `manualSorting`, `manualFiltering` and `manualPagination`, and omit the matching row models.
- Manual pagination passes `rowCount`, or `pageCount: -1` for cursor APIs.
- Fully manual tables reset `pageIndex` in their change callbacks, because no row model runs the auto-reset.

Migration from v8: `tanstack-table-v9` skill.
