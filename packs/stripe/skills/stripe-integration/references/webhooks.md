# Webhooks

## Event Formats

| Format | Payload | Verify and Parse | Use When |
| --- | --- | --- | --- |
| Thin | Event type and `related_object` reference, unversioned | `stripe.parseEventNotification(body, signature, secret)` | New endpoints, all API v2 events |
| Snapshot | Full object rendered in the destination's API version | `stripe.webhooks.constructEvent(body, signature, secret)` | A tool needs the full payload or `previous_attributes` |

- Thin event types for API v1 resources start with `v1.`, such as `v1.payment_intent.succeeded`.
- A thin handler calls `fetchRelatedObject()` for the current object and `fetchEvent()` only when it needs the full event data.
- Thin and snapshot events need separate endpoints.
- An account has up to 16 event destinations. Destinations are created in Workbench or through `/v2/core/event_destinations`.

## Handler

1. Read the raw body as text or a buffer. Frameworks that parse JSON first break verification.
2. Verify with the endpoint's `whsec_` secret and the `Stripe-Signature` header. Return `400` on failure.
3. Skip the event when its ID is already recorded.
4. Enqueue the work, record the event ID, and return `2xx`.
5. A worker fetches current state from Stripe and applies it idempotently.

- The default signature tolerance is 5 minutes. A tolerance of `0` disables the replay check and is never used.
- Two different events can describe the same change. Dedupe on the `data.object` ID plus the event type where that matters.
- Order is not guaranteed. Handlers fetch the object instead of trusting the order or the `created` timestamp.
- Redirects count as failures. The endpoint URL is the final URL.
- The webhook route is exempt from CSRF checks and from auth middleware, and accepts only `POST`.
- Live retries continue for up to three days. Failed deliveries are visible in Workbench under the endpoint's event deliveries.

## Secrets

- The signing secret is a server secret per endpoint and per mode.
- Rolling a secret can keep the old one active for up to 7 days. The handler accepts either during the overlap.
- Stripe's webhook IP addresses can be allowlisted as a second layer, never instead of signature checks.

## Local Testing

- `stripe listen --forward-to localhost:<port>/<path>` forwards snapshot events. `stripe listen --forward-thin-to <url> --thin-events "*"` forwards thin events.
- The CLI prints a separate `whsec_` secret for the session. Local env uses that secret.
- `stripe trigger <event>` creates the objects that fire an event.
- `stripe events resend <event_id> --webhook-endpoint=<endpoint_id>` replays an event for up to 30 days.
