---
description: Azure SignalR Service with ASP.NET Core SignalR for service modes, managed identity, sending from other services, shutdown, local development and limits.
globs: ["**/*.cs", "**/appsettings*.json", "**/*.bicep"]
---

# Azure SignalR Service

## Modes

- Default mode when the app hosts hubs: `AddSignalR().AddAzureSignalR()` with `Microsoft.Azure.SignalR`. The service proxies clients to hub servers.
- Serverless mode only when no hub server exists, such as Azure Functions bindings. Upstream endpoints work only in Serverless mode.
- Never Classic mode. A resource that needs both models is split into one Default and one Serverless resource.
- Default mode needs at least one connected hub server. With none, clients fail to connect, so deployments keep an instance running.

## Identity

- The app server authenticates with Microsoft Entra ID, never access keys. Access keys are disabled on the resource.
- Connection strings carry no key: `Endpoint=https://<name>.service.signalr.net;AuthType=azure.msi;Version=1.0;`, plus `ClientId=<id>` for a user-assigned identity.
- The hub server identity has the `SignalR App Server` role. Code that only sends messages through the REST API has `SignalR REST API Owner`.
- Configuration key is `Azure:SignalR:ConnectionString`. Several endpoints use `Azure:SignalR:ConnectionString:<name>:<primary|secondary>`.

## Hub Servers

- Clients are redirected to the service on negotiate, so the app needs no sticky sessions and no Redis backplane.
- Stateful reconnect needs `Microsoft.Azure.SignalR` 1.26.1 or later.
- `GracefulShutdown.Mode` set to `MigrateClients` or `WaitForClientsClose` keeps clients connected while a hub server stops. `GracefulShutdown.Add<THub>` sends a closing message first.
- Hubs that keep per-connection state read `IConnectionMigrationFeature` in `OnConnectedAsync` and `OnDisconnectedAsync`.

## Sending From Other Services

- Services without hubs send with `Microsoft.Azure.SignalR.Management`: `ServiceManagerBuilder`, then `CreateHubContextAsync<IClient>(hubName, ct)` for a typed `ServiceHubContext<IClient>`.
- A hub context is expensive. Create one per hub at startup, reuse it, and dispose it on shutdown.
- `Persistent` transport for high message volume, `Transient` (REST) when WebSockets are blocked or messages are rare.
- `UseJsonObjectSerializer(new JsonObjectSerializer(...))` matches the hub server's JSON naming, so clients receive the same shapes.

## Local Development

- Default mode develops against self-hosted SignalR. Configuration enables Azure SignalR outside Development only.
- The local emulator (`asrs-emulator`, tool `Microsoft.Azure.SignalR.Emulator`) supports Serverless mode and the `Transient` transport only.

## Limits

- A Standard or Premium unit holds 1,000 concurrent connections and includes 1,000,000 outbound messages per day. Free holds 20 connections.
- Outbound messages are billed in 2 KB chunks. Inbound messages are free.
- Each hub server opens five server connections per hub by default, and they count toward the connection total.
- REST API message bodies are limited to 1 MB. Large messages slow delivery: keep them small and move bulk data over HTTP.
