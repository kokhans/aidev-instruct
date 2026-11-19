# Labeled Break and Continue

A label goes directly on a loop or `switch` statement. An inner `break label;` leaves that statement, and an inner `continue label;` starts the next iteration of that loop.

```csharp
rows: for (int row = 0; row < grid.Height; row++)
{
    for (int column = 0; column < grid.Width; column++)
    {
        if (grid[row, column].IsBlocked) continue rows;
        if (grid[row, column].IsGoal) break rows;
    }
}
```

## Rules

- `break label;` targets an enclosing `for`, `foreach`, `while`, `do` or `switch` statement. A `switch` expression is never a target.
- `continue label;` targets loops only, never a `switch`.
- Only the statement directly after a label carries it. In `a: b: while (...)`, the loop is `b`.
- Unlabeled `break` and `continue` keep their old behavior.
- Labels follow `goto` label rules. Two labels with the same name in overlapping scopes are an error, so each labeled loop in a method gets its own name, such as `rows` and `cells`.
- A jump cannot leave a lambda or local function for an enclosing loop.

## Refactors

| Before | After |
| --- | --- |
| A `found` flag set in the inner loop and checked at each outer level | `break label;` |
| `goto Done;` with `Done:` right after the loops | `break label;` |
| `goto Next;` with `Next: ;` at the end of the outer body | `continue label;` |

- `IDE0410` ("Use labeled jump statement") reports these patterns and offers the fix. Its option is `csharp_style_prefer_labeled_jump_statements`, default `true`.
- Extracting a method is still cleaner when the loops share few locals. Labeled jumps win when extraction would need tuples or `out` parameters.
