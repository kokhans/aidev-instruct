---
description: Microsoft UET consent mode driven by CookieConsent.
globs: ["**/*consent*.ts", "**/*consent*.tsx", "**/*uet*.ts", "**/*analytics*.ts", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
with: ["cookie-consent"]
---

# Microsoft UET With Cookie Consent

- UET is a service in the `marketing` category, labelled "Microsoft Advertising".
- `window.uetq.push("consent", "default", { ad_storage: "denied" })` sits in the same inline `<head>` script as other consent defaults, before any tag loads.
- The consent sync function sends `window.uetq.push("consent", "update", { ad_storage })` with `"granted"` or `"denied"` from the `marketing` category on every call, so every page load repeats the stored choice.
- `autoClear` for `marketing` removes `/^_uet/`, which covers `_uetsid` and `_uetvid`.
- Before a choice, no `_uet` cookie exists and UET Tag Helper shows `asc` as `denied`. After accepting marketing, it shows `granted`.
- This rule applies when UET loads from page code. With the UET tag in Google Tag Manager, the template owns consent and page code sends no `uetq` consent calls.
