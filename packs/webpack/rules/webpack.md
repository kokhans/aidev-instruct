---
description: webpack for maintaining existing builds with built-in TypeScript, CSS and HTML, ES module output and caching.
globs: ["**/webpack.config.*", "**/webpack.*.config.*", "**/package.json", "**/tsconfig*.json"]
---

# Webpack

## Scope

- webpack is maintained where a build already uses it and stays on the latest 5.x release. A new project does not adopt it.
- Each upgrade reads the release posts: 5.x minors rename and deprecate options, and some old flags are ignored without an error.

## Config

- The config is `webpack.config.ts`, typed with `defineConfig` and loaded through Node's type stripping, without `ts-node`.
- Path aliases come from `tsconfig.json` through `resolve.tsconfig`. No `tsconfig-paths-webpack-plugin` and no duplicated `resolve.alias`.
- `cache: { type: "filesystem" }` with the config file in `buildDependencies.config`, so a config change invalidates the cache.
- Production uses `devtool: "source-map"` or `"hidden-source-map"`. Never `eval` source maps outside development.
- Output file names use `[contenthash]`, so long-term caching works.

## Built-In Support

- Built-in TypeScript (`experiments.typescript`, default `"auto"`) is experimental: experiments follow relaxed semver, so the lock file pins webpack. It only erases types: `.tsx` and non-erasable syntax still need `ts-loader` or `swc-loader`, and a loader rule for `.ts` turns it off.
- Type checking runs as `tsc --noEmit` in its own step, not inside the build.
- CSS imports, CSS Modules (`*.module.css`), extraction and minification are built in and stable. `css-loader`, `style-loader` and `mini-css-extract-plugin` are deprecated: replace them in one change with the `@webpack/css-plugins-to-native-css` codemod.
- Preprocessors keep their loader with `type: "css/auto"`, such as `sass-loader`. A loader rule on plain `.css`, such as PostCSS for Tailwind, needs `experiments.css: true`.
- An HTML entry, or `output.html: true` for a JavaScript entry, replaces `html-webpack-plugin`. The codemod is `@webpack/html-plugins-to-native-html` (5.112 and later).
- ES module output uses `output.module: true`. `experiments.outputModule` is ignored.

## Performance

- `optimization.splitChunks` defaults are kept unless a measured bundle says otherwise.
- An audit build enables `performance.all: true` (5.110 and later), which reports duplicate packages, unused modules and unused config. Findings are fixed, not silenced. The checks add build time, so regular builds leave them off.
