---
description: Python code conventions for typing, errors, standard library choices, asyncio and pytest tests.
globs: ["**/*.py", "**/*.pyi"]
---

# Python

## Commands

- uv runs every tool inside the project environment: `uv run pytest`, `uv run ruff check`. Rules name binaries without `uv run`.
- Never `pip install`, `python -m venv` or a global interpreter in a uv project.
- A change is done when `ruff format`, `ruff check`, the type checker and `pytest` pass.

## Types

- Code uses the syntax the `requires-python` floor allows: PEP 695 generics (`def first[T](items: list[T]) -> T`) and `type` aliases from 3.12, `lazy import` and `frozendict` from 3.15.
- With a floor of 3.14 or later, annotations are evaluated lazily. No `from __future__ import annotations` and no quoted forward references.
- No `Any` outside boundaries. Unknown data is `object` until validated.
- `# type: ignore[code]` names the error code and a reason. Never a bare `# type: ignore`.
- Internal records are `@dataclass(slots=True)`, frozen when nothing mutates them. Pydantic models validate data that crosses a boundary. `TypedDict` only types a dict another API requires.
- `Protocol` for structural interfaces instead of abstract base classes.
- `Literal` unions or `StrEnum` for closed sets of strings.

## Errors and Logging

- `except` names specific exceptions. Never a bare `except:` or a swallowed `except Exception`.
- Wrapping keeps the cause: `raise ConfigError(...) from err`.
- `ExceptionGroup` and `except*` handle failures from a `TaskGroup`.
- Each module logs through `logger = logging.getLogger(__name__)` with `%` arguments, not f-strings. `logger.exception` inside `except`. No `print` for diagnostics.

## Standard Library

- Datetimes are timezone-aware: `datetime.now(UTC)`. Never naive datetimes or `datetime.utcnow()`.
- Text I/O passes `encoding="utf-8"` until the floor is 3.15, where UTF-8 is the default.
- `subprocess.run([...], check=True)` with an argument list. Never `shell=True` with interpolated input.

## Async

- `asyncio.TaskGroup` runs concurrent work. No unreferenced `create_task` and no `gather` without error handling.
- `asyncio.timeout()` bounds every external call.
- Blocking calls never run on the event loop. `asyncio.to_thread()` moves them off it.
- One shared `httpx.AsyncClient` per service, closed on shutdown, never a client per request.

## Tests

- pytest with plain `assert`, fixtures in `conftest.py` and `@pytest.mark.parametrize` for cases. No `unittest.TestCase` in new tests.
- Built-in fixtures replace hand-rolled setup: `tmp_path`, `monkeypatch`, `caplog`, `capsys`.
- Async tests use the plugin the project has: `@pytest.mark.anyio` or `pytest-asyncio` 1.x, which removed the `event_loop` fixture.
- Tests never call real third-party services. HTTP is faked at the client with `httpx.MockTransport`.

Project setup, uv, Ruff, type checker and pytest configuration: `python-project` rule.
