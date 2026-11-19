---
description: TanStack Start head helper, structured data, sitemap, robots and RSS server routes.
globs: ["**/routes/**/*.ts", "**/routes/**/*.tsx", "**/vite.config.*"]
with: ["seo"]
---

# TanStack Start SEO

## Head Helper

- One helper turns `path`, `title`, `description`, `image` and `type` into `{ meta, links }`. Every page route's `head({ loaderData })` calls it.
- The title is a `{ title }` entry in `meta`. `description` and `twitter:*` use `name`, `og:*` uses `property`, and `canonical` and `alternate` go in `links`, all absolute.
- The root route's `head()` sets `charset`, `viewport`, `theme-color`, `og:site_name`, `og:locale`, icon and manifest links and the RSS `alternate` link. A child's entry with the same `name` or `property` replaces the root's.
- Title format (`Page | Brand`, home `Brand | Tagline`) is applied inside the helper, never per route.
- JSON-LD goes in `head().scripts` as `{ type: 'application/ld+json', children: JSON.stringify(data) }`.
- Crawlers see head tags only in server-rendered or prerendered HTML.

## Crawler Routes

- `sitemap.xml`, `robots.txt`, `rss.xml` and `llms.txt` are server routes (`sitemap[.]xml.ts`) returning a `Response` with the right `Content-Type`, or static files in `public/` when they never change.
- Each handler builds absolute URLs from the configured origin, never from the `Host` header.
- The sitemap lists canonical, indexable URLs with `lastmod` from the content's update date.
- Preview and branch deployments return `Disallow: /` from the robots route.
- Fully static sites can generate the sitemap at build with `tanstackStart({ prerender: { enabled: true, crawlLinks: true }, sitemap: { enabled: true, host } })`.
