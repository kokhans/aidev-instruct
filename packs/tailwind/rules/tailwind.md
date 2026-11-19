---
description: Tailwind CSS rules for theme tokens, utilities, variants, dark mode and class composition.
globs: ["**/*.css", "**/*.tsx", "**/*.jsx", "**/*.mdx", "**/*.html"]
---

# Tailwind CSS

Rules for the latest stable Tailwind CSS.

## Setup

- CSS-first: `@import "tailwindcss"` and every design token (colour, font, spacing, radius, easing) in `@theme`. No `tailwind.config.js`, `@config` or `@tailwind` directives.
- The build uses the first-party integration: `@tailwindcss/vite`, `@tailwindcss/postcss` or `@tailwindcss/webpack`.
- The brand palette replaces the defaults with `--color-*: initial`, so only brand colours exist.
- A token that references another variable goes in `@theme inline`, so the utility resolves the right value.
- CSS variables that must not generate utilities go in `:root`, not `@theme`. Theme variables stay top level, never inside selectors or media queries.
- Shared tokens for several apps live in one CSS file imported after `tailwindcss`.
- `@source` adds paths that automatic detection misses, such as classes in a dependency. `@reference` gives CSS modules and component `<style>` blocks access to the theme without duplicating it.

## Dark Mode

- Dark mode follows `prefers-color-scheme` by default. A remembered manual choice uses `@custom-variant dark (&:where(.dark, .dark *));` with the class set on `<html>` before first paint, by an inline script in `<head>` or by the server.

## Usage

- Built-in variants instead of custom CSS: `motion-safe:`, `motion-reduce:`, `forced-colors:`, `not-*:`, `in-*:`, `has-*:`, `aria-*:`, `data-*:` and container queries with `@container` and `@md:`.
- Custom utilities use `@utility`, custom variants use `@custom-variant`. `@apply` only for markup you do not control.
- Every class name is a complete string in source. Map variants to full class strings, never build `bg-${tone}-500`.
- Values from data or APIs go through a CSS variable in `style`: `bg-(--accent)`.
- No arbitrary values where a token exists. A missing token is added to `@theme`.
- Logical utilities over physical ones for direction-dependent layout: `ps-*`, `pe-*`, `ms-*`, `me-*`, `inset-s-*`, `inset-e-*`. `start-*` and `end-*` are deprecated.
- Conditional classes merge with `cn()` from the `cn` package, or a `twMerge(clsx(...))` helper, so later classes win conflicts. Component variants use `class-variance-authority`.
- `outline-hidden` removes the default outline and keeps one in forced colours mode. `outline-none` removes it entirely. Either way a `focus-visible:` ring replaces it.
