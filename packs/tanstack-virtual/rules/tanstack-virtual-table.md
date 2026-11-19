---
description: Virtualized rows and columns for TanStack Table with TanStack Virtual.
globs: ["**/*.tsx"]
with: ["tanstack-table"]
---

# TanStack Virtual With TanStack Table

- The virtualizer reads the final row model: `count` is `table.getRowModel().rows.length` and `getItemKey` returns `rows[index].id`. Sorting, filtering and grouping stay in the table.
- Rows are absolutely positioned inside a `position: relative` `<tbody>`, so native table layout no longer sizes columns. Cells take widths from `header.getSize()` and `cell.column.getSize()`.
- `<thead>` is sticky inside the scroll element and is never virtualized.
- Column virtualization renders spacer cells before and after the visible columns instead of positioning columns.
- Virtualization is not a replacement for server-side pagination, filtering or sorting: data too large for the browser loads in pages.
- Infinite loading fetches the next page near the bottom of the scroll element. Server sorting sets `manualSorting` and scrolls back with `scrollToIndex(0)` when the data is replaced.
