# Crawling and Indexing

## Robots

- `robots.txt` allows everything public, blocks admin, API and preview routes, and lists `Sitemap:` with the absolute sitemap URL.
- Preview, staging and branch deployments send `X-Robots-Tag: noindex` or a meta `robots` tag on every page, and block everything in their own `robots.txt`.
- A `robots.txt` block never hides a page from results. Use `noindex` and leave the URL crawlable.
- Snippet controls (`nosnippet`, `data-nosnippet`, `max-snippet`) limit what search and AI answers quote.

## AI Crawlers

Decide per project and write the decision into `robots.txt`. Training crawlers and answer or search crawlers are separate tokens, so one can be blocked without the other.

| Purpose | Tokens |
| --- | --- |
| Model training | `GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Applebot-Extended` |
| AI search and answers | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` |
| User-triggered fetches | `ChatGPT-User`, `Claude-User`, `Perplexity-User` |

- `Google-Extended` controls Gemini training and grounding, not Google Search or AI Overviews. Pages stay in AI Overviews unless they use `noindex` or snippet controls.
- OpenAI and Perplexity state that their user-triggered fetchers may not follow `robots.txt`. Block them at the server when that matters.
- Check each vendor's crawler page before relying on a token: lists change.

## Sitemap

- Generated at `/sitemap.xml` from routes and CMS content, never written by hand.
- Lists only indexable canonical URLs, absolute, on the canonical host. No redirects, 404s or `noindex` pages.
- `lastmod` is the content's real update date. Google uses it only when it is consistently accurate.
- Up to 50,000 URLs or 50 MB uncompressed per file. Larger sites use a sitemap index.
- Multi-language sites list alternates per URL (see the `i18n` pack when installed).

## IndexNow

- Publishing, updating or deleting a page notifies IndexNow (Bing, Yandex, Seznam and others) with the changed URLs.
- The key file is served at the site root. Google does not use IndexNow and relies on the sitemap.

## Pagination and Filters

- Paginated pages use real links and a canonical to themselves: `/blog?page=2` is canonical to itself, not to page 1.
- Filter and sort URLs that should not be indexed are disallowed in `robots.txt` or kept in the URL fragment. Google rates `rel="canonical"` as less effective for them in the long term.
- Crawlable filter URLs use `&` between parameters, a fixed filter order, and return 404 for combinations with no results.
- A filter that deserves search traffic becomes its own page with a clean URL and unique content: `/blog/security`.
- Infinite scroll also exposes paginated URLs that work without JavaScript.

## RSS

- Blogs publish `/rss.xml` (RSS 2.0) or an Atom feed with absolute URLs and a title, summary, date and author per item.
- Every page links it in the head: `<link rel="alternate" type="application/rss+xml" title="..." href="...">`.
- The feed sends `Content-Type: application/rss+xml; charset=utf-8`.
