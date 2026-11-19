---
description: "React 19 with React Compiler: memoization, refs, data with use() and Suspense, Actions, effect events, Activity and View Transitions."
globs: ["**/*.tsx", "**/*.jsx"]
version: "19"
---

# React 19

Rules for the latest stable React 19. Items marked 19.3 need React 19.3 or later.

## Components

- React Compiler is on. No manual `useMemo`, `useCallback` or `memo` unless a profile proves the need, or an effect or a library needs a stable identity. `"use no memo"` is a temporary escape hatch with a comment saying why.
- With Server Components, components stay on the server. `"use client"` marks only interactive leaves: local state, event handlers, animation, UI primitives and browser APIs.
- `ref` is a regular prop, no `forwardRef`. Ref callbacks return their cleanup function.
- `<Context value>` renders directly as the provider, never `<Context.Provider>`. A Server Component renders a context created in a `"use client"` module (19.3).
- A `ref` on `<Fragment>` (19.3) handles focus, events and observers for a group of children. No wrapper element just to hold a ref.
- StrictMode is on in development. Every effect is safe to run twice, including during hydration (19.3).

## Data

- Data comes from the framework's loaders, Server Components or a query library. Never fetch in `useEffect`.
- `use()` reads promises and context. A promise passed to `use()` comes from a loader, a Server Component or a cache, never from a client render.
- Every async area has a `<Suspense>` boundary with a skeleton, and an error boundary.
- A component that needs browser-only APIs during render calls `use(browser())` from `react-dom` (19.3) inside a `<Suspense>` boundary, in a Client Component. No mounted flag set in an effect, no `typeof window` check.
- `preload`, `preinit` and `preconnect` from `react-dom` for the LCP image, the main font and third-party origins.

## Actions

- Mutations are Actions: `<form action>`, `useActionState` for results and errors, `useFormStatus` for pending state, `useOptimistic` for instant feedback.
- Non-urgent updates run in `startTransition`. Async functions are allowed inside it.

## Effects and State

- `useEffectEvent` holds event logic that an effect calls. It never goes in a dependency array.
- External stores are read with `useSyncExternalStore`, not copied into state by an effect.
- `<Activity mode="hidden">` keeps the state of hidden tabs and panels and pre-renders the likely next screen.

## Transitions

- `<ViewTransition>` (19.3) animates enter, exit, update and shared-element changes. Only Transitions, Suspense reveals and `useDeferredValue` updates animate. Urgent updates such as typing stay instant.
- `addTransitionType` inside `startTransition` picks a direction-specific animation, such as `next` and `previous`.
- A shared `name` is mounted only once at a time.

## Metadata

- Metadata uses the framework API. Never mix it with React `<title>` and `<meta>` elements on the same route.

## Validation

- `react-doctor --scope changed --no-score` reports no errors for changed files.
