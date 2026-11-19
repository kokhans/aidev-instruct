---
description: Google Analytics 4 behind CookieConsent with Google Consent Mode v2.
globs: ["**/*consent*.ts", "**/*consent*.tsx", "**/*analytics*.ts", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
with: ["cookie-consent"]
---

# Google Analytics With Cookie Consent

- GA4 belongs to the `analytics` category as a service labelled "Google Analytics".
- Consent Mode v2 defaults (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` all denied) run in an inline `<head>` script before `gtag.js` or the tag manager loads.
- The consent sync function sends `gtag("consent", "update", { analytics_storage })` from the `analytics` category on every call.
- Choose with the legal owner between advanced consent mode (the tag loads and sends cookieless pings while denied) and basic consent mode (the tag loads only after consent). Record the decision in the cookie policy.
- `autoClear` for `analytics` removes `/^_ga/`, which covers the two GA4 cookies `_ga` and `_ga_<container-id>`.
- Before a choice, no `_ga` cookie exists. After accepting, both appear, and Tag Assistant shows `analytics_storage` granted.
