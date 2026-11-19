---
description: better-auth with the Prisma adapter, generated auth models and Prisma Migrate.
globs: ["**/*.ts", "**/*.prisma"]
with: ["prisma"]
---

# Better Auth with Prisma

- The database is `prismaAdapter(prisma, { provider: "postgresql" })` (or the project's provider) from `better-auth/adapters/prisma`, using the app's single `PrismaClient`.
- The adapter supports the stable Prisma major and earlier. The next major has a different client API and is not supported until the better-auth docs say so.
- `auth generate` writes the auth models into the Prisma schema. `prisma migrate dev` creates the migration and `prisma generate` updates the client. `auth migrate` does not work with this adapter.
