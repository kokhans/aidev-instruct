# Union Types

A union value is exactly one of a fixed set of case types. The compiler adds an implicit conversion from each case type, exhaustive `switch` checking and null-state tracking. C# unions are unions of types: for a discriminated union, declare fresh `record` types as the cases.

```csharp
public sealed record class Ok<T>(T Value);
public sealed record class Error(string Message);
public union Result<T>(Ok<T>, Error);

static Result<int> Parse(string text) =>
    int.TryParse(text, out var n) ? new Ok<int>(n) : new Error($"'{text}' is not a number");

string message = Parse(input) switch
{
    Ok<int> ok => $"Parsed {ok.Value}",
    Error e => e.Message,
    null => "No value",
};
```

## Declarations

- Case types are any type convertible to `object`: classes, structs, interfaces, type parameters, nullable types and other unions.
- A `union` declaration lowers to a `struct` with `[Union]`, `IUnion`, a `public object? Value { get; }` and one public constructor per case type.
- Value-type cases are boxed into `Value`. Generated unions are not allocation-free.
- A union adds no equality, cloning or deconstruction.
- The body may declare methods, computed properties and operators. It cannot declare instance fields, auto-properties, field-like events or a public single-parameter constructor. Any other constructor chains to a generated one through `this(...)`.
- Inside the body, `this switch` matches on the contents.

## Conversions

- An implicit union conversion exists from each case type. It calls the matching constructor.
- A conversion that fits more than one case type equally is ambiguous and fails to compile.
- A user-defined implicit operator to the union wins over the union conversion.
- A union struct `U` also accepts a case value as `U?`.

## Pattern Matching

| Pattern on a union value | Tests |
| --- | --- |
| Type or declaration pattern: `Dog`, `Dog d` | The contents |
| Typed property or positional pattern: `Dog { Breed: "Lab" }` | The contents, then the nested patterns on that case |
| Untyped property or positional pattern: `{ Name: "Rex" }` | The union's own members |
| List pattern | The union's own count and indexer |
| `var x`, `_` | The union instance, without unwrapping |
| Constant or relational pattern, including `null` | The contents. `null` also matches a null class union or an empty `U?`. |

- `pet is not null` is the "has a value" test. `pet is { }` always matches a struct union, even an empty one.
- A type pattern must match at least one case type: `pet is Pet` is CS8121.
- Recursive unions such as `union Pet(Cat, Dog, Pet)` make `pet is Pet` test for a contained `Pet`. Avoid them.

## Exhaustiveness and Null

- A `switch` expression that handles every case type is exhaustive while the contents are tracked as not null.
- A `null` arm keeps the missing-case warning (CS8509) alive. A `_` or `var` arm swallows new cases silently.
- With a nullable case type, such as `union NullablePet(Cat?, Dog)`, a missing `null` arm is CS8655.
- `default(U)`, default fields and array elements hold null contents, yet the compiler tracks `Value` as not null when every case type is non-nullable. Such a switch throws `SwitchExpressionException`. Add a `null` arm wherever default values can arrive.
- `HasValue` or `TryGetValue` returning `true` makes `Value` not null on that branch.

## Custom Unions

A hand-written union adapts an existing type, avoids boxing, gives reference semantics or controls layout.

- The basic pattern: `[System.Runtime.CompilerServices.Union]` on a class or struct, one public constructor per case type with a single by-value or `in` parameter, and a public `object? Value { get; }`. Implementing `IUnion` is recommended.
- The non-boxing pattern adds `public bool HasValue { get; }` and one `public bool TryGetValue(out C value)` per case type. The compiler then calls `TryGetValue` for type patterns and `HasValue` for `null` patterns. Each member is optional on its own.
- For a nullable value case type such as `int?`, the `TryGetValue` parameter is `out int`.
- A member provider handles private constructors, factories and `record class` unions: a public nested interface `IUnionMembers` that the type implements, declaring a static `Create(C value)` per case and `Value`, optionally `TryGetValue` and `HasValue`. The compiler then reads union members only from that interface.
- Class-based unions match `null` for both a null reference and a null `Value`. Seal them.

The compiler trusts these rules without checking them:

- `Value` is always null or an instance of a case type, including for `default`.
- A union created from case `C` reports `C`, or null for a null input.
- When a value converts to two case types, both constructors behave the same.
- `HasValue` and `TryGetValue` agree with `Value`.

## Mistakes

- Instance fields or auto-properties in a `union` body.
- `_ => ...` as a safety net instead of `null => ...`.
- Generated unions with value-type cases on a hot path.
- `x is MyUnion` to test for contents.
- A union struct method that reads `this` more than once while another thread reassigns the variable can see torn values. Copy `this` to a local first when that matters.
