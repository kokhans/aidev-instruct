---
description: "TanStack Markdown React renderer: the Markdown component, pre-parsed documents and component overrides."
globs: ["**/*.tsx"]
with: ["react"]
---

# TanStack Markdown With React

- Markdown renders with `<Markdown>{source}</Markdown>` from `@tanstack/markdown/react`, never through `dangerouslySetInnerHTML` of `renderHtml` output.
- `Markdown` returns a fragment, so the caller wraps it in its own semantic element such as `<article>`.
- Server-rendered pages pass a document from `parseMarkdown` as the child instead of reparsing on every render.
- Link and image behavior (external `rel`, router links, image components) comes from the `components` prop, typed with `satisfies MarkdownComponents`. A custom `a` keeps rejecting executable protocols.
- `renderMarkdownReact` renders outside JSX.
