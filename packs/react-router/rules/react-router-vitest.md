---
description: Vitest tests for React Router components, loaders and actions.
globs: ["**/*.test.ts", "**/*.test.tsx"]
with: ["vitest"]
---

# React Router With Vitest

- `createRoutesStub` from `react-router` tests reusable components that use `<Link>`, `<Form>`, `useFetcher` or other router hooks.
- Loaders, actions and middleware are tested as plain functions: build a `Request`, call the export, assert on the returned data or `Response`.
- A test that needs typed context creates a `RouterContextProvider` and sets the values the function reads.
- Route modules rendered as whole pages are covered by end-to-end tests against a production build.
