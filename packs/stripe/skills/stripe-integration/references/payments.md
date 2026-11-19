# Payments

## Surface Preference

| Order | Surface | Use When |
| --- | --- | --- |
| 1 | Payment Links | No code, simple products |
| 2 | Checkout, `hosted_page` or `embedded_page` | Most web apps |
| 3 | Payment Element with Checkout Sessions, `ui_mode: "elements"` | The form must match the app's own UI |
| 4 | Payment Element with PaymentIntents | Off-session charges or app-owned checkout state |

## Checkout Sessions

- The server creates the session from Price IDs or server-computed `price_data`. The client sends only a product or cart identifier.
- `client_reference_id` or the session's Customer links the session to the app's records. Metadata is a fallback, not the primary mapping.
- Existing customers are passed as `customer`, so saved payment methods and receipts stay on one Customer.
- Hosted mode redirects to `session.url`. Embedded and elements modes return the session `client_secret` to the client.
- `success_url` or `return_url` includes `{CHECKOUT_SESSION_ID}`. The landing page retrieves the session to show status and never fulfills.
- On API versions from `2026-03-25.dahlia`, `integration_identifier` labels sessions to compare checkout flows in the Dashboard.

## Payment Element

- Inspecting card details before confirming, such as for surcharging, uses Confirmation Tokens. `createPaymentMethod` and `createToken` from Stripe.js are not used for this.
- The Payment Element never runs in card-only mode. The Card Element is migrated to the Payment Element.

## Payment Methods

- No call passes `payment_method_types`. Omitting it enables dynamic payment methods.
- Limiting methods uses payment method configurations, `excluded_payment_method_types`, or, on Checkout Sessions, `allowed_payment_method_types`, which filters the dynamic set instead of replacing it.
- Terminal in-person payments are the only exception: `payment_method_types: ["card_present"]`.

## Saving Payment Methods

- SetupIntents save a method for later. The Sources API is deprecated.
- Later off-session charges create a PaymentIntent with `off_session: true` and handle `authentication_required` by bringing the customer back on-session.

## Deprecated

| API | Replacement |
| --- | --- |
| Charges API | Checkout Sessions or PaymentIntents |
| Sources API | SetupIntents |
| Tokens API | SetupIntents or Checkout Sessions |
| Card Element | Payment Element |
| `plan` object | Prices |
