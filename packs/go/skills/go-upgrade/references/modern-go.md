# Modern Go

Changes `go fix` does not make, by the release that introduced them. Apply those at or below the module's new `go` line.

## Go 1.27

| Change | Action |
| --- | --- |
| `uuid` package in the standard library | Replace `github.com/google/uuid` in new code. `uuid.NewV7()` for sortable keys. `database/sql` converts `uuid.UUID` both ways. |
| `encoding/json/v2` and `encoding/json/jsontext` | New code imports `encoding/json/v2`. It rejects invalid UTF-8 and duplicate names, and the `inline` tag option is `embed`. |
| `encoding/json` now runs on the v2 engine | Run JSON tests. `GOEXPERIMENT=nojsonv2` is a temporary escape hatch, not a fix. |
| Generic methods | Methods may declare type parameters. They cannot satisfy interface methods. |
| `strings.CutLast`, `bytes.CutLast` | Replace `LastIndex` and slicing pairs. |
| `goroutineleak` profile | Enable `/debug/pprof/goroutineleak` where pprof is already served. |
| `synctest.Sleep`, `httptest.NewTestServer` | Replace `time.Sleep` plus `synctest.Wait` pairs and real-network test servers. |
| `go test` runs the `stdversion` check | Fix uses of APIs newer than the `go` line. |
| `go mod tidy` merges `require` blocks | Expect a one-time `go.mod` diff. |
| `gofmt` alignment changed | Expect a one-time formatting diff after `golangci-lint fmt`. |
| `go tool trace -http=:port` binds to localhost | Use `0.0.0.0:port` where remote access is intended. |
| Removed `GODEBUG` settings (`asynctimerchan`, `tlsrsakex`, `tls3des`, `tls10server`, `x509keypairleaf`, `gotypesalias` and others) | Remove `godebug` lines that set old values. |
| macOS 13 is the minimum | Raise macOS build agents. |

## Go 1.26

| Change | Action |
| --- | --- |
| `new(expr)` | Optional pointer fields take `new(value)` instead of helper functions. |
| Crypto ignores caller-supplied randomness | Deterministic crypto tests use `testing/cryptotest.SetGlobalRandom`. |
| `slog.NewMultiHandler` | Replace custom fan-out handlers. |
| `os/signal.NotifyContext` sets a cause | Read `context.Cause(ctx)` to log which signal stopped the process. |
| `ServeMux` trailing-slash redirects use 307 | Update tests that expect 301. |
| `net/url.Parse` rejects colons in hosts | Bracket IPv6 hosts. |
| Green Tea GC is the default | Re-measure services with tuned `GOGC` or `GOMEMLIMIT`. |
| `T.ArtifactDir` and `go test -artifacts` | Write test outputs worth keeping there instead of ad hoc paths. |

## Go 1.25

| Change | Action |
| --- | --- |
| Container-aware `GOMAXPROCS` on Linux | Remove `go.uber.org/automaxprocs` and manual `GOMAXPROCS` settings that only matched CPU limits. |
| `testing/synctest` | Rewrite sleep-based concurrency tests with `synctest.Test`. |
| `http.CrossOriginProtection` | Use it for CSRF protection of cookie-authenticated handlers instead of token middleware. |
| `ignore` directive in `go.mod` | Replace `./...` workarounds for directories without Go code. |
| `runtime/trace.FlightRecorder` | Capture a trace snapshot when a rare failure happens. |
| Nil checks are no longer delayed | Code that used a result before checking `err` now panics. Check `err` first. |

## Go 1.24

| Change | Action |
| --- | --- |
| `tool` directive | Replace `tools.go` blank imports with `go get -tool`, then delete the file. |
| `os.Root` | Open user-controlled paths through `os.OpenRoot`. |
| `testing.B.Loop` | Rewrite `for i := 0; i < b.N; i++` benchmarks as `for b.Loop()` and drop `b.ResetTimer`. |
| `omitzero` | Apply where the `omitzero` fixer suggests it, checking API consumers. |
| `crypto/rand.Text` | Replace hand-built random token strings. |
| `runtime.AddCleanup` | Replace `runtime.SetFinalizer`. |
| `weak` package | Replace unsafe weak-reference workarounds in caches. |

## Go 1.23

| Change | Action |
| --- | --- |
| Range-over-func iterators and `iter` | Expose sequences as `iter.Seq[T]` instead of callback or channel APIs. |
| `slices.Collect`, `slices.Sorted`, `maps.Keys` | Replace manual key collection and sorting. |
| Timers are collected when unreferenced, channels unbuffered | Remove `Stop` and drain workarounds that only existed to avoid leaks. |
