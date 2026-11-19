---
description: "D3 in React: D3 computes scales, shapes and layouts, React renders the DOM."
globs: ["**/*.tsx", "**/*.jsx"]
with: ["react"]
---

# D3 With React

- D3 does the math, React renders the DOM. Scales, shape generators and layouts run during render, and JSX draws `<path>`, `<circle>` and `<text>` from their output.
- Axes and gridlines render in JSX from `scale.ticks()` and `scale.tickFormat()`. `d3-axis` only when its exact output is required.
- DOM modules (`d3-selection`, `d3-zoom`, `d3-brush`, `d3-drag`) run in a `useEffect` on a `ref` to an element React renders empty. React never renders children into that element.
- Effects that attach D3 behaviour return a cleanup that removes listeners and stops timers and transitions.
- Zoom and brush results go into React state, and the chart re-renders from it. D3 never mutates elements React owns.
- A force simulation runs outside render. Tick updates batch into state once per frame, or draw directly to a `<canvas>` for large graphs.
- Chart size comes from a `ResizeObserver` on the container, read in an effect and stored in state.
- Charts built only from pure modules render on the server. Only charts using DOM modules need a client component.
- With React Compiler on, no `useMemo` around scales: the compiler memoizes them.
