# Breaking Changes From C# 14

Compiler changes between the .NET 10 SDK (10.0.100) and the .NET 11 SDK (11.0.100). Check these when a project moves to `net11.0`.

| Change | Symptom | Fix |
| --- | --- | --- |
| `with(...)` as the first collection element is collection arguments | `[with(x, y), z]` no longer calls a method named `with` | `[@with(x, y), z]` |
| `union` is contextual in type declarations | A member typed `union` parses as a union declaration (CS9370) | `@union` |
| `closed` is contextual in type declarations | A type named `closed` is CS9380, a field of that type is CS1519 | `@closed` |
| A `Span<T>` or `ReadOnlySpan<T>` collection expression has declaration-block safe context | Assigning a loop-local `Span<int> items = [x];` to an outer `scoped` span fails | Use an array, or declare the span outside the loop |
| `nameof(this.P)` in an attribute is disallowed | Compile error | `nameof(P)` |
| `(X.Y) when` in a switch expression arm parses as a constant pattern and a `when` clause | Code that relied on the cast parse changes meaning | Rewrite the arm |
| `&&` or `\|\|` with an interface-typed left operand and a `dynamic` right operand | CS7083 | Cast the left operand to a concrete type or `dynamic` |
| Synthesized `ref readonly` delegates and `ref readonly` local functions need `InAttribute` | CS0518 on `System.Runtime.InteropServices.InAttribute` | Reference an assembly that defines it |
