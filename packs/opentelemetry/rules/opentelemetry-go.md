---
description: OpenTelemetry SDK setup for Go services with otelhttp and the slog bridge.
globs: ["**/*.go", "**/go.mod"]
with: ["go"]
---

# OpenTelemetry for Go

- `main` calls one `setupOTelSDK(ctx)` function that sets the propagator, then the tracer, meter and logger providers, and returns a shutdown function. `main` defers it and joins its error.
- If a later provider fails to start, setup shuts down the ones already started.
- The propagator is `propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{})`, set with `otel.SetTextMapPropagator`.
- Providers are registered globally with `otel.SetTracerProvider`, `otel.SetMeterProvider` and `global.SetLoggerProvider`, and use OTLP exporters with a batcher or periodic reader.
- HTTP servers wrap the mux with `otelhttp.NewHandler`, and clients use `otelhttp.NewTransport`.
- Logging goes through `log/slog` with the `otelslog` bridge. Calls use the `Context` variants (`InfoContext`) so records carry the trace.
- Every function that does traced work takes `ctx context.Context` first and passes it on. Spans end with `defer span.End()`.
- Packages get tracers and meters with `otel.Tracer(name)` and `otel.Meter(name)`, named after the import path.
