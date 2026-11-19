---
name: seo-setup
description: Full search and sharing setup for public websites, independent of framework. Covers page metadata, Open Graph and X cards, share image rules, JSON-LD structured data, robots.txt, AI crawler decisions, sitemap, IndexNow, pagination and filters, RSS, favicons and the web manifest, and CMS SEO fields. Use when adding a page type, building the metadata helper, generating crawl files, wiring a CMS, or reviewing why a page does not index or preview correctly.
---

# SEO Setup

## References

| File | Covers |
| --- | --- |
| [metadata.md](references/metadata.md) | Tag table, title format, Open Graph, X cards, share images |
| [structured-data.md](references/structured-data.md) | JSON-LD types per page, articles and authors |
| [crawling.md](references/crawling.md) | Robots, AI crawlers, sitemap, IndexNow, pagination and filters, RSS |
| [assets-and-cms.md](references/assets-and-cms.md) | Icons, web manifest, CMS fields and revalidation |

## Use

- New page type: `metadata.md`, then `structured-data.md`.
- Crawl files, feeds or a page missing from search: `crawling.md`.
- Icons, manifest or CMS integration: `assets-and-cms.md`.
- Verify by fetching raw HTML with `curl -A "facebookexternalhit/1.1"` and `curl -A "LinkedInBot/1.0"`. Never judge metadata from the rendered DOM.

## Decisions

- Google ignores `priority` and `changefreq` in sitemaps. Leave them out.
- Google no longer uses `rel="next"` and `rel="prev"`. Each paginated page is canonical to itself.
- Search engines need no `llms.txt`, AI text files or special schema for AI answers. Add `/llms.txt` only when the project wants it for other tools.
- Google Search shows no FAQ (since May 2026) or HowTo rich results. Skip that markup unless another consumer needs it.
