---
description: Microsoft Clarity behind CookieConsent with the Clarity Consent API v2.
globs: ["**/*consent*.ts", "**/*consent*.tsx", "**/*clarity*.ts", "**/*analytics*.ts"]
with: ["cookie-consent"]
---

# Microsoft Clarity With Cookie Consent

- Clarity is a service in the `analytics` category, labelled "Microsoft Clarity".
- The consent sync function calls `clarity("consentv2", {...})` on every call: `analytics_Storage` from the `analytics` category, `ad_Storage` from `marketing` (denied when there is no `marketing` category).
- The snippet and the package define the `clarity` queue before the script loads, so early calls are queued. Without a loader on the page, skip the call.
- Withdrawing `analytics` sends `analytics_Storage: "denied"`: Clarity deletes its cookies, ends the session and continues without cookies.
- `autoClear` for `analytics` lists `_clck` and `_clsk`. Third-party cookies on `clarity.ms` (`CLID`, `MUID` and others) are cleared by Clarity itself.
- Before a choice, no `_clck` or `_clsk` cookie exists and the console metadata check reports `DENIED`.
