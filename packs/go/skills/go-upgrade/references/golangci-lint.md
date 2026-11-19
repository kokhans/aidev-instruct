# `golangci-lint` Configuration

## Install

- Install the release binary at a pinned version, locally and in CI. The docs advise against `go install` and `go tool`: they build with the local toolchain and can pull untested dependency versions.
- Upgrade the binary with every Go upgrade. A golangci-lint built with a Go release older than the `go` line cannot load the module.

## Migrating a v1 Config

1. Run `golangci-lint migrate`. It writes a v2 file and keeps the original as `<name>.bck.<ext>`.
2. Comments and unknown or deprecated fields are not carried over. Re-add comments that explain exclusions.
3. Review the result against the mapping below, then run `golangci-lint run` and `golangci-lint fmt`.

| v1 | v2 |
| --- | --- |
| no `version` | `version: "2"` |
| `linters.disable-all: true` | `linters.default: none` |
| `linters.enable-all: true` | `linters.default: all` |
| `linters.fast` | `linters.default: fast` |
| `gofmt`, `gofumpt`, `goimports`, `gci` in `linters.enable` | `formatters.enable` |
| `linters-settings` | `linters.settings` and `formatters.settings` |
| `issues.exclude-rules`, `exclude-dirs`, `exclude-files` | `linters.exclusions.rules` and `linters.exclusions.paths` |
| `issues.exclude-generated` | `linters.exclusions.generated` (`strict`, `lax` or `disable`) |
| `gosimple`, `stylecheck` | merged into `staticcheck` |
| `exclude-case-sensitive` | `(?i)` in the regular expression |

## Config Shape

```yaml
version: "2"
linters:
  default: standard
  enable: [bodyclose, errorlint, gosec, noctx, revive]
  exclusions:
    generated: strict
    rules:
      - path: _test\.go
        linters: [gosec]
formatters:
  enable: [gofumpt, goimports]
```

- `standard` enables `errcheck`, `govet`, `ineffassign`, `staticcheck` and `unused`. Additions are listed explicitly; `default: all` breaks on every release that adds a linter.
- Exclusions are narrow: a path and a linter, or a `text` pattern with a comment explaining it. No blanket `paths` exclusions for real code.
- `issues.new-from-rev` adopts linting gradually on an existing codebase.
