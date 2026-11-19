---
description: Container images for Go services built as static binaries.
globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile", "**/.dockerignore"]
with: ["go"]
---

# Docker for Go

- The build stage uses `golang:<version>` matching the `go` or `toolchain` line in `go.mod`.
- `go.mod` and `go.sum` are copied first and `go mod download` runs with a cache mount on `/go/pkg/mod`. The build also caches `/root/.cache/go-build`.
- Binaries build with `CGO_ENABLED=0` and `-trimpath`, so the runtime image needs no libc.
- The runtime stage is `gcr.io/distroless/static:nonroot`, `dhi.io/static` or `scratch` with CA certificates and time zone data copied in.
- The runtime stage runs as a non-root user (`nonroot` in distroless).
- A `test` stage runs `go test ./...` and can be targeted with `--target`.
- `ENTRYPOINT ["/app"]` runs the binary in exec form.
