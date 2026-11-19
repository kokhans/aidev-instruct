---
description: Content Security Policy hosts for Microsoft Clarity.
globs: ["**/*csp*.ts", "**/*security*.ts", "**/*headers*.ts", "**/middleware.ts", "**/proxy.ts", "**/_headers"]
with: ["web-security"]
---

# Microsoft Clarity With Web Security

| Directive | Hosts |
| --- | --- |
| `script-src` | Covered by the nonce and `'strict-dynamic'`. Without it: `https://*.clarity.ms` |
| `connect-src` | `https://*.clarity.ms https://c.bing.com` |
| `img-src` | `https://*.clarity.ms https://c.bing.com` |

- Microsoft lists `https://*.clarity.ms` and `https://c.bing.com` for `default-src`. A policy that sets fetch directives one by one repeats both in each directive above.
- The tag loads from `www.clarity.ms` and `scripts.clarity.ms` and uploads to lettered hosts such as `r.clarity.ms`, so use the wildcard rather than single hosts.
- With `ad_Storage` granted, Clarity requests `c.clarity.ms/c.gif`, which redirects to `c.bing.com`. CSP checks the redirect target, so `img-src` needs both.
- Never add `'unsafe-inline'` for the Clarity snippet, as Microsoft's example does. The inline snippet carries the page nonce.
