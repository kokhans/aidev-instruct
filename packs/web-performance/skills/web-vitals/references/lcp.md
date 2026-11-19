# Largest Contentful Paint

## Phases

| Phase | Typical cause | Fix |
| --- | --- | --- |
| Time to first byte | Slow server render, no CDN, redirects | Cache HTML at the edge, stream the shell, remove redirect chains |
| Resource load delay | LCP image discovered late (CSS background, client-rendered, lazy-loaded) | Put it in the initial HTML as `<img>` with `fetchpriority="high"`, or preload it |
| Resource load duration | Oversized image, wrong format | Serve AVIF or WebP at the rendered size through `srcset` and `sizes` |
| Element render delay | Render-blocking CSS or scripts, hidden by animation, waiting on a web font | Inline critical CSS, defer scripts, never animate the LCP element in |

## Images

- The hero image is an `<img>` in the HTML, not a CSS background and not inserted by client code.
- `fetchpriority="high"` on the LCP image only. Never `loading="lazy"` on it.
- `sizes` matches the real layout widths. A wrong `sizes` downloads the largest file.
- Responsive art direction uses `<picture>` with `media` sources, each with dimensions.
- Images below the fold use `loading="lazy"` and `decoding="async"`.

## Fonts

- Self-hosted WOFF2, variable where the design uses several weights, subset per script with `unicode-range`.
- The main text face is preloaded: `<link rel="preload" as="font" type="font/woff2" crossorigin>`.
- `font-display: swap` with a fallback `@font-face` tuned by `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override`, so the swap does not shift text.
- Preload only the main text face. Every extra preload competes with the LCP image.

## Server and Network

- HTML for anonymous visitors is served from a CDN cache with `stale-while-revalidate`.
- `preconnect` only to the few third-party origins the first render needs, such as an image CDN.
- `103 Early Hints` or `Link` preload headers help when the server render is slow.
- Speculation Rules (`<script type="speculationrules">`) can prerender likely next pages in Chromium browsers. Use `eagerness: "moderate"` and exclude logout and cart actions. Under a strict CSP the rules script carries the nonce.
