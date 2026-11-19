---
description: Go modules, toolchain, linting, errors, context, concurrency, logging and standard library choices.
globs: ["**/*.go", "**/go.mod", "**/go.work", "**/.golangci.yml", "**/.golangci.yaml"]
---

# Go

## Modules and Toolchain

- The `go` line in `go.mod` is the oldest Go release the module supports. Libraries keep it at the oldest supported release, applications may raise it to the release they build with.
- The Go version changes with `go get go@<version>` and `go get toolchain@<version>`, which keep the `go` and `toolchain` lines consistent with dependencies.
- Only the two newest major releases get security fixes. A `go` line below them is upgraded with the `go-upgrade` skill.
- Code generators and other Go tools are `tool` directives added with `go get -tool <package>` and run with `go tool <name>`. No `tools.go` files with blank imports.
- golangci-lint is the exception: a pinned release binary, because its docs advise against `go install` and `go tool`.
- `go mod tidy` runs after every dependency change, and `go.sum` is committed.
- `go.work` stays out of version control, so CI tests each module as its dependents build it. The exception is a repository whose modules are developed only with each other.
- Directories that hold no Go code, such as `node_modules`, are excluded from `./...` with an `ignore` directive.
- Generated files are regenerated with `go generate ./...`, never edited by hand.

## Checks

- Every change passes `go build ./...`, `go vet ./...`, `go test -race ./...` and `golangci-lint run`.
- `.golangci.yml` declares `version: "2"`, starts from `linters.default: standard` and lists formatters (`gofmt` or `gofumpt`, `goimports`) under `formatters`. `golangci-lint fmt` formats.
- `govulncheck ./...` runs in CI. It reports only vulnerabilities reachable from the module's code.

## Errors

- Errors are returned, wrapped with context: `fmt.Errorf("load user %d: %w", id, err)`. `%v` instead of `%w` when callers must not depend on the cause.
- An error is either handled (logged, converted, retried) or returned, never both.
- Callers match with `errors.Is` for sentinels and `errors.AsType[*MyError](err)` for types. Error strings are never compared.
- Sentinels are `var ErrNotFound = errors.New("...")`. Error types exist only when callers need fields.

## Context and Concurrency

- `ctx context.Context` is the first parameter of every function that does I/O or blocks. It is never stored in a struct.
- `context.Background()` appears only in `main` and top-level wiring. Every `WithTimeout` or `WithCancel` is followed by `defer cancel()`.
- Every goroutine has an owner that waits for it and a way to stop it. `wg.Go(func() { ... })` over `Add` and `Done`, `errgroup.WithContext` from `golang.org/x/sync/errgroup` when the first error cancels the rest.
- The sender closes a channel. Channels are unbuffered unless a size is justified.
- Shared state uses `sync.Mutex` or `sync/atomic` types (`atomic.Int64`), never plain fields written from several goroutines.

## Logging

- `log/slog` is the only logger. `main` builds it (JSON handler in production) and passes `*slog.Logger` to components that log. Libraries never call `slog.SetDefault`.
- Messages are constant strings with key-value attributes: `logger.InfoContext(ctx, "order created", "order_id", id)`. The `Context` variants let handlers add trace IDs.

## Standard Library Choices

- Modules on `go 1.27` or later take UUIDs from the standard `uuid` package (`uuid.NewV7()` for database keys) and write new JSON code with `encoding/json/v2`. `github.com/google/uuid` stays only in existing code.
- Struct and `time.Time` fields that may be empty use the `omitzero` JSON option, which `omitempty` does not handle.
- `http.Server` always sets `ReadHeaderTimeout`. Shutdown uses `signal.NotifyContext` and `Server.Shutdown`.
- Standard routing uses method and wildcard patterns (`mux.HandleFunc("GET /items/{id}", h)`, `r.PathValue("id")`).
- Paths built from user input are opened through `os.OpenRoot`, which blocks traversal outside the root.

Upgrades and modernization: `go-upgrade` skill. Tests: `go-testing` rule.
