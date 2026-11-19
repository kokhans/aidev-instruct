---
description: Rendering streamed TanStack AI responses with TanStack Markdown's streaming profile.
globs: ["**/*.ts", "**/*.tsx"]
with: ["tanstack-ai"]
---

# TanStack Markdown With TanStack AI

- TanStack AI's `TextPart` already renders with TanStack Markdown. These rules apply to custom renderers.
- Streamed model text renders the accumulated string with `streamingMarkdownExtension()` from `@tanstack/markdown/extensions/streaming`, `frontmatter: false` and `headingIds: false`.
- The extensions array is created once at module scope.
- Model output is untrusted: `allowHtml` stays off, highlighters escape source, and outbound links and remote images follow an application policy.
- Very fast or long streams batch tokens into normal UI updates, because each update reparses the full text.
- HTML responses that stream long code fences use `createStreamingHtmlRenderer` from `@tanstack/markdown/html/streaming`, one session per response, with `reset()` when discarding it.
