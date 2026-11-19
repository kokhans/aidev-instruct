---
description: OpenTelemetry setup for .NET apps with OpenTelemetry.Extensions.Hosting, ActivitySource and Meter.
globs: ["**/*.cs", "**/*.csproj", "**/Directory.Packages.props"]
with: ["dotnet"]
---

# OpenTelemetry for .NET

- Setup is one chain on the host: `builder.Services.AddOpenTelemetry().ConfigureResource(...).WithTracing(...).WithMetrics(...).UseOtlpExporter()`. `UseOtlpExporter` exports traces, metrics and `ILogger` logs, is called once, and never together with a per-signal `AddOtlpExporter`, which throws.
- Packages are `OpenTelemetry.Extensions.Hosting`, `OpenTelemetry.Exporter.OpenTelemetryProtocol` and the instrumentation packages for ASP.NET Core, `HttpClient` and the database client.
- Tracing uses `System.Diagnostics.ActivitySource` and metrics use `System.Diagnostics.Metrics.Meter`. There is no OpenTelemetry tracer API in app code.
- Every custom source and meter is registered by name with `AddSource("...")` and `AddMeter("...")`. Unregistered sources produce nothing.
- `ActivitySource` instances are static, named after the assembly or component. Meters in DI apps come from `IMeterFactory` in a singleton service, never one per request.
- Code checks `activity is not null` or uses `?.`, because `StartActivity` returns `null` when nothing listens.
- Log messages use templates with named placeholders, never string interpolation.
- Aspire service defaults (`AddServiceDefaults`) already wire this up. Aspire projects extend that setup instead of adding a second one.
