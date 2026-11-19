---
description: Vite configuration with Rolldown and Oxc, environment variables, assets and production builds.
globs: ["**/vite.config.*", "**/vitest.config.*", "**/.env*", "**/index.html", "**/vite-env.d.ts", "**/tsconfig*.json"]
---

# Vite

## Config

- Vite bundles with Rolldown and transforms with Oxc. Use `build.rolldownOptions`, `worker.rolldownOptions`, `optimizeDeps.rolldownOptions` and `oxc`. Never the renamed `rollupOptions` or the deprecated `esbuild` and `optimizeDeps.esbuildOptions`.
- Minification uses the Oxc minifier and Lightning CSS. Never the deprecated `build.minify: 'esbuild'`.
- The object form of `output.manualChunks` is removed and the function form is deprecated in favour of Rolldown's `codeSplitting`. Prefer the framework's route splitting and dynamic `import()` over manual chunks.
- `resolve.tsconfigPaths: true` reads aliases from `tsconfig.json` `paths` for files the tsconfig `include` matches. No `vite-tsconfig-paths` plugin and no second alias list.
- A plugin is added only when the framework or a feature needs it. Framework plugins come before `react()` when their docs say so.
- `build.target` keeps the default `'baseline-widely-available'` unless a support requirement names older browsers.
- Machine-specific values (ports, local hosts) go in `.env.local`, never in the shared config.

## React Compiler

- The stable setup adds `babel({ presets: [reactCompilerPreset()] })` after `react()`: `babel` from `@rolldown/plugin-babel`, `reactCompilerPreset` from `@vitejs/plugin-react`, with `babel-plugin-react-compiler` and `@babel/core` installed.
- `react({ compiler: true })` uses the experimental native compiler from `oxc-transform-react`, only as a deliberate project choice.

## Environment

- Only `VITE_` variables reach client code, and everything in them is public. Secrets never get the prefix.
- Client code reads `import.meta.env`. `process.env` exists only in server code and the config.
- `tsconfig.json` lists `"vite/client"` in `types` for `import.meta.env` and asset import types.
- `.env.local` and `.env.*.local` are git-ignored.
- `vite.config.ts` reads unprefixed values with `loadEnv(mode, process.cwd(), '')`.

## Assets

- Assets imported from source get hashed URLs. `public/` holds only files that need a fixed URL, such as `favicon.ico` or `robots.txt`, referenced by absolute path and never imported.
- `?url`, `?raw` and `?inline` suffixes replace plugins for URLs, file contents and data URIs.
- Workers load with `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.
- `import.meta.glob` builds directory-driven registries instead of hand-kept import lists.

## Build and Dev

- `vite build` neither type-checks nor lints. Those run as separate steps.
- Component files export only components. Other exports turn Fast Refresh updates into full reloads.
- `build.sourcemap: 'hidden'` when source maps go to error tracking and must not be public.
- `vite --force` rebuilds pre-bundled dependencies when one behaves stale.
- The dev server `proxy` is for local development only. Production servers configure CORS themselves.
