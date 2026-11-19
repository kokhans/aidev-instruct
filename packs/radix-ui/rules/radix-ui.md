---
description: Radix UI primitives for dialogs, menus, popovers, tooltips, tabs, accordions and selects.
globs: ["**/*.tsx", "**/*.jsx"]
---

# Radix UI

- Dialogs, menus, popovers, tooltips, tabs, accordions and selects use Radix primitives. Never hand-build their keyboard and focus logic.
- Imports come from the `radix-ui` package (`import { Dialog } from "radix-ui"` or `import * as Dialog from "radix-ui/dialog"`), never the separate `@radix-ui/react-*` packages.
- Each primitive is wrapped once in a styled component. Pages use the wrapper, never the raw primitive.
- `asChild` keeps the right element: links stay `<a>`, buttons stay `<button>`. A custom child spreads every prop it receives onto its DOM node and passes `ref` to it.
- Every dialog has a `Title` and a `Description`, visually hidden when the design shows none.
- Overlays (dialog, popover, menu, tooltip content) render inside their `Portal`.
- Tooltips sit inside one `Tooltip.Provider` near the root. Tooltips hold only supplementary text, never the only label of a control.
- Controlled state uses `open` and `onOpenChange` (or `value` and `onValueChange`). Never toggle visibility by unmounting the root.
- Exit animations are CSS keyframe animations on `data-state="closed"`: Radix delays unmount until `animationend`. It does not wait for CSS transitions. A JavaScript animation library controls unmount through `forceMount`.
- Preview primitives exported as `unstable_*` (such as `unstable_OneTimePasswordField`) can change in any release. Only the wrapper imports them.
