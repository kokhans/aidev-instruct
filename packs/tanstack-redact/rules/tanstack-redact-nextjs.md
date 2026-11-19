---
description: "TanStack Redact in Next.js: withRedact for the browser runtime while Next keeps React on the server."
globs: ["**/next.config.ts", "**/next.config.mjs", "**/next.config.js"]
with: ["nextjs"]
---

# TanStack Redact With Next.js

- `next.config` wraps its options in `withRedact({ ... })` from `@tanstack/redact/next`. Existing options, webpack callbacks and Turbopack rules stay.
- Redact runs only in the browser. Next keeps native React for server rendering, Server Components, Server Actions and caching.
- The adapter accepts only the stable Next.js minors it was tested against and rejects prereleases. A Next.js upgrade waits for a Redact release that lists the new minor.
- The full runtime is always used: Vite feature presets do not apply.
- Custom transforms of React's own entry files conflict with the integration. Check for them before enabling Redact.
