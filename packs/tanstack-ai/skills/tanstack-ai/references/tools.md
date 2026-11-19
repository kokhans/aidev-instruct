# Tools

## Flow

1. `chat()` sends each tool's name, description and input schema to the model.
2. The model returns a tool call with arguments.
3. `chat()` validates the arguments against `inputSchema`.
4. A server tool runs inside the same run. A client tool or an approval ends the run with an interrupt.
5. The browser runs the client tool or collects the user's answer, then sends a new request. The route forwards `parentRunId` and `resume`, and `chat()` rebuilds the paused call from the message history.
6. The result goes back to the model, which answers or calls another tool.

No server-side store is needed for pauses: the browser sends the full history with the answer.

## Shared Definitions

```ts
// tools/definitions.ts, imported by server and client
export const sendEmailDef = toolDefinition({
  name: 'send_email',
  description: 'Send an email to a recipient',
  inputSchema: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
  outputSchema: z.object({ sent: z.boolean() }),
  needsApproval: true,
})
```

- Server: `sendEmailDef.server(async (input, ctx) => ...)`. `ctx.context` holds the typed `chat({ context })` value.
- Client: `def.client((input) => ...)` at module scope, passed to the hook's `tools`.
- A client tool resumes only when its schemas, `outputSchema` included, match the server's. A mismatch shows up as a generic interrupt that waits forever.

## Results and Errors

- Declare `error` in `outputSchema` and return `{ error: 'User not found' }` for expected failures. The model sees your message.
- A thrown error becomes a tool error with a message you do not control.
- Long server tools stream progress events instead of going silent.

## Interrupts

- `useChat` returns `interrupts`. Each has a `kind`: `tool-approval` for approvals, generic interrupts for your own questions, `unbound` for a pause from an old server that cannot resume.
- An approval is answered with `interrupt.resolveInterrupt(true)` or `(false)`. A denied call does not run, and the model receives a denied result.
- `interrupt.cancel()` and `resolveInterrupts(...)` answer in other ways. `interrupt.errors[0]` holds the latest failure.
- Buttons stay disabled while `!interrupt.canResolve` or while `resuming` is true.

## Call States

A `tool-call` part moves through `awaiting-input`, `input-streaming`, `input-complete`, then `approval-requested` and `approval-responded` for approvals. A sibling `tool-result` part shows `complete` or `error`. Render progress from these states.

## Execution Control

- Server tools in one turn run in parallel. `toolExecution: 'sequential'` runs them one at a time in call order. Client tools run as their calls arrive either way.
- `lazy: true` keeps a rarely used tool out of the prompt until the model discovers it, which keeps long tool lists cheap.
- Provider tools come from each adapter's `/tools` subpath, such as `webSearchTool` from `@tanstack/ai-anthropic/tools`. A model that does not support a provider tool is a type error.
- MCP server tools and Code Mode (one generated program calling many tools) are separate features with their own setup.

## Design

- One job per tool, with a description that says when to use it.
- Repeated calls with the same input are safe.
- Cache results where the data allows it, and set timeouts on external APIs.
