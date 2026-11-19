# Bulk Operations and Throughput

## Choosing an Operation

| Need | Use |
| --- | --- |
| Many records of one table, all expected to succeed | `CreateMultipleRequest`, `UpdateMultipleRequest`, `UpsertMultipleRequest` |
| Many records of an elastic table | The same, plus `DeleteMultiple` |
| Delete many records of a standard table | `BulkDeleteRequest` (asynchronous job) |
| Mixed messages or tables in one round trip | `ExecuteMultipleRequest` |
| Several operations that must commit together | `ExecuteTransactionRequest` |
| Highest throughput | Single or bulk requests sent in parallel |

## Bulk Messages

```csharp
var targets = new EntityCollection(records) { EntityName = "contoso_reading" };
var response = (CreateMultipleResponse)await client.ExecuteAsync(new CreateMultipleRequest { Targets = targets }, ct);
Guid[] ids = response.Ids;
```

- Every entity in `Targets` has the same table, and `EntityName` is set.
- Not every standard table supports `CreateMultiple` and `UpdateMultiple`. Check the table first with a query on `sdkmessagefilter` for the message name and `primaryobjecttypecode`. A table that supports both supports `UpsertMultiple`.
- Standard tables: start at 100 to 1,000 records per request and make the size configurable. Larger requests are more efficient until they hit message size or time limits, and then the whole request fails.
- Elastic tables: 100 records per request, sent in parallel. Failures are partial: read `Plugin.BulkApiErrorDetails` from the fault's `ErrorDetails` to find the failed indexes.
- `UpdateMultiple` applies only the first record when several share a key. `UpsertMultiple` fails on duplicate keys. Deduplicate before sending.
- Let Dataverse generate primary keys on create unless the ID must match another system.
- Requests over 116.85 MB fail when a plug-in is registered on the message. Send fewer records, or skip plug-ins with `BypassCustomPluginExecution` when that is intended and permitted.

## ExecuteMultiple

```csharp
var request = new ExecuteMultipleRequest
{
    Settings = new ExecuteMultipleSettings { ContinueOnError = true, ReturnResponses = false },
    Requests = new OrganizationRequestCollection(),
};
```

- At most 1,000 requests per batch. Start at 10 and grow only while throughput improves.
- `ContinueOnError = true` with `ReturnResponses = false` returns only the faults, each with its request index.
- Each batch counts as one request but its full execution time counts toward the 20-minute window.

## Parallel Requests

```csharp
client.EnableAffinityCookie = false;
var options = new ParallelOptions
{
    MaxDegreeOfParallelism = client.RecommendedDegreesOfParallelism,
    CancellationToken = ct,
};

await Parallel.ForEachAsync(batches, options, async (batch, token) =>
{
    await client.ExecuteAsync(new UpsertMultipleRequest { Targets = batch }, token);
});
```

- `RecommendedDegreesOfParallelism` reads the `x-ms-dop-hint` header. Never use the CPU count of the client machine.
- The concurrency limit (52 by default) applies per user per web server. Staying at the recommended degree rarely reaches it.
- Results from parallel work go into thread-safe collections; their order does not match the input.

## Limits

| Limit (per user, per web server, 5-minute window) | Default |
| --- | --- |
| Requests | 6,000 |
| Combined execution time | 20 minutes |
| Concurrent requests | 52 or higher |

- Limits differ between environments and can change. Trial environments have one web server.
- Application users get the same limits as any other user.
- Large periodic jobs are the main cause of throttling. Move integrations toward continuous, smaller syncs where possible.
- Dataverse search (`api/search`) has its own limit of one request per second per user.
