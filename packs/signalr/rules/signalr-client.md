---
description: The @microsoft/signalr TypeScript client for connections, reconnects, token refresh, handlers and invocations.
globs: ["**/*.ts", "**/*.tsx"]
with: ["typescript"]
---

# SignalR TypeScript Client

## Connection

- `@microsoft/signalr`, latest stable. One `HubConnection` per hub, created once and shared by the app.
- `withUrl(url, { accessTokenFactory })` supplies the token. The factory returns a fresh token on every call.
- Cross-origin hubs use an absolute URL and a server CORS policy with the exact origins and credentials.
- `withAutomaticReconnect()` on every connection. It does not retry a failed `start()`: retry that with backoff.
- `withStatefulReconnect()` when the hub allows stateful reconnects, so short drops lose no messages.
- `withAuthenticationRefresh()` when the hub enables authentication refresh. `refreshAuthentication()` renews at once, for example after claims change.
- `@microsoft/signalr-protocol-msgpack` with `withHubProtocol(new MessagePackHubProtocol())` when the server uses MessagePack.

## Handlers and Calls

- `on` handlers register before `start()` and are removed with `off` when their view unmounts.
- Hub method names and payloads live in one typed module, so components never pass raw method name strings.
- `invoke` when the caller needs the result or the error, `send` for fire and forget.
- `stream` returns an `IStreamResult`. The subscription is disposed when the consumer stops.

## State

- `onreconnecting` shows a degraded state and disables actions that need the hub.
- `onreconnected` rejoins groups and resyncs data. It receives a new connection ID.
- `onclose` fires after reconnects run out. It restarts the connection or tells the user.
- Browsers can put background tabs to sleep and close the connection. Apps that must stay connected hold a Web Lock (`navigator.locks.request`) while connected and release it on stop.
