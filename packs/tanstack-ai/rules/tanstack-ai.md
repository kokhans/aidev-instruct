---
description: "TanStack AI on the server: chat() routes, provider adapters, threadId, isomorphic tool definitions, approvals, structured output and the agent loop."
globs: ["**/*.ts", "**/*.tsx"]
---

# TanStack AI

Rules for the latest stable TanStack AI (`@tanstack/ai` plus one adapter package per provider).

## Packages

- Every `@tanstack/ai*` package moves to the same major at once. A 1.x client needs a 1.x server.
- Each provider exports one function per activity with the model ID inside: `openaiText('model')`, `anthropicText('model')`, `openaiEmbedding('model')`. `chat()` has no `model` option.
- Provider settings such as temperature and max tokens go in `modelOptions`.
- Provider API keys live in server environment variables only. The adapter reads them at runtime.

## Chat Routes

- A chat route reads input with `chatParamsFromRequest(request)` and returns `toServerSentEventsResponse(chat({ ... }))`.
- Every `chat()`, `summarize()` and generation call passes `threadId`. Chat routes forward `threadId`, `runId`, `parentRunId` and `resume` from the params, so paused runs (client tools, approvals) can continue.
- Extra client fields arrive as `forwardedProps`. Never trust them for identity or authorization: the user comes from the server session.
- Cancellation shares one `AbortController` between `chat({ abortController })` and `toServerSentEventsResponse(stream, { abortController })`.
- Non-streaming calls use `stream: false` and read `text` from the returned object.
- Typed output passes a Standard Schema as `outputSchema`. The call fails when the output does not match.

## Tools

- Tools are defined once with `toolDefinition({ name, description, inputSchema, outputSchema })` in a module shared by server and client. Schema drift between the two stops a client tool from resuming.
- The description says what the tool does and when to use it. Schema fields carry descriptions.
- `.server(fn)` runs on the server: databases, secrets, private APIs. `.client(fn)` runs in the browser: UI, storage, browser APIs. The server passes a client tool's bare definition to `chat()`.
- Request data such as the user ID and database client reaches tools through `chat({ context })`, typed with `.server<AppContext>()`.
- Expected failures return as data (`{ error }` declared in `outputSchema`), so the model can react. Unexpected errors throw.
- Tools that send email, pay, delete or publish set `needsApproval: true`.
- One job per tool. Tools are safe to call twice with the same input.
- Tools that must not overlap run with `toolExecution: 'sequential'`. Rarely used tools in a long list set `lazy: true`.
- The agent loop stops after five model turns by default. `agentLoopStrategy` with `maxIterations(n)` changes it.

The `tanstack-ai` skill covers tool flows, interrupts and the upgrade from 0.x.
