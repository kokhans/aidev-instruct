---
description: Rust toolchain setup and Cargo checks in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["rust"]
---

# GitHub Actions for Rust

- Runners ship with `rustup`. A step runs `rustup toolchain install` with no arguments, which installs the active toolchain from `rust-toolchain.toml`, with its components and targets.
- `CARGO_TERM_COLOR: always` is set at workflow level.
- CI runs `cargo fmt --check`, `cargo clippy --all-targets --all-features` and `cargo test --locked` with `CARGO_BUILD_WARNINGS: deny`, which turns rustc and Clippy lint warnings in workspace crates into errors (Rust 1.97 or later).
- Crates that publish a `rust-version` check it with `cargo hack check --rust-version --workspace --all-targets --ignore-private`.
- An optional job with `continue-on-error: true` runs `cargo update` and the tests, with `CARGO_RESOLVER_INCOMPATIBLE_RUST_VERSIONS: allow`, to catch breakage from new dependency releases.
