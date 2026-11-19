---
name: csharp-15
description: Writes, reviews and modernizes C# 15 code on .NET 11. Covers collection expression arguments (`[with(...), ...]`), union types (`union`, custom `[Union]` types), closed class hierarchies (`closed`), extension indexers, labeled `break` and `continue`, static interface members on older runtimes, and the preview memory safety model (`unsafe(expr)`, `safe`, requires-unsafe members). Use when code targets `net11.0`, when one of these features is named, when replacing marker interfaces, OneOf-style results, flag or `goto` loop exits, or construct-then-add collection code, when upgrading a project from C# 14, or when the build reports CS8121, CS8509, CS8655, CS8510, CS0121 or CS0411 on a `with(...)` element, CS9370, CS9380, CS9363 or CS9376.
version: "15"
---

# C# 15

C# 15 ships with the .NET 11 SDK (11.0.100) and Visual Studio 2026. It is the default language version for projects that target `net11.0`.

| Feature | Syntax | Preview | Reference |
| --- | --- | --- | --- |
| Collection expression arguments | `[with(args), e1, e2]` | No | [collection-expression-arguments.md](references/collection-expression-arguments.md) |
| Union types | `union U(A, B);`, `[Union]` | No | [unions.md](references/unions.md) |
| Closed hierarchies | `closed class`, `closed record class` | No | [closed-hierarchies.md](references/closed-hierarchies.md) |
| Extension indexers | `this[...]` inside `extension(T x)` | No | [extension-indexers.md](references/extension-indexers.md) |
| Labeled jumps | `outer: for (...) { break outer; }` | No | [labeled-jumps.md](references/labeled-jumps.md) |
| Static interface members on older runtimes | `static` helpers on .NET Framework or `netstandard2.0` | No | [static-interface-members.md](references/static-interface-members.md) |
| Memory safety model | `unsafe(expr)`, `safe`, requires-unsafe members | Yes | [memory-safety.md](references/memory-safety.md) |

Upgrading from C# 14 can break existing code: see [breaking-changes.md](references/breaking-changes.md).

## Before Using a Feature

1. Check `TargetFramework` and `LangVersion`. `net11.0` without `LangVersion` gives C# 15. To print the active version, add `#error version` temporarily: the compiler reports CS8304 with both versions.
2. Never set `LangVersion` to `latest`: the result changes with the installed compiler. Move the target framework to `net11.0` instead of raising `LangVersion` on an older one.
3. Unions need `System.Runtime.CompilerServices.UnionAttribute` and `IUnion`. The .NET 11 runtime ships them, and the compiler never synthesizes them. On an older target framework the project defines or references them.
4. `with(`, `union` and `closed` are contextual keywords now. An identifier with one of those names needs `@`.
5. Touch the memory safety preview only when the user opts in. It needs `LangVersion` `preview` and a feature flag.
6. The Microsoft Learn language reference describes shipped behavior. When a feature specification disagrees, the reference wins.

## Choosing a Shape

| Need | Use |
| --- | --- |
| One of several existing or unrelated types (`int`, `string`, third-party types) | `union` |
| One of my own classes that share members, state or virtual behavior | `closed` base class |
| A result the caller must handle completely | `union` of fresh `record` case types, such as `union Result<T>(Ok<T>, Error)` |
| A marker interface or abstract class that exists only for pattern matching | `union` |
| Value-type cases on a hot path | Hand-written union with `HasValue` and `TryGetValue` |
| Capacity, comparer or constructor arguments for a collection literal | `[with(...), ...]` |
| Leaving nested loops early | Labeled `break` or `continue`, or an extracted method |

## Checklist

- [ ] The project is on C# 15 through `net11.0`. No `LangVersion` `latest`.
- [ ] `[with(...), ...]` replaces construct-then-add code where capacity, a comparer or a constructor argument matters. Never on arrays or spans.
- [ ] "One of these types" is a `union`. "One of my subclasses" is a `closed` class.
- [ ] Switches go over the union or the closed base, never over `.Value` or `object`.
- [ ] Exhaustive switches use a `null` arm, never `_`, so a new case still warns (CS8509).
- [ ] A switch handles `null` whenever a `default` union can reach it: fields, array elements and `default` hold null contents.
- [ ] Union bodies declare no instance fields or auto-properties. Data lives in the case types.
- [ ] `x is MyUnion` never tests for contents. `x is not null` does.
- [ ] Closed hierarchies seal their leaves, keep every direct subtype as accessible as the base, and treat the subtype list as public API.
- [ ] Each labeled loop has a distinct label in its method. `continue` never targets a `switch`.
- [ ] Extension indexers are not expected to work on arrays, `string` or inside expression trees and `IQueryable` lambdas.
- [ ] Memory safety preview code keeps `unsafe` blocks minimal, documents every requires-unsafe member with `/// <safety>`, and explains each block with `// SAFETY:`.

## Diagnostics

| Code | Meaning |
| --- | --- |
| CS8121 | A type pattern matches no union case type, such as `pet is Pet`. Use `is not null` or `var`. |
| CS8509 | Switch not exhaustive: a missing union case, a missing `null` arm on a nullable input, or a closed-hierarchy subtype not visible at the switch site. |
| CS8655 | A union with a nullable case type has no `null` arm. |
| CS8510 | Unreachable arm: a base-type arm before a subtype arm. |
| CS0121, CS0411 | `with(...)` arguments neither pick an overload nor infer type arguments. Assign to a typed variable or pass type arguments. |
| CS9370, CS9380, CS1519 | `union` or `closed` used as an identifier. Escape it with `@`. |
| CS9363 | A member with pointer parameters, such as an indexer, called outside `unsafe` (preview). |
| CS9376 | A requires-unsafe parameterless constructor used for a `new()` or `struct` constraint in a declaration (preview). |
| CS9392 | A field in an explicit or extended layout type needs `safe` or `unsafe` (preview). |
| CS9401, CS0227 | `safe` or `unsafe` used without `AllowUnsafeBlocks`. |
| `SwitchExpressionException` | Run time: a `default` union with null contents reached a switch without a `null` arm. |

## Sources

- What's new in C# 15: https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-15
- Compiler breaking changes in .NET 11: https://learn.microsoft.com/dotnet/csharp/whats-new/breaking-changes/compiler%20breaking%20changes%20-%20dotnet%2011
