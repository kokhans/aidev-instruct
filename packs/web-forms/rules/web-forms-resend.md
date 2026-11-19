---
description: Sending form notification and confirmation emails with Resend.
globs: ["**/*form*.ts", "**/*action*.ts", "**/*contact*.ts", "**/*email*.ts", "**/*mail*.ts"]
with: ["resend"]
---

# Web Forms With Resend

- Emails are sent only from server code after validation and spam checks pass. The API key never reaches the browser.
- `from` uses a verified domain with SPF, DKIM and DMARC passing, and comes from configuration.
- Contact forms send a team notification with `replyTo` set to the submitter, and, where useful, a confirmation to the submitter.
- The confirmation never echoes free-text fields back to the submitter address, so the form cannot be used to send spam to third parties.
- Every send passes an `idempotencyKey` derived from the submission ID (`contact-notification/<submissionId>`), so a retried request never sends twice. Keys expire after 24 hours.
- User input placed in email HTML is escaped. Subjects never contain raw user input beyond a short, trimmed field.
- Each email has HTML and plain text. Resend generates the text version from HTML when `text` is omitted, so set `text` explicitly only when the generated one reads badly.
- A failed send is logged with the Resend error and shown as the form's error state. The submission is stored first when losing it is not acceptable.
