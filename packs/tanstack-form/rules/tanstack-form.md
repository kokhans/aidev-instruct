---
description: TanStack Form rules for React, covering form options, Standard Schema validation, fields, accessibility, subscriptions and composition.
globs: ["**/*.tsx"]
---

# TanStack Form

## Setup

- `formOptions()` defines `defaultValues` once. Client and server code spread the same options.
- Apps with several forms build `useAppForm` with `createFormHook` and `createFormHookContexts`, registering shared field and form components once. `withForm` splits large forms.
- Default values for loaded records come from the loader or query, so the form mounts with data instead of resetting later.

## Validation

- Schemas from Standard Schema libraries (Zod, Valibot, ArkType) pass straight into `validators`, at form level (`validators: { onSubmit: schema }`) or field level.
- Validators never transform values. `onSubmit` parses `value` with the schema again to get coerced and transformed output.
- Async validators set `onChangeAsyncDebounceMs` or `asyncDebounceMs`.
- Server-side checks run in the form's `onSubmitAsync` validator, which returns `{ form, fields: { 'details.email': '...' } }` to set errors on fields. Never copy server errors into separate state.

## Fields

- Each field renders through `form.Field` (or `form.AppField`) with a visible `<label htmlFor>` and an input with a `name` attribute.
- Number inputs pass `e.target.valueAsNumber` to `field.handleChange`.
- Errors from `field.state.meta.errors` render as text with an `id`. The input references it with `aria-describedby` and sets `aria-invalid`.
- Errors show after the field is touched or after a submit attempt, not while the user types the first character.
- Array fields use `mode="array"` with `pushValue` and `removeValue`, and keys from item IDs, never the index of a list that reorders.
- Side effects between fields use `listeners`, not effects.

## State and Submission

- Components read form state with `useSelector(form.store, selector)` or `<form.Subscribe selector>`. Always pass a selector. `useStore` is a deprecated alias of `useSelector`.
- Inside `form.Field`, the render function already tracks the field's own `state.value` and `state.meta`.
- The submit button reads `canSubmit` and `isSubmitting` through `form.Subscribe`, is disabled while sending and shows pending state.
- `<form onSubmit>` calls `event.preventDefault()`, `event.stopPropagation()` and `form.handleSubmit()`.
- Failure keeps every value the user typed. Success resets with `form.reset()` or navigates.
