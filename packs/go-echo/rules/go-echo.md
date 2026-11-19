---
description: Echo HTTP servers in Go, covering handlers, errors, binding, validation, middleware, proxies, shutdown and tests.
globs: ["**/*.go"]
---

# Echo

## Version

- Echo is `github.com/labstack/echo/v5`, middleware is `github.com/labstack/echo/v5/middleware`. v4 receives only fixes until its end of support: migrate with the `go-echo-v5-migration` skill.

## Handlers

- Handlers are `func(c *echo.Context) error`. `*echo.Context` is pooled and never escapes the handler, including into goroutines.
- Downstream calls take `c.Request().Context()`. Values set by middleware are read with `echo.ContextGet[T](c, key)`.
- Routes of one feature share `e.Group(prefix, middleware...)`. Routes and `Echo` fields never change after the server starts.

## Errors

- Handlers and middleware return errors. Only the central `e.HTTPErrorHandler` writes error responses.
- Client errors are `echo.NewHTTPError(code, message)` or a sentinel with cause: `echo.ErrBadRequest.Wrap(err)`.
- Status codes are read with `echo.StatusCode(err)` or `errors.As` to `echo.HTTPStatusCoder`. Sentinels such as `echo.ErrNotFound` are not `*echo.HTTPError`, so type assertions turn them into 500s.
- The error handler is `echo.DefaultHTTPErrorHandler(false)`, `echo.ProblemDetailsHTTPErrorHandler(false)` for RFC 9457 responses, or a custom `func(c *echo.Context, err error)`. Internal error messages are exposed only in development.
- With problem details, domain errors return an `*echo.ProblemError` or implement `echo.ProblemErrorer` to set their own type, title and detail.
- A custom handler returns early when `echo.UnwrapResponse(c.Response())` reports `Committed`.
- Error handlers do not log. `middleware.RequestLoggerWithConfig` with `HandleError: true` logs every failed request.

## Binding and Validation

- Requests bind into request DTOs, never domain or database structs, so clients cannot set fields such as roles or IDs.
- `c.Bind` applies path values, then query parameters (only for GET, DELETE, HEAD and QUERY), then the body. Single-source endpoints use `echo.BindBody`, `echo.BindQueryParams` or `echo.BindPathValues`. Headers bind only with `echo.BindHeaders`.
- Single values use the typed helpers `echo.PathParam[int64](c, "id")` and `echo.QueryParam[T]`, returning their error.
- `e.Validator` wraps `github.com/go-playground/validator/v10`. Handlers call `c.Validate(&dto)` after binding, or `c.ValidateCtx` when rules need the request context, and return `echo.ErrBadRequest.Wrap(err)`.

## Middleware

- `e.Pre` holds middleware that rewrites the request before routing (trailing slash, method override). `e.Use` runs after routing.
- The baseline is `middleware.Recover()`, `middleware.RequestID()`, `middleware.RequestLogger()`, `middleware.BodyLimit(bytes)` and `middleware.Secure()`.
- `middleware.ContextTimeout(d)` only sets a deadline on the request context and turns a returned `context.DeadlineExceeded` into a 503. Handlers must pass that context to every blocking call.
- `middleware.CORS(origins...)` lists exact origins, never `*` with credentials.
- A static mount exposes its whole directory. Authorization middleware goes on the `Static` route or group itself, never on a sibling route.

## Proxies

- Without a proxy, `c.RealIP()` is the peer address. Behind proxies, `e.IPExtractor` is `echo.ExtractIPFromXFFHeader` or `echo.ExtractIPFromRealIPHeader` with `echo.TrustIPRange` for public proxy ranges.
- `e.SchemeExtractor` trusts `X-Forwarded-Proto` only from private addresses by default. Public proxy ranges are added with `echo.ExtractSchemeFromHeaders(echo.TrustIPRange(...))`. `LegacyIPExtractor` and `LegacySchemeExtractor` are never used.

## Server and Tests

- Servers start with `echo.StartConfig{Address, GracefulTimeout, BeforeServeFunc}.Start(ctx, e)`, `ctx` from `signal.NotifyContext`. `BeforeServeFunc` sets `ReadHeaderTimeout` and other `http.Server` limits.
- `e.Logger` is the application's `*slog.Logger`. Handlers log with `c.Logger()`.
- Handler tests build a context with `e.NewContext(req, rec)` and `c.SetPathValues`, or `echotest.ContextConfig`. Routing and middleware tests call `e.ServeHTTP(rec, req)`.
