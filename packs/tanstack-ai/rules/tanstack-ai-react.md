---
description: "TanStack AI in React: useChat, stable thread IDs, message parts, client tools, approval interrupts, transports and the chat UI factory."
globs: ["**/*.tsx"]
with: ["react"]
---

# TanStack AI With React

- Chats use `useChat` from `@tanstack/ai-react` with a `connection` (`fetchServerSentEvents('/api/chat')` by default) and a `threadId`.
- `threadId` is a stable conversation ID from the route or the database. A new random ID per render starts a new conversation.
- Messages render from `message.parts` by `part.type` (`text`, `tool-call`, `tool-result` and others), never from a single content string.
- While `isLoading` is true the UI offers `stop()`.
- Client tool implementations (`definition.client(fn)`) are created at module scope and passed in `tools`.
- Approval tools pass their definitions in `tools` for typed `interrupts`. Each `tool-approval` interrupt is answered with `interrupt.resolveInterrupt(true)` or `(false)`, with the buttons disabled while `!interrupt.canResolve` or `resuming`.
- Chat-level extra data goes in `forwardedProps`. `body` stays only on transport options and `sendMessage(content, { body })`.
- Transport choice: `fetchServerSentEvents` by default, `fetchHttpStream` where a runtime or proxy blocks SSE, `fetchJson` where a host buffers streams.
- A full chat UI comes from `createChatHook` in `@tanstack/ai-react/ui`, with the app's own components. The removed `Chat`, `ChatMessages`, `ChatInput`, `ToolApproval` and `@tanstack/ai-react-ui` are never used.
- Model text renders through `TextPart` from `@tanstack/ai-react/ui`, which escapes raw HTML and removes executable URLs. Its code highlighter comes from `createTanStackMarkdownHighlighter` in `@tanstack/highlight/markdown`, never one that returns unescaped source.
