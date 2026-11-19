---
description: Content Security Policy, security headers, cookies and secret handling for websites.
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.html", "**/_headers", "**/vercel.json", "**/netlify.toml", "**/staticwebapp.config.json", "**/nginx.conf", "**/.env*"]
---

# Web Security

## Content Security Policy

- Scripts run under a strict CSP: `script-src 'nonce-{random}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`.
- Server-rendered HTML uses a nonce generated per response from a cryptographic random source (at least 128 bits). Static or prerendered HTML uses `'sha256-...'` hashes of its inline scripts instead.
- Every inline script, including consent defaults and tag loaders, carries the nonce or has its hash in the policy. `'strict-dynamic'` then trusts the scripts they load.
- Never `'unsafe-inline'` or `'unsafe-eval'` in `script-src`. No inline event handlers (`onclick=""`) and no `javascript:` URLs, because a strict CSP blocks them.
- `frame-ancestors 'none'` (or `'self'` when the site frames itself) and `form-action 'self'`.
- HTML with a nonce is never stored in a shared cache, because every visitor would get the same nonce.
- New or changed policies ship as `Content-Security-Policy-Report-Only` with a `report-to` endpoint first, then enforce.
- The CSP is an HTTP header, not a `<meta>` tag: `frame-ancestors` and reporting do not work in `<meta>`.

## Headers

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, added only once every subdomain serves HTTPS.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: DENY` for older browsers.
- `Permissions-Policy` disables every feature the site does not use: `camera=(), microphone=(), geolocation=(), payment=()`.
- `Cross-Origin-Opener-Policy: same-origin`, or `same-origin-allow-popups` when OAuth or payment popups need the opener.
- Never send `X-XSS-Protection`, `Expect-CT` or `Public-Key-Pins`. Remove `X-Powered-By` and version details from `Server`.

## Cookies

- Session cookies are `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`), and use the `__Host-` prefix when they need no subdomain access.
- State-changing requests authenticated by cookies check the `Origin` header or a CSRF token.

## Secrets and Input

- Secrets live in server-only modules. Only values meant for the browser carry the framework's public prefix.
- Environment variables are validated once at startup or build. A missing secret fails fast.
- `.env` files with real values are never committed. An example file lists names only.
- User-supplied HTML is sanitized before rendering. Redirect targets from query strings are checked against an allow list.
- Third-party scripts from a fixed URL use Subresource Integrity (`integrity`, `crossorigin`).

Use the `security-headers` skill for CSP rollout, directive tables and per-host header configuration.
