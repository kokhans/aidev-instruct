---
description: C# 15 on .NET 11 for nullable types, records, unions, closed hierarchies, extension members, collection expressions, patterns, async code, time and logging.
globs: ["**/*.cs"]
version: "15"
---

# C# 15

## Compiler

- C# 15 is the default for `net11.0`. `LangVersion` `preview` only for an opted-in preview feature, such as the memory safety model.
- Nullable reference types are on. `!` needs a comment that proves the value is set.

## Types

- `record` for immutable data and DTOs, `record struct` for small values. Classes for services and entities.
- `required` and `init` for mandatory data instead of long constructors.
- Primary constructors for dependency injection. Never assign to a primary constructor parameter. Copy it to a `readonly` field when it must not change.
- `field` inside a property accessor instead of a hand-written backing field.
- `union` for a value that is one of a fixed set of types, such as an operation result: `public union SaveResult(Saved, NotFound, Conflict);`.
- `closed` on a base class whose direct subclasses all live in the same assembly. Leaves are `sealed`.
- A `switch` over a union or a closed class lists every case and handles `null` with a `null` arm, never `_`, so a new case raises a warning.
- `extension(T receiver)` blocks for extension methods, properties, operators and indexers.

## Expressions

- Collection expressions for every collection literal: `[]`, `[a, b]`, `[.. items, extra]`.
- `with(...)` as the first element passes capacity or a comparer: `HashSet<string> ids = [with(StringComparer.Ordinal), .. raw];`.
- Pattern matching over casts: `is null`, `is not null`, property and list patterns, switch expressions.
- Labeled `break outer;` and `continue outer;` instead of flag variables or `goto` in nested loops.
- Null-conditional assignment `order?.Status = status;` instead of an `if` null check.
- `System.Threading.Lock` for new locks, never `lock` on an `object`.
- Guards use the throw helpers: `ArgumentNullException.ThrowIfNull`, `ArgumentException.ThrowIfNullOrWhiteSpace`, `ArgumentOutOfRangeException.ThrowIfNegative`.
- Expected outcomes are usually a union.

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

For unions, closed hierarchies and the other C# 15 features in depth, use the `csharp-15` skill.
