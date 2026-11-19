---
description: Vitest for unit tests and component tests in browser mode.
globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/vitest.config.*", "**/vite.config.*"]
---

# Vitest

## Config

- Test settings live in the `test` block of `vite.config.ts` when the app uses Vite, otherwise in `vitest.config.ts`.
- Vitest never looks for a config in parent folders. A run from a package folder passes `--config`.
- Several environments use `test.projects`, each with a `name`. Inline projects inherit the root config; `extends: false` opts one out.
- Test APIs are imported from `vitest`. No `globals: true`.
- Coverage uses `@vitest/coverage-v8`. `coverage.include` names the source folders, so untested files count.
- `.vitest/` holds reports and attachments: Git ignores it and CI keeps it as an artifact.

## Browser Mode

- Component and DOM tests run in browser mode with `provider: playwright()` from `@vitest/browser-playwright` and at least one entry in `browser.instances`. No `jsdom` for components.
- Queries are locators from `page` or the render result. Assertions on them are `await expect.element(locator)`, which retries.
- Locator text matches exactly and case-sensitively by default. Pass `{ exact: false }` for partial text instead of loosening the config.
- Components render with the framework's `vitest-browser-*` package. `render` from `vitest-browser-vue` and `vitest-browser-svelte` is awaited.
- `toHaveTextContent` checks the whole text. `toMatchTextContent` matches part of it or a regular expression.

## Mocks and Async

- `vi.mock`, `vi.unmock` and `vi.hoisted` sit at the top level of the module. Vitest throws otherwise. `vi.doMock` and `vi.doUnmock` work inside a test.
- `clearMocks` is on by default. Tests never depend on mock state from an earlier test.
- Async assertions are awaited. An unawaited `.resolves`, `.rejects` or `toMatchFileSnapshot` fails the test, and `expect.poll` fails at its timeout.
- Time-based code uses `vi.useFakeTimers()` and `vi.setSystemTime()`, never real waits. Fake timers also mock `Temporal` when it exists.
- `toThrow("")` matches any error. Assert the message with a string or a regular expression.

## Habits

- A bug fix adds a test that fails without the fix.
- Tests run in any order and share no state through module variables.
- `-t` matches the full name joined with ` > `, such as `-t "math > adds"`.
