---
description: Redux Toolkit and RTK Query rules for store setup, slices, selectors, typed hooks and async logic.
globs: ["**/*.ts", "**/*.tsx"]
---

# Redux

- Rules for the latest stable Redux Toolkit (`@reduxjs/toolkit`) and React Redux. React Redux needs React 18 or later.

## Scope

- Redux holds global, shared, mutable client state. Server data goes through RTK Query. Form drafts, URL state and single-component state stay out of the store.
- Never write legacy Redux: no `createStore`, hand-written action type constants, switch reducers, `connect` or manual `redux-thunk` setup.
- One store per app, created with `configureStore`. Default middleware and DevTools stay on.

## Types

- `AppStore`, `RootState` and `AppDispatch` are inferred from the store, never written by hand.
- Typed hooks come from one module: `useDispatch.withTypes<AppDispatch>()`, `useSelector.withTypes<RootState>()`, `useStore.withTypes<AppStore>()`. Components never call the untyped hooks.

## Slices

- `createSlice` for every reducer. Slices are named after the data they store, not after components.
- Case reducers either mutate the Immer draft or return a new state, never both.
- State and actions are serializable: no promises, functions, class instances, `Map`, `Set` or `Date` objects.
- Actions describe events (`todoAdded`), not setters (`setTodos`). Logic lives in reducers, and several slices may respond to one action through the `extraReducers` builder callback.
- Collections are normalized with `createEntityAdapter`.
- Lazily loaded slices use `combineSlices` with `withLazyLoadedSlices` and `slice.injectInto`.

## Selectors

- Selectors are named `selectThing` and live in the slice's `selectors` field or next to it.
- Derived data is computed by `createSelector`, never stored. A selector that returns a new array or object is memoized.
- Components call `useAppSelector` once per value they need, rather than selecting a large object.

## Async Logic

- Data fetching uses RTK Query. No hand-written fetch thunks with loading flags.
- Other async work uses `createAsyncThunk`. Side effects that react to actions use `createListenerMiddleware`.

Use the `rtk-query` skill for API slices, cache tags, optimistic updates, infinite queries and OpenAPI code generation.
