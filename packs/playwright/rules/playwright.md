---
description: Playwright Test for end-to-end tests with role-based locators, web-first assertions, isolated data and CI traces.
globs: ["**/*.spec.ts", "**/*.e2e.ts", "**/e2e/**", "**/playwright.config.*"]
---

# Playwright

## Config

- End-to-end tests use `@playwright/test`. `webServer` starts the production build, and `use.baseURL` points at it.
- `reuseExistingServer: !process.env.CI`, `forbidOnly: !!process.env.CI` and `retries` only in CI.
- `trace: "on-first-retry"`. CI keeps the HTML report and traces as artifacts.
- CI installs browsers with `playwright install --with-deps`, for only the browsers the projects use.
- Sign-in runs once in a setup project. Other projects list it in `dependencies` and reuse its `storageState` file, which Git ignores.
- `failOnFlakyTests` in CI turns a test that passes only on retry into a failure.

## Locators

- Locators use `getByRole`, `getByLabel`, `getByPlaceholder` and `getByText`. `getByTestId` only where no accessible name exists. No CSS or XPath selectors.
- A locator that matches several elements fails. Narrow it with `filter`, a parent locator or a stricter name, never with `first()` to silence the error.
- No element handles (`page.$`, `page.$$`). Locators re-resolve on every action.

## Assertions and Waiting

- Assertions are web-first and awaited: `await expect(locator).toBeVisible()`. `expect(await locator.isVisible())` does not retry.
- No `page.waitForTimeout` and no fixed sleeps. Wait for a visible result, a URL with `toHaveURL` or a response with `page.waitForResponse`.
- `expect.poll` waits on values that are not locators, such as an API result.
- Page structure checks use `toMatchAriaSnapshot`. `toHaveScreenshot` only where pixels matter, with baselines from the CI platform.
- Time-dependent UI uses `page.clock`, never real waits.

## Isolation

- Each test creates its own data through the API or fixtures and runs in any order. `--shuffle` exposes hidden order dependencies.
- Custom fixtures with `test.extend` hold setup and teardown, not `beforeAll` with shared variables.
- Third-party services are stubbed with `page.route`. The app's own backend is real.
- `test.step` groups long flows, so the report shows where a test failed.

## Debugging

- `playwright test --ui` or `--debug` locally. `playwright show-trace` opens a CI trace.
- `playwright codegen` drafts locators. The test keeps only role-based ones.
