---
description: Go tests with the standard testing package, covering table tests, contexts, concurrency, HTTP, benchmarks and fuzzing.
globs: ["**/*_test.go", "**/testdata/**"]
---

# Go Testing

## Structure

- Tests use the standard `testing` package. Cases that share logic are a table of named cases run with `t.Run(tc.name, ...)`.
- Struct comparisons use `cmp.Diff(want, got)` from `github.com/google/go-cmp/cmp` and report `(-want +got)`. A project that already uses `testify` keeps it; one assertion style per module.
- Failures say what was called, with what input, what came back and what was expected. `t.Fatalf` only when the test cannot continue.
- Helpers call `t.Helper()` and take `testing.TB`.
- Independent tests and subtests call `t.Parallel()`. Loop variables are per iteration, so no `tc := tc` copies.
- Fixtures and golden files live in `testdata/`. Golden files are rewritten behind an `-update` flag, never by hand.
- Examples (`func ExampleX()`) with `// Output:` document public APIs and run as tests.

## Resources

- Contexts come from `t.Context()`, which is canceled before cleanups run. No `context.Background()` in tests.
- `t.TempDir()`, `t.Setenv()`, `t.Chdir()` and `t.Cleanup()` replace manual setup and teardown. `t.Setenv` and `t.Chdir` cannot be used in parallel tests.
- Tests that need an external service skip with `t.Skip` when its connection string is not set.

## Concurrency and Time

- `go test -race ./...` runs in CI. A data race is a failing test.
- Code with goroutines, timers or timeouts is tested inside `synctest.Test(t, func(t *testing.T) { ... })` from `testing/synctest`. Its fake clock makes `time.Sleep` instant and deterministic.
- `synctest.Wait()` waits until every goroutine in the bubble is blocked. `synctest.Sleep(d)` advances the clock and then waits.
- Tests never sleep on the real clock to wait for goroutines.

## HTTP

- Handlers are tested with `httptest.NewRequest` and `httptest.NewRecorder`, or end to end with `httptest.NewTestServer(t, handler)`, which runs in memory and works inside `synctest`.

## Benchmarks and Fuzzing

- Benchmarks loop with `for b.Loop() { ... }`, not `b.N`. Setup before the loop is excluded from timing automatically.
- Parsers, decoders and validators get fuzz tests (`func FuzzX(f *testing.F)`). Crashers saved in `testdata/fuzz/` stay as regression cases.
