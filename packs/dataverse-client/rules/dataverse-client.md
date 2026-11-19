---
description: Dataverse client code on .NET with ServiceClient from Microsoft.PowerPlatform.Dataverse.Client, covering authentication, queries, bulk operations, parallelism and service protection limits.
globs: ["**/*.cs", "**/*.csproj"]
---

# Dataverse Client

## Package

- Client apps use `ServiceClient` from `Microsoft.PowerPlatform.Dataverse.Client`, latest stable. It targets .NET Framework 4.6.2 and later and .NET 8 and later, so it follows the project's `dotnet` target.
- Never `CrmServiceClient` (ADAL-based), `OrganizationServiceProxy` (deprecated) or a hand-written SOAP client. Code that has them moves to `ServiceClient`: the members are the same apart from the class name and namespace.
- Plug-ins never reference this package. They use the services the sandbox passes in.

## Authentication

- Servers and jobs authenticate as an application user: `AuthType=ClientSecret` or `AuthType=Certificate` connection strings, or the constructor that takes a token provider, `ServiceClient(Uri, Func<string, Task<string>>, bool, ILogger)`, backed by Azure Identity (managed identity in Azure).
- Web apps acting for a signed-in user use the token provider constructor with an on-behalf-of token.
- Interactive tools use `AuthType=OAuth`. `AuthType=Office365` is deprecated and never used.
- The sample `AppId` `51f81489-12ee-4a9e-aaae-a2591f45987d` is for development only. Production registers its own app in Microsoft Entra ID.
- Connection strings and secrets come from configuration and a secret store, never source code.
- After construction, check `IsReady`. When false, log `LastError` and `LastException` and fail fast.
- Pass an `ILogger` to the constructor so connection and retry events reach the app's logs.

## Calls

- Async methods with a `CancellationToken`: `RetrieveMultipleAsync`, `CreateAsync`, `UpdateAsync`, `ExecuteAsync`.
- `ColumnSet` names the columns needed. Never `new ColumnSet(true)` or `AllColumns` in production code.
- Updates send only changed columns. Plug-in steps fire on every column in the request, changed or not.
- External IDs use alternate keys and `UpsertRequest` instead of retrieve-then-create.
- `OrganizationServiceFault` errors are caught as `FaultException<OrganizationServiceFault>` and mapped by `ErrorCode`, never by message text.

## Throughput

- Writes to one table in bulk use `CreateMultipleRequest`, `UpdateMultipleRequest` or `UpsertMultipleRequest`. Standard tables: 100 to 1,000 records per request, and one failure rolls back the whole request. Elastic tables: 100 per request, partial success is possible.
- `DeleteMultiple` works only on elastic tables. Standard tables use `BulkDeleteRequest`.
- `ExecuteMultipleRequest` serves mixed operations, and a retry of a failed bulk request one operation at a time. Start at 10 per batch: large batches hit the execution time limit.
- Parallel work uses `Parallel.ForEachAsync` with `MaxDegreeOfParallelism = serviceClient.RecommendedDegreesOfParallelism` and sets `EnableAffinityCookie = false`, so requests spread across web servers.
- Ramp up load and let `Retry-After` set the pace. Never compute a fixed request rate.
- The default `ServiceClient` timeout is 4 minutes. Reduce the batch size before raising `MaxConnectionTimeout`.

## Service Protection

- `ServiceClient` handles service protection errors itself and retries. Tune `MaxRetryCount` and `RetryPauseTime` instead of wrapping calls in a second retry policy.
- Code that calls the Web API through `HttpClient` retries `429` after the `Retry-After` seconds, and transient `5xx` with backoff.
- Batching and bulk messages do not bypass entitlement limits: every record in `Targets` counts.

For connection setup, dependency injection, bulk patterns and error codes in depth, use the `dataverse-service-client` skill.
