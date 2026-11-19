---
description: TanStack Start in SPA mode with a prerendered shell, client rendering, server functions and host rewrites.
globs: ["**/*.ts", "**/*.tsx", "**/vite.config.*"]
---

# TanStack Start SPA Mode

## Config

- `tanstackStart({ spa: { enabled: true } })` prerenders a shell to `/_shell.html`. Keep the default `maskPath: '/'`.
- The build renders only the root route, with the router's pending component in place of matched routes. Other routes may be prerendered through `prerender`, but are not required.
- A root `loader` runs at build time, so its data is part of the shell. It never reads per-user or per-request data.

## Rendering

- Pages render in the browser. Every route still renders without browser APIs during the shell build.
- `useRouter().isShell()` is `true` only while the shell renders. The router navigates right after hydration and it turns `false`, so UI branched on it must not cause a flash of unstyled content.
- Server functions and server routes keep working and remain the place for secrets and database access.
- Search engines see only the shell. Pages that need search traffic belong in an SSR project.

## Hosting

- Rewrite order on the host: serve existing static files, pass server paths through (`/_serverFn/*`, `/api/*`), then rewrite every other path to `/_shell.html` with status 200.
- A changed server function base path or shell output path needs the same change in the host rules.
- Security headers and CSP for the shell come from request middleware when a Start server serves it, or from the host configuration otherwise.
