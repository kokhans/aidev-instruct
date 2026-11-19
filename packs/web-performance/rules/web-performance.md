---
description: Core Web Vitals, asset loading, caching, UI states and URL state for websites.
globs: ["**/*.tsx", "**/*.jsx", "**/*.html", "**/*.css", "**/*.mdx", "**/_headers", "**/vercel.json", "**/netlify.toml", "**/staticwebapp.config.json"]
---

# Web Performance

## Core Web Vitals

- Targets at the 75th percentile of real visits, mobile and desktop separately: LCP under 2.5 s, INP under 200 ms, CLS under 0.1.
- Field data from the `web-vitals` library or the Chrome UX Report decides. Lighthouse scores are lab hints only.

## Loading

- The LCP element (hero image or heading) is in the initial HTML and visible at first paint. Entrance animations never hide it.
- The LCP image has `fetchpriority="high"` and is never lazy-loaded. Images below the fold use `loading="lazy"`.
- Every image and video has `width` and `height` or an `aspect-ratio`, plus `srcset` and `sizes`. Page images are served as AVIF or WebP through an image CDN or build step.
- Fonts are self-hosted WOFF2, subset to the scripts used, preloaded for the main face, with `font-display: swap` and a fallback tuned with `size-adjust` and the metric overrides.
- Video and map embeds start as a static preview. The real embed loads on click, from privacy-enhanced hosts.
- Third-party scripts load after consent and never block rendering.

## Responsiveness and Stability

- Event handlers give feedback within one frame and move heavy work after it, splitting long tasks with `scheduler.yield()` where supported and `setTimeout` as the fallback.
- Content never shifts after load: banners, ads and embeds reserve their space, and late content goes below the viewport or behind a user action.
- Pages stay eligible for the back/forward cache: no `unload` handlers and no `Cache-Control: no-store` on public HTML.

## Caching

- Hashed static files: `Cache-Control: public, max-age=31536000, immutable`.
- Public HTML: short `max-age` or `s-maxage` with `stale-while-revalidate`, so edits appear within minutes. HTML with a CSP nonce or user data is `private`.
- Unhashed public files (`robots.txt`, `sitemap.xml`, icons) get a short cache.

## UI States

- Every data-driven area has loading, empty and error states. Loading states keep the final size, so nothing shifts.
- Errors offer a retry and keep what the user entered.
- Filters, tabs, sorting, pagination and search live in the URL. Back and forward restore them, including scroll position.

Use the `web-vitals` skill to diagnose and fix a slow metric.
