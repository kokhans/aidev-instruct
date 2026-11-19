---
description: Cargo manifests, workspaces, lint configuration, toolchain pinning and dependency policy for Rust projects.
globs: ["**/Cargo.toml", "**/Cargo.lock", "**/rust-toolchain.toml", "**/.cargo/config.toml", "**/clippy.toml", "**/rustfmt.toml", "**/deny.toml"]
---

# Cargo

## Manifest

- Every package sets `edition = "2024"` and a `rust-version` that CI tests. Edition 2024 uses resolver 3, which prefers dependency versions that support that `rust-version`.
- Workspaces share `[workspace.package]`, `[workspace.dependencies]` and `[workspace.lints]`. Members inherit with `edition.workspace = true`, `serde = { workspace = true }` and `[lints] workspace = true`.
- Dependencies enable only the features the code uses. `default-features = false` where defaults pull in a runtime or TLS stack the project does not use.
- Optional dependencies use `dep:` names in `[features]`. Features are additive and never turn behavior off.
- `Cargo.lock` is committed, for libraries too.
- Cargo 1.100 and later warns about unused dependencies (`cargo::unused_dependencies`). Remove them instead of allowing the lint. A dependency kept only to enable a feature of a transitive one is a known false positive.

## Lints

- Lint levels live in the `[lints]` table, not in `#![deny(...)]` crate attributes.
- Groups take a lower priority than single lints so single lints can override them: `pedantic = { level = "warn", priority = -1 }`.
- `#[expect(lint, reason = "...")]` replaces `#[allow]` for a local exception, so the exception is flagged once it is no longer needed.
- Application crates warn on `clippy::unwrap_used` and `clippy::dbg_macro`.

## Toolchain

- `rust-toolchain.toml` pins the channel and lists `components = ["rustfmt", "clippy"]`, so local and CI builds match.
- `rustfmt.toml` exists only for a deliberate deviation. The style edition follows the crate edition.

## Supply Chain

- `.cargo/config.toml` sets `[registry] global-min-publish-age = "7 days"` (Cargo 1.100 and later), so `cargo update` holds back fresh releases.
- `cargo deny check` runs in CI for advisories, licenses, duplicate versions and banned crates, configured in `deny.toml`.
- `cargo update -p <crate>` updates one dependency. Lock changes arrive in their own commit.
- Dependencies come from crates.io with a version. Git dependencies pin a `rev` and are temporary.
