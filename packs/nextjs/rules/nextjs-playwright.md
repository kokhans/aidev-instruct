---
description: Playwright end-to-end tests for Next.js production builds, status codes, metadata and instant navigations.
globs: ["**/e2e/**/*.ts", "**/*.spec.ts", "**/playwright.config.*"]
with: ["playwright"]
---

# Next.js With Playwright

- Tests run against `next build && next start`, or against the served `out/` folder for a static export. Development mode hides prefetching and caching behaviour.
- Playwright covers async Server Components, Server Actions end to end, metadata in the first `<head>`, headers and status codes.
- Every dynamic route has a test that asserts a 404 status for a missing record.
- With Cache Components, `instant()` from `@next/playwright` asserts what a navigation shows before the network answers, so a refactor that makes a navigation block fails the test.
- Forms are tested once with JavaScript disabled (`javaScriptEnabled: false`) to prove they submit before hydration.
