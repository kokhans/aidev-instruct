---
description: Go toolchain setup and caching in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["go"]
---

# GitHub Actions for Go

- `actions/setup-go` uses `go-version-file: go.mod`, which prefers the `toolchain` line over the `go` line. Workflows do not repeat the version.
- Module and build caching is on by default and keys on `go.sum`. `cache-dependency-path` lists every `go.sum` in a multi-module repository.
- CI runs `go mod tidy -diff`, `go vet ./...` and `go test -race ./...`.
