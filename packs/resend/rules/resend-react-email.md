---
description: Sending React Email templates through Resend, with typed props, matching subjects and plain-text tests.
globs: ["**/*email*.ts", "**/*email*.tsx", "**/*mail*.ts", "**/emails/**"]
with: ["react-email"]
---

# Resend With React Email

- `resend.emails.send` takes the template in `react` as a function call, `react: Welcome(props)`, not JSX, as the Resend docs require. Resend derives the plain text from the rendered HTML.
- Code that needs the output itself, such as a test or a preview, uses `render` and `toPlainText` from `react-email`.
- The props passed to the template are the same typed data the send function receives. No template reads environment variables or fetches data.
- `subject` is built in the send function next to the template call, from the same props, so subject and body never disagree.
- A test renders each template with its `PreviewProps` and asserts on the plain text, which catches missing data without an HTML snapshot.
