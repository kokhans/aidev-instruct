---
description: "TanStack Highlight: selective language registries, one shared highlighter for SSR and client, themes, trusted output and Markdown pipelines."
globs: ["**/*.ts", "**/*.tsx"]
---

# TanStack Highlight

Rules for the latest stable `@tanstack/highlight` 1.x. It targets documentation-sized code samples, not editors: no language detection, no editor state, no TextMate grammars.

## Registry

- One module creates the highlighter at module scope with `createHighlighter({ languages: [...] })` from `@tanstack/highlight/core`, importing each language from `@tanstack/highlight/languages/<name>`. Server and client import that same module.
- The registry lists only the languages the content uses. A language that embeds others needs them registered too, such as `js` and `css` for `<script>` and `<style>` in `html`.
- The root `@tanstack/highlight` helpers (`highlight`, `highlightToHtml`, `defaultHighlighter`) load every language. Browser code never imports them.
- A changed language set means a new highlighter. Registrations are never conditional on `window`.
- Unknown languages fall back to escaped `plaintext`. `fallbackLanguage` changes the fallback.

## Rendering

- Code blocks with a title, copy button or decorations use `highlighter.renderCodeBlockData({ code, lang, title, decorations })`, which returns `htmlMarkup` and `copyText`.
- `htmlMarkup` and `result.html` are inserted only when they come straight from the highlighter. Arbitrary HTML never travels in the same field.
- Server-rendered code is not highlighted again during hydration. The client highlighter handles only code that appears later, such as live previews.
- Server and client agree on source, registrations and their order, language, decorations, line-number option and package version. `renderCodeBlockData` trims trailing whitespace and `highlight` does not, so both paths use the same call.
- Large interactive input has a size limit or moves off the UI thread.
- React components receive props from `createHighlightedCodeBlockProps` in `@tanstack/highlight/react` and own their markup.

## Themes

- Colors come from CSS: `createThemeCss({ light, dark, darkSelector })` with themes from `@tanstack/highlight/themes/*`, added once. Theme switches never rehighlight, and caches never key on theme.
- Custom styling targets the stable `th-*` classes, never inline colors.

## Markdown Pipelines

- unified pipelines use `remarkHighlightCodeBlocks({ highlighter })` from `@tanstack/highlight/remark` before `remark-rehype`, which keeps HAST structured without raw HTML. `remarkCodeNodeToHtml` is only for pipelines that already accept raw HTML.
- Standalone fences with metadata render through `renderCodeFence` from `@tanstack/highlight/markdown`.
