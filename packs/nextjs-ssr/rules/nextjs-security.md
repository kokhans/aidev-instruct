---
description: Security headers, CSP nonces from Proxy and the hash-based alternative for Next.js apps with a server.
globs: ["**/proxy.ts", "**/next.config.*", "**/app/**/layout.tsx"]
with: ["web-security"]
---

# Next.js Security Headers and CSP

## Static Headers

- `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` come from `headers()` in `next.config.ts` with `source: '/:path*'`.
- The canonical host is a `redirects()` entry with `has: [{ type: 'host', value: '<other host>' }]` and `permanent: true`, which answers 308.
- Order of execution: `headers`, then `redirects`, then Proxy, then routes.

## Nonce CSP

- `proxy.ts` creates a nonce per request with `Buffer.from(crypto.randomUUID()).toString('base64')` and sets `Content-Security-Policy` on both the forwarded request and the response, plus `x-nonce` on the request.
- Forward request headers with `NextResponse.next({ request: { headers } })`. `NextResponse.next({ headers })` would send them to the browser instead.
- Next.js reads the nonce from the request's `Content-Security-Policy` header and applies it to framework scripts, page bundles and its own inline scripts and styles.
- `<Script>` tags get the nonce explicitly: a Server Component inside `<Suspense>` reads it with `(await headers()).get('x-nonce')`.
- `'unsafe-eval'` goes in `script-src` in development only. Production never needs it.
- The matcher excludes `_next/static`, `_next/image`, metadata files and prefetch requests (`missing` for `next-router-prefetch` and `purpose: prefetch`).

## Static Shells

- Nonces need request-time rendering. The prerendered shell of Cache Components cannot carry them, so pages with a nonce CSP give up static shells and CDN caching of HTML.
- A site that must serve static shells uses `experimental.sri` (`algorithm: 'sha256'`) with a hash-based CSP instead. SRI is experimental and is chosen as a written project decision.
- Verify on `next build && next start`: load each page type in Playwright with a `securitypolicyviolation` listener and assert none fire.
