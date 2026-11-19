---
description: React Router framework mode as a single-page app with ssr false, a root HydrateFallback, clientLoader, clientAction and static hosting.
globs: ["**/*.ts", "**/*.tsx", "**/react-router.config.*"]
---

# React Router SPA Mode

## Config

- `react-router.config.ts` sets `ssr: false`. No server build is produced; `react-router build` writes `build/client` with `index.html`.
- The root route is still rendered at build time to produce `index.html`. `@react-router/node` stays installed and every route is safe to render without browser APIs.
- The root route exports `HydrateFallback`, which becomes the loading screen in `index.html`.

## Data

- Routes load data with `clientLoader` and mutate with `clientAction`. `<Form>` and `useFetcher` submit to `clientAction`.
- Only the root route may export `loader`. It runs at build time and feeds `HydrateFallback` through `loaderData`.
- Other routes export `loader` only when `prerender` lists their paths.
- `clientLoader` calls a query library or the API client with `request.signal`, so cancelled navigations abort their requests.
- Auth and route guards run in `clientMiddleware` or `clientLoader`, with `throw redirect('/login')`.
- The API enforces authorization. Client guards only shape the UI.
- No `.server` modules and no secrets: every value in the bundle is public. Configuration uses `import.meta.env.VITE_*`.

## Hosting

- The host serves `build/client` and rewrites every unknown path to `/index.html` with status 200, such as `/* /index.html 200`.
- Valid routes answering 404 mean the host rewrite is missing.
- Hashed files under `build/client/assets` get a long immutable `Cache-Control`; `index.html` gets `no-cache`.
- Security headers and CSP come from the host or CDN configuration.
