---
description: Vitest setup and limits for Next.js components, helpers and Proxy matchers.
globs: ["**/*.test.ts", "**/*.test.tsx", "**/vitest.config.*"]
with: ["vitest"]
---

# Next.js With Vitest

- `vitest.config.mts` uses `@vitejs/plugin-react` and `environment: 'jsdom'`. Path aliases come from `resolve.tsconfigPaths: true` on Vite 8, which replaces the `vite-tsconfig-paths` plugin from the official guide.
- Vitest cannot render async Server Components. Unit tests cover synchronous Server and Client Components, schemas, data helpers and Server Action logic called as plain functions. End-to-end tests cover async components.
- `unstable_doesMiddlewareMatch` from `next/experimental/testing/server` tests the `proxy.ts` matcher. `unstable_getResponseFromNextConfig` tests `headers`, `redirects` and `rewrites` from `next.config.ts`.
