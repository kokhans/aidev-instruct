---
description: WCAG 2.2 level AA requirements for every page and component, independent of framework.
globs: ["**/*.tsx", "**/*.jsx", "**/*.html", "**/*.mdx", "**/*.css"]
---

# Accessibility

Baseline: WCAG 2.2 level AA. WCAG 3 is still a working draft and is not a target.

## Structure

- Native elements first: `<button>` for actions, `<a href>` for navigation, `<label>` for fields. ARIA only fills gaps that HTML cannot.
- `<html lang>` is set. Each page has one `<main>`. Several `<nav>` elements on one page each have a label.
- One `<h1>` per page. Heading levels go in order without skipping.
- Meaningful images have alt text. Decorative images have `alt=""`. Icon-only buttons have an accessible name.
- Link text says where the link goes. Never "click here" or "read more" without context.

## Keyboard and Focus

- Everything works with the keyboard alone, in a logical order, with no keyboard traps.
- The first focusable element is a "Skip to content" link.
- Focus is always visible (`:focus-visible`) and never hidden behind sticky headers, banners or cookie dialogs. Use `scroll-padding-top` for sticky headers.
- Never remove an outline without a visible replacement. Never use a positive `tabindex`.
- On client-side navigation, focus moves to the new page's `<h1>` or main region and the new title is announced.

## Visual

- Contrast: 4.5:1 for text, 3:1 for large text, icons, focus indicators and control borders.
- Targets are at least 24 x 24 CSS px, or have enough spacing around them.
- Pages work at 200% zoom and at 320 px width without horizontal scrolling. The viewport meta never disables zoom.
- Information never relies on color alone.
- `prefers-reduced-motion` turns off non-essential animation, parallax and auto-playing motion. Anything that moves for more than 5 seconds can be paused.
- `forced-colors` mode keeps every control, border and focus ring visible.

## Interaction

- Dialogs, menus and popovers have an accessible name, close with Escape, keep focus inside while modal and return focus on close. Prefer `<dialog>` with `showModal()` and the `popover` attribute.
- Dragging always has a single-pointer alternative.
- Status messages (saved, added to cart, results count) use a live region and never move focus.
- Authentication never requires a cognitive test. Paste and password managers always work.
- Media has captions. Audio never auto-plays.

Use the `accessibility-patterns` skill for component patterns, the WCAG 2.2 additions and testing.
