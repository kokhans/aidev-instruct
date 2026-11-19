# Caching

## Cache-Control per Resource

| Resource | Header |
| --- | --- |
| Hashed scripts, styles, fonts, images | `public, max-age=31536000, immutable` |
| Public HTML | `public, max-age=0, s-maxage=300, stale-while-revalidate=86400`, tuned per site |
| HTML with a CSP nonce, a session or personal data | `private, no-cache` |
| `robots.txt`, `sitemap.xml`, feeds, icons, manifest | `public, max-age=3600` |
| API responses with user data | `private, no-store` |
| Share images | `public, max-age=86400`, and a new URL when the image changes |

- File names carry a content hash, so a deploy never needs a cache purge for assets.
- CDN caches vary only on what changes the response. `Vary: Cookie` on public HTML splits the cache per visitor and defeats it.
- CMS publishing revalidates or purges the affected HTML paths instead of lowering every TTL.

## Back/Forward Cache

- Never register `unload` handlers. Use `pagehide` or `visibilitychange`.
- `Cache-Control: no-store` can block the cache. Use `private, no-cache` for personal HTML instead.
- Close open `WebSocket`, `BroadcastChannel` and IndexedDB connections on `pagehide` and reopen on `pageshow`.
- Check eligibility in DevTools, Application panel, Back/forward cache test.

## Images and Embeds

- Page images go through an image CDN or a build step that resizes them and serves AVIF or WebP by `Accept` header or `<picture>`.
- YouTube uses `www.youtube-nocookie.com` and maps use a static image until the user clicks.
