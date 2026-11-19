---
description: FastAPI with Pydantic for path operations, Annotated dependencies, models, responses, async rules, settings, security and tests.
globs: ["**/*.py", "**/pyproject.toml"]
---

# FastAPI

## App

- `fastapi dev` runs locally and `fastapi run` in production. `[tool.fastapi] entrypoint = "pkg.main:app"` in `pyproject.toml` names the app.
- Startup and shutdown live in a `lifespan` async context manager. `@app.on_event` is deprecated and ignored once `lifespan` is set.
- A proxy path prefix goes to the server, `fastapi run --root-path /api`. `FastAPI(root_path=...)` is deprecated.
- `APIRouter` declares its `prefix`, `tags` and shared `dependencies`. `include_router()` only includes it.
- One function per HTTP operation. `router.routes` is internal and never iterated or changed.
- Request bodies have a limit: `FastAPI(max_body_size=...)`, overridden per router or path operation. Without one, bodies are unlimited.

## Parameters and Models

- Parameters and dependencies use `Annotated`: `Annotated[int, Path(ge=1)]`. A reused dependency gets an alias such as `CurrentUser = Annotated[User, Depends(get_current_user)]`.
- Required fields and parameters have no default. Never `...` as a default.
- Pydantic v2 API only: `ConfigDict`, `field_validator`, `model_validator`, `model_dump`, `model_validate`. FastAPI dropped `pydantic.v1`.
- Constrained lists and scalars use `Annotated[list[int], Field(min_length=1)]`, never `RootModel`.
- Input and output models are separate, such as `ItemCreate`, `ItemUpdate` and `ItemPublic`. Partial updates apply `model_dump(exclude_unset=True)`.
- Query, header, cookie and form groups use parameter models. `extra="forbid"` on one model also rejects sibling parameters from the same location.
- Extra schema keys go in `json_schema_extra`. Unknown keyword arguments to `Query`, `Body` and the others raise `TypeError`.

## Responses

- Path operations declare a return type. It validates, filters, documents and serializes the response in Pydantic's Rust core. `response_model` only when the returned object differs from the public schema, such as an ORM row.
- Never `ORJSONResponse` or `UJSONResponse`: both are deprecated and slower than a declared return type.
- Expected failures raise `HTTPException`. Domain exceptions map to responses in one `@app.exception_handler` each.
- JSON requests need a JSON `Content-Type`. `strict_content_type=False` only for clients that cannot send it.
- Server-sent events use `response_class=EventSourceResponse` from `fastapi.sse` with `yield`. Built single-page apps are served with `app.frontend("/", directory="dist")`, not a hand-mounted `StaticFiles`.

## Dependencies and Async

- `async def` only when every call inside is awaited and non-blocking. Otherwise plain `def`, which runs in the thread pool. The same holds for dependencies.
- Blocking work inside `async def` goes through `asyncify()` from `asyncer`.
- Resources with cleanup come from `yield` dependencies. `scope="function"` runs the cleanup before the response is sent; the default `scope="request"` runs it after.
- `Depends(get_db, max_concurrency=n)` limits a dependency that holds a pooled resource. Routes share the limit only by reusing one `Depends()` object, such as an `Annotated` alias.
- A function that returns an instance replaces a class dependency.

## Settings and Security

- Configuration is a `pydantic_settings.BaseSettings` subclass with `SettingsConfigDict(env_file=".env")`, provided by an `@lru_cache` `get_settings` dependency. Secrets are `SecretStr`.
- Tokens use `PyJWT`. Passwords hash with `pwdlib[argon2]` and `PasswordHash.recommended()`.
- `CORSMiddleware` lists explicit origins. Never `allow_origins=["*"]` with credentials.
- OpenTelemetry exporter setup from `OTEL_*` variables is opt-in with `FASTAPI_OTEL_AUTO_CONFIGURE=true`.

## Tests

- Sync tests use `TestClient`. `with TestClient(app) as client:` runs the lifespan.
- Async tests use `httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test")` under `@pytest.mark.anyio`. It skips the lifespan, so `LifespanManager` from `asgi-lifespan` wraps the app when the lifespan matters.
- Fakes replace dependencies through `app.dependency_overrides`, cleared after each test.

Depth on streaming, parameter models and dependencies: FastAPI's official `fastapi` skill, installed with `uvx library-skills install --skill fastapi`.
