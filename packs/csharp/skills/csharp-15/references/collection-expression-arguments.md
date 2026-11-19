# Collection Expression Arguments

A `with(...)` element passes arguments to the constructor or builder method of the target collection. It is always the first element.

```csharp
List<string> names = [with(capacity: values.Length * 2), .. values];
HashSet<string> set = [with(StringComparer.OrdinalIgnoreCase), "a", "A"]; // one element
IList<int> numbers = [with(capacity: 100), 1, 2, 3];                      // creates List<int>(100)
```

## Binding by Target Type

| Target type | What `with(args)` binds to |
| --- | --- |
| Class or struct that implements `IEnumerable`, without `[CollectionBuilder]` | Overload resolution over its accessible constructors. Named arguments work. |
| Type with `[CollectionBuilder(typeof(B), "Create")]` | Overload resolution over the `Create` methods. The arguments go before the final `ReadOnlySpan<T>` parameter. |
| `IEnumerable<T>`, `IReadOnlyCollection<T>`, `IReadOnlyList<T>` | Only `with()`, which means the same as no `with`. |
| `ICollection<T>`, `IList<T>` | `with()` or `with(int capacity)`. The compiler creates a `List<T>`. |
| Arrays, `Span<T>`, `ReadOnlySpan<T>` | Compile error, even for `with()`. |

## Rules

- A type whose constructors all take arguments is a valid target only with `with(...)`: `NamedValues readings = [with("temperature"), 18, 21];`.
- Builder methods may take configuration parameters before the span. A builder author puts the `ReadOnlySpan<T>` parameter last, because `with(...)` cannot bind to a span-first shape.
- Arguments cannot be `dynamic`.
- The `with(...)` arguments are evaluated first, then the elements, left to right, each once. A spread such as `.. GetItems()` calls `GetItems()` in order, but its enumeration can happen after later elements. Code never relies on enumeration side effects.
- Only the presence of `with(...)` decides whether a collection expression converts to a candidate type. Its arguments do not pick overloads and do not infer type arguments.

```csharp
static void Print(List<string> values) { }
static void Print(HashSet<string> values) { }

Print([with(StringComparer.OrdinalIgnoreCase), "one"]); // CS0121: ambiguous
HashSet<string> h = [with(StringComparer.OrdinalIgnoreCase), "one"];
Print(h);                                               // OK

static void Use<T>(List<T> values) { }
Use([with(10)]);      // CS0411
Use<int>([with(10)]); // OK
```

## Refactors

| Before | After |
| --- | --- |
| `var list = new List<T>(n); list.AddRange(src);` | `List<T> list = [with(n), .. src];` |
| `new HashSet<string>(comparer) { a, b }` | `HashSet<string> set = [with(comparer), a, b];` |
| `new Dictionary<K, V>(comparer)` | Unchanged. Dictionary expressions are not part of C# 15. |

## Mistakes

- `with(...)` anywhere but first is a compile error.
- `IReadOnlyList<T> x = [with(capacity: 10)];` is an error. Target `List<T>` to set a capacity.
- Positional `with(default)` on `List<int>` is ambiguous between constructors. Named arguments such as `with(capacity: n)` are clearer.
- Classic initializers (`new List<T>(n) { ... }`) are unchanged by this feature.
