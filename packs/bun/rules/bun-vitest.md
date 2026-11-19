---
description: Running Vitest in a Bun project.
globs: ["**/package.json", "**/*.test.ts", "**/*.test.tsx", "**/vitest.config.*"]
with: ["vitest"]
---

# Bun With Vitest

- `bun run test` runs the `test` script, which starts Vitest. `bun test` starts Bun's own runner and is never used.
- `bun run` honors the `node` shebang of the `vitest` binary, so Vitest runs on Node when Node is on `PATH`. It runs on Bun only with `--bun`, `[run] bun = true` in `bunfig.toml`, or no Node installed.
- On Node, a module that imports `Bun.*` or `bun:*` cannot load in a test. Bun-only calls sit behind a module that tests replace with `vi.mock`.
