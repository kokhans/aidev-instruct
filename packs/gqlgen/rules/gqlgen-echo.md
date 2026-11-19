---
description: gqlgen servers mounted in Echo, covering routing, middleware, request context and limits.
globs: ["**/*.go"]
with: ["go-echo"]
---

# `gqlgen` with Echo

- The gqlgen server is mounted with `echo.WrapHandler(srv)` on `e.GET` and `e.POST` for one path. WebSocket upgrades arrive on the GET route.
- Resolvers see only `context.Context`, never `*echo.Context`. Echo middleware that resolves the user or tenant stores it in the request context with `c.SetRequest(c.Request().WithContext(ctx))`, not with `c.Set`.
- Dataloader middleware written as `func(http.Handler) http.Handler` is attached with `echo.WrapMiddleware`, on the GraphQL route only.
- Echo's `RequestLogger` sees one route for every operation. Operation names are logged from `srv.AroundOperations` with `graphql.GetOperationContext(ctx).OperationName`.
- `middleware.BodyLimit` covers the GraphQL route. Uploads through `transport.MultipartForm` set their own `MaxUploadSize` and `MaxMemory` within that limit.
- `middleware.ContextTimeout` is not applied to the route that serves WebSocket subscriptions. gqlgen closes the connection when the request context ends, so the deadline would cut every subscription.
- Resolver errors reach the client in the GraphQL `errors` array, not through Echo's `HTTPErrorHandler`. GraphQL error formatting stays in `SetErrorPresenter`.
