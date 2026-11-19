---
description: "TanStack Store in React: createStore, derived stores, atoms, actions, useSelector and scoped store context."
globs: ["**/*.ts", "**/*.tsx"]
---

# TanStack Store

Rules for the latest stable `@tanstack/react-store` (0.x). Check the installed version before using an API, because 0.x minors break APIs.

## Stores

- Code imports from `@tanstack/react-store`, which re-exports `@tanstack/store`.
- Shared client state is a store created with `createStore(initialValue)` at module scope.
- `setState` takes an updater and returns a new object: `store.setState((prev) => ({ ...prev, count: prev.count + 1 }))`. Never mutate `store.state`.
- Writes that belong together are named actions: `createStore(initialValue, ({ setState, get }) => ({ increment: () => ... }))`, called as `store.actions.increment()`.
- Derived values are read-only stores: `createStore(() => count.state * 2)`. The getter receives the previous value as `prev`. No state copied by hand and no effect that syncs one store into another.
- A single value with a getter and setter is an atom: `createAtom(value)`. `createAsyncAtom(fn)` exposes `pending`, `done` and `error` states for one async value.
- Several updates that should notify once run inside `batch(() => ...)`.
- `subscribe` returns `{ unsubscribe }`. Every subscription outside React is unsubscribed in its owner's cleanup.
- `Derived`, `Effect` and the `mount()` lifecycle belong to releases before 0.9 and no longer exist.

## React

- Components read with `useSelector(store, (state) => state.slice)`. The selector returns the smallest value the component renders.
- A selector that builds a new object or array passes `{ compare: shallow }`, so equal content does not re-render.
- `useAtom(atom)` returns `[value, set]` for a component that reads and writes one atom.
- Component-local stores use `useCreateStore` or `useCreateAtom`, never `createStore` inside render.
- A store scoped to a subtree, such as one per open document, travels through `createStoreContext()`: its `StoreProvider` passes the stores and `useStoreContext()` reads them.
- `useStore` is a deprecated alias of `useSelector`. `_useStore` is experimental. Use neither in new code.
