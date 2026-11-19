---
description: Running Google Tag Manager under a strict nonce-based Content Security Policy.
globs: ["**/*csp*.ts", "**/*security*.ts", "**/*headers*.ts", "**/middleware.ts", "**/proxy.ts", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html", "**/_headers"]
with: ["web-security"]
---

# Google Tag Manager With Web Security

- The container snippet is Google's nonce-aware version: the inline script carries the nonce and copies it onto `gtm.js`. Tag Manager then passes the nonce to scripts it adds.
- The consent default script carries the same nonce.
- `'strict-dynamic'` trusts scripts that GTM loads, so `script-src` needs no Google hosts. Policies without `'strict-dynamic'` add `https://www.googletagmanager.com`.
- `img-src` includes `https://www.googletagmanager.com`. `connect-src` includes `https://www.googletagmanager.com https://www.google.com`. Each tag type in the container adds its own hosts through its integration.
- Preview mode needs `https://tagmanager.google.com` in `script-src`, `https://www.googletagmanager.com https://tagmanager.google.com https://fonts.googleapis.com` in `style-src`, `https://ssl.gstatic.com https://www.gstatic.com` in `img-src`, and `https://fonts.gstatic.com data:` in `font-src`, on every environment where the team runs Preview.
- Never add `'unsafe-eval'` for Custom JavaScript variables (they evaluate to `undefined` without it) or `'unsafe-inline'` for the container. Custom templates replace both.
