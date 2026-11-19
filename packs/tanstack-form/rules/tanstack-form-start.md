---
description: TanStack Form in TanStack Start, covering server validation, progressive enhancement and restoring state after a no-JavaScript submit.
globs: ["**/*.ts", "**/*.tsx"]
with: ["tanstack-start"]
---

# TanStack Form With TanStack Start

- Start projects use TanStack Form for forms instead of React's `useActionState` and `useFormStatus`.
- Imports come from `@tanstack/react-form-start`. It re-exports `@tanstack/react-form` and adds the server helpers.
- `createServerValidate({ ...formOpts, onServerValidate })` runs the same schema on the server, plus checks that need the server.
- The POST server function's `.validator()` accepts only `FormData`. The handler calls `serverValidate(data)` and returns `error.response` for a `ServerValidateError`.
- The `<form>` posts to the server function: `action={handleForm.url} method="post" encType="multipart/form-data"`, so it submits before hydration.
- After a submit without JavaScript, a GET server function returns `getFormData()`. The loader passes it to `useTransform((base) => mergeForm(base, state), [state])`, which restores values and errors.
- Interactive forms submit through a mutation that calls the server function, then invalidate queries or call `router.invalidate()`, and redirect or show a confirmation.
