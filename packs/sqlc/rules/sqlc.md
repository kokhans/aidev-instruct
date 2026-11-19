---
description: sqlc for Go, covering sqlc.yaml, query files and annotations, named parameters, type overrides, transactions, tests and CI.
globs: ["**/*.sql", "**/sqlc.yaml", "**/sqlc.yml", "**/sqlc.json", "**/*.go"]
---

# `sqlc`

## Configuration

- `sqlc.yaml` uses `version: "2"` with one `sql` entry per engine and output package.
- `schema` points at the migrations directory. sqlc applies every up migration in lexicographic order and skips down sections, so numeric prefixes are zero-padded.
- Each `gen.go` block sets `package`, `out`, `emit_empty_slices: true` (empty results encode as `[]`, not `null`) and `emit_interface: true` when callers need a `Querier` interface.
- Go types for columns change through `overrides` (`db_type`, or `column: "table.column"` which wins over `db_type`), never by editing generated code.
- One `sqlc` version is pinned and used by every developer and CI job, because different versions generate different code.

## Queries

- Every query sits in a `.sql` file under `queries` with a `-- name: GetUser :one` annotation. Names are verbs plus nouns and unique per package.
- Annotations: `:one` returns a not-found error for zero rows, `:many` returns a slice, `:exec` returns only an error, `:execrows` when the caller must check the affected count (optimistic updates, deletes by ID).
- Parameters are named: `sqlc.arg(name)`, or `@name` where the engine supports it. Optional parameters use `sqlc.narg(name)`. Positional placeholders appear only in single-parameter queries.
- Joins that return whole rows use `sqlc.embed(table)` so the result reuses the table's model struct.
- Queries list the columns callers need. `SELECT *` is acceptable only for the table's own model.
- Dynamic SQL is not built beside sqlc. A variable filter becomes a nullable parameter; a variable sort order becomes separate queries or a `CASE` on a parameter.

## Generated Code

- Generated files are never edited. Changes go into SQL, migrations or `sqlc.yaml`, followed by `sqlc generate`.
- Generated structs are persistence types. HTTP and GraphQL responses map them into their own types, so a schema change does not silently change an API.
- `New(db)` accepts any `DBTX`. Transactions run with `queries.WithTx(tx)` inside the service that owns the transaction, never inside generated code.
- The not-found error from `:one` queries is translated to the application's own not-found error at the repository or service boundary.

## Checks

- CI runs `sqlc diff` (generated code matches the SQL) and `sqlc vet`.
- `sqlc vet` rules are CEL expressions under `rules` in `sqlc.yaml`. `sqlc/db-prepare` and `EXPLAIN`-based rules need `database.uri` pointing at a database migrated to the current schema.
- `sqlc verify`, `sqlc push` and `database.managed` depend on sqlc Cloud. Projects without it use `database.uri` with a local or CI database.
- Query tests run against a real database of the same engine and version, not against a mocked `Querier`.
