---
description: TanStack Virtual rules for React, covering element and window virtualizers, sizing, dynamic measurement, keys, end-anchored feeds and accessibility.
globs: ["**/*.tsx"]
---

# TanStack Virtual

## When

- Virtualize lists and grids that render hundreds of rows or more. Short lists render normally; pagination or "load more" is often the simpler answer.
- Content that must be found with the browser's find-in-page or read by crawlers is not virtualized.

## Setup

- `useVirtualizer` takes `count`, `getScrollElement: () => parentRef.current` and `estimateSize`. Pages that scroll the whole window use `useWindowVirtualizer`.
- The scroll element has a fixed height and `overflow: auto`. The inner element is `position: relative` with height `getTotalSize()`.
- Items render from `getVirtualItems()`, absolutely positioned with `transform: translateY(item.start)` (minus `scrollMargin` for window virtualizers below a header).
- `getItemKey` returns a stable record ID. The default index key breaks state and measurement when items are inserted, removed or reordered.
- `overscan` stays small (default `1`). Raise it only when fast scrolling shows blank rows.

## Sizes

- Fixed-size rows return the exact size from `estimateSize`.
- Variable rows pass `ref={virtualizer.measureElement}` and `data-index={item.index}` on each item, and `estimateSize` returns the largest likely size.
- Grids combine a row and a column virtualizer, or use `lanes` for masonry layouts.
- `gap` replaces margins between items; margins are not measured.

## Feeds and Chat

- Chat, logs and reverse feeds set `anchorTo: 'end'` with a stable `getItemKey`, so prepending history keeps the visible item in place.
- `followOnAppend: true` scrolls to new items only when the viewport was already at the end. Users reading history are never pulled down.

## React

- React 19 may warn about `flushSync` during scroll. Set `useFlushSync: false` when the warning appears.
- `directDomUpdates: true` skips React renders for scroll-only updates. Items then never set their own main-axis position, and the inner element takes `ref={virtualizer.containerRef}` without a height.
- Scroll to a row with `scrollToIndex(index, { align })`, never by setting `scrollTop` by hand.

## Accessibility

- Virtualized lists keep their semantics: `role="list"` or a real `<table>` with `aria-rowcount` and `aria-rowindex` on rendered rows.
- Keyboard focus that moves to an unrendered row calls `scrollToIndex` first, then focuses the element.
