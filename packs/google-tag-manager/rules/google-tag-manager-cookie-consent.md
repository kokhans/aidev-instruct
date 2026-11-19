---
description: Google Consent Mode v2 defaults and updates for Google Tag Manager, driven by CookieConsent.
globs: ["**/*consent*.ts", "**/*consent*.tsx", "**/*analytics*.ts", "**/*gtm*.ts", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
with: ["cookie-consent"]
---

# Google Tag Manager With Cookie Consent

## Defaults

An inline script in `<head>`, before the container snippet, defines `gtag` on the data layer and sets every Consent Mode v2 signal to denied. Google warns that defaults called out of this order do not work.

```js
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag("consent", "default", {
  ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  analytics_storage: "denied", wait_for_update: 500,
});
```

- The default runs on every page load, before any other data layer push.
- Google recommends scoping denied defaults to the regions that need a banner (`region: ["DE", "US-CA"]`). Which regions get which default is a legal decision. Without one, deny everywhere.
- With ad tags, `gtag("set", "ads_data_redaction", true)` runs with the defaults, so ad click data is redacted while `ad_storage` is denied.

## Updates

| Category | Signals granted |
| --- | --- |
| `analytics` | `analytics_storage` |
| `marketing` | `ad_storage`, `ad_user_data`, `ad_personalization` |

- The consent sync function calls `gtag("consent", "update", {...})` with all four signals on every call.
- Updates come from page code, never from a Custom HTML tag inside the container.

## Verification

- Tag Assistant shows the four signals in the first Consent event as denied, and in the update after "Accept all" as granted.
- Tags blocked by consent show "Not fired" with the consent reason in Preview mode.
- The container's Consent Overview lists a consent setting for every tag.
