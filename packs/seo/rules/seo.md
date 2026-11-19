---
description: Search and link-preview requirements for public pages, independent of framework.
globs: ["**/*.tsx", "**/*.jsx", "**/*.html", "**/*.mdx", "**/*seo*.ts", "**/*meta*.ts", "**/robots.ts", "**/sitemap.ts", "**/robots.txt", "**/*.xml"]
---

# SEO

## Crawlable HTML

- Metadata, headings, main content and navigation links are in the initial HTML response, server-rendered or prerendered. Link-preview bots never run JavaScript.
- Metadata is never streamed late or injected after load.
- Links are real `<a href>` elements. Pagination and filters that should be crawled use links, not buttons.
- Unknown routes and missing CMS records return a real 404 status, not a 200 page that says "not found".

## Origin and URLs

- One canonical host (`www` or bare domain) over HTTPS. Every other variant redirects there with a 301 or 308.
- One trailing-slash policy, enforced by redirect.
- The origin comes from configuration, never from request headers, and makes every URL in metadata absolute.
- URLs are lowercase, kebab-case and readable: `/blog/getting-started`.

## Metadata

- One shared helper builds every tag from `path`, `title`, `description`, `image` and `type`. Pages never write tags by hand.
- Every page has a unique `<title>`, a `description`, a self-referencing absolute `canonical` and the Open Graph and `twitter:card` set.
- Titles and descriptions use sentence case and plain punctuation. Each text has one source of truth: CMS or code, never both.
- Share images are 1200 x 630 px PNG or JPG under 1 MB. Every page falls back to the branded default card.

## Indexing

- `robots.txt` points to the absolute sitemap URL and blocks admin, API and preview routes.
- Pages hidden from search use `<meta name="robots" content="noindex">`, never a `robots.txt` block, so crawlers can read the tag.
- Preview, staging and branch deployments send `noindex` for every page.
- The sitemap lists only indexable canonical URLs, with a `lastmod` from the real content update date.
- Structured data is JSON-LD in the initial HTML and matches what the page shows.

Use the `seo-setup` skill for tag tables, share images, structured data, crawl files, feeds, icons and CMS fields.
