---
description: better-auth mounted in Elysia with an auth macro and CORS.
globs: ["**/*.ts"]
with: ["elysia"]
---

# Better Auth with Elysia

- One plugin, `new Elysia({ name: "better-auth" })`, mounts the handler with `.mount(auth.handler)` and defines an `auth` macro.
- The macro's `resolve` calls `auth.api.getSession({ headers })` and returns `status(401)` without a session, otherwise `{ user, session }`.
- Protected routes opt in with `{ auth: true }`. Handlers read `user` and `session` from the context.
- `cors()` from `@elysia/cors` is registered before the mount, with the exact frontend origins, `credentials: true` and the `Content-Type` and `Authorization` headers.
- The auth routes appear in OpenAPI through the `openAPI()` plugin from `better-auth/plugins` and `auth.api.generateOpenAPISchema()`, merged into `openapi({ documentation })`.
