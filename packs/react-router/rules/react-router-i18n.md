---
description: Language segments, html lang and localized meta tags in React Router.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx"]
with: ["i18n"]
---

# React Router Languages

- A `:lang` segment carries the language, declared once with `prefix(':lang', [...])` or an optional `:lang?` segment for the default language.
- The root loader validates the segment and throws a 404 for unknown values.
- The root `Layout` renders `<html lang>` from the loader's language.
- The page meta component renders `<link rel="alternate" hrefLang={lang} href={url} />` for each translation plus `x-default`, all absolute.
- `og:locale` matches the page language. `og:locale:alternate` lists the others.
- No middleware or loader redirects by `Accept-Language` or IP, so crawlers reach every language.
