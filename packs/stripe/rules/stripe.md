---
description: "Stripe integration rules for stripe-node: API choice, keys, API version, idempotency and webhook handling."
globs: ["**/*stripe*", "**/*payment*", "**/*checkout*", "**/*billing*", "**/*subscription*", "**/webhooks/**"]
---

# Stripe

## Client

- Server code creates one client, `new Stripe(process.env.STRIPE_SECRET_KEY)`, and calls methods on it. No global or module-level key setters.
- The client pins `apiVersion` to the version the installed `stripe` package was released with. An upgrade bumps the package and the version together and follows the changelog.
- The browser loads Stripe.js with `loadStripe` from `@stripe/stripe-js` and never imports `stripe`.

## Keys

- Server code uses a restricted key (`rk_`) with only the permissions it needs, one per service. A full secret key (`sk_`) is the exception.
- Keys come from the platform's secret store or environment, never from source, committed env files, logs or error messages.
- Each environment has its own keys. Development and CI use sandboxes, not live mode.

## API Choice

- Payments use the Checkout Sessions API: `ui_mode` `hosted_page` (default), `embedded_page`, or `elements` for a custom form with the Payment Element. API versions before `2026-03-25.dahlia` name them `hosted`, `embedded` and `custom`, and newer versions reject the old names.
- PaymentIntents are used directly only for off-session charges or when the app must own checkout state.
- Saving a payment method for later uses SetupIntents.
- Subscriptions use Prices and the Billing APIs with a Checkout Session in `mode: "subscription"`, and the Customer Portal for self-service changes.
- Never used: the Charges API, Sources, Tokens, the Card Element, the `plan` object, or raw PaymentIntent renewal loops.
- No call passes `payment_method_types`. Dynamic payment methods are configured in the Dashboard or with payment method configurations.
- Amounts are integers in the currency's smallest unit, and prices come from the server, never from the client.

## Idempotency

- Every `POST` that a retry can repeat passes `{ idempotencyKey }` in the request options, built from the app's own operation ID. Keys are up to 255 characters and hold no personal data.
- The same key with different parameters is an error. A new operation gets a new key.

## Webhooks

- Every integration has a webhook handler. Fulfillment, access grants, emails and inventory changes happen there, never on the success page.
- Handlers verify the signature on the raw body with the endpoint's `whsec_` secret before any work, return `2xx` quickly and move slow work to a queue.
- Handlers are idempotent on the event ID and do not rely on delivery order or on `created`.
- Endpoints subscribe only to the events the code handles.
- New endpoints use thin events: `stripe.parseEventNotification(body, signature, secret)`, then `fetchRelatedObject()` for current state. Snapshot handlers use `stripe.webhooks.constructEvent`.
- Local testing forwards events with `stripe listen` and triggers them with `stripe trigger`.

The `stripe-integration` skill covers payments, billing and webhook flows in depth.
