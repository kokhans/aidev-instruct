---
description: Drizzle connecting to a Supabase Postgres database through the right pooler mode.
globs: ["**/drizzle.config.ts", "**/db/**/*.ts", "**/*schema*.ts"]
with: ["drizzle"]
---

# Supabase With Drizzle

- Drizzle connects with the `postgres` driver from `drizzle-orm/postgres-js`.
- Serverless and edge code connects through the shared pooler in transaction mode (port 6543) and passes `prepare: false`, because transaction mode does not support prepared statements.
- Long-running servers use the direct connection, or session mode (port 5432) from IPv4-only networks.
- `drizzle-kit` migrations use the direct connection, or session mode on an IPv4-only network, never transaction mode.
- A Drizzle connection uses a database role, not the Data API. RLS applies only when that role is subject to it, so server code checks authorization itself.
- One tool owns migrations: Drizzle (`drizzle-kit generate`) or the Supabase CLI, never both on the same schema.
