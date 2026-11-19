# Echo v4 to v5 API Changes

Source: `API_CHANGES_V5.md` in the Echo repository. Check it for APIs not listed here.

## Core

| v4 | v5 |
| --- | --- |
| `func(c echo.Context) error` | `func(c *echo.Context) error` |
| `e.NewContext(req, rec)` returns `echo.Context` | returns `*echo.Context`; `echo.NewContext(req, rec)` also exists |
| `c.ParamNames()`, `c.ParamValues()`, `c.SetParamNames`, `c.SetParamValues` | `c.PathValues()`, `c.SetPathValues(echo.PathValues{{Name: "id", Value: "1"}})` |
| `c.Response()` returns `*echo.Response` | returns `http.ResponseWriter`; `echo.UnwrapResponse(rw)` for `*echo.Response` |
| `echo.ContextGet[T](c, key)` on the interface | same name, takes `*echo.Context` |
| `e.Logger` custom interface, `e.StdLogger` | `e.Logger` is `*slog.Logger`; `c.Logger()` returns `*slog.Logger` |
| `echo.Map{...}` | `map[string]any{...}` |
| `echo.GetPath(r)` | `r.URL.Path` or `r.URL.RawPath` |

## Errors

| v4 | v5 |
| --- | --- |
| `HTTPErrorHandler func(err error, c Context)` | `func(c *Context, err error)` |
| `e.DefaultHTTPErrorHandler(err, c)` | `echo.DefaultHTTPErrorHandler(exposeError bool)` returns a handler |
| `NewHTTPError(code, message ...any)` | `NewHTTPError(code int, message string)` |
| `HTTPError.Message any`, `HTTPError.Internal` | `Message string`, cause added with `Wrap(err)` |
| `err.(*echo.HTTPError)` on `ErrNotFound` | never matches; use `echo.StatusCode(err)` |
| `echo.NotFoundHandler`, `echo.MethodNotAllowedHandler` variables | removed; register `e.RouteNotFound(path, h)` |

## Binding

| v4 | v5 |
| --- | --- |
| `Binder.Bind(i any, c Context)` | `Bind(c *Context, target any)` |
| `(&echo.DefaultBinder{}).BindBody(c, &v)` | `echo.BindBody(c, &v)` |
| `BindPathParams` | `echo.BindPathValues` |
| `BindQueryParams`, `BindHeaders` methods | `echo.BindQueryParams`, `echo.BindHeaders` functions |
| `echo.PathParamsBinder(c)` | `echo.PathValuesBinder(c)` |
| `echo.FormParam[T]`, `FormParams`, `FormParamOr` | `echo.FormValue[T]`, `FormValues`, `FormValueOr` |
| `strconv.Atoi(c.Param("id"))` | `echo.PathParam[int](c, "id")` |
| `NewBindingError(param, values, message any, err)` | `message string` |
| `JSONSerializer` and `Renderer` methods with `Context` last | `*Context` first |

## Routing

| v4 | v5 |
| --- | --- |
| `e.GET(...)` returns `*echo.Route` | returns `echo.RouteInfo`; `e.Match` returns `echo.Routes` |
| `e.Routes()`, `e.Reverse(name)`, `e.URI(h)` | `e.Router().Routes()`, `Routes.Reverse(name, params...)` |
| `echo.Router` struct, `router.Find` | `echo.Router` interface, `echo.DefaultRouter`, `Route(c)` |
| `e.OnAddRouteHandler` | `e.OnAddRoute func(route Route) error` |

## Server

| v4 | v5 |
| --- | --- |
| `e.Server`, `e.TLSServer`, `e.Listener` fields | removed; configure through `StartConfig` |
| `e.HideBanner`, `e.HidePort`, `e.Debug` | `StartConfig.HideBanner`, `StartConfig.HidePort`; `Debug` removed |
| `e.StartTLS`, `e.StartAutoTLS`, `e.StartH2CServer`, `e.StartServer` | `StartConfig.Start(ctx, e)` and `StartConfig.StartTLS(ctx, e, cert, key)` |
| `e.Shutdown(ctx)` in a signal goroutine | cancel the `ctx` passed to `StartConfig.Start`; `GracefulTimeout` bounds the wait |
| custom `http.Server` timeouts | `StartConfig.BeforeServeFunc func(*http.Server) error` |
| `e.ListenerAddr()` | `StartConfig.ListenerAddrFunc` |

## Middleware

| v4 | v5 |
| --- | --- |
| `middleware.Logger()`, `LoggerWithConfig` | `middleware.RequestLogger()`, `RequestLoggerWithConfig` with `LogValuesFunc` |
| `middleware.Timeout()`, `TimeoutWithConfig` | `middleware.ContextTimeout(d)`; handlers must honor the context |
| `middleware.CORSWithConfig` for origins only | `middleware.CORS(origins...)` |
| `middleware.BodyLimit("2M")` | `middleware.BodyLimit(2 * 1024 * 1024)` in bytes |
| `TrailingSlashConfig` | `AddTrailingSlashConfig`, `RemoveTrailingSlashConfig` |
| `BasicAuthValidator(user, pass, c)` | `func(c *echo.Context, user, password string) (bool, error)` |
| `KeyAuthValidator(key, c)` | `func(c *echo.Context, key string, source ExtractorSource) (bool, error)` |
| `BodyDumpHandler(c, req, res)` | adds an `err error` argument |
| `NewRateLimiterMemoryStore(rate.Limit)` | `NewRateLimiterMemoryStore(float64)` |
| `middleware.Default*Config` variables | removed; start from a zero config |
| `CSRFErrorHandler` | removed; use the config `ErrorHandler` |
