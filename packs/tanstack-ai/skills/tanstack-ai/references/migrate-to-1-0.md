# Upgrade to 1.0

1.0 removes every API that 0.x marked deprecated. Each replacement already shipped in 0.x.

## Steps

1. Run the official codemod: `jscodeshift --parser=tsx -t https://raw.githubusercontent.com/TanStack/ai/main/codemods/ag-ui-compliance/transform.ts "src/**/*.{ts,tsx}"`. Add `--dry --print` to preview.
2. Update every `@tanstack/ai*` package to 1.x together. Remove `@tanstack/ai-react-ui`, `@tanstack/ai-solid-ui` and `@tanstack/ai-vue-ui`: they have no 1.0.
3. Run the type checker and fix each error with the tables below.
4. Migrate saved data before deploying.
5. Search for removed names: `pendingInterrupts`, `resumeInterrupts(`, `addToolApprovalResponse`, `conversationId`, `getVideoUrl`, `durationSeconds`, `unitsBilled`, `body.data`.

## Early 0.x Releases

| Before | After |
| --- | --- |
| `openai()` with a `model` option | `openaiText('model')`, one function per activity |
| `options: { temperature }`, `providerOptions` | `modelOptions` |
| `toResponseStream` | `toServerSentEventsStream` |
| `embedding()` | `embed()` |
| `createWebSearchTool` from `@tanstack/ai-openrouter` | `webSearchTool` from `@tanstack/ai-openrouter/tools` |
| `await chat({ stream: false })` as a string | `const { text } = await chat({ stream: false })` |

## Client

| Before | After |
| --- | --- |
| `useChat({ body })` | `useChat({ forwardedProps })` |
| No `threadId` | `threadId` required on every chat and generation hook |
| `pendingInterrupts` | `interrupts` |
| `resumeInterrupts(items)`, `addToolApprovalResponse()` | `interrupt.resolveInterrupt(...)`, `interrupt.cancel()`, `resolveInterrupts(...)` |
| `interrupt.error` | `interrupt.errors[0]` |
| `Chat`, `ChatMessages`, `ChatInput`, `ToolApproval` components | `createChatHook` from `@tanstack/ai-react/ui` with your own components |
| `useWebMCPTools` | `useRegisterWebMCPTools` |
| Persistence `getItem` returning `UIMessage[]` | Return `{ messages }` |

`createChatHook` no longer takes `threadId`. Pass it on each call: `useAppChat({ threadId })`.

## Server

| Before | After |
| --- | --- |
| `chat({ conversationId })` | `chat({ threadId: params.threadId })` |
| `threadId` optional on `chat()`, `summarize()`, generation functions | Required |
| Reading `body.data` | Read `forwardedProps` |
| `ctx.conversationId` in middleware | `ctx.threadId` |
| `TokenUsage.durationSeconds`, `unitsBilled` | `usage.billed` with `quantity` and `unit` |
| Adding cache tokens to `promptTokens` (Anthropic, Bedrock, Claude Code) | `promptTokens` already includes them |
| `AGUIEventType`, `StreamChunkType` | `EventType` |

Generation routes read `threadId` and `runId` with `generationParamsFromRequest()`.

## Custom Servers

A server that streams to a TanStack AI client without `chat()` ends runs with `RUN_FINISHED` instead of `data: [DONE]`, sets top-level `message` on `RUN_ERROR`, sends thinking as `REASONING_*` events, and sends approvals and client tools as interrupts.

## Saved Data

- Resolve or drop pending interrupts saved before interrupt bindings existed.
- Client persistence wraps old arrays: `Array.isArray(saved) ? { messages: saved } : saved`.
- Artifact records need `blobKey`.
