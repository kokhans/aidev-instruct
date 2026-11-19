---
description: Sending transactional email with the Resend Node.js SDK, with idempotency keys, rate limits and verified webhooks.
globs: ["**/*email*.ts", "**/*email*.tsx", "**/*mail*.ts", "**/emails/**", "**/webhooks/**"]
---

# Resend

## Setup

- The SDK runs in server code only. `RESEND_API_KEY` lives in the server environment schema and never reaches the client.
- Every sending domain is verified in Resend before code sends from it. `from` uses that domain, with a display name: `Acme <hello@example.com>`.

## Sending

- `resend.emails.send` returns `{ data, error }` and does not throw on API errors, so every call checks `error`.
- Every email carries HTML and plain text. Omitting `text` makes Resend derive it from the HTML. `text: ""` opts out and is never used.
- `to` holds at most 50 addresses. Separate recipients who must not see each other get separate sends or a batch.
- `tags` record the email kind and the owning entity, so logs and webhooks map back to the app. Names and values use ASCII letters, digits, `_` and `-`.
- Hosted templates go through `template: { id, variables }` and never mix with `html`, `text` or `react` in the same call.
- Attachments stay under 40 MB per email after Base64 encoding. Larger files go out as signed links.

## Idempotency

- Every send that a retry, a double submit or a queue redelivery can repeat passes `{ idempotencyKey }` as the second argument.
- The key names the event and the entity, such as `welcome-user/<userId>` or `contact/<submissionId>`. It is 1 to 256 characters and expires after 24 hours.
- The same key with a different payload returns `409 invalid_idempotent_request`. Retrying does not help: the payload or the key is wrong.
- `409 concurrent_idempotent_requests` means the first request is still running. Retry later.
- `resend.batch.send` sends up to 100 emails, takes one key for the whole batch, and does not accept attachments.

## Rate Limits

- The default limit is 10 requests per second, shared by every API key of the team.
- A `429` response is retried after the `retry-after` seconds. Bulk sends go through a queue or `resend.batch.send`, never a tight loop.

## Webhooks

- Webhook handlers verify the signature before any work: `resend.webhooks.verify({ payload, headers, webhookSecret })` with the `svix-id`, `svix-timestamp` and `svix-signature` headers.
- Verification reads the raw request body as text. A parsed and re-serialized body fails.
- `RESEND_WEBHOOK_SECRET` is a server secret, separate per endpoint.
- Handlers are idempotent on `svix-id` and do not rely on delivery order.
- `email.bounced` and `email.complained` events mark the address in the app's own records, so the app stops mailing it.
