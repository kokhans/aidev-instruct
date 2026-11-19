# Queries

## Projections

- Project to the shape the caller needs. EF selects only the referenced columns and tracks nothing.
- Nested collections in a projection load in the same query: `Select(o => new OrderDto(o.Id, o.Lines.Select(l => new LineDto(l.Sku, l.Quantity)).ToList()))`.
- Never call methods EF cannot translate inside `Where` or `OrderBy`. In a final `Select`, client methods run after the query, which is fine only for formatting.
- `AsNoTrackingWithIdentityResolution()` when a no-tracking query must return the same instance for the same row.

## Loading Related Data

- `Include` and `ThenInclude` when the caller needs entities to modify. Filtered includes (`Include(b => b.Posts.Where(p => p.Published))`) load only what is needed.
- Loading by a set of keys: collect the IDs, then one query with `Where(x => ids.Contains(x.Id))`.
- Explicit loading (`Entry(e).Collection(...).LoadAsync()`) only for a single entity, never in a loop.

## Single and Split Queries

- A single query with several collection includes multiplies rows (cartesian explosion). `AsSplitQuery()` runs one query per collection.
- Split queries are not one snapshot. When rows change between them, EF throws `DbQueryConcurrencyException`. Retry the query, run it in a `Serializable` or snapshot transaction, or use `AsSingleQuery()`.
- Split queries need a stable order. Any `OrderBy` before `Skip` or `Take` includes a unique column.
- Set a default with `UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)` in provider options only when most queries include several collections. Use `AsSingleQuery()` to opt back out.

## Pagination

- Offset pages (`Skip`, `Take`) only for small, shallow lists.
- Keyset pagination for feeds and large tables: `Where(p => p.Id > lastId).OrderBy(p => p.Id).Take(pageSize)`. For a non-unique sort column, order by the column plus the key and filter on both.
- Back keyset pagination with an index that matches the `ORDER BY`.
- Return a cursor, not a total count. Counting a large table is a full scan.

## Aggregates, Joins and Existence

- `AnyAsync` for existence, never `CountAsync() > 0`.
- Aggregate in the database: `GroupBy` with `Count`, `Sum`, `Max` inside `Select`.
- `MaxByAsync` and `MinByAsync` return the row with the largest or smallest key in one query.
- `LeftJoin`, `RightJoin` and `FullJoin` express outer joins directly instead of `GroupJoin` with `DefaultIfEmpty`.

## Compiled Queries

- EF caches query plans by expression shape. Most queries need nothing more.
- `EF.CompileAsyncQuery` removes the remaining expression processing for hot queries. Store the compiled delegate in a `static readonly` field and pass the context and parameters on each call.
- Compile only after measuring. Compiled queries cannot change shape at runtime.

## Query Shape Stability

- Captured variables become parameters. Inline constants that vary per call produce new plans and fill the cache.
- Dynamic filters compose by chaining `Where` calls conditionally, which keeps a small set of shapes.
- `Contains` over a list parameter keeps few shapes regardless of list length.

## Raw SQL

- `FromSql($"...")` and `SqlQuery<T>($"...")` turn interpolated values into parameters.
- Compose LINQ on top of `FromSql` only when the SQL is a plain `SELECT`.
- Window functions, recursive CTEs and lateral joins that LINQ cannot express belong in raw SQL or a view mapped with `ToView`.
