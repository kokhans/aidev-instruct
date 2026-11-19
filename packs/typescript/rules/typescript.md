---
description: TypeScript 7 compiler settings, type design and how commands run through the project's package manager.
globs: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts", "**/tsconfig*.json", "**/package.json"]
---

# TypeScript

## Compiler

- TypeScript 7, the native `tsc`. `strict` and `noUncheckedSideEffectImports` are on by default. The project also sets `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax` and `erasableSyntaxOnly`.
- Code run by a bundler or Bun uses `module: "preserve"` with `moduleResolution: "bundler"`. Code run by Node.js uses `module: "nodenext"`.
- `types` defaults to `[]`: list every global type package, such as `["node"]` or `["vite/client"]`.
- `noUncheckedSideEffectImports` makes `import "./app.css"` need an ambient declaration, such as the one in `vite/client`.
- `baseUrl` is an error. `paths` entries start with `./` and match the bundler and runtime aliases.
- `rootDir` defaults to the folder of `tsconfig.json`. A project that emits from an inner folder such as `src` sets it.
- Bundlers, runtimes and test runners strip types without checking them. A `typecheck` script runs `tsc --noEmit` (`tsc -b` with project references), and CI runs it.
- `tsc` with file arguments fails next to a `tsconfig.json` unless `--ignoreConfig` is passed. Check the project, not single files.
- TypeScript 7 ships no compiler API. Tools that import it, such as typescript-eslint and the Vue, Svelte and Astro tooling, stay on TypeScript 6: `package.json` aliases `"typescript": "npm:@typescript/typescript6@^6"` and `"@typescript/native": "npm:typescript@^7"`, so tools load 6.0 and `tsc` stays native.

## Commands

- The project's package manager, set by its lock file, runs scripts and binaries. Never mix package managers in one repository.
- Rules name binaries without a runner: `biome check` runs as `bunx biome check`, `pnpm exec biome check` or `npx biome check`. Versioned one-off tools such as `react-doctor@latest` run through `bunx`, `pnx` or `npx`.
- `package.json` scripts are the entry points. Run a script instead of retyping its command.

## Types

- No `any`. External data enters as `unknown` and a schema or type guard narrows it.
- No `as` casts or non-null `!` to silence an error. Narrow, guard or fix the type.
- `@ts-expect-error` with a reason, never `@ts-ignore`.
- No `enum`, runtime `namespace` or constructor parameter properties: `erasableSyntaxOnly` rejects them. String literal unions or `as const` objects replace enums.
- Variants are discriminated unions. A `switch` over them ends with a `never` check.
- Object types extend with `interface ... extends`, not `&` intersections: interfaces check faster and report conflicts.
- Exported functions declare their return type.
- No barrel `index.ts` files inside an app. Import from the defining module.
- Types for external systems are generated from their schema, never written by hand.

Type design depth, overloads, generics and compile-time performance: `typescript-type-design` skill.
