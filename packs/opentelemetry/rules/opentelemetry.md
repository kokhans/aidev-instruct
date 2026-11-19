---
description: Language-neutral OpenTelemetry rules for instrumentation, resources, attributes, export and sampling.
globs: ["**/*.ts", "**/*.js", "**/*.cs", "**/*.py", "**/*.go", "**/*.rs", "**/otel*.yaml", "**/*collector*.yaml"]
---

# OpenTelemetry

## Setup

- The SDK starts before any instrumented library loads and shuts down on exit, flushing pending telemetry.
- Libraries depend on the OpenTelemetry API only. The application owns the SDK, exporters and configuration.
- Configuration comes from the standard `OTEL_*` environment variables, not from code: `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`, `OTEL_TRACES_SAMPLER`.
- Every service sets `service.name`, `service.version` and `deployment.environment.name` as resource attributes.

## Export

- Telemetry goes out over OTLP to an OpenTelemetry Collector, which handles batching, retries, filtering and the backend. Apps do not use vendor exporters.
- `OTEL_EXPORTER_OTLP_ENDPOINT` is the base URL. With OTLP/HTTP the SDK appends `/v1/traces`, `/v1/metrics` and `/v1/logs`. Per-signal endpoint variables are used exactly as given.
- Exporter credentials go in `OTEL_EXPORTER_OTLP_HEADERS` from the secret store, never in code.

## Instrumentation

- Instrumentation libraries cover HTTP servers, clients, databases and messaging first. Manual spans are added only for meaningful business operations.
- Attributes use the semantic convention names, such as `http.request.method`, `http.response.status_code`, `url.full`, `server.address` and `db.system.name`. Custom attributes use an app-specific namespace.
- Span names are low-cardinality: `GET /orders/{id}`, never a URL with IDs.
- Errors set the span status to error and `error.type`, where they are handled. The exception is logged once there, inside the span context. New code does not use span events (`RecordException`, `AddEvent`) for this: the span exception conventions are deprecated in favor of logs.
- Metric attributes stay low-cardinality. User IDs, request IDs and raw URLs never become metric attributes.
- Telemetry never carries secrets, tokens or personal data. Collector processors redact as a second layer.

## Context

- W3C Trace Context and Baggage are the propagators (`tracecontext,baggage`, the default).
- Context crosses queues and background jobs by injecting it into message headers and extracting it in the consumer.
- Logs are emitted through the language's logging bridge, so each record carries the trace and span IDs.
- Baggage never holds sensitive data. It travels to every downstream service.

## Sampling

- Production uses `parentbased_traceidratio` with a ratio in `OTEL_TRACES_SAMPLER_ARG`, or tail sampling in the Collector. Development keeps the default `parentbased_always_on`.
