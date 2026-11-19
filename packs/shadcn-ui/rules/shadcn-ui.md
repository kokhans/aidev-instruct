---
description: "shadcn/ui components as owned project code: primitive base, theme tokens, cn, variants and registries."
globs: ["**/*.tsx", "**/*.jsx", "**/*.css", "**/components.json"]
---

# shadcn/ui

Rules for the latest stable shadcn/ui and `shadcn` CLI.

## Components

- Components are source code owned by the project. Edit them in place instead of wrapping them or forking a copy.
- Before building a widget, look for it with `shadcn search` and `shadcn docs <component>`. Add an existing component rather than hand-building one.
- `components.json` is the source of truth for style, base colour, CSS variables, aliases and registries. `style` and `tailwind.cssVariables` never change after init. The base colour changes only through `shadcn migrate base-color`.
- Imports use the aliases from `components.json`, never relative paths into the UI folder.
- Product variants go into the component's `cva` variants. Never copy a component to change its look.
- Local edits stay small and readable, so `shadcn add <component> --diff` can merge upstream updates.

## Primitive Base

- The project keeps one base: Base UI (the default for new projects), Radix or React Aria. Check existing components before writing a new one.
- Base UI parts compose with the `render` prop, Radix parts with `asChild`. A component follows the API of the base it was added with.
- A component never imports primitives from a second base. Migration to another base happens one component at a time.

## Theme

- Colours are semantic tokens in global CSS under `:root` and `.dark`, exposed to Tailwind in `@theme inline` (`--color-primary: var(--primary)`).
- Components use semantic utilities (`bg-primary`, `text-muted-foreground`, `border-input`), never raw palette colours.
- A new colour adds a token pair (`--warning`, `--warning-foreground`) in `:root`, `.dark` and `@theme inline`.
- Corner radii derive from `--radius`. Never hard-code a radius in a component.
- Global CSS keeps `@import "shadcn/tailwind.css"` unless the project ran `shadcn eject`. It defines variants such as `data-open:` and `data-closed:` that match both Base UI `data-open` and Radix `data-state="open"`, so components use them instead of base-specific selectors.

## Helpers

- `cn` comes from the `cn` package. `lib/utils.ts` only re-exports it. `shadcn migrate cn` replaces an old `twMerge(clsx(...))` helper and removes `clsx` and `tailwind-merge` once unused.
- With `rsc: true` the CLI adds `"use client"` to interactive components. Keep it when editing them.
- Icons come from the icon library set in `components.json`. Never mix icon libraries.

## Registries

- Third-party registries are namespaced in `components.json` `registries`. Tokens use `${VAR_NAME}` from the environment and are never committed.
- Review third-party items with `shadcn view` or `shadcn add --dry-run` before installing.

Use the `shadcn-ui-cli` skill to initialize, add, update, migrate or publish components.
