---
description: Elysia HTTP APIs, covering plugins, hooks, macros, validation, errors, OpenAPI and Eden clients.
globs: ["**/*.ts"]
---

# Elysia

## Version

- The next major is a prerelease and is not adopted until stable. A project already on it follows its docs and `@elysia/codemod`.
- `@sinclair/typebox` is installed next to `elysia` in the range Elysia's peer dependency names (`>=0.34 <1` for 1.4).
- Official plugins come from the `@elysia/*` scope the docs use (`@elysia/cors`, `@elysia/openapi`, `@elysia/eden`, `@elysia/node`). `@elysiajs/*` remains only for the previous major's plugins. `@elysiajs/swagger` is deprecated.
- Node runs Elysia through `new Elysia({ adapter: node() })` from `@elysia/node`.

## Instances and Plugins

- Elysia code always chains methods. A chain split into separate statements loses inferred types.
- A feature is its own `new Elysia({ prefix })` instance mounted with `.use()`. Plugins are instances, not `(app) => app` callbacks.
- Every instance `.use()`s the plugins it depends on. Nothing relies on a parent having registered them.
- A plugin that adds context (`decorate`, `resolve`, a macro or models) has a unique `name`, so it runs once however often it is used.
- Hooks, `onError` included, apply only to routes registered after them and are `local` by default. `{ as: "scoped" }` or `.as("scoped")` lifts them to the parent. `"global"` is only for cross-cutting concerns such as CORS and logging.
- `resolve` over `derive`: it runs after validation.
- Handlers stay inline. Logic moves to plain functions that take destructured values, never the whole `Context`.
- Auth and other guards are macros: `.macro({ auth: { resolve } })`. The `resolve` returns `status(401)` or the context it adds, and routes opt in with `{ auth: true }`.

## Validation

- Every route declares its `params`, `query`, `body`, `headers` and `response` schemas with `t` from `elysia`. One schema gives validation, coercion, types and OpenAPI.
- `response` maps status codes to schemas, and handlers return `status(code, body)`. The removed `error()` function is never used.
- Reused schemas are registered once with `.model()` and referenced by name.
- Types come from schemas (`typeof schema.static`), never from parallel interfaces.
- `normalize` stays at its default, which strips unknown fields from bodies and responses.

## Errors

- Custom errors extend `Error` with a `status` and an optional `toResponse()`, registered with `.error({ ... })` so `onError` narrows them by `code`.
- `throw status(...)` reaches `onError`. `return status(...)` does not.
- Validation details stay hidden while `NODE_ENV` is `production`. `allowUnsafeValidationDetails` is never set.

## OpenAPI, Clients and Tests

- `openapi()` from `@elysia/openapi` serves the docs at `/openapi`, disabled or protected in production. `references: fromTypes()` adds response types the schemas do not declare.
- The server exports `type App = typeof app`. Clients call it with `treaty<App>(url)` from `@elysia/eden`, never hand-written fetch wrappers.
- Tests call `treaty(app)` or `app.handle(new Request("http://localhost/path"))`. No server is started.
