---
name: stripe-integration
description: Plans, builds and reviews Stripe integrations with stripe-node. Covers choosing between Checkout Sessions, PaymentIntents and SetupIntents, subscriptions with the Billing APIs, webhook and event destination handling, fulfillment, and a go-live review. Use when adding payments or subscriptions, writing a Stripe webhook handler, upgrading the Stripe API version, or reviewing Stripe code before launch.
---

# Stripe Integration

## Workflow

1. Pick the API from the routing table. Read the matching reference before writing code.
2. Create Products and Prices in the sandbox, one Product per plan the customer can choose.
3. Build the server call that creates the Checkout Session (or Intent) from server-side prices.
4. Build the webhook handler before the success page. The success page only shows status.
5. Test with `stripe listen` and `stripe trigger`, including async payment methods and failures.
6. Run the go-live review below.

## Routing

| Building | API | Reference |
| --- | --- | --- |
| One-time payment, Stripe-hosted or embedded page | Checkout Sessions, `ui_mode` `hosted_page` or `embedded_page` | [payments.md](references/payments.md) |
| Custom payment form | Checkout Sessions with `ui_mode: "elements"` and the Payment Element | [payments.md](references/payments.md) |
| Off-session charge or app-owned checkout state | PaymentIntents | [payments.md](references/payments.md) |
| Save a payment method for later | SetupIntents | [payments.md](references/payments.md) |
| Subscriptions | Billing APIs, Checkout Session in `mode: "subscription"`, Customer Portal | [billing.md](references/billing.md) |
| Any post-payment side effect | Webhook handler on an event destination | [webhooks.md](references/webhooks.md) |

## API Version Upgrades

1. Read the changelog entries between the current and target versions for the resources the code uses.
2. Bump the `stripe` package and the pinned `apiVersion` together, then fix type errors.
3. Snapshot event destinations render payloads in their own `snapshot_api_version`, which is set only at creation. Create a new destination on the new version, run both with idempotent handlers, then delete the old one.
4. Thin event payloads are unversioned. `fetchRelatedObject()` returns objects in the client's version.

## Go-Live Review

- [ ] Live keys are restricted keys in the secret store, one per service, with access policies.
- [ ] No `sk_live_` or `rk_live_` string exists in the repository. A pre-commit hook or secret scanning blocks them.
- [ ] The client pins `apiVersion`.
- [ ] Prices and amounts come from the server.
- [ ] No call passes `payment_method_types`.
- [ ] Every create or update call that can retry passes an idempotency key.
- [ ] A live event destination exists with only the handled events, and its signing secret is in the secret store.
- [ ] Handlers verify signatures on the raw body, dedupe on event ID, and fulfill from the event, not the success page.
- [ ] Subscription handlers cover lifecycle, payment failure, refund, dispute and early fraud warning events.
- [ ] `automatic_tax` is enabled only with an active tax registration in the customer's jurisdiction.
- [ ] Pages that load Stripe.js send the CSP from Stripe's security guide: `https://js.stripe.com` and `https://*.js.stripe.com` in `script-src` and `frame-src`, `https://hooks.stripe.com` in `frame-src`, `https://api.stripe.com` in `connect-src`.
- [ ] Connect OAuth flows check the `state` parameter.
