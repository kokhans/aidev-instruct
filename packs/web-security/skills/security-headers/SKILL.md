---
name: security-headers
description: Designs, rolls out and verifies a strict Content Security Policy and the full set of HTTP security headers for a website. Covers nonce versus hash policies, strict-dynamic, third-party allow lists, styles, reporting, Trusted Types, and where headers are set for server-rendered and static hosting. Use when adding or changing a CSP, adding a third-party script, fixing CSP violations, or reviewing response headers before release.
---

# Security Headers

## References

| File | Covers |
| --- | --- |
| [csp.md](references/csp.md) | Nonce and hash policies, directives, third-party hosts, styles, reporting, Trusted Types |
| [headers.md](references/headers.md) | Every header with its value, where to set it, how to verify |

## Workflow

1. Pick the policy type: nonce for HTML rendered per request, hashes for static or prerendered HTML. See `csp.md`.
2. Write the policy in one module that builds the header string from a list of directives. Integrations add hosts to that list, never a second policy.
3. Deploy it as `Content-Security-Policy-Report-Only` with reporting, browse every page type and every third-party flow (consent, analytics, payments, embeds), and collect violations.
4. Fix each violation at the source: add the nonce, move inline handlers into scripts, or add a host to the right directive.
5. Enforce with `Content-Security-Policy`. Keep the report endpoint.
6. Verify with `curl -sI` on HTML, assets and API responses, the CSP Evaluator and the browser console.

## Decisions

- One policy per response. Two `Content-Security-Policy` headers combine as an intersection and usually break the site.
- `'strict-dynamic'` makes host allow lists in `script-src` unnecessary for scripts loaded by trusted scripts. Hosts still matter in `connect-src`, `img-src`, `frame-src` and `style-src`.
- `'unsafe-eval'` is never added for a tag manager feature. Choose the feature that works without it.
