---
description: "TanStack Charts definitions: mark composition, compact scales, sizing, accessibility, stable keys, server rendering and testing."
globs: ["**/*.ts", "**/*.tsx"]
---

# TanStack Charts

Rules for the latest stable `@tanstack/charts` 1.x. The single package exposes everything through exact subpaths, such as `@tanstack/charts/scales/linear` and `@tanstack/charts/react`.

## Definitions

- A chart is `defineChart({ marks, scales })`: ordinary marks (`lineY`, `barY`, `dot`, `areaY`, `ruleY`, `text` and others) that share scales. No special series container.
- Before writing a chart, state the analytical question and each field's semantic type (quantitative, temporal, ordinal, identifier). Pick the smallest mark composition that answers it.
- Data arrives prepared: fetching, cleaning and aggregation happen in the data layer. Charts own domains inferred from channels, pixel ranges, guide layout and rendering.
- Field names are passed as channel strings (`x: 'month'`). Types are inferred: no generics on components and no casts on definitions.
- A fixed chart is defined at module scope. A chart that captures data is rebuilt only when that data changes, because definition identity is the update boundary.
- Cartesian scale and axis options live under `scales.x` and `scales.y`: `scale`, `nice`, `grid`, `axis: { label, ticks: { format } }`. `axis: false` hides an axis and keeps its scale.
- Bars stack their length channel by default. Side-by-side bars use `layout: group()`.
- Imports use exact public subpaths. Never import private source files.

## Scales

- Start with compact scales: `scales/linear` for numbers, `scales/band` for bars, `scales/point` for categorical positions, `scales/ordinal` for categorical colors, `scales/time` (`scaleUtc`) for dates spaced by elapsed time.
- Pass the compact factory itself to infer the domain, a zero-argument factory for options such as `() => scaleBand().padding(0.2)`, or an instance when the domain is application state.
- Never assign a positional pixel range. Charts owns responsive ranges.
- Log, power, square-root, local-time, piecewise and sequential or diverging color scales use granular `d3-scale` imports, with `d3-scale` and `@types/d3-scale` as direct dependencies. Only the scale that needs it is upgraded.
- Axis formatting alone never needs D3: pass an `Intl` formatter to `axis.ticks.format`.

## Accessibility

- Every chart has a meaningful `ariaLabel`. Context that is not visible nearby goes in `ariaDescription`, never into one huge label.
- A visible heading, units, time range and source sit in normal HTML next to the chart. A linked table carries exact values when they matter.
- Color is never the only signal: add direct labels, shape, stroke pattern, order or position.
- Tooltips are supplemental. Essential values stay visible without hovering.
- Keyboard focus stays enabled on interactive charts. `respectReducedMotion` stays `true`.

## Rendering

- SVG is the default. Only a measured paint-heavy mark moves to Canvas through `canvasChartRenderer` from `@tanstack/charts/canvas` on that mark's `renderer` option.
- Marks need stable identity across updates: a unique `id` on rows, or an explicit `key` when no unique field exists.
- Server rendering gets a real size: `initialWidth` with `height` or `aspectRatio` for responsive charts.
- Definitions are deterministic: no `window`, time, locale or random values while building one. Unordered data is sorted first, and locale-sensitive formatters are passed explicitly.
- Empty data and constant domains have an explicit policy.
- Tests assert the static scene and run interaction in a browser. Changing charts are tested for reorder, resize, empty data and replaced data.
