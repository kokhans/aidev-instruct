---
name: typescript-type-design
description: Designs TypeScript types that stay safe and fast to check. Covers unions and exhaustiveness, literal and branded types, function signatures and overloads, generics, readonly inputs, and the type shapes that slow the compiler. Use when designing a public API or shared types, when refactoring complex generics, or when type checking or editor feedback is slow.
---

# TypeScript Type Design

## Model Data

- Variants are discriminated unions on one literal field, such as `status` or `kind`.
- Exhaustive handling ends in a `never` check, so a new variant breaks the build:

```ts
default: {
  const unhandled: never = result;
  throw new Error(`Unhandled: ${String(unhandled)}`);
}
```

- Shared fields go on a base interface that each variant extends. Removing redundant members from a union compares them pairwise, so large unions of object types check slowly.
- Fixed sets of values are `as const` objects with a derived union: `type Route = (typeof ROUTES)[keyof typeof ROUTES]`.
- `satisfies` validates a config literal and keeps its literal types: `` as const satisfies Record<string, `/${string}`> ``.
- IDs that must not mix get a brand: `type UserId = string & { readonly __brand: "UserId" }`, created only by a parse function.
- Inputs that a function must not mutate are `readonly T[]` or `Readonly<T>`.
- Optional means absent. A value that can be present and empty is `T | null`, not `T | undefined`.

## Functions

- One signature with a union parameter instead of overloads that differ in one argument's type.
- Optional trailing parameters instead of overloads that differ only in arity.
- When overloads are needed, the most specific comes first. TypeScript picks the first match.
- Callback parameters are not optional unless the caller really passes fewer arguments.
- Callbacks whose result is ignored return `void`, not `any`.
- More than three parameters become one options object.
- Exported functions declare their return type. It saves the compiler work and stops accidental API changes.

## Generics

- A type parameter appears at least twice, linking inputs to outputs. Otherwise use the concrete type.
- Constrain parameters (`<T extends object>`) instead of checking inside the body.
- `NoInfer<T>` stops a parameter from widening the inferred type.
- `const` type parameters (`<const T>`) infer literal types without `as const` at the call site.

## Avoid

| Avoid | Use |
| --- | --- |
| `Function` | An explicit call signature |
| `{}` as "any object" | `object`, `Record<string, unknown>` or a real shape |
| `Object.keys(obj)` typed as the object's keys | A typed helper, or iterate the source union |
| A DTO type copied from the API | A type inferred from the schema or generated from the API |
| Global interface augmentation for convenience | An explicit import |

## Compile-Time Performance

- Name complex conditional and mapped types with a type alias. Named types are cached, inline ones are recomputed at each use.
- `interface ... extends` instead of `&` intersections for object shapes.
- `types` lists only the global packages the project uses.
- `include` names source roots. `node_modules` and dot folders stay out.
- Monorepos use project references (`composite: true`), one project per package, with tests in their own project.
- `tsc --noEmit` runs as its own step, not inside the bundler.
