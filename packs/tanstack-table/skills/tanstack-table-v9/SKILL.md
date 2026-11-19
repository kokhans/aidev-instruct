---
name: tanstack-table-v9
description: Migrates React tables from TanStack Table v8 (useReactTable) to v9 (useTable with tableFeatures), covering feature registration, row model slots, renamed APIs, state access, column pinning, sizing, aggregation, TypeScript generics and the deprecated useLegacyTable bridge. Use when upgrading @tanstack/react-table to v9, when code still calls useReactTable, getCoreRowModel or table.getState(), or when a v9 upgrade fails type checking.
---

# TanStack Table v9 Migration

## Workflow

1. Upgrade `@tanstack/react-table` to the latest v9. Packages are ESM only and target ES2022.
2. List every `useReactTable` call. Large codebases may switch them to `useLegacyTable` from `@tanstack/react-table/legacy` first, then migrate one table at a time. `useLegacyTable` is deprecated and bundles every feature, so no table stays on it.
3. Migrate each table with the steps below, then run the type checker and the table's tests before the next one.
4. Remove `useLegacyTable`, `legacyCreateColumnHelper` and the `/legacy` imports once every table is migrated.

## Per-Table Steps

1. Replace `useReactTable` with `useTable`.
2. Create `const features = tableFeatures({...})` at module scope with the features the table uses (table below). Pass it as the `features` option.
3. Move row model options into `features`, each after its feature. Delete `getCoreRowModel`: the core row model is automatic.
4. Register only the sort, filter and aggregation functions the table uses, such as `sortFns: { alphanumeric: sortFn_alphanumeric }`. Custom functions referenced by string go in the same slot instead of a `declare module` augmentation.
5. Replace `table.getState()` with `table.state` and remove `onStateChange`. Subscribe with `table.store.subscribe` where the app listened to every change.
6. Replace destructured instance methods (`const { getValue } = row`) with calls on the instance.
7. Apply the renames below.
8. Add `typeof features` as the first generic to `ColumnDef`, `Column`, `Row`, `Cell`, `Table` and `createColumnHelper`. Wrap column arrays in `columnHelper.columns([...])`.
9. `flexRender(...)` still works. New code renders `<table.FlexRender header={header} />` and `<table.FlexRender cell={cell} />` instead.
10. Under React Compiler, remove memoization that only existed for `useTable`, and add `Subscribe` in nested components that read state through stable `row`, `cell`, `column` or `header` objects.

## Features

| Behaviour | Feature | Row model slot |
| --- | --- | --- |
| Sorting | `rowSortingFeature` | `sortedRowModel: createSortedRowModel()` |
| Column filters | `columnFilteringFeature` | `filteredRowModel: createFilteredRowModel()` |
| Global filter | `globalFilteringFeature` | `filteredRowModel: createFilteredRowModel()` |
| Pagination | `rowPaginationFeature` | `paginatedRowModel: createPaginatedRowModel()` |
| Expanding | `rowExpandingFeature` | `expandedRowModel: createExpandedRowModel()` |
| Grouping | `columnGroupingFeature` | `groupedRowModel: createGroupedRowModel()` |
| Aggregation | `rowAggregationFeature` | none |
| Faceting | `columnFacetingFeature` | `facetedRowModel`, `facetedMinMaxValues`, `facetedUniqueValues` |
| Selection | `rowSelectionFeature` | none |
| Visibility, ordering | `columnVisibilityFeature`, `columnOrderingFeature` | none |
| Pinning | `columnPinningFeature`, `rowPinningFeature` | none |
| Fixed widths, drag resizing | `columnSizingFeature`, `columnResizingFeature` | none |

## Renames

| v8 | v9 |
| --- | --- |
| `sortingFn`, `sortingFns`, `SortingFn` | `sortFn`, `sortFns`, `SortFn` |
| `column.getSortingFn()` | `column.getSortFn()` |
| `columnPinning.left` and `.right`, `column.pin('left')` | `columnPinning.start` and `.end`, `column.pin('start')` |
| `getLeft*` and `getRight*` pinning APIs | `getStart*` and `getEnd*` |
| `enablePinning` | `enableColumnPinning`, `enableRowPinning` |
| `columnSizingInfo`, `setColumnSizingInfo`, `onColumnSizingInfoChange` | `columnResizing`, `setColumnResizing`, `onColumnResizingChange` |
| `column.getAggregationFn()` | `column.getAggregationFns()` |
| `column.getAggregationValue(rows, maxDepth)` | `column.getAggregationValue({ rows, maxDepth })` |
| `row._getAllCellsByColumnId()` | `row.getAllCellsByColumnId()` |

## Behaviour Changes to Check

- Custom aggregation functions become `constructAggregationFn({ aggregate })`. `maxAggregationDepth` replaces the choice between `childRows` and `leafRows`.
- `row.getToggleSelectedHandler()` selects Shift ranges by default. Set `enableRowRangeSelection: false` to keep v8 behaviour.
- `getIsSomeRowsSelected()` stays `true` when every row is selected. An indeterminate checkbox uses `getIsSomeRowsSelected() && !getIsAllRowsSelected()`.
- Sticky pinned columns use CSS logical properties (`insetInlineStart`, `insetInlineEnd`) so RTL layouts work.
- `TableMeta` and `ColumnMeta` augmentations take `TFeatures` as their first generic, or move to the `tableMeta` and `columnMeta` slots with `metaHelper`.
- Row data must be an object or array.
- Removed private APIs such as `table._getFacetedRowModel()` have public replacements.
