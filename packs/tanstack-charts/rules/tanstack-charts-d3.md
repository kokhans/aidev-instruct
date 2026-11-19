---
description: "Splitting work between TanStack Charts and D3 modules: D3 for algorithms and advanced scales, Charts for layout and rendering."
globs: ["**/*.ts", "**/*.tsx"]
with: ["d3"]
---

# TanStack Charts With D3

- A chart that TanStack Charts can express renders with it. D3 supplies scales, data preparation and algorithms, not a second rendering path beside the chart.
- An advanced scale enters one channel as a D3 factory or instance, such as `x: { scale: scaleTime, nice: true }` with `scaleTime` from `d3-scale`. Other channels keep their compact scales.
- D3 never sets the pixel range of a chart scale. Charts sets responsive ranges.
- `d3-array` and `d3-time` prepare rows, domains, bins and thresholds before `defineChart`. Formatters from `d3-format` or `d3-time-format` go to axis and tooltip options.
- Charts ships optional layout marks such as `treemap`, `treeLayout`, `forceLayout`, `sankeyDiagram`, `geoShape`, `brushX` and `zoomX` behind exact subpaths. Use them before importing the D3 layout directly.
- Every `d3-*` module the application imports is a direct dependency with its `@types` package. Modules Charts uses internally are not added.
