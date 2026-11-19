---
description: Biome sorts and checks Tailwind CSS classes through its tailwind lint domain.
globs: ["**/biome.json", "**/biome.jsonc", "**/*.tsx", "**/*.jsx", "**/*.html"]
with: ["biome"]
---

# Tailwind CSS With Biome

- Biome sorts and checks classes. Never hand-sort classes or add `prettier-plugin-tailwindcss`.
- `biome.json` sets `tailwind.stylesheet` to the CSS file that imports Tailwind, so the rules know the project's theme and custom utilities.
- The Tailwind rules are nursery rules, so the `tailwind` domain enables none of them on its own. Enable `useTailwindSortedClasses` and `useTailwindStaticClassStrings` by name under `linter.rules.nursery`.
- A class helper missing from the defaults goes into `tailwind.mergeFunctions` (defaults include `cn`, `clsx` and `twMerge`) or `tailwind.variantFunctions` (defaults `cva` and `tv`). Setting either list replaces the defaults, so the list repeats the default names it still needs.
- Class sorting is an unsafe fix: apply it with `biome check --write --unsafe` and review the diff.
