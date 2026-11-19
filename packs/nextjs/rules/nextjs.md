---
description: Next.js App Router rules shared by server and static-export apps, covering components, Turbopack, configuration, metadata, images, fonts and errors.
globs: ["**/*.ts", "**/*.tsx", "**/next.config.*"]
---

# Next.js

## Config

- Turbopack builds in development and production. No `webpack` config and no `--webpack` flag. Turbopack options live under `turbopack` in `next.config.ts`.
- `next.config.ts` sets `reactCompiler: true` and `typedRoutes: true`, both stable top-level options. `experimental.turbopackRustReactCompiler` is experimental: use it only as a deliberate project choice.
- `next build` does not lint. Biome runs as its own step.
- `next dev` writes a managed block into `AGENTS.md` that points to the version-matched docs in `node_modules/next/dist/docs/`. Commit the block and read those docs before guessing at an API.

## Components

- `'use client'` goes on interactive leaves only.
- `params` and `searchParams` are promises. Type them with the global `PageProps<'/route'>` and `LayoutProps<'/route'>` helpers, which need no import.
- Root-level params such as `[lang]` are read with `next/root-params` instead of drilling props.
- Client Components receive data as props or as promises read with `use()` inside `<Suspense>`. They never import server modules.
- A Client Component whose first browser render cannot match the server HTML uses `use(browser())` inside `<Suspense>`, or `next/dynamic` with `ssr: false`.

## Server-Only Code and Environment

- Modules with secrets or database clients start with `import 'server-only'`. A client import then fails the build.
- `NEXT_PUBLIC_` values are inlined at build time, so a value that differs per deployment needs a rebuild.

## Metadata

- Theme colour and viewport come from `viewport` or `generateViewport`. `metadata.themeColor` is deprecated.
- Metadata merges shallowly: a segment that sets `openGraph`, `twitter`, `robots` or `alternates` replaces the parent's whole object.
- `title.template` applies to child segments only. `title.default` is required next to it.
- `metadataBase` is set once in the root layout from configuration.
- File-based metadata (`opengraph-image`, `icon`, `sitemap.ts`, `robots.ts`, `manifest.ts`) overrides the `metadata` export for its segment.

## Images and Fonts

- The LCP image sets `fetchPriority="high"` or `loading="eager"`. `priority` is deprecated.
- Every other image has `width` and `height`, or `fill` with `sizes`.
- Remote images need `images.remotePatterns`. `images.qualities` defaults to `[75]`; add values before using another `quality`.
- Fonts load through `next/font/google` or `next/font/local` with `variable`, mapped to a CSS variable token.

## Navigation and Errors

- Typed routes reject unknown literal `href` values in `<Link>` and `useRouter()` methods at type check.
- `error.tsx` is a Client Component boundary per segment. `global-error.tsx` replaces the root layout and renders its own `<html>` and `<body>`.
- `catchError` from `next/error` builds component-level error boundaries. Their fallback calls `retry()`, which re-fetches Server Components, rather than `reset()`.
- `app/not-found.tsx` is the branded 404 for unmatched URLs.

Mode rules: `nextjs-ssr` or `nextjs-spa`.
