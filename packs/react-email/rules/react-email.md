---
description: React Email templates, preview server and rendering to HTML and plain text.
globs: ["**/emails/**", "**/*email*.tsx"]
---

# React Email

Rules for the latest stable React Email, which needs React 18 or later.

## Packages

- Components and utilities (`Html`, `Body`, `Button`, `Tailwind`, `render`, `toPlainText`, `pretty`) import from `react-email`. Never the deprecated `@react-email/components` or the single-component packages.
- The preview server is the `@react-email/ui` dev dependency. Never the deprecated `@react-email/preview-server`.
- Templates live in one folder, `emails` by default. A different folder is passed with `email dev --dir <folder>`.

## Templates

- Each template is a default-exported component with typed props and no data fetching.
- Each template sets `Template.PreviewProps` with realistic data. The preview server renders with them.
- Templates build on `Html`, `Head`, `Preview`, `Body` and `Container`, and use the library components for links, buttons, images and layout. They avoid raw `div` layouts, which email clients render unevenly.
- Images use absolute HTTPS URLs. Clients do not resolve relative paths.

## Rendering

- `render` is async: `await render(<Template {...props} />)`.
- Plain text comes from `toPlainText(html)`. Every email ships both versions.
- `pretty` only formats HTML for reading. Production output is not prettified.
- `email export` writes static HTML only for systems that cannot call `render` at send time.
- Templates render on the server. Rendering in a browser needs `web-streams-polyfill` for Safari's missing `ReadableByteStreamController`.
