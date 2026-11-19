---
description: Container images for apps that run on Bun.
globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile", "**/.dockerignore"]
with: ["bun"]
---

# Docker for Bun

- Images start from `oven/bun` with a version tag that matches the project's Bun version.
- The install stage copies `package.json` and `bun.lock`, then runs `bun install --frozen-lockfile` for the build and `bun install --production` (which implies `--frozen-lockfile`) for the runtime dependencies.
- Tests and the build run in a stage with `NODE_ENV=production` before the runtime stage.
- The runtime stage copies production `node_modules`, the build output and `package.json` only.
- The runtime stage runs as the image's `bun` user.
- `ENTRYPOINT ["bun", "run", "<entry>"]` uses the exec form.
- `.dockerignore` excludes `node_modules`.
