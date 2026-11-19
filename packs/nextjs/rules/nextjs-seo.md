---
description: Next.js metadata helper, share images, structured data, sitemap, robots and RSS for search engines and link previews.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx", "**/next.config.*"]
with: ["seo"]
---

# Next.js SEO

## Metadata

- One helper turns `path`, `title`, `description`, `image` and `type` into a complete `Metadata` object. Pages call it from `metadata` or `generateMetadata` and never set tags directly.
- The helper always returns complete `openGraph`, `twitter`, `robots` and `alternates` objects, because a segment that sets one replaces the parent's.
- The root layout sets `title.template` (`'%s | Brand'`). The home page uses `title.absolute`.
- `alternates.canonical` is set on every page. `robots: { index: false, follow: true }` goes on filtered lists and preview deployments.
- `generateMetadata` that loads a record calls the same data function as the page and calls `notFound()` when the record is missing.
- Metadata that waits on request-time data streams into `<body>` for browsers. Only bots matched by `htmlLimitedBots` get it in `<head>`. Keep metadata prerenderable so every agent gets it in the first `<head>`.

## Share Images

- Default card: `app/opengraph-image.png` (1200 x 630) with `app/opengraph-image.alt.txt`.
- Generated cards: `opengraph-image.tsx` returns `new ImageResponse(...)` from `next/og` with `size = { width: 1200, height: 630 }` and `contentType = 'image/png'`.
- File-based images override `openGraph.images` from the helper for that segment. Use one source per segment.
- CMS images reach `og:image` through a CMS transform URL that returns a 1200 x 630 JPG, never through `/_next/image`, which negotiates WebP and AVIF.

## Structured Data

- The page renders `<script type="application/ld+json">` with `dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}`. The replace stops a `</script>` inside CMS text from breaking out.

## Crawler Files

- `app/sitemap.ts` returns `MetadataRoute.Sitemap` with absolute URLs and `lastModified` from the content's update date. `generateSitemaps` splits sites over 50,000 URLs.
- `app/robots.ts` returns `MetadataRoute.Robots` built from the environment: preview and branch deployments return `disallow: '/'`.
- `/rss.xml` and `/llms.txt` are `GET` Route Handlers in folders named `rss.xml` and `llms.txt`. The RSS link goes in `alternates.types` of the root metadata.
