# Content Security Policy

## Policy Types

| HTML | Policy | Notes |
| --- | --- | --- |
| Rendered per request (SSR, server functions, middleware) | `script-src 'nonce-{random}' 'strict-dynamic'` | New nonce per response. The framework passes it to every script and style tag it renders. The HTML is never publicly cached. |
| Static or prerendered (SPA, static export, CDN) | `script-src 'sha256-{hash}' 'strict-dynamic'` | Hash every inline script at build time. External bundles load through a hashed inline loader script, which `'strict-dynamic'` then trusts. |

Both keep `object-src 'none'` and `base-uri 'none'`. Add `https:` and `'unsafe-inline'` to `script-src` only as a fallback for browsers that predate CSP 3: modern browsers ignore both when a nonce or hash and `'strict-dynamic'` are present.

## Directive Baseline

| Directive | Value |
| --- | --- |
| `default-src` | `'self'` |
| `script-src` | Nonce or hashes plus `'strict-dynamic'` |
| `style-src` | `'self'` plus the nonce. `'unsafe-inline'` only when a library injects style attributes and no nonce option exists. |
| `img-src` | `'self' data: blob:` plus image CDN and analytics hosts |
| `font-src` | `'self'`, plus font hosts only when fonts are not self-hosted |
| `connect-src` | `'self'` plus API, analytics and error-reporting hosts |
| `frame-src` | Only hosts that are embedded: video, maps, payments, challenges |
| `object-src` | `'none'` |
| `base-uri` | `'none'`, or `'self'` when a `<base>` tag is needed |
| `form-action` | `'self'` plus payment or auth hosts that receive posts |
| `frame-ancestors` | `'none'` |
| `upgrade-insecure-requests` | Present |
| `report-to` | Name of the group in `Reporting-Endpoints` |

## Third Parties

- Each integration documents the hosts it needs per directive. They join the single policy builder.
- Tag managers inject scripts that inherit trust through `'strict-dynamic'`, but their beacons still need `connect-src` and `img-src` hosts.
- Features that need `'unsafe-eval'`, such as custom JavaScript variables in a tag manager, are replaced, not allowed.
- Embeds (YouTube, maps) load in `frame-src` with privacy-enhanced hosts such as `www.youtube-nocookie.com`.

## Reporting

- `Reporting-Endpoints: csp="https://example.com/csp-reports"` with `report-to csp` in the policy. Keep `report-uri` beside it only for browsers without the Reporting API.
- Expect noise from browser extensions. Filter reports by `source-file` and `blocked-uri` before acting.

## Trusted Types

- `require-trusted-types-for 'script'` makes DOM sinks such as `innerHTML` reject plain strings. It is Baseline Newly available since February 2026 (Firefox 148, Safari 26).
- Roll it out in report-only mode first. Frameworks that render through the DOM safely usually need a policy only for the few places that set HTML.
