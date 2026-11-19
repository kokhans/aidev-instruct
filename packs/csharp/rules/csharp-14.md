---
description: C# 14 on .NET 10 for nullable types, records, extension members, collection expressions, patterns, async code, time and logging.
globs: ["**/*.cs"]
version: "14"
---

# C# 14

## Compiler

- C# 14 is the default for `net10.0`. C# 15 features do not compile: `union`, `closed`, `with(...)` collection arguments, labeled `break` and `continue`, and extension indexers.
- Nullable reference types are on. `!` needs a comment that proves the value is set.

## Types

- `record` for immutable data and DTOs, `record struct` for small values. Classes for services and entities.
- `required` and `init` for mandatory data instead of long constructors.
- Primary constructors for dependency injection. Never assign to a primary constructor parameter. Copy it to a `readonly` field when it must not change.
- `field` inside a property accessor instead of a hand-written backing field.
- `extension(T receiver)` blocks for extension methods and properties, and `extension(T)` blocks for static extension members and operators.
- A result with several outcomes is a small record hierarchy with `sealed` leaves, matched with a switch expression.

## Expressions

- Collection expressions for every collection literal: `[]`, `[a, b]`, `[.. items, extra]`. A collection that needs capacity or a comparer uses its constructor.
- Pattern matching over casts: `is null`, `is not null`, property and list patterns, switch expressions.
- Null-conditional assignment `order?.Status = status;` instead of an `if` null check.
- `System.Threading.Lock` for new locks, never `lock` on an `object`.
- Guards use the throw helpers: `ArgumentNullException.ThrowIfNull`, `ArgumentException.ThrowIfNullOrWhiteSpace`, `ArgumentOutOfRangeException.ThrowIfNegative`.

## Async

- Async all the way. Never `.Result`, `.Wait()` or `GetAwaiter().GetResult()`.
- Every method that does I/O takes a `CancellationToken` as its last parameter and passes it to every call that accepts one.
- `Task.WhenAll` for independent calls, `Parallel.ForEachAsync` for bounded fan-out, `Channel<T>` for producer and consumer queues.
- `await using` for `IAsyncDisposable`. `IAsyncEnumerable<T>` with `[EnumeratorCancellation]` for streams.
- `ValueTask` only where a profile shows allocation cost.

## Time

- Code reads the clock from an injected `TimeProvider`, never `DateTime.Now` or `DateTimeOffset.UtcNow`. Tests use `FakeTimeProvider`.
- Instants are `DateTimeOffset` in UTC. `DateOnly` and `TimeOnly` for calendar values.
- Delays and timers go through `TimeProvider` too: `Task.Delay(span, timeProvider, ct)`, `timeProvider.CreateTimer`.

## Logging

- Log calls use source-generated `[LoggerMessage]` partial methods.
- Message templates are constants with named placeholders. Never interpolate into a log message.
