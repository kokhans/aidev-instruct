---
description: OpenTelemetry SDK setup for Node.js services with @opentelemetry/sdk-node.
globs: ["**/instrumentation.ts", "**/instrumentation.mjs", "**/*otel*.ts", "**/*telemetry*.ts", "**/package.json"]
with: ["node"]
---

# OpenTelemetry for Node.js

- The SDK is `@opentelemetry/sdk-node` (SDK 2.x) with `@opentelemetry/auto-instrumentations-node` and the OTLP exporters. Instrumentations not in use are disabled to cut startup cost.
- `instrumentation.ts` creates the `NodeSDK` and calls `sdk.start()`. It loads before the app with `node --import` (ESM) or `--require` (CommonJS), never by an `import` inside the app.
- ESM apps also register the loader hook: `--experimental-loader=@opentelemetry/instrumentation/hook.mjs`. So do CommonJS apps whose ESM dependencies import instrumented packages. It is the only supported hook; `import-in-the-middle` is not used directly.
- `NODE_OPTIONS` holds no second `--require` or `--import` of OpenTelemetry.
- `SIGTERM` handling awaits `sdk.shutdown()` before the process exits.
- Code reads `trace` and `metrics` from `@opentelemetry/api` only. App modules never import SDK packages.
- Frameworks with their own hook, such as the Next.js `instrumentation.ts` file, use that hook instead of `--import`.
