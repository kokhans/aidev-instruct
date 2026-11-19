---
description: Splits work between Vitest and Playwright when a project uses both test runners.
globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/vitest.config.*", "**/vite.config.*", "**/playwright.config.*"]
with: ["playwright"]
---

# Vitest With Playwright

- Vitest owns unit and component tests. Playwright owns end-to-end tests against the running app.
- Vitest `include` and Playwright `testDir` never overlap, so neither runner picks up the other's files.
- Component tests use Vitest browser mode, not Playwright component testing.
- Vitest browser mode and `@playwright/test` share one Playwright version and one browser install in CI.
- A behavior is tested at the lowest level that proves it. End-to-end tests cover user journeys, not every branch.
