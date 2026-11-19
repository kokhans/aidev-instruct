---
description: Dockerfile rules for small, reproducible, non-root images built with BuildKit.
globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile", "**/.dockerignore"]
---

# Docker

## Base Images

- Images start from Docker Official Images, Verified Publisher images or Docker Hardened Images (`dhi.io/<image>:<tag>`, free under Apache 2.0, needs `docker login dhi.io`).
- Build stages use a full or `-dev` variant. The final stage uses the smallest variant that runs the app: slim, distroless, chiseled or a hardened runtime image without a shell.
- Tags name the runtime version, never `latest`. Production pins the digest too (`image:tag@sha256:...`), and Dependabot or Renovate updates the pins.
- Images are rebuilt regularly with `--pull` so base image fixes land.

## Dockerfile

- The file starts with `# syntax=docker/dockerfile:1`.
- Multi-stage builds: dependencies, build, test and runtime stages. The runtime stage copies only the built output and production dependencies.
- Dependency manifests and lockfiles are copied and installed before the source, so source changes keep the dependency layer cached.
- Package caches use `RUN --mount=type=cache`. Files needed by one step only use `RUN --mount=type=bind` instead of `COPY`.
- Build secrets use `RUN --mount=type=secret`. Secrets never go in `ARG`, `ENV` or a copied file, because they persist in the image history.
- `COPY` for local files. `ADD` only for remote artifacts with `--checksum`.
- `apt-get update` and `apt-get install --no-install-recommends` share one `RUN`, which also removes `/var/lib/apt/lists/*`.
- Pipes run under `set -o pipefail`. Multi-line scripts use `RUN <<EOF` heredocs instead of long `&&` chains.
- `docker build --check` passes with no warnings.

## Runtime

- The final stage runs as a non-root user with a numeric UID (`USER 10001` or the image's built-in user). Files the app writes are owned by that user through `COPY --chown`.
- `ENTRYPOINT` and `CMD` use the exec form (`["executable", "arg"]`), so the app is PID 1 and receives `SIGTERM`. Wrapper scripts end with `exec`.
- The app handles `SIGTERM` and exits before the stop timeout.
- Configuration comes from environment variables at runtime. The image is the same for every environment.
- `EXPOSE` documents the port the app listens on. Apps listen on `0.0.0.0`, not `localhost`.
- `HEALTHCHECK` is set only when the image has a tool to run it. Orchestrators use their own probes.

## .dockerignore

- `.dockerignore` excludes `.git`, dependency folders, build output, local env files, test reports and IDE folders.
- Env files and keys are never in the build context.

Compose rules are in `docker-compose`.
