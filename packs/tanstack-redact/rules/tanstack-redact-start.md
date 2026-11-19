---
description: "TanStack Redact in a TanStack Start app: Vite plugin order, bundled server dependencies and safe feature flags."
globs: ["**/vite.config.ts", "**/vite.config.mts"]
with: ["tanstack-start"]
---

# TanStack Redact With TanStack Start

- `vite.config.ts` lists `redact()` from `@tanstack/redact/vite` after `tanstackStart()` and the React plugin, and sets `ssr: { noExternal: true }` so server dependencies also resolve React to Redact.
- Redact renders on the server and hydrates in the browser. Start still owns routing and server functions.
- Start needs hydration, context, Suspense, lazy, memo, forwarded refs and class error boundaries, so those flags stay on. `activity`, `fragmentRefs` and `portal` may be turned off only when the app and its dependencies do not use them.
- After switching, direct loads, client navigation and forms are checked in a production build.
