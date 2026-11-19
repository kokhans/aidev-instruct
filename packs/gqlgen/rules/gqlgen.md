---
description: gqlgen GraphQL servers in Go, covering generation, resolvers, N+1 loading, server setup, limits, errors and subscriptions.
globs: ["**/*.go", "**/*.graphqls", "**/*.graphql", "**/gqlgen.yml"]
---

# `gqlgen`

## Generation

- The schema (`*.graphqls`) is the source of truth. Go code is generated from it, never the other way round.
- gqlgen is a `tool` directive (`go get -tool github.com/99designs/gqlgen`). `resolver.go` carries `//go:generate go tool gqlgen generate`, and code regenerates with `go generate ./...`.
- Generated files (`generated.go`, `*.generated.go`, `models_gen.go`) are never edited. Changes go into the schema, `gqlgen.yml` or resolvers.
- `gqlgen.yml` uses `resolver.layout: follow-schema`, so each schema file has its own `*.resolvers.go`. Large schemas also set `exec.layout: follow-schema`.
- Existing Go types are reused through `autobind` and `models`, not duplicated as generated models.
- A field that needs its own query gets a resolver with `@goField(forceResolver: true)` or `resolver: true` under `models`.

## Resolvers

- Dependencies live on the `Resolver` struct in `resolver.go`. Resolvers parse arguments, call application code and map results; they hold no business logic.
- Every resolver passes its `ctx` to downstream calls.
- A field resolved per parent never queries per parent. `@goField(batch: true)` batch resolvers receive all sibling parents in one call and return results in the same order. Loads shared across levels or fields use per-request dataloaders from `github.com/vikstrous/dataloadgen`.
- Dataloaders are created per request in HTTP middleware and stored in the request context, never shared between requests. A batch function runs one query for all keys and returns results in key order.
- Batch resolvers treat their `objs` slice as read-only, never keep it after returning, and match results to parents by index or key, never by pointer identity.

## Server

- The server is `handler.New(graph.NewExecutableSchema(cfg))` with explicit transports: `transport.Options{}`, `transport.GET{}`, `transport.POST{}`, plus `transport.MultipartForm{}` for uploads and `transport.Websocket{}` or `transport.SSE{}` for subscriptions. `handler.NewDefaultServer` is deprecated and not for production.
- Parsed queries are cached with `srv.SetQueryCache(lru.New[*ast.QueryDocument](1000))`. Automatic persisted queries use `extension.AutomaticPersistedQuery{Cache: lru.New[string](100)}`.
- `extension.FixedComplexityLimit(n)` is always installed. List fields with `first` or `limit` arguments get complexity functions that multiply child cost by the argument.
- `extension.Introspection{}` is installed only in development, or enabled per request for trusted users through `AroundOperations`.
- Playground handlers (`playground.Handler`, `ApolloSandboxHandler`) are mounted only in development.

## Errors

- A returned error's message reaches the client, so resolvers return only messages safe to show.
- `srv.SetErrorPresenter` starts from `graphql.DefaultErrorPresenter`, logs internal errors and replaces their message with a generic one and an `extensions.code`.
- `srv.SetRecoverFunc` logs the panic and returns a generic error.
- Partial results add errors with `graphql.AddError(ctx, err)` and still return data.
- Errors are matched by type or sentinel, never by message text.

## Auth and Subscriptions

- HTTP middleware authenticates and puts the user in the request context. Resolvers or schema directives authorize each field.
- WebSocket connections authenticate in `transport.Websocket.InitFunc`, set `KeepAlivePingInterval`, and restrict `OriginPatterns` in the `AcceptOptions` of `transport.CoderWebsocketImplementation`. `InsecureSkipVerify` is never set outside local development.
- Subscription resolvers return a channel fed by a goroutine that stops on `ctx.Done()` and closes the channel.

## Tests

- Resolver tests run real operations through `client.New(srv)` from `github.com/99designs/gqlgen/client` with test doubles on the `Resolver` struct.
