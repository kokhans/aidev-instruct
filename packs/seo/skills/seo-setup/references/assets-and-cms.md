# Icons, Manifest and CMS

## Icons and Manifest

| File | Rule |
| --- | --- |
| `favicon.ico` | 32 x 32, at the site root, for crawlers and old browsers |
| `icon.svg` | Linked with `<link rel="icon" type="image/svg+xml">`. May adapt to dark mode with a `prefers-color-scheme` media query inside. |
| `apple-touch-icon.png` | 180 x 180, square, solid background, no transparency |
| `site.webmanifest` | `name`, `short_name`, `icons` (192 and 512, plus a `maskable` 512), `theme_color`, `background_color`, `display` |

- Google Search reads the favicon from the home page `<link rel="icon">`. SVG is not among its supported formats, and Google recommends larger than 48 x 48 px, so link a square 96 x 96 PNG next to the SVG.

## CMS Fields

- Every page type has SEO fields: title, description and share image. Each field's help text states the rules from `metadata.md`.
- The share image field is optional. It warns on the wrong size or format, and the default card covers it when empty.
- A `noindex` toggle exists per document for thin or temporary pages.
- Slugs are generated once and editable. Changing a published slug creates a redirect from the old URL.

## CMS Data Flow

- Detail queries filter by slug. A missing or unpublished record returns 404.
- Drafts render only in preview mode, which is `noindex` and never cached publicly.
- Publishing calls a webhook that revalidates the affected pages, lists, sitemap and feed. No redeploy needed.
- The webhook verifies a shared secret or signature before revalidating.
