---
description: "React 16.14.0 rules for projects pinned to it: dependencies that support 16, and what to write instead of APIs from React 17, 18 and 19."
globs: ["**/*.tsx", "**/*.jsx"]
version: "16"
---

# React 16

Rules for React 16.14.0. Code uses no API newer than 16.14.0, even when a newer runtime may load it.

## Dependencies

- `react`, `react-dom`, `@types/react` and `@types/react-dom` stay on 16.x, so the type check rejects newer APIs.
- Every library's `react` peer range includes 16.14.0. Many current majors need React 18: TanStack Query 5, React Testing Library 13 and later, `react-error-boundary` 6. Use the last major that supports 16, such as React Testing Library 12 or `react-error-boundary` 5.

## Replacements

| Newer API | In React 16.14.0 |
| --- | --- |
| `createRoot`, `hydrateRoot` (18) | `ReactDOM.render` or `ReactDOM.hydrate`, and `ReactDOM.unmountComponentAtNode` on teardown |
| `useId` (18) | An ID created once per instance, such as `useState(() => nextId())` from a module counter, or the UI library's ID hook |
| `useTransition`, `useDeferredValue` (18) | Debounce the value that drives an expensive render. The input's own state updates immediately |
| `useSyncExternalStore` (18) | The same hook from `use-sync-external-store/shim` |
| `ref` as a prop (19) | `forwardRef`, with `useImperativeHandle` for an imperative API |
| `<Context value>` as provider (19) | `<Context.Provider value>` |
| Ref callback cleanup (19) | The callback receives `null` on unmount and cleans up then |
| `<form action>`, `useActionState`, `useFormStatus`, `useOptimistic` (19) | `onSubmit` with `event.preventDefault()`, and pending, error and optimistic state in `useState` or `useReducer` |
| `use()` (19) | `useContext` for context. Promises resolve in an effect or a data library |
| Document metadata, `preload`, `preinit` (19) | The host page, or `document.title` set in an effect |
| `useEffectEvent` (19.2) | A ref assigned the latest handler on every render and read inside the effect |
| `<Activity>` (19.2) | The panel stays mounted and hidden with the `hidden` attribute, or its state moves up |
| Fragment refs (19.3) | A wrapper element that holds the ref |

## Rendering

- No React Compiler: it supports React 17 and later. `useMemo`, `useCallback` and `React.memo` keep identities stable where an effect dependency or a memoized child needs it, and where a profile shows a slow render.
- A component that renders nothing returns `null`. Returning `undefined` throws before React 18.
- `React.lazy` with `<Suspense>` only splits code. React 16 has no Suspense for data, so a component renders its own loading and error states.
- Data loaded in an effect ignores stale responses: an `ignore` flag or `AbortController.abort()` in the cleanup.

## Batching and Events

- Only updates inside React event handlers are batched. Several updates in a promise, timer or native listener render once each: combine them into one state object or `useReducer` dispatch, or wrap them in `ReactDOM.unstable_batchedUpdates`.
- Synthetic events are pooled: React clears their properties after the handler returns. Read values into variables before an `await`, a timer or a state updater function, or call `event.persist()` first.
