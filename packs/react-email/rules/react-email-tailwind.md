---
description: Tailwind CSS inside React Email templates through the Tailwind component.
globs: ["**/emails/**", "**/*email*.tsx"]
with: ["tailwind"]
---

# React Email With Tailwind

- Templates style with `<Tailwind config={{ presets: [pixelBasedPreset], theme }}>` from `react-email`. The component inlines Tailwind CSS classes into `style` attributes.
- `pixelBasedPreset` is always on, because many email clients ignore `rem`.
- The `theme` mirrors the site's design tokens as plain values. Email templates do not import the app's CSS file.
- `hover:` classes are not inlined and most clients ignore them. Templates do not depend on them.
- `prose` and `space-*` utilities do not work. Spacing uses padding and margin on each element.
- Context providers sit outside `<Tailwind>`. Inside it, `useContext` breaks.
