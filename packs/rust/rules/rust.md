---
description: Rust code conventions for ownership, error handling, async with Tokio, tracing and tests.
globs: ["**/*.rs"]
---

# Rust

## Commands

- A change is done when `cargo fmt`, `cargo clippy --all-targets --all-features` and `cargo test` pass without warnings.
- CI runs `cargo fmt --check` and sets `CARGO_BUILD_WARNINGS=deny` (Cargo 1.97 and later), which fails on rustc and Clippy warnings in local packages. Not `RUSTFLAGS=-Dwarnings`, which invalidates the build cache.

## Code

- Edition 2024. Let chains (`if let Some(x) = a && x > 0`) and `if let` guards in `match` (Rust 1.95) replace nested `if let`.
- A `.clone()` that only silences the borrow checker needs a reason.
- Identifiers and validated values are newtypes whose constructors return `Result`, so invalid states do not compile.
- `match` on an enum the crate owns lists every variant. No `_` arm, so a new variant breaks the build where it matters.
- `std::sync::LazyLock` and `OnceLock` replace `lazy_static` and `once_cell`.
- `unsafe` blocks carry a `// SAFETY:` comment that proves the invariants. Crates without unsafe code set `unsafe_code = "forbid"`.

## Errors

- Library crates define error enums with `thiserror`. Binaries and application glue return `anyhow::Result` and add `.context(...)` at each layer.
- Public library APIs never return `Box<dyn Error>` or `anyhow::Error`.
- No `unwrap()` outside tests. `expect("why this holds")` only for invariants proven at that line.

## Async

- Tokio is the runtime. `#[tokio::main]` sits only on `main`. Libraries never start a runtime.
- Blocking I/O and CPU-heavy work run in `tokio::task::spawn_blocking`, never on a runtime worker.
- `std::sync::Mutex` guards short sections that never cross `.await`. `tokio::sync::Mutex` only when the guard must be held across `.await`.
- Spawned tasks are owned by a `JoinSet` or a `tokio_util::task::TaskTracker`, so their errors and panics surface. Cancellation flows through `CancellationToken`.
- Channels are bounded. Every external call has a `tokio::time::timeout`.
- Branches in `tokio::select!` use cancellation-safe futures, as each method's docs state.
- Shutdown waits for `ctrl_c` or SIGTERM, stops accepting work, then drains tasks.

## Logging and Tests

- `tracing` for logs and spans, with fields instead of formatted strings: `info!(user_id = %id, "user created")`. `tracing-subscriber` is set up once in `main`. No `println!` for diagnostics.
- Unit tests sit in a `#[cfg(test)] mod tests` beside the code. Integration tests live in `tests/` and use only the public API.
- Async tests use `#[tokio::test]`. `assert_matches!` (Rust 1.96) checks enum variants and prints the value on failure.
- Doc examples compile and run as tests. They use `?` with a hidden `Result` return instead of `unwrap()`.

Manifests, lints, toolchain and dependency policy: `rust-cargo` rule.
