---
description: Running TypeScript directly on Node.js with built-in type stripping.
globs: ["**/tsconfig*.json", "**/*.ts", "**/*.mts", "**/*.cts"]
with: ["typescript"]
---

# Node.js With TypeScript

- Node runs `.ts`, `.mts` and `.cts` files directly by stripping types. No `ts-node` or `tsx` for code that uses only erasable syntax.
- `tsconfig.json` sets `module: "nodenext"`, `erasableSyntaxOnly`, `verbatimModuleSyntax` and `rewriteRelativeImportExtensions`, plus `noEmit` when nothing is compiled.
- Relative imports name the `.ts` file: `import { db } from "./db.ts"`. Extensionless imports fail at runtime.
- Node never reads `tsconfig.json`: `paths` aliases fail. Use subpath `imports` starting with `#`.
- Node strips no types under `node_modules`. Packages publish compiled JavaScript with declaration files.
- `.tsx`, `enum`, runtime `namespace`, parameter properties, import aliases and decorators fail. `--experimental-transform-types` was removed in Node 26.
- `@types/node` matches the runtime's major version, and `tsconfig.json` lists `"types": ["node"]`.
