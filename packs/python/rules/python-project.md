---
description: Python project setup with uv, pyproject.toml, Ruff, a type checker and pytest configuration.
globs: ["**/pyproject.toml", "**/uv.lock", "**/uv.toml", "**/.python-version", "**/ruff.toml", "**/conftest.py"]
---

# Python Project

## Environment and Dependencies

- uv manages the interpreter, the virtual environment, dependencies and the lock. No `requirements.txt`, Poetry, Pipenv or pip-tools next to it. `uv export` writes a requirements file when a consumer needs one.
- Dependencies change with `uv add`, `uv add --dev` and `uv remove`, never by editing `pyproject.toml` and the lock separately.
- `uv.lock` is committed and never edited by hand.
- `requires-python` sets the supported floor. `.python-version`, written by `uv python pin`, sets the development interpreter.
- CI and container builds install with `uv sync --locked`, which fails on a stale lock. `uv lock --check` checks without installing.
- `uv lock --upgrade-package <pkg>` upgrades one package. `uv lock --upgrade` upgrades all within the constraints.
- `[tool.uv] exclude-newer = "7 days"` holds back freshly uploaded releases.
- `uv audit` (a preview command) checks the locked dependencies for known vulnerabilities.
- Tools the project relies on, such as Ruff, pytest and the type checker, are in the `dev` group so the lock pins them. `uvx` runs only one-off tools.

## pyproject.toml

- Metadata lives in `[project]`. No `setup.py`, `setup.cfg` or `requirements-dev.txt`.
- Development dependencies go in `[dependency-groups]`. `[project.optional-dependencies]` is only for extras that users install.
- Dependencies declare lower bounds, as `uv add` writes them. Upper bounds only for a known incompatibility.
- New projects build with the `uv_build` backend, which `uv init` writes.
- Tool settings live in `pyproject.toml` under `[tool.*]`, unless the project already has separate config files.

## Ruff

- Ruff lints and formats. No Black, isort, Flake8 or pyupgrade beside it.
- Ruff's default rule set is broad. Extra rules come through `extend-select`, such as `DTZ` for naive datetimes and `S` for security. Replacing the defaults with `select` needs a reason.
- `target-version` is inferred from `requires-python` and never set twice.
- Fixes from `--unsafe-fixes` are reviewed before commit.
- A `# noqa: <code>` names the rule. Never a bare `# noqa`.
- CI runs `ruff format --check` and `ruff check`.

## Type Checking

- One type checker, the one the project configures. New projects use `mypy` with `strict = true`. `ty` is in beta, so it is used only where the project already chose it.
- Stub packages such as `types-requests` go in the `dev` group.
- CI type checks the whole project, tests included.

## Test Runner

- New projects configure pytest in `[tool.pytest]` with native TOML values. `[tool.pytest.ini_options]` stays only in existing projects, never both.
- `strict = true` turns on strict config, markers, parametrization ids and xfail.
- `addopts = ["--import-mode=importlib"]` for new projects. `testpaths` lists the test folders.

Code conventions: `python` rule.
