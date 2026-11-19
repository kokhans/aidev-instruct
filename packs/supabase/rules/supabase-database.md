---
description: Supabase database changes, Row Level Security policies, Data API grants and CLI migrations.
globs: ["**/supabase/**/*.sql", "**/supabase/config.toml"]
---

# Supabase Database

## Migrations

- Every schema change is a file in `supabase/migrations`, created with `supabase migration new <name>` or generated. Nobody edits the hosted database in Studio or the SQL editor.
- Projects with declarative schemas edit `supabase/schemas/*.sql` and generate the migration with `supabase db schema declarative sync -f <name>`. On the default `pg-delta` engine, `supabase db diff` never reads that folder.
- A generated migration is reviewed before commit: it can include `GRANT` and `REVOKE` statements nobody wrote, and it never contains data changes.
- Data changes go in hand-written migrations. Local sample data goes in `supabase/seed.sql`.
- `supabase db reset` replays every migration and the seed locally before a push. After pulling teammates' migrations, run it again.
- Production receives migrations from CI with `supabase db push --remote --yes`, never from a laptop. Drift is captured with `supabase db pull --remote`.

## Data API Exposure

- New `public` tables are no longer granted to the Data API roles automatically. The migration that creates a table grants the operations each role needs to `anon`, `authenticated` and `service_role` (used by secret keys), so it works whatever the project's setting.
- Grants decide whether a role may run an operation at all. Policies decide which rows. Both are written on purpose.
- Tables only the server reads through a database connection stay ungranted, or live in a schema the API does not expose.

## Row Level Security

- Every table in an exposed schema has RLS enabled in the migration that creates it. RLS with no policy denies everything.
- One policy per operation (`select`, `insert`, `update`, `delete`), never `for all`.
- Every policy names its role with `to authenticated` or `to anon`.
- Policies call `(select auth.uid())` and `(select auth.jwt())`, wrapped in `select` so Postgres evaluates them once per statement.
- `update` policies have both `using` and `with check`, so a row cannot be moved to another owner.
- Every column a policy filters on leads a btree index.
- Authorization reads `auth.jwt() -> 'app_metadata'`, never `user_metadata`.
- Views set `security_invoker = true`, otherwise they bypass the RLS of their tables.
- `security definer` functions set `search_path = ''`, qualify every name and live in an unexposed schema. Policies that recurse (error `42P17`) call such a function instead.
- Policies are tested with pgTAP through `supabase test db`, with an allow and a deny case per role and operation.

## Storage

- Buckets are private unless the files are public by design. Access goes through RLS policies on `storage.objects` and signed URLs.
