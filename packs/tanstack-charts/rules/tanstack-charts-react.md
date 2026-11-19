---
description: "TanStack Charts React adapter: the Chart component, definition identity, sizing props, tooltip bodies and Server Components."
globs: ["**/*.tsx"]
with: ["react"]
---

# TanStack Charts With React

- Charts render with `Chart` from `@tanstack/charts/react`: `<Chart definition={definition} ariaLabel="..." height={320} />`. The old `@tanstack/react-charts` imports move to `@tanstack/charts/react`.
- A definition that captures props or state is built in `useMemo` against exactly those values, as the adapter requires: a new definition identity rebuilds the scene. This is the documented exception to the React Compiler rule.
- Sizing goes through props: no `width` follows the container, `height` or `aspectRatio` fixes the shape, `initialWidth` sets the server and first render width. `className` and `style` style the outer host only.
- A custom tooltip body imports `Chart` from `@tanstack/charts/react/tooltip` and passes `renderTooltipBody`. Controls inside it render only while `pinned` is true.
- A fully Canvas chart imports `Chart` from `@tanstack/charts/react/canvas`. The default `Chart` stays SVG, with Canvas only on marks that need it.
- With Server Components, the definition, scales and callbacks live in a client component. The Server Component passes plain data, never a `defineChart()` result.
- The entries already include `'use client'` and still render SVG on the server. A chart that must skip server rendering is mounted after hydration in a wrapper that reserves its space.
