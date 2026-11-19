---
description: Container images for Node.js apps.
globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile", "**/.dockerignore"]
with: ["node"]
---

# Docker for Node.js

- Images start from `node:<lts>-slim`, or a hardened `dhi.io/node` image with its `-dev` variant for build stages. The version matches the project's Node.js version file.
- Alpine images are used only when native add-ons are known to build on musl.
- The dependency stage copies `package.json` and the lockfile, then runs the package manager's frozen install with a cache mount for its store.
- The runtime stage installs or copies production dependencies only, plus the build output.
- `NODE_ENV=production` is set in the runtime stage.
- The runtime stage runs as the image's `node` user (UID 1000).
- `CMD ["node", "dist/server.js"]` starts the app directly. `npm start` and other package manager scripts are not the entrypoint: they add a process and swallow `SIGTERM`.
- Node.js is not built to run as PID 1. Containers run with `--init` (or the orchestrator's equivalent) unless the app handles `SIGTERM` and `SIGINT` itself.
- `.dockerignore` excludes `node_modules`, so host binaries never enter the image.
