---
description: Content Security Policy hosts for Microsoft UET.
globs: ["**/*csp*.ts", "**/*security*.ts", "**/*headers*.ts", "**/middleware.ts", "**/proxy.ts", "**/_headers"]
with: ["web-security"]
---

# Microsoft UET With Web Security

| Directive | Hosts |
| --- | --- |
| `script-src` | Covered by the nonce and `'strict-dynamic'`. Without it: `https://bat.bing.com` |
| `connect-src` | `https://bat.bing.com https://bat.bing.net` |
| `img-src` | `https://bat.bing.com https://bat.bing.net` |

- `bat.js` sends hits to `bat.bing.com`, and to `bat.bing.net` while `ad_storage` is denied and for error reports.
- The inline UET snippet and the consent default carry the page nonce.
- Microsoft publishes no CSP list for UET. Deploy in report-only mode, accept all, and add any further Microsoft hosts the violation reports show.
