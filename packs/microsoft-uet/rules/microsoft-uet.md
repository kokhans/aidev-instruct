---
description: Microsoft Advertising UET tag loading, page views, conversion events and consent mode.
globs: ["**/*analytics*.ts", "**/*analytics*.tsx", "**/*tracking*.ts", "**/*uet*.ts", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
---

# Microsoft UET

## Loading

- The UET tag ID comes from configuration. With no ID (local and preview), the tag never loads.
- The JavaScript tag is used, never the image tag. Microsoft requires it for single-page apps.
- One loader per page: a tag manager or the snippet from Microsoft Advertising, never both. Several UET tags on one page each use their own queue name instead of `uetq`.

## Consent Mode

- An inline `<head>` script sets the default before the tag loads: `window.uetq = window.uetq || []; window.uetq.push("consent", "default", { ad_storage: "denied" })`.
- The default is always explicit: outside the EEA, the UK and Switzerland, UET treats a missing default as `granted`. Microsoft has enforced consent signals for those three regions since 5 May 2025.
- After a choice, and on every later page load while it applies, page code sends `window.uetq.push("consent", "update", { ad_storage: "granted" })` or `"denied"`.
- UET consent mode has one signal, `ad_storage`. Microsoft recommends advanced consent mode: the tag loads with `denied` and sends cookieless hits until consent.
- With explicit consent calls, set `enableAutoConsent: false` in the tag options, so UET does not also read consent from other sources on the page.

## Page Views

- Client-routed sites keep `enableAutoSpaTracking: true` in the tag options, which sends a page view on history changes.
- Manual page views (`window.uetq.push("event", "page_view", { page_path: "/path" })`) are used only with automatic tracking off, never together. `page_path` starts with `/`.

## Events

- Conversion events go through the typed tracking module: `window.uetq.push("event", action, { event_category, event_label, event_value, revenue_value, currency })`.
- Custom event actions, conversion goals and remarketing lists never use the action `page_view`.
- Enhanced conversions send email or phone only with marketing consent.

## Verification

- UET Tag Helper (browser extension) shows each event with its `asc` parameter: `denied` before consent, `granted` after.
- Requests to `bat.bing.com/action/0?ti=...` appear once per page view.
