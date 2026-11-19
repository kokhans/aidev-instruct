---
name: go-echo-v5-migration
description: Migrates a Go service from Echo v4 to Echo v5, covering import paths, the *echo.Context handler signature, slog logging, HTTP errors and the error handler, binding helpers, middleware renames, StartConfig and the trusted-proxy defaults. Use when a module imports github.com/labstack/echo/v4 or when Echo v4 code fails to compile against v5.
---

# Echo v5 Migration

Echo v4 gets bug fixes until 2026-12-31 and security fixes until 2027-12-31. v5 needs a Go release from the last three.

## Workflow

1. Upgrade v4 to its latest release first and run the tests. Late v4.16 releases already changed IP and redirect behavior, so this separates behavior changes from API changes.
2. Replace import paths: `github.com/labstack/echo/v4` to `github.com/labstack/echo/v5`, including `/middleware`. Companion modules move too: `github.com/labstack/echo-jwt/v5`, `github.com/labstack/echo-contrib/v5`.
3. Replace ` echo.Context` with ` *echo.Context` in every handler, middleware, binder, renderer and test helper.
4. Run `go build ./...` and fix each remaining error with the table in [api-changes.md](references/api-changes.md).
5. Rewrite the custom error handler (see below). This is the change most likely to compile and still be wrong.
6. Replace the logger setup with `*slog.Logger` and the removed `Logger` middleware with `RequestLogger`.
7. Replace server startup with `echo.StartConfig` and graceful shutdown.
8. Configure `e.IPExtractor` and `e.SchemeExtractor` for the real proxy chain.
9. Run `go vet ./...`, `go test -race ./...` and the end-to-end tests behind the real proxy.

## Error Handler

- The signature is `func(c *echo.Context, err error)`: arguments swapped.
- Predefined errors (`echo.ErrNotFound`, `echo.ErrMethodNotAllowed`, `echo.ErrBadRequest`) are no longer `*echo.HTTPError`. A v4 type assertion `err.(*echo.HTTPError)` now turns router 404s and 405s into 500s.
- Status comes from `echo.StatusCode(err)`, which returns 0 when the error carries no status.
- `HTTPError.Message` is a `string`, and `Internal` is unexported. Causes are attached with `.Wrap(err)` and read with `errors.Unwrap` or `errors.As`.
- `echo.NewHTTPError(code, message)` takes exactly one string. Extra detail moves into a custom error type or the wrapped error.
- `e.DefaultHTTPErrorHandler` is gone. `echo.DefaultHTTPErrorHandler(exposeError)` returns a handler; production passes `false`.
- `c.Response()` returns `http.ResponseWriter`. `echo.UnwrapResponse(c.Response())` gives `*echo.Response` for `Committed` and `Status`.

## Behavior Changes to Test

| Area | v5 behavior |
| --- | --- |
| `c.RealIP()` | Uses the peer address unless `e.IPExtractor` is set. Rate limits and audit logs behind a proxy see the proxy IP until it is configured. |
| `c.Scheme()` | Trusts `X-Forwarded-Proto` only from loopback, link-local, private addresses and unix sockets. Public load balancers need `echo.ExtractSchemeFromHeaders(echo.TrustIPRange(...))`, or `HTTPSRedirect` loops and HSTS stops. |
| Static files | Paths are not unescaped by default. A static mount exposes its whole tree; guard it with middleware on the mount. |
| Groups | Groups register implicit 404 routes as in v4. `echo.Config{NoGroupAutoRegister404Routes: true}` turns that off. |
| `HEAD` | Served by `GET` handlers only with `RouterConfig{AutoHandleHEAD: true}`. |
| Tests | `httptest.NewRequest` uses an untrusted `RemoteAddr`, so tests that set forwarding headers set `req.RemoteAddr` to a private address. |

## Checklist

- [ ] No import of `echo/v4`, `echo-jwt/v4` or `echo-contrib` without `/v5`
- [ ] Custom error handler uses `echo.StatusCode`, not a type assertion
- [ ] No `NewHTTPError` call with more than one message argument
- [ ] Request logging and timeouts use `RequestLogger` and `ContextTimeout`
- [ ] Server starts with `StartConfig` and shuts down on `SIGTERM`
- [ ] `IPExtractor` and `SchemeExtractor` match the deployed proxy chain
- [ ] 404, 405, validation and panic responses verified by tests
