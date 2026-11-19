---
description: Styling Radix UI primitives with Tailwind CSS data attribute variants and Radix CSS variables.
globs: ["**/*.tsx", "**/*.jsx"]
with: ["tailwind"]
---

# Radix UI With Tailwind CSS

- Styling targets Radix data attributes: `data-[state=open]:`, `data-[state=checked]:`, `data-[side=top]:`, `data-disabled:`, `data-highlighted:`.
- Exit animations are keyframe utilities (`animate-*`) on `data-[state=closed]:`, never `transition-*`: Radix waits for `animationend` before unmounting and ignores transitions.
- Popover and menu animations start from the Radix transform origin variable: `origin-(--radix-popover-content-transform-origin)`.
- Content height and width follow the Radix size variables, such as `max-h-(--radix-select-content-available-height)`.
- Hidden dialog titles and descriptions use `sr-only`.
