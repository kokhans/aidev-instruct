---
description: TanStack AI chat routes as Next.js App Router route handlers.
globs: ["**/app/**/route.ts"]
with: ["nextjs"]
---

# TanStack AI With Next.js

- A chat endpoint is a `POST` route handler, such as `app/api/chat/route.ts`, that returns `toServerSentEventsResponse(chat({ ... }))`.
- Route handlers do not convert thrown responses: `chatParamsFromRequest` runs inside `try`/`catch`, and a caught `Response` is returned as is.
- Chat components that call `useChat` are client components.
