---
description: Container images for Python apps built with uv.
globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile", "**/.dockerignore"]
with: ["python"]
---

# Docker for Python

- uv comes from its image with a pinned version: `COPY --from=ghcr.io/astral-sh/uv:<version> /uv /uvx /bin/`.
- The builder stage sets `UV_COMPILE_BYTECODE=1`, `UV_LINK_MODE=copy`, `UV_NO_DEV=1` and `UV_PYTHON_DOWNLOADS=0`.
- Dependencies install first with `uv sync --frozen --no-install-project --no-editable`, binding only `uv.lock` and caching `/root/.cache/uv`. `--frozen` is needed because uv cannot check the lockfile without `pyproject.toml`. The project installs after the source is copied, with `uv sync --locked --no-editable`.
- The runtime stage uses the same Python base version, copies only `/app/.venv` and puts `/app/.venv/bin` first on `PATH`. uv is not in the runtime image.
- The runtime stage runs as a non-root user with a numeric UID.
- `CMD` runs the app's entry point or server from the virtual environment in exec form.
- `.dockerignore` excludes `.venv`, caches and test output.
