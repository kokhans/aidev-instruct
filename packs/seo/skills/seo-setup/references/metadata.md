# Metadata and Sharing

## Page Tags

| Tag | Rule |
| --- | --- |
| `<html lang>` | Matches the page language. |
| `<title>` | Home: `Brand \| Tagline`. Others: `Page \| Brand`. One separator across the site. Aim for 50 to 60 characters. |
| `description` | 140 to 160 characters, unique per page, one plain sentence. |
| `canonical` | Absolute URL of the page itself, on the canonical host. |
| `robots` | Present only where the default changes: `noindex` or `noindex, follow`. |
| `theme-color` | Brand background color. Use two tags with `media` for light and dark. |
| `viewport` | `width=device-width, initial-scale=1`. Never `maximum-scale` or `user-scalable=no`. |

- Each piece of text has one source of truth. If the CMS owns a title, code does not override it.
- Titles never repeat the brand twice and never stuff keywords.

## Open Graph and X

Required on every page:

- `og:title`, `og:description`, `og:url` (equals the canonical), `og:type` (`website`, or `article` on posts), `og:site_name`, `og:locale`
- `og:image`, `og:image:width`, `og:image:height`, `og:image:type`, `og:image:alt`
- `twitter:card` set to `summary_large_image`. X falls back to the Open Graph title, description and image, so `twitter:title` and `twitter:image` are needed only when they differ.
- On posts: `article:published_time`, `article:modified_time` and `article:author`

Every URL is absolute HTTPS.

## Share Images

- 1200 x 630 px, PNG or JPG, under 1 MB. WebP, AVIF and SVG are not rendered by every preview bot.
- Every site has a branded default card. Every page falls back to it.
- The headline stays in the central area, because some apps crop the card to a square.
- The card's source (HTML template or design file) lives in the repository next to the exported image.
- Generated cards (an image route that renders HTML to PNG) are cached and return `Content-Type: image/png`.
- CMS images go through a transform that crops to 1200 x 630 and converts to JPG. Images narrower than 600 px are ignored in favor of the default card.
- Preview caches last days. After changing a card, re-scrape with LinkedIn Post Inspector and the Facebook Sharing Debugger.

## Errors and Status

- 404 and 500 pages are branded, `noindex`, and link to the home page and main sections.
- A moved page redirects with 301 or 308 to its new URL. A removed page returns 404 or 410.
