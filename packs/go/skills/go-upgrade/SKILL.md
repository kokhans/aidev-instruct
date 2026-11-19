---
name: go-upgrade
description: Upgrades a Go module to a newer Go release and modernizes its code with go fix, then updates dependencies, tools and golangci-lint. Use when raising the go line in go.mod, when a module targets an unsupported Go release, after installing a new toolchain, or when migrating a golangci-lint v1 configuration.
---

# Go Upgrade

## Before Starting

- Find the latest stable release on `https://go.dev/doc/devel/release` and read the release notes of every release between the current `go` line and the target.
- Start from a clean working tree so each step lands as its own reviewable commit.
- Check `godebug` lines in `go.mod` and `//go:debug` directives. A setting removed in the target release fails the build unless it is set to its final default.
- Decide the target per module: an application moves to the latest stable release; a library moves only as far as the oldest release its users still need.

## Workflow

1. Raise the version: `go get go@<version>`. Add `go get toolchain@go<version>` only when development must use a newer toolchain than the `go` line.
2. Run `go mod tidy`, then `go build ./...`, `go vet ./...` and `go test -race ./...`. Fix failures before modernizing.
3. Run `go fix -diff ./...` to preview, then `go fix ./...`. Repeat until it reports nothing; twice is usually enough. Commit this step alone.
4. Code behind build constraints is only fixed for the platform being built. Repeat step 3 with `GOOS` and `GOARCH` set for each other target platform.
5. Apply the changes `go fix` cannot make, listed in [modern-go.md](references/modern-go.md).
6. Upgrade dependencies: `go list -m -u all` lists available updates, `go get -u=patch ./...` takes patch releases, minor and major updates go one module at a time with tests in between.
7. Upgrade tools: `go get tool` moves every `tool` directive to its latest version. Re-run `go generate ./...` and commit regenerated code separately.
8. Update golangci-lint to the latest release binary. A config without `version: "2"` is migrated with [golangci-lint.md](references/golangci-lint.md).
9. Run `govulncheck ./...` and the full check suite again.
10. Update every other place that names a Go version: CI setup, Dockerfiles and build images, devcontainers. CI reads the version from `go.mod` where it can.

## What Go Fix Does

`go fix` applies the modernizers registered with `go tool fix help`. A fix applies only in files whose Go version (from `go.mod` or a `//go:build go1.N` line) is new enough.

| Fixer | Change |
| --- | --- |
| `any` | `interface{}` to `any` |
| `forvar` | removes `x := x` loop copies |
| `rangeint` | `for i := 0; i < n; i++` to `for i := range n` |
| `minmax`, `slicescontains`, `slicessort`, `mapsloop` | hand-written loops to `min`, `max`, `slices` and `maps` calls |
| `stringscut`, `stringscutprefix`, `stringsseq` | `strings.Index` and `Split` patterns to `Cut`, `CutPrefix`, `SplitSeq` |
| `testingcontext` | `context.WithCancel` in tests to `t.Context()` |
| `waitgroupgo` | `wg.Add(1)` with `go` and `wg.Done()` to `wg.Go` |
| `errorsastype` | `errors.As` with a target variable to `errors.AsType[T]` |
| `newexpr` | helper pointer functions to `new(expr)` |
| `omitzero` | suggests `omitzero` for struct fields tagged `omitempty` |
| `atomictypes` | `atomic.AddInt64(&x, 1)` on plain fields to `atomic.Int64` |
| `inline` | inlines calls to functions marked `//go:fix inline` |

- A library that deprecates a function marks it `//go:fix inline` when its body is the replacement call, so callers migrate with `go fix`.
- Compile errors left after the last run are fixed by hand.

## Checklist

- [ ] `go` line, `toolchain` line and every CI and image version agree
- [ ] `go fix ./...` reports nothing on every target platform
- [ ] No `godebug` setting relies on removed behavior
- [ ] Manual changes from `modern-go.md` applied or consciously deferred
- [ ] `go build`, `go vet`, `go test -race`, `golangci-lint run` and `govulncheck` pass
