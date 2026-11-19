---
description: Highlighting TanStack Markdown code fences with TanStack Highlight.
globs: ["**/*.ts", "**/*.tsx"]
with: ["tanstack-highlight"]
---

# TanStack Markdown With TanStack Highlight

- The Markdown `highlighter` is `createTanStackMarkdownHighlighter(highlighter)` from `@tanstack/highlight/markdown`. Highlight's own HTML methods add a second `<pre><code>` and are never passed directly.
- The highlighter registers only the languages the content uses. Unknown fences render as escaped plain text.
- Theme CSS from `createThemeCss` targets Markdown's wrapper classes: `codeBlockSelector: '.markdown-renderer pre.tm-code'` and `lineNumbersSelector: '.markdown-renderer .tm-code--line-numbers'`, with the rendered content inside `.markdown-renderer`.
- `codeLineNumbers` turns on line numbers in every renderer.
