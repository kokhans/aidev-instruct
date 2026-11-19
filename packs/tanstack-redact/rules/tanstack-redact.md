---
description: "TanStack Redact as the React runtime: build integration, feature flags, synchronous rendering limits, unsupported React APIs and testing."
globs: ["**/vite.config.ts", "**/vite.config.mts", "**/*.tsx", "**/*.jsx"]
---

# TanStack Redact

Rules for `@tanstack/redact` (0.x), an alternative runtime that replaces React and React DOM at build time.

## Setup

- `react` and `react-dom` stay installed and application code keeps importing them. No import rewrites and no `jsxImportSource` pointing at Redact.
- The framework integration performs the swap. A plain Vite app adds `redact()` from `@tanstack/redact/vite` after its React plugin. Vinext uses `@tanstack/redact/vinext`.
- `redact()` starts on the default `full` preset. A feature flag is turned off only after checking that neither the app nor its dependencies use it: `context: false` breaks every provider, `hydration: false` makes `hydrateRoot` throw, `portal: false` renders portals in place.
- The `nano` preset turns every optional feature off, so it fits only an app whose feature use was audited. Native view transition animation (`viewTransitions: true`) is experimental and off in `full`.

## Behavior Differences

- Rendering is synchronous: no time slicing and no interruptible renders. `useTransition` and `useDeferredValue` keep committed or stale content, without priority scheduling.
- Roots use `createRoot` and `hydrateRoot` from `react-dom/client`. `ReactDOM.render`, `ReactDOM.hydrate`, `unmountComponentAtNode` and `findDOMNode` do not exist, and legacy class lifecycles never run.
- `StrictMode` does not double-invoke and `<Profiler>` callbacks never fire.
- Server Components stay on upstream React. Fizz prerender and resume APIs are not implemented.
- `cache` returns its function unchanged and `cacheSignal` returns `null`: rendering under Redact is uncached.
- Libraries built on private React internals, such as React Three Fiber, need native React: they live in a separately built native module graph, mounted into an empty element from an effect that returns the native root's unmount.

## Testing

- Tests never read React DOM internals such as `__reactFiber$` or `__reactProps$`. They wait for a marker the app sets in an effect, such as `data-app-ready="true"`.
- Before shipping, the test suite and production build run under Redact, and hydration, forms, portals, navigation, pending transitions, actions, optimistic state and third-party components are checked by hand or end-to-end.
