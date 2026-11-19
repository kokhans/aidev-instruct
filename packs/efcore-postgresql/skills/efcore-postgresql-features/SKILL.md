---
name: efcore-postgresql-features
description: Uses PostgreSQL features from EF Core through the Npgsql provider. Covers provider setup, type mapping, enums, xmin concurrency, jsonb complex types, arrays, index options (GIN, partial, covering, concurrent), full-text search with tsvector, bulk inserts with binary COPY and upserts with ON CONFLICT. Use when mapping a new entity to PostgreSQL, adding indexes in EF Core migrations, querying JSON or arrays, adding search, or loading many rows at once.
---

# EF Core PostgreSQL Features

Database-level design (index choice, locks, migration safety, `EXPLAIN`) belongs to the `postgresql` pack. This skill covers how EF Core and Npgsql express it.

## Setup

```csharp
builder.Services.AddDbContextPool<AppDbContext>(options => options
    .UseNpgsql(
        builder.Configuration.GetConnectionString("Default"),
        npgsql => npgsql
            .MapEnum<OrderStatus>("order_status")
            .EnableRetryOnFailure()));
```

- `MapEnum<T>()` in `UseNpgsql` maps the enum for EF Core and for the Npgsql connection, and migrations create the type.
- An enum in a schema other than `public` names the schema in `MapEnum`.
- With an app-built `NpgsqlDataSource`, call `dataSourceBuilder.MapEnum<T>()` too, then pass the data source to `UseNpgsql`.

## Type Mapping

| .NET | PostgreSQL | Note |
| --- | --- | --- |
| `DateTimeOffset`, `DateTime` (UTC) | `timestamptz` | Non-UTC `DateTime` or a non-zero offset throws on write |
| `DateTime` (unspecified) | `timestamp` | Wall-clock values without a zone only |
| `DateOnly`, `TimeOnly` | `date`, `time` | |
| `Guid` | `uuid` | `Guid.CreateVersion7()` for keys set in code |
| `string` | `text` | `HasMaxLength` adds `varchar(n)` only when the limit is a real rule |
| `decimal` | `numeric` | `HasPrecision` for money |
| `string[]`, `List<T>` of primitives | arrays | `Contains`, `Any`, `Length` translate |
| enum with `MapEnum` | enum type | New values need a migration |
| complex type with `ToJson()` | `jsonb` | Queryable, partially updatable |
| `uint` with `[Timestamp]` | `xmin` | Concurrency token, no column added |

## JSON

```csharp
modelBuilder.Entity<Order>()
    .ComplexProperty(o => o.ShippingAddress, b => b.ToJson());
```

- Complex types with `ToJson()` replace owned JSON entities and string columns holding serialized JSON.
- `Where` and `Select` on JSON properties translate to PostgreSQL JSON operators.
- `ExecuteUpdateAsync` with `SetProperty(o => o.ShippingAddress.City, ...)` updates one property inside the document with `jsonb_set`.
- Containment queries on large tables need a GIN index on the `jsonb` column.

## Indexes

```csharp
modelBuilder.Entity<Order>(order =>
{
    order.HasIndex(o => new { o.CustomerId, o.CreatedAt })
        .IncludeProperties(o => o.Total);
    order.HasIndex(o => o.Status).HasFilter("deleted_at IS NULL");
    order.HasIndex(o => o.Tags).HasMethod("gin");
    order.HasIndex(o => o.Reference).IsUnique().IsCreatedConcurrently();
});
```

| Need | API |
| --- | --- |
| Covering index | `IncludeProperties` |
| Partial index | `HasFilter("sql predicate")` |
| `jsonb`, arrays, `tsvector` | `HasMethod("gin")` |
| Index on a large live table | `IsCreatedConcurrently()` |
| Trigram search | `HasMethod("gin").HasOperators("gin_trgm_ops")` with `HasPostgresExtension("pg_trgm")` |
| Case-insensitive column | `HasColumnType("citext")` with `HasPostgresExtension("citext")` |

- Composite index column order follows the query: equality columns first, then range or sort columns.
- EF creates indexes on foreign keys. Every other index is an explicit `HasIndex`.
- Review the generated migration SQL for every index change on a large table.

## Full-Text Search

```csharp
modelBuilder.Entity<Product>()
    .HasGeneratedTsVectorColumn(p => p.SearchVector, "english", p => new { p.Name, p.Description })
    .HasIndex(p => p.SearchVector)
    .HasMethod("gin");

var hits = await db.Products
    .Where(p => p.SearchVector.Matches(EF.Functions.WebSearchToTsQuery("english", term)))
    .OrderByDescending(p => p.SearchVector.Rank(EF.Functions.WebSearchToTsQuery("english", term)))
    .Take(20)
    .ToListAsync(ct);
```

- The `tsvector` property is an `NpgsqlTsVector`. The generated column keeps it in sync with the source columns.
- `WebSearchToTsQuery` parses user input safely. `ToTsQuery` expects query syntax and throws on malformed input.
- `ILike` or `Contains` with a leading wildcard scans the table. Use full-text search or a trigram index.

## Bulk Inserts

```csharp
var connection = (NpgsqlConnection)db.Database.GetDbConnection();
await db.Database.OpenConnectionAsync(ct);
await using var writer = await connection.BeginBinaryImportAsync(
    "COPY events (id, kind, created_at) FROM STDIN (FORMAT BINARY)", ct);
foreach (var e in events)
{
    await writer.StartRowAsync(ct);
    await writer.WriteAsync(e.Id, NpgsqlDbType.Uuid, ct);
    await writer.WriteAsync(e.Kind, NpgsqlDbType.Text, ct);
    await writer.WriteAsync(e.CreatedAt, NpgsqlDbType.TimestampTz, ct);
}
await writer.CompleteAsync(ct);
```

- Binary `COPY` for tens of thousands of rows and more. `AddRange` and one `SaveChangesAsync` below that.
- `COPY` bypasses EF: no change tracking, no interceptors, no generated values read back.
- Without `CompleteAsync`, disposing the writer rolls the import back.

## Upserts

```csharp
await db.Database.ExecuteSqlAsync($"""
    INSERT INTO stock (sku, quantity) VALUES ({sku}, {quantity})
    ON CONFLICT (sku) DO UPDATE SET quantity = stock.quantity + EXCLUDED.quantity
    """, ct);
```

- Interpolated values become parameters. The conflict target matches a unique index or constraint.

## Review

Flag on review:

- `DateTime.Now` or `DateTimeKind.Local` values written to `timestamptz` columns.
- Enums stored as strings or integers where a PostgreSQL enum is the agreed mapping, or the reverse, mixed in one model.
- A `rowversion` style `byte[]` concurrency token instead of `xmin`.
- `ToLower()` or `ToUpper()` in predicates instead of `citext` or `ILike`.
- Raw SQL built with string concatenation instead of interpolated parameters.
