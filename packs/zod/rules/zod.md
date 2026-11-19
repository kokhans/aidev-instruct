---
description: Zod validates every boundary (environment, forms, request bodies, API responses) and is the source of the types.
globs: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
---

# Zod

## Boundaries

- Zod parses every value that enters the program: environment variables, form data, query and route params, request bodies, `JSON.parse` output, storage, CMS and third-party API responses.
- Schemas live next to the boundary that uses them and are shared when client and server read the same shape.
- Environment variables are parsed once at startup by one schema, with `parse` so a bad value stops the process. Server and public values are separate schemas, and server values never reach client code.
- User input uses `safeParse` and returns field errors. `parse` is for data whose failure is a bug. A check that needs only pass or fail uses `.validate()`, which builds no error.
- Types come from schemas with `z.infer`, or `z.input` and `z.output` when a schema transforms. Never write a type twice.

## Zod API

- `import * as z from "zod"`. Zod Mini (`zod/mini`) only where client bundle size is a hard constraint.
- String formats are top-level: `z.email()`, `z.url()`, `z.uuid()`, `z.iso.datetime()`, `z.ipv4()`. `z.string().email()` and the other method forms are deprecated.
- Messages use the `error` parameter: `z.string().min(1, { error: "Required" })`. No `message`, `invalid_type_error`, `required_error` or `errorMap`.
- Objects: `z.object` strips unknown keys, `z.strictObject` rejects them, `z.looseObject` keeps them. No `.strict()`, `.passthrough()` or `.merge()`; use `.extend()` or spread `.shape`.
- `z.enum()` takes string literals or an existing TypeScript enum. No `z.nativeEnum()`.
- `z.record()` takes a key and a value schema. `z.partialRecord()` when not every enum key is present.
- `.default()` returns its value as the output when the input is `undefined`. `.prefault()` parses its value instead.
- Form and query strings use `z.coerce.number()` and `z.coerce.date()`. Environment flags use `z.stringbool()`, never `z.coerce.boolean()`, which turns `"false"` into `true`.
- Discriminated variants use `z.discriminatedUnion("kind", [...])`.
- Values that cross the wire in both directions, such as an ISO string and a `Date`, use `z.codec()` with `decode` and `encode`. `.transform()` is one-way.
- IDs that must not mix use `.brand<"UserId">()`.
- `z.function()` is not a schema: define `input` and `output`, then `.implement()`. No `z.promise()`; await before parsing.

## Errors and Metadata

- Forms show `z.flattenError(error).fieldErrors`. Nested data uses `z.treeifyError`. Logs use `z.prettifyError`. No `.format()`, `.flatten()`, `z.formatError` or `.formErrors`.
- `.meta({ description })` documents a schema, and `z.toJSONSchema()` exports it (`{ io: "input" }` for request bodies).
