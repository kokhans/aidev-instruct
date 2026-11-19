---
name: tanstack-ai
description: Builds and reviews TanStack AI features. Covers adding a streaming chat end to end, choosing a transport, designing server and client tools, approval and other interrupts, structured output, the agent loop, security review, and upgrading from 0.x releases. Use when adding or changing an AI chat, tool, generation endpoint or chat UI built on TanStack AI, or when upgrading TanStack AI.
---

# TanStack AI

TanStack AI is a provider-agnostic TypeScript AI SDK. A server route runs `chat()` with a provider adapter and streams AG-UI events. A framework hook (`useChat` in React) renders the stream. Check the installed `@tanstack/ai` version in `package.json` before applying any step.

## Add a Chat

1. Install `@tanstack/ai`, the framework package (`@tanstack/ai-react`) and one adapter package per provider (`@tanstack/ai-openai`, `@tanstack/ai-anthropic`, `@tanstack/ai-gemini` and others).
2. Put the provider key in the server environment.
3. Add a POST endpoint: `chatParamsFromRequest(request)`, then `chat({ adapter, messages, threadId, runId, parentRunId, resume, tools })`, then `toServerSentEventsResponse(stream)`.
4. Render with `useChat({ connection, threadId })` and map `message.parts`.
5. Add tools, approvals or `outputSchema` as needed.

## Choose a Transport

| App                                              | Client side                   | Server side                  |
| ------------------------------------------------ | ----------------------------- | ---------------------------- |
| Ordinary HTTP server                             | `fetchServerSentEvents(url)`  | `toServerSentEventsResponse` |
| Runtime or proxy that blocks SSE                 | `fetchHttpStream(url)`        | `toHttpResponse`             |
| Host that buffers streams                        | `fetchJson(url)`              | `toJsonResponse`             |
| React Native or Expo                             | `xhrHttpStream(url)`          | `toHttpResponse`             |
| TanStack Start server function                   | `fetcher` option on `useChat` | `toServerSentEventsResponse` |
| In-process `AsyncIterable` (tests, RSC streams)  | `stream(factory)`             | The `chat()` stream          |
| RPC framework method returning an async iterable | `rpcStream(...)`              | The `chat()` stream          |
| One long-lived resumable socket for many runs    | `webSocket(...)`              | `toWebSocketResponse`        |

Headers, auth tokens and extra body fields go through the transport's request options.

## Design Tools

| Tool runs                                 | Definition                               | Server `chat()` gets | Client hook gets                     |
| ----------------------------------------- | ---------------------------------------- | -------------------- | ------------------------------------ |
| On the server                             | `toolDefinition(...).server(fn)`         | The server tool      | Nothing                              |
| In the browser                            | `toolDefinition(...)` plus `.client(fn)` | The bare definition  | The client tool                      |
| After user approval                       | Definition with `needsApproval: true`    | The server tool      | The definition, for typed interrupts |
| At the provider (web search, code runner) | The adapter's `/tools` export            | The provider tool    | Nothing                              |

Details, call states and interrupts: [tools](references/tools.md).

## Structured Output

- Pass the same Standard Schema as `outputSchema` to `chat()` and to `useChat`. The hook exposes `partial` while streaming and `final` at the end, typed from the schema.
- Without `stream: true`, `chat({ outputSchema })` resolves to the parsed object, which suits scripts and server jobs.
- The adapter uses the provider's native structured-output API. A non-matching answer fails the call.

## Agent Loop

- One run can call tools several times. The default stop is five model turns or an answer cut by the output limit: `combineStrategies([maxIterations(5), untilFinishReason(['length'])])`.
- `agentLoopStrategy` replaces the default. Raise `maxIterations` only for tasks that need long tool chains.
- `chat({ toolChoice })` applies to every model call of the run, so `'required'` or a named tool never yields a text answer. A per-call choice, such as a forced tool on the first turn, comes from a middleware `onConfig`.

## Security Review

- [ ] Provider keys are only in server code and environment. Bring-your-own-key flows use the documented BYOK support.
- [ ] Identity and permissions come from the server session, passed to tools through `context`. Nothing in `forwardedProps` grants access.
- [ ] Every tool validates business rules beyond its `inputSchema`.
- [ ] Destructive or costly tools set `needsApproval: true`, and expensive ones are rate limited.
- [ ] Tool runs are logged for audit.
- [ ] Model text renders with raw HTML escaped and executable URLs removed.
- [ ] External calls in tools have timeouts, and the route forwards an `AbortController` so `stop()` ends the run.

## Upgrade From 0.x

Follow [upgrade to 1.0](references/migrate-to-1-0.md), then run the type checker.
