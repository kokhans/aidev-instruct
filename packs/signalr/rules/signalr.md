---
description: ASP.NET Core SignalR hubs for typing, auth, authentication refresh, groups, reconnects, limits, scale-out and tests.
globs: ["**/*.cs"]
---

# SignalR

## Hubs

- Hubs are strongly typed: `Hub<IClient>`, where every `IClient` method returns `Task`. No string method names with `SendAsync`.
- Code outside a hub sends through `IHubContext<THub, IClient>`.
- Hubs are transient. No state in fields. Per-connection data lives in `Context.Items`, shared data in a store.
- Hub methods take and return record DTOs, validate their arguments, and are never overloaded.
- Long-running hub methods take a `CancellationToken`. A client that cancels its invocation cancels that token, for streaming and non-streaming methods.
- Errors meant for the client are `HubException`. `EnableDetailedErrors` stays off outside Development.
- A client runs one non-streaming invocation at a time (`MaximumParallelInvocationsPerClient` is 1). Hub methods return quickly, and long work reports back through `IHubContext`.

## Auth

- `[Authorize]` on every hub class, with policies on methods that need more.
- Browsers cannot set headers on WebSockets or Server-Sent Events. The client passes an access token factory, and `JwtBearerEvents.OnMessageReceived` reads `access_token` from the query string for hub paths only.
- `Clients.User(id)` routes by `IUserIdProvider`, which defaults to the `ClaimTypes.NameIdentifier` claim. Register a custom provider when the ID lives in another claim.
- `CloseOnAuthenticationExpiration` is on, so expired tokens end the connection.
- `EnableAuthenticationRefresh` on `MapHub` lets clients renew tokens without reconnecting. Proxies, firewalls and CORS rules also allow the hub's `/refresh` route.
- `OnAuthenticationRefresh` rejects refreshes that change the tenant or other claims the connection depends on. `MaximumAuthenticationExpiration` caps how far a refresh extends a connection.
- A refresh never changes `Context.UserIdentifier`. Switching users needs a new connection.

## Groups

- Group membership belongs to a connection and is not persisted. After a reconnect without stateful reconnect, the client calls a hub method to rejoin its groups.
- Hub methods that join a group check that the caller may read it.
- `OnDisconnectedAsync` cleans up presence data, which also expires on its own because servers can stop without calling it.

## Connections and Limits

- `MaximumReceiveMessageSize` stays at its 32 KB default. Large payloads go over HTTP, or as a stream.
- Stateful reconnect: `AllowStatefulReconnects` on `MapHub` and stateful reconnect on the client keep the connection and buffer messages across short drops. Size the buffer with `StatefulReconnectBufferSize`.
- `ClientTimeoutInterval` is double `KeepAliveInterval`, and the client server timeout is double the server keep-alive.
- MessagePack (`Microsoft.AspNetCore.SignalR.Protocols.MessagePack`) for high-volume or binary traffic.

## Scale-Out

- More than one server needs a backplane or Azure SignalR Service. Apps hosted on Azure use the service.
- The Redis backplane (`Microsoft.AspNetCore.SignalR.StackExchangeRedis`, `AddStackExchangeRedis`) runs in the same data center, with a `ChannelPrefix` (`RedisChannel.Literal("app")`) unique per app.
- The Redis backplane needs sticky sessions, unless every client uses WebSockets only with `SkipNegotiation`. Messages sent while Redis is down are lost.

## Testing

- Integration tests start the app with `WebApplicationFactory` and connect a .NET `HubConnection` with `HttpMessageHandlerFactory = _ => factory.Server.CreateHandler()` and `Transports = HttpTransportType.LongPolling`.
- Assert on messages received by client handlers with a timeout from the test cancellation token, never a fixed delay.
- Hub methods are unit tested with substitutes for `IHubCallerClients<IClient>` and `HubCallerContext`.
