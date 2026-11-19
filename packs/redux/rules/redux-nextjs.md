---
description: "Redux Toolkit with the Next.js App Router: a store per request, client-only access and per-route initialization."
globs: ["**/*.ts", "**/*.tsx"]
with: ["nextjs"]
---

# Redux With Next.js

- The store is created per request by a `makeStore` function. Never a module-level store, because the server shares modules across requests.
- A client `StoreProvider` creates the store once with `useState(makeStore)` and wraps the app with `Provider`.
- Server Components never read or write the store. Server data comes from async Server Components. RTK Query runs on the client only.
- Route data that seeds the store is dispatched once during render of the route's client component, guarded by a `useRef` flag. Never in `useEffect`, which causes flicker and hydration errors.
- A layout-level store survives client navigation, so per-route state is reset or re-seeded when the route changes.
- Routes whose output depends on per-user store data are rendered dynamically. Mutations call `revalidatePath` or `revalidateTag`.
