---
description: Localized metadata, hreflang annotations and multi-language sitemaps.
globs: ["**/*.tsx", "**/*.jsx", "**/*.html", "**/*seo*.ts", "**/*meta*.ts", "**/sitemap.ts", "**/*.xml"]
with: ["seo"]
---

# Multi-Language SEO

## Hreflang

- Every page lists all its language versions with `hreflang`, including itself, plus `x-default` for the language chooser or default version.
- Annotations are reciprocal. When two pages do not point to each other, search engines ignore both.
- Every URL is absolute HTTPS on the canonical host.
- Codes are ISO 639-1 languages with optional ISO 3166-1 alpha-2 regions: `de`, `de-AT`, `en-GB`. Never a region alone.
- Use one method per site: `<link rel="alternate">` in the head, `Link` headers, or sitemap entries. The shared metadata helper generates them from the route's available locales.

## Canonical and Metadata

- Each language version is canonical to itself. A translation never points its canonical at another language.
- Title, description and `og:image:alt` are translated per language.
- `og:locale` uses the `language_TERRITORY` form (`de_DE`) and matches the page. `og:locale:alternate` lists the other versions.
- Structured data uses `inLanguage` and the translated text.

## Sitemap and Feeds

- The sitemap lists each URL with `xhtml:link` alternates for every language, including itself.
- A page that exists in only some languages lists only those alternates.
- Each language has its own RSS feed when the blog is translated.
