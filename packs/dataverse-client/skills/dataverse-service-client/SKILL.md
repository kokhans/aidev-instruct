---
name: dataverse-service-client
description: Builds and reviews .NET code that talks to Dataverse through ServiceClient from Microsoft.PowerPlatform.Dataverse.Client. Covers connection strings and token-provider authentication, application users, client lifetime in hosted apps, async queries and paging, early-bound classes from pac modelbuilder, bulk operations (CreateMultiple, UpdateMultiple, UpsertMultiple), ExecuteMultiple, parallel requests with RecommendedDegreesOfParallelism, timeouts, and service protection errors and retries. Use when writing an integration, data load, background job or API that reads or writes Dataverse, when migrating from CrmServiceClient, or when calls fail with 429, throttling error codes or timeouts.
---

# Dataverse ServiceClient

## References

| File | Covers |
| --- | --- |
| [connection.md](references/connection.md) | Connection strings, token providers, client lifetime, logging |
| [bulk.md](references/bulk.md) | Bulk messages, `ExecuteMultiple`, parallelism, limits and error codes |

## Setup

```xml
<PackageReference Include="Microsoft.PowerPlatform.Dataverse.Client" />
```

- The package targets `net462`, `net472`, `net48`, `net8.0` and `net10.0`. Newer .NET targets such as `net11.0` use the `net10.0` build.
- Early-bound classes come from `pac modelbuilder build` with `--entitynamesfilter`, `--messagenamesfilter`, `--serviceContextName` and `--suppressINotifyPattern` (unless the app is WPF), regenerated from a committed `builderSettings.json`.
- Late-bound `Entity` with logical-name constants (`--emitfieldsclasses`) suits code that spans many tables or runs before the schema exists.

## Reading Data

```csharp
var query = new QueryExpression("account")
{
    ColumnSet = new ColumnSet("name", "accountnumber"),
    Criteria = { Conditions = { new ConditionExpression("statecode", ConditionOperator.Equal, 0) } },
    PageInfo = new PagingInfo { Count = 500, PageNumber = 1 },
};

while (true)
{
    EntityCollection page = await client.RetrieveMultipleAsync(query, ct);
    foreach (Entity account in page.Entities)
    {
        // process
    }

    if (!page.MoreRecords) break;
    query.PageInfo.PageNumber++;
    query.PageInfo.PagingCookie = page.PagingCookie;
}
```

- Every query names its columns and pages with the paging cookie. Never page by skipping records.
- FetchXML suits aggregates and queries kept as text. `QueryExpression` suits queries built in code.
- Choice columns come back as `OptionSetValue`, lookups as `EntityReference`, money as `Money`. Formatted labels are in `entity.FormattedValues`.

## Writing Data

- Create and update send a new `Entity` with only the columns being set. Never send back an entity that was retrieved with extra columns.
- `UpsertRequest` with an alternate key (`new Entity("account", "accountnumber", value)`) creates or updates in one call.
- Related records created together go in one `CreateRequest` with `RelatedEntities` or in an `ExecuteTransactionRequest`, so they commit or roll back together.
- `BypassCustomPluginExecution` and the other optional parameters that skip business logic need a recorded reason and the matching privilege.

## Errors

| Error code | Meaning | Action |
| --- | --- | --- |
| `-2147015902` | Request count limit | Wait for `Retry-After`, retry |
| `-2147015903` | Execution time limit | Wait, then retry with smaller batches or lower concurrency |
| `-2147015898` | Concurrent request limit | Lower the degree of parallelism |

- `ServiceClient` manages these errors and retries, bounded by `MaxRetryCount` and `RetryPauseTime`. Errors that still surface mean the job is too aggressive: reduce concurrency or batch size.
- Plug-in errors arrive as `FaultException<OrganizationServiceFault>` with the plug-in's message; bulk failures carry details in `Detail.ErrorDetails`.
- Interactive apps show a busy message with the wait time, never the raw fault text.
