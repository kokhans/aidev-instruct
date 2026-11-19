---
description: React Router page meta component, structured data and resource routes for sitemap, robots and RSS.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx"]
with: ["seo"]
---

# React Router SEO

## Page Meta Component

- One component takes `path`, `title`, `description`, `image` and `type` and renders `<title>`, the description, canonical, Open Graph and Twitter tags as React 19 elements, with absolute URLs.
- Every page route renders it with values from `loaderData`. Layouts never render page-level tags, because duplicates are not removed.
- Site defaults (origin, brand, default card) come from the root loader through `useRouteLoaderData('root')`.
- Icons, the manifest and the RSS `alternate` link go in the root `links` export.
- JSON-LD is a `<script type="application/ld+json">` with `dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}`. The replace stops a `</script>` inside CMS text from breaking out.
- In SPA mode crawlers only see prerendered HTML. Pages that need search traffic, and the resource routes below, are listed in `prerender` or use server rendering.

## Resource Routes

- `sitemap.xml`, `robots.txt`, `rss.xml` and `llms.txt` are registered in `routes.ts` with their literal path: `route('sitemap.xml', '<module>')`.
- Each loader returns a `Response` with the right `Content-Type` and absolute URLs built from the configured origin.
- The sitemap lists canonical, indexable URLs with `lastmod` from the content's update date.
- The robots route returns `Disallow: /` outside production and the absolute `Sitemap:` line in production.
- The publish webhook is a resource route `action` that verifies a shared secret and purges the CDN for the changed pages and `/sitemap.xml`.
