---
description: TanStack Form with Next.js Server Actions, covering shared form options, server validation and merging server state.
globs: ["**/app/**/*.ts", "**/app/**/*.tsx"]
with: ["nextjs-ssr"]
---

# TanStack Form With Next.js

- Shared form options and server helpers import from `@tanstack/react-form-nextjs`, not from `@tanstack/react-form`.
- The Server Action takes `(prev, formData)`, runs `createServerValidate({ ...formOpts, onServerValidate })` and returns `error.formState` for a `ServerValidateError`.
- The Client Component calls `useActionState(action, initialFormState)` and merges the result with `transform: useTransform((base) => mergeForm(base, state), [state])`.
- `<form action={action} onSubmit={() => form.handleSubmit()}>` keeps the native submit, so the form works before hydration.
- Every input sets `name`, because the Server Action reads `FormData`.
