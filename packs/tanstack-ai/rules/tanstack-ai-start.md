---
description: "TanStack AI in TanStack Start: chat through server routes or server functions with the fetcher transport."
globs: ["**/*.ts", "**/*.tsx"]
with: ["tanstack-start"]
---

# TanStack AI With TanStack Start

- A chat without its own HTTP route is a `createServerFn({ method: 'POST' })` whose handler returns `toServerSentEventsResponse(chat({ ... }))`.
- The client passes that server function to `useChat` as the top-level `fetcher`, not as `connection`, and forwards the `signal`: `fetcher: ({ messages, threadId }, { signal }) => chatFn({ data: { messages, threadId }, signal })`.
- The server function validates its input with `.validator()`, never the removed `.inputValidator()` that some TanStack AI examples still show.
- A server route works too: it returns the `Response` from `toServerSentEventsResponse`. A `Response` thrown by `chatParamsFromRequest` for a bad body reaches the client as a 400 without extra handling.
- Generation hooks (`useGenerateImage` and the others) take a `fetcher` that calls a server function. A server function that returns the result gives JSON; one that returns `toServerSentEventsResponse(generateImage({ ..., stream: true }))` streams.
