# Memory Safety Model (Preview)

The preview model moves `unsafe` from code that mentions pointers to code that accesses unmanaged memory, and makes `unsafe` on a member a contract its callers uphold. Use it only when the user opts in.

## Enabling

```xml
<PropertyGroup>
  <LangVersion>preview</LangVersion>
  <Features>$(Features);updated-memory-safety-rules</Features>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
</PropertyGroup>
```

- `LangVersion` `preview` turns on the syntax and the pointer relaxations.
- The `updated-memory-safety-rules` feature turns on caller obligations and records `MemorySafetyRulesAttribute` in the assembly.
- `AllowUnsafeBlocks` is independent. Without it, a project with the updated rules gets errors when it calls requires-unsafe APIs.
- A file-based app uses `#:property LangVersion=preview` and `#:property Features=$(Features);updated-memory-safety-rules`.
- A stable `MemorySafetyRules` property is planned but not implemented. Never set it.
- Diagnostics and breaking-change notes call this preview language version C# 16.

## What Needs an Unsafe Context

| Operation | Original model | Preview model |
| --- | --- | --- |
| Declare a pointer type, take `&x` | `unsafe` | Safe |
| `fixed` statement | `unsafe` | Safe |
| `stackalloc` converted to a pointer | `unsafe` | Safe |
| `sizeof` on any unmanaged type | `unsafe` | Safe |
| `*p`, `p->m`, `p[i]` | `unsafe` | `unsafe` |
| Function pointer invocation | `unsafe` | `unsafe` |
| Fixed-size buffer element access | `unsafe` | `unsafe` |
| Calling a member marked `unsafe` | No requirement | `unsafe`, with the updated rules |

The relaxations apply with `LangVersion` `preview` even without the feature flag.

## Requires-Unsafe Members

- `unsafe` on a member's signature makes every caller use an `unsafe` context. It no longer opens an unsafe context for the body: the dereference goes in an inner `unsafe { }` block.
- A member either propagates the obligation by marking itself `unsafe`, or discharges it: it validates inputs, keeps a safe signature and wraps the access in an inner block.
- Every requires-unsafe member documents what callers guarantee in a `/// <safety>` block. Every `unsafe` block explains why it is sound in a `// SAFETY:` comment.

```csharp
public static int SumBytes(byte[] source)
{
    ArgumentNullException.ThrowIfNull(source);
    fixed (byte* first = source)
    {
        unsafe
        {
            // SAFETY: the null check and source.Length bound every read to the pinned array.
            int total = 0;
            for (int i = 0; i < source.Length; i++) total += first[i];
            return total;
        }
    }
}
```

- `unsafe` is an error on type declarations, static constructors, finalizers and delegates.
- A type whose parameterless constructor is `unsafe` cannot satisfy `new()` or `struct` in a declaration such as a base type or field type (CS9376). In an expression it can, inside an `unsafe` context.
- An `unsafe` field forces every write into an `unsafe` block. Use it when the field type cannot express an invariant, such as a `byte*` paired with a length. `readonly unsafe` also blocks writes after construction.

## The `safe` Keyword

- `safe` attests that a declaration is sound where the compiler demands a choice. Ordinary declarations are safe by default.
- Every `extern` member, including `LibraryImport` partial methods, is marked `safe` or `unsafe`.
- Every instance field of a type with `LayoutKind.Explicit`, `[ExtendedLayout]` or a nonzero `Pack` or `Size` is marked `safe` or `unsafe` (CS9392). For a synthesized backing field, mark the property or event.
- `safe` and `unsafe` never appear together on one declaration.
- Compilers after .NET 11.0.100 require `AllowUnsafeBlocks` for both modifiers and report CS9401 without it.

## Unsafe Expressions

- `unsafe(expression)` opens an unsafe context for one expression. Use it where a block cannot go, such as field initializers, constructor initializers and `catch` filters, or to keep `await` outside the unsafe scope: `return await unsafe(ReadCoreAsync());`.
- It needs `AllowUnsafeBlocks` and `LangVersion` `preview`.

## Across Assemblies

| Caller | Callee | Result |
| --- | --- | --- |
| Updated rules | Updated rules | `unsafe` markers flow through metadata. Calls need an unsafe context. |
| Updated rules | Original rules | Any callee member with a pointer in its signature counts as requires-unsafe. |
| Original rules | Updated rules | Original rules apply. A requires-unsafe member without pointers in its signature is callable from safe code. |

## Breaking Changes in the Preview Version

- Lambdas can now bind to delegates with pointer parameters, so overloads can become ambiguous (CS0121). Give the lambda explicit parameter types: `M((int x) => { })`.
- `safe` is a modifier. A type named `safe` needs `@safe`.
- Members with pointer parameters, including indexers, need an unsafe context at the call site (CS9363).
