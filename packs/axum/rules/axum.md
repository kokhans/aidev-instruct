---
description: Axum web services with routing, state, extractors, error responses, tower-http middleware, graceful shutdown and router tests.
globs: ["**/*.rs"]
---

# Axum

## Routing

- Path params use `/{id}` and `/{*rest}`. The old `/:id` and `/*rest` panic at startup.
- Routers compose with `nest` and `merge`. The outer router calls `.with_state(state)` once.
- `fallback` and `method_not_allowed_fallback` return the API's error body instead of an empty 404 or 405.
- Middleware that must not run on unmatched paths, such as authentication, uses `route_layer`.

## State and Extractors

- App state is one `Clone` struct of cheap handles (pools, clients, `Arc` config), extracted with `State<AppState>`. Handlers that need part of it extract a substate through `FromRef`.
- `Extension` carries per-request values set by middleware, never app state: `State` is checked at compile time.
- The body extractor (`Json`, `Form`, `Bytes`, `Multipart`) is the last handler argument, because the body is read once.
- Custom extractors implement `FromRequestParts` or `FromRequest` with a plain `async fn`. No `#[async_trait]`.
- `Option<T>` extractors reject malformed input and yield `None` only when the value is absent. Optional query values are `Option` fields inside the `Query<T>` struct.
- A wrapper extractor, `#[derive(FromRequest)]` with `#[from_request(via(Json), rejection(AppError))]`, returns rejections in the API's error format.
- Extracted input is validated before use. A newtype constructor or a validation crate turns failures into a 422.

## Errors

- Handlers return `Result<T, AppError>`. `AppError` implements `IntoResponse` with a status and JSON body, and `From<E>` conversions make `?` work.
- Internal errors log the full source with `tracing` and return a 500 without details.
- `NoContent` answers 204. `(StatusCode::CREATED, Json(body))` answers 201.

## Server and Middleware

- `tokio::net::TcpListener::bind`, then `axum::serve(listener, app).with_graceful_shutdown(shutdown_signal())`.
- Cross-cutting behavior comes from `tower-http`: `TraceLayer`, `TimeoutLayer::with_status_code(StatusCode::REQUEST_TIMEOUT, duration)` (`TimeoutLayer::new` is deprecated), `CorsLayer` with explicit origins, `CompressionLayer`, `SetRequestIdLayer` and `PropagateRequestIdLayer`.
- Request bodies have a limit: `DefaultBodyLimit` per route, `RequestBodyLimitLayer` for the whole app.
- Several layers go in one `ServiceBuilder`, which runs them top to bottom. Separate `.layer()` calls wrap outward, so the last one runs first.
- Custom middleware is `axum::middleware::from_fn` or `from_fn_with_state`, not a hand-written `Service`.

## Tests

- Tests build the router with test state and call it with `tower::ServiceExt::oneshot`. No TCP port.
- Response bodies are read with `http_body_util::BodyExt::collect` and asserted as parsed JSON, not raw strings.
