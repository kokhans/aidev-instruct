# Security Headers

## Values

| Header | Value | Applies to |
| --- | --- | --- |
| `Content-Security-Policy` | See `csp.md` | HTML |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | All HTTPS responses |
| `X-Content-Type-Options` | `nosniff` | All responses |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | All responses |
| `X-Frame-Options` | `DENY` | HTML, for browsers without `frame-ancestors` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()`, keeping only features the site uses | HTML |
| `Cross-Origin-Opener-Policy` | `same-origin`, or `same-origin-allow-popups` for OAuth and payment popups | HTML |
| `Cross-Origin-Resource-Policy` | `same-site` | Private assets and API responses |
| `Content-Type` | Correct type with `charset=utf-8` for text | All responses |

Headers that are never sent: `X-XSS-Protection`, `Expect-CT`, `Public-Key-Pins`, `Feature-Policy`, `X-Powered-By`.

## HSTS Preload

- Submit to the preload list only after every subdomain serves HTTPS, because removal takes months.
- Start with a short `max-age` on a new domain and raise it once nothing breaks.

## Where to Set Headers

| Hosting | Place |
| --- | --- |
| Framework server | Middleware or the server entry, so the nonce and the HTML share one request |
| Static host or CDN | The host's header file or config (`_headers`, `vercel.json`, `staticwebapp.config.json`, CDN rules) |
| Reverse proxy | `nginx`, Caddy or the load balancer, for headers that do not depend on the page |

- Headers that need a per-request nonce are set where the HTML is rendered, never at a static layer.
- API responses get `nosniff`, `Referrer-Policy` and a restrictive `Cache-Control`, not a page CSP.

## Verification

- `curl -sI https://example.com/` for HTML, plus one hashed asset, one API route and the 404 page.
- Check that each HTML response has a different nonce.
- Run the CSP Evaluator on the policy and check the browser console on every page type.
