---
description: "TanStack Markdown: entry points, the supported syntax profile, parse-once rendering, URL and HTML security, code highlighting and extensions."
globs: ["**/*.ts", "**/*.tsx", "**/*.md"]
---

# TanStack Markdown

Rules for the latest stable `@tanstack/markdown` 1.x.

## Entry Points

- Code imports the narrowest entry: `@tanstack/markdown/parser` for `parseMarkdown`, `@tanstack/markdown/html` for `renderHtml`, an adapter such as `@tanstack/markdown/react`, and `@tanstack/markdown/extensions/*` for optional syntax.
- Content is parsed once with `parseMarkdown` and the serializable document is cached or passed to any renderer. Static content is parsed during the build or server render.

## Syntax

- The supported contract is the TanStack docs syntax profile, not full CommonMark or GFM. Content uses `#` headings and fenced code blocks: setext headings and indented code blocks are not supported.
- MDX, JSX in Markdown and evaluated code are out of scope. Rich content uses comment-delimited component blocks from the docs extensions.
- Bare URLs become links only with the autolinks extension.
- Fence metadata (`file="app.tsx"`, `{2,4-6}`) is data. Values chosen from it are validated, never evaluated.
- Callouts, heading collection for a table of contents, tabs and framework blocks come from the docs extensions, not custom regex passes.

## Security

- Raw HTML stays escaped. `allowHtml: true` is set only for trusted, repository-authored content, or with a sanitizer after rendering.
- Link and image policies use `urlTransform(url, kind, defaultUrl)` during parsing. Returning `defaultUrl` keeps the built-in protocol screening, `null` removes the link or image.
- A document AST from outside the app (JSON from a client or store) is validated before rendering: URL screening happens only while parsing Markdown text.
- A `highlighter` returns trusted, escaped markup, because its output is inserted without further escaping.
- Untrusted input has an application size limit. The parser bounds nesting, not total work.
- Extensions that return HTML or URLs follow the same trust rules as the app.

## Extensions

- Custom syntax is a `MarkdownExtension` with synchronous hooks. Inline syntax that must see raw characters uses `inlineParser` with `markers`, and checks the full token at the index.
- Custom presentation returns portable component nodes, not HTML strings.
