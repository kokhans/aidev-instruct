---
description: OpenTelemetry setup for Python services with the distro and zero-code instrumentation.
globs: ["**/*.py", "**/pyproject.toml"]
with: ["python"]
---

# OpenTelemetry for Python

- Services install `opentelemetry-distro` and `opentelemetry-exporter-otlp`, then add the instrumentation packages that `opentelemetry-bootstrap -a requirements` lists to `pyproject.toml`. `opentelemetry-bootstrap -a install` is not run in images; dependencies stay locked.
- The process starts under `opentelemetry-instrument`, such as `opentelemetry-instrument python -m app`, configured by `OTEL_*` variables.
- `opentelemetry-instrumentation-logging` exports `logging` records as OTLP logs with trace context. Its handler is on by default (`OTEL_PYTHON_LOG_AUTO_INSTRUMENTATION`). `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED` is the setting from before 1.40 and is not used.
- `OTEL_PYTHON_LOG_CORRELATION=true` adds `otelTraceID` and `otelSpanID` to text log lines.
- Custom spans and metrics use `opentelemetry.trace.get_tracer(__name__)` and `opentelemetry.metrics.get_meter(__name__)` at module level.
- Spans wrap work with `with tracer.start_as_current_span("name"):`, so context propagates to child calls and async tasks.
- Pre-fork servers such as Gunicorn initialize OpenTelemetry in each worker after the fork. Started before the fork, metric export breaks. ASGI apps can run Gunicorn with `uvicorn.workers.UvicornWorker` under `opentelemetry-instrument` instead.
