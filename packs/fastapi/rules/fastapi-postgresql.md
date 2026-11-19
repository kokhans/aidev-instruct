---
description: FastAPI on PostgreSQL with SQLModel or SQLAlchemy, psycopg, a session per request, pool limits, Alembic migrations and database tests.
globs: ["**/*.py", "**/alembic.ini"]
with: ["postgresql"]
---

# FastAPI With PostgreSQL

## Driver and Engine

- psycopg 3 is the driver, named in the URL as `postgresql+psycopg://`. The same URL serves `create_engine()` and `create_async_engine()`. Never psycopg2 in new code.
- SQLAlchemy installs `greenlet` only with the `asyncio` extra, so async projects depend on `sqlalchemy[asyncio]`.
- One engine per process, created in the `lifespan` and disposed on shutdown, with `await engine.dispose()` for an async engine.
- `pool_size` plus `max_overflow`, times workers and instances, stays below the server's `max_connections` minus other clients. `pool_pre_ping=True` survives database restarts.

## Models

- New code follows the FastAPI docs: SQLModel table models (`table=True`) plus separate create, update and public data models. Projects on plain SQLAlchemy 2 keep `Mapped[...]` declarative models and Pydantic schemas.
- Endpoints that return a table model declare `response_model` with the public model.
- Partial updates apply `model_dump(exclude_unset=True)` to the row, with `sqlmodel_update()` on SQLModel.

## Sessions

- A `yield` dependency opens one session per request, exposed as one alias such as `SessionDep = Annotated[Session, Depends(get_session, max_concurrency=n)]`, so waiting requests do not exhaust the pool.
- Sync sessions serve `def` endpoints. `AsyncSession` serves `async def` endpoints. A sync session never runs inside `async def`.
- `async_sessionmaker(engine, expire_on_commit=False)`. Relationships load with `selectinload()`, and `lazy="raise"` turns an accidental lazy load into an error instead of hidden IO.
- An `AsyncSession` is never shared between concurrent tasks.
- `IntegrityError` from a unique constraint becomes a 409. The constraint is the guarantee, never a lookup before insert.

## Migrations

- Alembic owns the schema. `metadata.create_all()` runs only in tests.
- `alembic revision --autogenerate -m "<change>"` drafts a revision. It is reviewed before commit: autogenerate does not detect renames.
- `target_metadata` in `env.py` points at `SQLModel.metadata` or the declarative `Base.metadata`.
- `alembic upgrade head` runs as a deploy step before the new version starts, never inside app startup.

## Tests

- Tests run against PostgreSQL in a container. Never SQLite as a stand-in.
- Each test runs inside a transaction that rolls back, and `app.dependency_overrides` points the session dependency at it.
