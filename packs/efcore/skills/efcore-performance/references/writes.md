# Writes

## Change Tracking

- `SaveChangesAsync` batches inserts, updates and deletes into few round trips and wraps them in one transaction.
- Tracking cost grows with the number of tracked entities. For loops over thousands of rows, process chunks and call `ChangeTracker.Clear()` after each `SaveChangesAsync`.
- Update a known row without loading it only when every changed property is set explicitly. Prefer `ExecuteUpdateAsync` for that case.

## Set-Based Updates and Deletes

```csharp
await db.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ExecuteUpdateAsync(s => s
        .SetProperty(o => o.Status, OrderStatus.Expired)
        .SetProperty(o => o.UpdatedAt, now), ct);

await db.Sessions.Where(s => s.ExpiresAt < now).ExecuteDeleteAsync(ct);
```

- They run immediately in one statement and return the affected row count.
- They bypass the change tracker, `SaveChanges` interceptors and concurrency tokens. Tracked instances keep stale values.
- Several of them plus `SaveChangesAsync` that must succeed together run in one explicit transaction.
- The setter lambda can hold statements, so conditional `SetProperty` calls need no expression tricks.
- Properties inside JSON complex types can be set too, which updates part of the document.

## Bulk Inserts

- Up to a few thousand rows: `AddRange` and one `SaveChangesAsync`.
- More rows: the provider's bulk copy API on the underlying connection from `db.Database.GetDbConnection()`.
- EF has no upsert operator. Upserts use the database's SQL through `ExecuteSqlAsync`.

## Concurrency

- Rows edited concurrently carry a concurrency token: `[Timestamp]` or `IsRowVersion()` for a database-generated version, `[ConcurrencyCheck]` or `IsConcurrencyToken()` for an app-managed one.
- Updates then include the original token in the `WHERE` clause. A changed row throws `DbUpdateConcurrencyException`.
- APIs return the token to the client (for example as an `ETag`) and require it back on updates.
- Counters and balances use atomic SQL (`ExecuteUpdateAsync(s => s.SetProperty(a => a.Balance, a => a.Balance - amount))`) instead of read, modify, write.

## Transactions

- `SaveChangesAsync` alone needs no explicit transaction.
- Explicit transactions with retries enabled:

```csharp
var strategy = db.Database.CreateExecutionStrategy();
await strategy.ExecuteAsync(async () =>
{
    await using var tx = await db.Database.BeginTransactionAsync(ct);
    // work, SaveChangesAsync, ExecuteUpdateAsync
    await tx.CommitAsync(ct);
});
```

- The whole delegate reruns on a transient failure, so it must be safe to repeat and must not depend on state from a failed attempt.
- Keep transactions short. Never await HTTP calls or user input inside one.
- Pick `Serializable` only for invariants that need it, and retry on serialization failures.
