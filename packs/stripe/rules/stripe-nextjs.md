---
description: "Stripe in Next.js App Router: Checkout Sessions from server code, Stripe.js in Client Components and webhook Route Handlers."
globs: ["**/app/**/*.ts", "**/app/**/*.tsx", "**/proxy.ts", "**/next.config.*"]
with: ["nextjs"]
---

# Stripe With Next.js

- The Stripe client lives in a module that imports `server-only`. `STRIPE_SECRET_KEY` and webhook secrets never get the `NEXT_PUBLIC_` prefix. The publishable key does.
- A Server Function or Route Handler creates the Checkout Session after an auth check, then redirects to `session.url` or returns the `client_secret`.
- `loadStripe` runs once at module scope in a Client Component file. Stripe.js is never imported in Server Components.
- Webhook Route Handlers export only `POST`, read `await request.text()` and pass that string to the Stripe verification call.
- The webhook route is excluded from auth checks in the proxy, and its handler does no work before verification.
- Pages that show order or subscription status read them from the app's database, which webhooks keep current, and render dynamically.
