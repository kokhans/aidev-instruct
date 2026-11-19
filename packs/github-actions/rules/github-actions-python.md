---
description: Python setup with uv and caching in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["python"]
---

# GitHub Actions for Python

- `astral-sh/setup-uv` installs uv. Its cache is on by default on GitHub-hosted runners, except for release, tag push, `pull_request_target` and `workflow_run` events, and keys on `uv.lock` and `pyproject.toml`.
- The Python version comes from `.python-version` or `requires-python`. A matrix sets `python-version` on `setup-uv` instead of using `actions/setup-python`.
- Installs run `uv sync --locked`, which fails when `uv.lock` is out of date.
