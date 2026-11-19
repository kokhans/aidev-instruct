---
description: Mobile-first layout, browser support, sizes, input, colour schemes, CSS motion and print rules for every UI change.
globs: ["**/*.tsx", "**/*.jsx", "**/*.css", "**/*.mdx", "**/*.html"]
---

# Responsive Design

A component is done when it works narrow, wide, zoomed and without a pointer.

## Browser Support

- CSS and DOM features are Baseline widely available. Newer features are enhancements behind `@supports` or with a fallback that keeps content usable.

## Layout

- Base styles target the smallest screen. Wider layouts are added with `min-width` queries only.
- A breakpoint goes where this layout stops working, not at a device width.
- Intrinsic layout first: `flex-wrap`, `repeat(auto-fit, minmax(...))`, `clamp()`, and container queries for components reused at different widths.
- Recompose per size, do not reposition: change structure, navigation, density, media crop and controls. Removing decoration that has no room is a valid choice.
- Never `transform: scale()` a whole block to make it fit.
- `display: none` hides decoration only, never content a keyboard or screen reader needs.

## Sizes

- Type and spacing in `rem`. `px` only for hairlines and borders. Fluid sizes use `clamp()` with a `rem` part, so zoom still scales them.
- Line length is capped (about `65ch`) at every width.
- Text containers never get a fixed `height`. Use `min-height`.
- Full-height sections use `svh` or `dvh`, never `100vh`. Edge-to-edge and sticky elements respect `env(safe-area-inset-*)` with `viewport-fit=cover`.
- Logical properties (`margin-inline`, `padding-block`) for direction-independent layout.
- Long words and user data wrap with `overflow-wrap: anywhere` or scroll inside their own box.

## Input

- Hover is an enhancement. Hover effects sit under `@media (hover: hover) and (pointer: fine)`, with `:active` and `:focus-visible` equivalents.
- Essential text never depends on `title` or hover tooltips.

## Colour Schemes

- `color-scheme` on `:root` declares the supported schemes, so form controls and scrollbars match.
- Dark mode, when supported, follows the system setting and remembers a manual choice. Scheme-dependent colours use one token set per scheme. `light-dark()` is Baseline newly available, so it needs a fallback.

## Motion

- CSS animations and transitions change only `transform` and `opacity`.
- Under `prefers-reduced-motion: reduce`, movement is removed or replaced by a fade. Layout and content stay intact.
- Page changes may use the View Transitions API where the design calls for it. An instant change is the fallback and the reduced-motion behaviour.

## Print

- Articles and legal pages print cleanly: `@media print` hides navigation, footer and banners, prints dark text on white and shows link URLs after the link text.

Verify a UI change with the `responsive-check` skill.
