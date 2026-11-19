---
description: TypeScript settings for code that runs on Bun.
globs: ["**/tsconfig*.json", "**/*.ts", "**/*.tsx"]
with: ["typescript"]
---

# Bun With TypeScript

- `@types/bun` is a dev dependency and `tsconfig.json` lists `"types": ["bun"]`.
- `module: "preserve"`, `moduleResolution: "bundler"`, `noEmit: true` and `allowImportingTsExtensions: true`.
