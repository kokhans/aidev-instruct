---
description: Website forms with progressive enhancement, server validation, accessible errors and spam protection.
globs: ["**/*.tsx", "**/*.jsx", "**/*.html", "**/*form*.ts", "**/*action*.ts", "**/*contact*.ts"]
---

# Web Forms

## Progressive Enhancement

- Forms are real `<form>` elements with `method` and `action` and submit without JavaScript. Client code only enhances them.
- After a successful non-JavaScript post, the server redirects (303) to a result page, so a reload never resubmits.

## Fields

- Every field has a visible `<label>`. Placeholder text is a hint, never the label.
- Inputs use the right `type`, `inputmode`, `autocomplete` tokens and `name`. Required fields are marked in text, not only by color.
- Native constraints (`required`, `type="email"`, `minlength`, `pattern`) give early feedback. They never replace server validation.

## Validation and Errors

- The server validates every submission with the same rules the client uses and returns field errors with the submitted values.
- Errors are text next to the field, linked with `aria-describedby`, with `aria-invalid="true"`. After a failed submit, focus moves to an error summary or the first invalid field.
- Validation runs on blur and submit, never on every keystroke before the first blur.
- Failure keeps everything the user typed, except passwords and payment data.

## Submission

- The submit button shows a pending state and ignores repeat clicks while sending.
- Success is announced in a live region or shown on the result page.
- The server handles a repeated submission once: an idempotency key or a unique constraint stops duplicates.
- Every failure is logged on the server with a request ID and shown to the user as a recoverable error state.

## Spam Protection

- Never ask users to solve a puzzle. Use a honeypot field, rate limiting per IP and per target, and an invisible challenge: Cloudflare Turnstile (free but proprietary) or ALTCHA (open source).
- The challenge is verified on the server before any side effect. Turnstile checks tokens with `siteverify`; its tokens are single-use and expire after 300 seconds.
- The honeypot is hidden with CSS and `tabindex="-1"` and `autocomplete="off"`, and is ignored by screen readers with `aria-hidden="true"` on its wrapper.
- Submissions that fail spam checks get a generic response, never a reason.

## Privacy

- Forms collect only fields the purpose needs. Consent checkboxes are never pre-checked.
- The privacy policy link sits next to the submit button on forms that collect personal data.
