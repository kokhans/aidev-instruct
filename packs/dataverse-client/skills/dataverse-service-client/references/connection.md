# Connection and Lifetime

## Connection Strings

| Scenario | Connection string |
| --- | --- |
| Service with client secret | `AuthType=ClientSecret;Url=https://<org>.crm.dynamics.com;ClientId=<app id>;ClientSecret=<secret>` |
| Service with certificate | `AuthType=Certificate;Url=https://<org>.crm.dynamics.com;ClientId=<app id>;Thumbprint=<thumbprint>` |
| Interactive tool | `AuthType=OAuth;Url=https://<org>.crm.dynamics.com;AppId=<app id>;RedirectUri=<uri>;LoginPrompt=Auto;TokenCacheStorePath=<path>` |

- Dataverse online accepts only `OAuth`, `Certificate`, `ClientSecret` and the deprecated `Office365`. `AD` and `IFD` are on-premises values.
- `LoginPrompt=Never` for any process without a user interface.
- `RequireNewInstance=true` when two clients in one process must not share a connection.
- The application ID is registered in Microsoft Entra ID and added to each environment as an application user with a least-privilege security role.
- Microsoft recommends a more secure flow, such as managed identity, over secrets in connection strings wherever one is available.

## Token Provider

```csharp
var credential = new DefaultAzureCredential();
var instanceUrl = new Uri(configuration["Dataverse:Url"]!);

var client = new ServiceClient(
    instanceUrl,
    async resource =>
    {
        var scope = new Uri(new Uri(resource), "/.default").ToString();
        var token = await credential.GetTokenAsync(new TokenRequestContext([scope]), default);
        return token.Token;
    },
    true,
    logger);
```

- The callback receives the instance URI and returns an access token whenever the client needs one. Azure Identity caches and refreshes tokens.
- This constructor is the choice for managed identity, workload identity and on-behalf-of flows in web apps.
- `DefaultAzureCredential` suits development. Production pins the credential type, such as `ManagedIdentityCredential`, so a stray environment variable never changes the identity.

## Lifetime

- Creating a client authenticates and connects, so create it at startup and reuse it. The official parallel samples share one `ServiceClient` across concurrent async calls.
- In a host with dependency injection, register the client once and expose it as `IOrganizationServiceAsync2` so code depends on the interface.
- `Clone()` creates a new connection with the same credentials and works only for OAuth-based connections. Use it when one caller needs a separate connection, such as a different `CallerId`.
- `CallerId` impersonates another user for later calls on that instance. Never set it on a shared client: use a clone.
- `Dispose` the client when the host shuts down.

## Settings

| Setting | Use |
| --- | --- |
| `EnableAffinityCookie = false` | Spread parallel requests over all web servers |
| `MaxRetryCount`, `RetryPauseTime` | Bounds for the built-in retry on service protection errors |
| `ServiceClient.MaxConnectionTimeout` (static) | Request timeout, default 4 minutes |
| `UseWebApi` | Prefer the Web API where the client supports it. Default `false` |
| `DisableCrossThreadSafeties` | Faster, but thread safety becomes the caller's job. Leave it off |

## .NET Framework Clients

- Apps on .NET Framework raise connection limits before sending parallel requests: `ServicePointManager.DefaultConnectionLimit` at least the planned concurrency, `Expect100Continue = false`, `UseNagleAlgorithm = false`.
- On .NET, `HttpClient` settings apply instead, and `MaxConnectionsPerServer` is unlimited by default.
- `ThreadPool.SetMinThreads` is raised only when measurements show thread pool starvation.
