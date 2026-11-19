---
description: C# rules for every supported language version, C# 7.3 to C# 15, covering the language version, warnings, types, errors, async methods and logging.
globs: ["**/*.cs"]
---

# C#

## Language Version

- The target framework picks the language version. Projects set no `LangVersion`.
- Never `LangVersion` `latest`: its meaning changes with the installed compiler.
- A language version newer than the target framework's default is unsupported. Move the target framework instead.
- `#error version` makes the compiler report its version and the language version (CS8304). Remove it after reading.

## Compiler

- Warnings are errors. Suppress a diagnostic at the narrowest scope with a justification, never project-wide.

## Types and Errors

- Classes are `sealed` unless designed for inheritance.
- Exceptions are for unexpected failures. Expected outcomes are return values.

## Async

- No `async void` outside event handlers.
- `ConfigureAwait(false)` only in reusable libraries. App code omits it.

## Logging

- Never log secrets, tokens, connection strings or full request bodies.
