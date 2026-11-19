---
description: Security headers, canonical redirects and CSP nonces in React Router server-rendered apps.
globs: ["**/root.tsx", "**/entry.server.tsx", "**/react-router.config.*"]
with: ["web-security"]
---

# React Router Security Headers and CSP

## Root Middleware

- Root server middleware sets `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` on the response from `next()`.
- The same middleware redirects other hosts and the wrong trailing-slash form with `throw redirect(url, 301)` before `next()`. Trailing-slash redirects apply to document requests only, never `.data` paths.
- URLs are built from the configured origin, never from the `Host` header.
- Middleware never touches the response body.

## Nonce CSP

- The nonce is generated once per request as base64 of `crypto.randomUUID()`.
- `handleRequest` in `entry.server.tsx` passes it to `<ServerRouter nonce={nonce}>` and to the `nonce` option of `renderToPipeableStream` or `renderToReadableStream`, and sets `Content-Security-Policy` on `responseHeaders`.
- `<Scripts>`, `<ScrollRestoration>` and `<Links>` read the nonce from `<ServerRouter>`. A component's own `nonce` prop overrides it.
- Consent and tag scripts that the app renders need the same value. Root middleware creates it and stores it with a `createContext` key; `handleRequest` reads it from its fifth argument, the `RouterContextProvider`.
- Policy: `script-src 'self' 'nonce-<value>' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, plus analytics endpoints from configuration.
- Prerendered routes cannot carry a per-request nonce. Prerender only under a hash-based CSP chosen by the project.
- Verify on a production build with Playwright: listen for `securitypolicyviolation`, assert none fire, and assert every `<script>` has a `nonce`.
