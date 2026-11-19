---
description: Security headers, canonical redirects and CSP limits in server-rendered TanStack Start apps.
globs: ["**/start.ts", "**/router.tsx", "**/routes/__root.tsx"]
with: ["web-security"]
---

# TanStack Start Security Headers and CSP

- Global request middleware in `src/start.ts` sets `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` on `(await next()).response.headers`.
- The same middleware redirects other hosts and the wrong trailing-slash form with `Response.redirect(url, 301)` before calling `next()`. The router's `trailingSlash` option keeps client links consistent with that policy.
- `requestMiddleware` lists `createCsrfMiddleware(...)` first, because defining `src/start.ts` turns off the automatic CSRF check.
- URLs are built from the configured origin, never from the `Host` header. Middleware never modifies the response body.
- Prefer a hash-based or `'self'` script policy. The router option `ssr.nonce` puts a nonce on the tags `<HeadContent />` and `<Scripts />` render, but the docs show it only for inline CSS: verify a nonce setup against the installed version before use.
- Verify on a production build with Playwright: listen for `securitypolicyviolation` and assert none fire.
