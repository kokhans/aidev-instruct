---
description: Language segments, root params and localized metadata in the Next.js App Router.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx", "**/proxy.ts"]
with: ["i18n"]
---

# Next.js Languages

- A `[lang]` segment at the root of `app` carries the language. Its layout renders `<html lang={lang}>`, and `generateStaticParams` lists every language.
- Deep components read the language with `lang()` from `next/root-params`. Inside `'use cache'`, only the root params a function reads join its cache key.
- An unknown language calls `notFound()` in the root layout.
- `alternates.languages` lists every translation plus `x-default`, resolved against `metadataBase`.
- `openGraph.locale` matches the page language. `openGraph.alternateLocale` lists the others.
- `app/sitemap.ts` adds `alternates.languages` to each entry.
- Proxy never redirects by `Accept-Language` or IP, so crawlers reach every language. A language switcher links to the other versions.
