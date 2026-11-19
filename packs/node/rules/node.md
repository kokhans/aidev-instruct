---
description: Node.js LTS as the runtime for servers, scripts and CLIs, with ESM, env files, the permission model and graceful shutdown.
globs: ["**/package.json", "**/*.ts", "**/*.mts", "**/*.js", "**/*.mjs", "**/node.config.json", "**/.nvmrc", "**/.node-version"]
---

# Node.js

## Version

- Production runs on an LTS line, latest stable LTS for new projects. `engines.node` in `package.json` and `.nvmrc` or `.node-version` name the same major.
- Alpha and Current releases never run production.
- Upgrades read the release's deprecations: `node --pending-deprecation` and `--throw-deprecation` surface them in tests.

## Modules

- `package.json` sets `"type": "module"`. New code is ESM; `.cjs` only for a tool that demands CommonJS.
- Built-in modules use the `node:` prefix: `import { readFile } from "node:fs/promises"`.
- Relative imports include the file extension. Internal aliases use `imports` entries starting with `#`, which Node resolves itself.
- Web APIs first where Node has them: `fetch`, `AbortController`, `URL`, `structuredClone`, `crypto.randomUUID()`, Web Streams.

## Configuration

- Env files load with `--env-file=.env` or `--env-file-if-exists=.env.local`, or `process.loadEnvFile()`. No `dotenv`. Variables already set in the environment win.
- Runtime flags shared by every entry point live under `nodeOptions` in `node.config.json`, loaded with `--config-file` (stable since Node 26.12).
- Development uses `node --watch`, not `nodemon`.
- `--enable-source-maps` for code compiled to JavaScript, so stack traces point at the source.

## Permission Model

- Scripts and CLIs that touch the file system or spawn processes run with `--permission` and the narrowest `--allow-fs-read`, `--allow-fs-write`, `--allow-child-process` and `--allow-net` they need.
- The permission model is a seat belt for trusted code, not a sandbox: malicious code can bypass it.
- `process.permission.has()` checks access before an optional feature runs.

## Shutdown and Errors

- Servers handle `SIGTERM` and `SIGINT`: stop accepting connections with `server.close()`, which also drops idle keep-alive connections, finish in-flight work, close pools, then exit. A timer forces exit if draining hangs.
- Long work takes an `AbortSignal` so shutdown can cancel it.
- `unhandledRejection` and `uncaughtException` log and exit with a non-zero code. Never keep running after them.
- No synchronous `fs` calls or CPU-heavy loops on a request path. CPU work moves to `node:worker_threads`.
- Logs are structured JSON on stdout.
