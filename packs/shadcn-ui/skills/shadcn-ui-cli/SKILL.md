---
name: shadcn-ui-cli
description: "Runs shadcn/ui CLI workflows: initializing a project, choosing a primitive base, adding and updating components, applying presets, running migrations, consuming namespaced registries and publishing a registry. Use when adding or updating shadcn/ui components, changing components.json, migrating between Radix and Base UI, or building a component registry."
---

# shadcn/ui CLI

Commands use the latest `shadcn` CLI through the project's package manager runner.

## Inspect First

| Command | Shows |
| --- | --- |
| `shadcn info` | Framework, versions, CSS variables, installed components and config |
| `shadcn docs <component>` | Docs, examples and API links for the project's base (`--base` to override) |
| `shadcn search [registries...] -q <text>` | Matching items in one or more registries |
| `shadcn view <items...>` | The full registry payload before installing |

## Initialize

- `shadcn init` sets up `components.json`, dependencies, the `cn` helper and CSS variables in an existing project.
- `--base base`, `--base radix` or `--base aria` picks the primitives. Without it, new projects get Base UI. Scripts and CI that expect Radix always pass `--base radix`.
- `--preset <code>` applies a preset (colours, theme, icon library, fonts, radius). `--template` (`next`, `vite`, `start`, `react-router`, `astro`, `laravel`) creates a new project. `--monorepo` sets up a workspace.
- Running `init` again in a configured project reconfigures it. Never re-run it to fix one component.

## Add and Update

1. `shadcn add <component> --dry-run` lists the files and dependencies it will write.
2. `shadcn add <component>` writes the source and installs dependencies and registry dependencies.
3. To update a component with local changes, `shadcn add <component> --diff` shows the upstream changes. Merge them by hand, never with `--overwrite` on an edited file.
4. Run the type check and the component's pages after every add or update.

## Presets

- `shadcn apply <preset>` applies a preset to an existing project. `--only theme` or `--only font` limits it.
- `shadcn preset resolve` prints the preset the project uses. `shadcn preset decode <code>` shows what a code contains.

## Migrations

| Migration | Does |
| --- | --- |
| `shadcn migrate radix [path]` | Moves imports from `@radix-ui/react-*` packages to `radix-ui` |
| `shadcn migrate cn` | Replaces the `twMerge(clsx(...))` helper with the `cn` package |
| `shadcn migrate icons` | Moves components to another icon library |
| `shadcn migrate base-color` | Rewrites the theme variables for another base colour and updates `baseColor` |
| `shadcn migrate rtl` | Sets `rtl: true`, converts physical classes to logical ones and adds `rtl:` variants |

- `shadcn migrate --list` shows the available migrations.
- Pass a path to cover components outside the UI folder, then remove unused packages from `package.json`.
- Moving from Radix to Base UI goes one component at a time on a branch: `asChild` becomes `render`, and each behaviour difference is checked by hand. Both bases can coexist during the move.

## Eject

- `shadcn eject` copies `shadcn/tailwind.css` into the global CSS and removes the `shadcn` package dependency. It cannot be undone, so run it only when the project asks to drop the dependency.

## Consume Registries

- A namespace maps to a URL template in `registries` in `components.json`: `"@acme": "https://acme.com/r/{name}.json"`.
- Private registries use the object form with `headers` whose values read `${VAR_NAME}` from the environment. Tokens live in an ignored env file such as `.env.local`.
- Install with `shadcn add @acme/button`, after `shadcn view @acme/button`.
- GitHub registries install by `owner/repo/item` (`shadcn add acme/toolkit/auth-kit`). Private repositories authenticate through a logged-in `gh`, or `GH_TOKEN` or `GITHUB_TOKEN` in CI with a fine-grained token scoped to the repository with Contents read-only.

## Publish a Registry

1. `registry.json` at the registry root holds `name`, `homepage` and `items`. Large registries split items into nested files with `include`.
2. Each item has `name`, `type` (such as `registry:ui`, `registry:component`, `registry:block`, `registry:hook`), `title`, `description` and `files` with `path` and `type`.
3. `dependencies` lists npm packages. `registryDependencies` lists other items, such as `button` or `@acme/card`.
4. `registry:base` distributes a whole design system, `registry:font` a font.
5. `shadcn registry validate` checks the source files, includes and item paths. `shadcn build` resolves includes and writes one JSON file per item to `public/r` (`--output` to change it).
6. Install each item into a clean project before publishing.
