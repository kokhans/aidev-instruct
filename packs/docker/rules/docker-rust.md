---
description: Container images for Rust services.
globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile", "**/.dockerignore"]
with: ["rust"]
---

# Docker for Rust

- The build stage uses `rust:<version>` matching `rust-toolchain.toml` or the crate's `rust-version`.
- The build binds `src`, `Cargo.toml` and `Cargo.lock` and caches `/usr/local/cargo/registry` and `/app/target` with cache mounts. The binary is copied out of the cached `target` in the same `RUN`, because cache mounts do not persist into the image.
- Builds run `cargo build --locked --release`.
- glibc builds run on `debian:<release>-slim` or `gcr.io/distroless/cc:nonroot`. musl builds produce a static binary for `dhi.io/static`, `distroless/static` or `scratch`.
- The runtime stage runs as a non-root user with a numeric UID.
- `.dockerignore` excludes `target`.
