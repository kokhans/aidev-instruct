---
description: Next.js as a static export with output export, covering build-time Server Components, client data, unsupported features and static hosting.
globs: ["**/*.ts", "**/*.tsx", "**/next.config.*"]
---

# Next.js Static Export

## Config

- `next.config.ts` sets `output: 'export'`. `next build` writes the site to `out/`.
- `cacheComponents` stays off: `'use cache'` does not support static export.
- `next/image` needs `images.loader: 'custom'` with a `loaderFile`, or `images.unoptimized: true`. The default loader is not available.
- `trailingSlash: true` emits `/page/index.html` for hosts that serve folders. Pick one form and match the host config.

## Unsupported

- Server Actions, Proxy, `cookies()`, `headers()`, rewrites, redirects and headers in `next.config.ts`, ISR, Draft Mode, intercepting routes and Route Handlers that read the request.
- Dynamic routes need `generateStaticParams` and `dynamicParams = false`. A URL not listed at build is a 404.
- `next dev` errors on an unsupported feature. Never work around it with client redirects.

## Rendering and Data

- Server Components run once at build time. They read data that is fixed per build: CMS content, Markdown, configuration.
- Data that changes per user or per request is fetched in Client Components with a query library, never in `useEffect`.
- Client Components are prerendered too. Browser APIs are used only after hydration: `use(browser())` inside `<Suspense>`, `useEffect`, or `next/dynamic` with `ssr: false`.
- Content that crawlers need stays outside browser-only boundaries, because the prerender holds only the `<Suspense>` fallback.
- Route Handlers export `dynamic = 'force-static'` and only `GET`. They emit files such as `data.json` or `rss.xml` at build.
- Shallow URL updates use `window.history.pushState` and `replaceState`. `useSearchParams` and `usePathname` follow them.

## Hosting

- The host serves `out/` and maps clean URLs to the HTML files (`try_files $uri $uri.html $uri/`), with `404.html` as the error page.
- Security headers, CSP and redirects come from the host or CDN configuration, because `next.config.ts` cannot set them.
- A change in content needs a new build and deploy.
