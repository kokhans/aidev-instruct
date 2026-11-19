---
description: C# 7.3, the default language version of every .NET Framework target such as Dataverse plug-ins on .NET Framework 4.8, with what to write instead of newer features.
globs: ["**/*.cs"]
version: "7.3"
---

# C# 7.3

- C# 7.3 is the default of every .NET Framework target. Code never uses a feature from C# 8 or later.
- Raising `LangVersion` is unsupported. Default interface members also need runtime support, and indices and ranges need types, that .NET Framework lacks.

## Instead of Newer Features

| Feature | Write instead |
| --- | --- |
| `record` (9), `record struct` (10) | A `sealed class` with get-only properties set in the constructor |
| `init` (9), `required` (11) | Get-only properties assigned in the constructor, after guard clauses |
| Primary constructors (12) | A constructor that assigns `private readonly` fields |
| Nullable reference types (8) | Guard clauses: `if (value == null) throw new ArgumentNullException(nameof(value));` |
| File-scoped namespaces (10) | Block-scoped `namespace Contoso.Orders { }` |
| `global using` (10) | `using` directives in each file |
| Switch expressions, property and positional patterns (8) | A `switch` statement with type patterns and `when`: `case Order o when o.Total > 0:` |
| `not`, `and`, `or` and relational patterns (9) | `x != null`, `&&`, `\|\|` and comparison operators |
| Collection expressions (12) | `new List<T> { a, b }`, `new[] { a, b }`, `Array.Empty<T>()` |
| `using var` declarations (8) | `using (var stream = ...) { }` blocks |
| `??=` (8) | `value = value ?? fallback;` |
| Target-typed `new()` (9) | `new Order()` with the type named |
| Indices and ranges, `^1` and `a..b` (8) | `items[items.Count - 1]`, `Substring`, `Skip` and `Take` |
| Raw string literals (11) | Verbatim strings `@"..."` |
| Static local functions (8) | Local functions that capture nothing |
| `field` keyword, extension blocks (14) | A private backing field, `static` extension methods with `this` |
| `IAsyncEnumerable<T>` and `await foreach` (8) | A `Task` that returns a list, or paging |
| Default interface members (8) | An abstract base class or extension methods |

## Available in 7.3

- Tuples with named elements and deconstruction, `out var`, discards, local functions, throw expressions and `default` literals.
- Type patterns in `is` and `switch`: `if (entity is Account account)`, `case null:`.
- `in` parameters, `readonly struct`, `ref` returns and `private protected`.
- `async Task` methods with `await`.
