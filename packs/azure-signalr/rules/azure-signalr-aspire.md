---
description: Azure SignalR Service in an Aspire AppHost, the hub host connection and the serverless emulator.
globs: ["**/*.cs"]
with: ["aspire"]
---

# Azure SignalR Service with Aspire

- The AppHost adds the resource with `AddAzureSignalR("signalr")` from `Aspire.Hosting.Azure.SignalR`, which provisions Default mode.
- Hub host projects get it with `WithReference(signalR)` and `WaitFor(signalR)`.
- The hub host reads the injected connection with `AddSignalR().AddNamedAzureSignalR("signalr")`. The name matches the AppHost resource.
- Generated infrastructure disables local auth and assigns the `SignalR App Server` role to the hub host identity. Customize it with `ConfigureInfrastructure`, never by editing the generated Bicep.
- `RunAsEmulator()` runs the emulator container locally and works only with `AddAzureSignalR("signalr", AzureSignalRServiceMode.Serverless)`.
- Without `RunAsEmulator()`, a local run provisions a real Azure resource and needs an Azure subscription.
