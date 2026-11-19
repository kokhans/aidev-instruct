---
description: Content Security Policy hosts for Google Analytics 4.
globs: ["**/*csp*.ts", "**/*security*.ts", "**/*headers*.ts", "**/middleware.ts", "**/proxy.ts", "**/_headers"]
with: ["web-security"]
---

# Google Analytics With Web Security

Google's list for Analytics without Ads features:

| Directive | Hosts |
| --- | --- |
| `script-src` | Covered by the nonce and `'strict-dynamic'`. Without it: `https://www.googletagmanager.com` |
| `img-src` | `https://www.googletagmanager.com https://*.google-analytics.com` |
| `connect-src` | `https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com` |

- When the property is or may be linked to Google Ads, add `https://*.google.com`, `https://*.g.doubleclick.net` and `https://*.google.<TLD>` to `img-src`, the same plus `https://pagead2.googlesyndication.com` to `connect-src`, and `https://www.googletagmanager.com` to `frame-src`. Google recommends this full list from the start.
- List each `google.<TLD>` country domain the audience uses one by one: CSP has no wildcard for top-level domains.
- The inline `gtag` bootstrap and consent default carry the page nonce.
