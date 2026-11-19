---
description: better-auth in React Router framework mode, covering the resource route and session checks in loaders and actions.
globs: ["**/*.ts", "**/*.tsx"]
with: ["react-router"]
---

# Better Auth with React Router

- A splat resource route at the auth base path (`app/routes/api.auth.$.ts`) exports a `loader` and an `action` that both return `auth.handler(request)`.
- Loaders and actions that need a user call `auth.api.getSession({ headers: request.headers })` and redirect or throw a 401 response without a session.
- Client components read the session with the auth client's `useSession()`, only for display. Access decisions happen in loaders and actions.
