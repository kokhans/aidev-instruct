# Closed Hierarchies

`closed` on a class means only its declaring assembly and module may declare direct subclasses. Because the direct descendants are fixed, a `switch` expression that handles all of them is exhaustive without a default arm, in any assembly.

```csharp
public closed record class JobStatus;
public sealed record class Queued : JobStatus;
public sealed record class Running(int Percent) : JobStatus;
public sealed record class Failed(string Error) : JobStatus;

static string Describe(JobStatus status) => status switch
{
    Queued => "waiting",
    Running(var percent) => $"{percent}% complete",
    Failed(var error) => $"failed: {error}",
};
```

## Declaration Rules

- `closed` applies to classes and record classes only, never to structs or interfaces.
- A closed class is implicitly `abstract`. Combining it with `sealed`, `static` or an explicit `abstract` is an error.
- Direct subclasses live in the same assembly and module as the closed class.
- Closure is not transitive. A plain subclass of a closed class can be extended from other assemblies. Mark leaves `sealed`, or intermediate levels `closed`.
- A generic class that directly derives from a closed class uses every one of its type parameters in the base class: `Leaf<T>(T Value) : Tree<T>` is valid, `Constant<U>(U Value) : Tree<int>` is not.
- `closed` is contextual. A type named `closed` needs `@closed` (CS9380), and a field of that type may now fail to parse (CS1519).

## Exhaustiveness

- Only direct descendants count. An arm for a direct descendant also covers its subtypes.
- A more derived arm goes before its base: `Sedan` before `Car`. The reverse order is CS8510.
- A switch over a nullable input, such as `JobStatus?`, also needs a `null` arm.
- A direct descendant that is not visible at the switch site, such as an `internal` subtype seen from another assembly, makes the switch non-exhaustive (CS8509). Make every direct subtype as accessible as the base, or add a base-type arm.
- A switch over a type parameter constrained to the closed class, `where X : JobStatus`, is exhaustive on the same terms.
- Marking an intermediate class `closed` makes it abstract too. Leave it open when it must stay instantiable.

## Versioning

- Adding `closed` to a published class, or a new direct subtype to a closed class, breaks consumers whose switches were exhaustive. The subtype list is public API.

## Union or Closed Hierarchy

| Union | Closed hierarchy |
| --- | --- |
| Cases are existing or unrelated types | Every case is my own class in one family |
| No inheritance or shared members | Cases share base members, state or virtual behavior |
| Struct wrapper, value cases box | Reference semantics and polymorphism |
| A type can be a case of several unions | A type belongs to exactly one family |
