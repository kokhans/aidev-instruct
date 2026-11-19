---
description: Google Analytics 4 page views, events and data hygiene for websites.
globs: ["**/*analytics*.ts", "**/*analytics*.tsx", "**/*tracking*.ts", "**/*gtag*.ts", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
---

# Google Analytics

## Loading

- The measurement ID (`G-XXXXXXXXXX`) comes from configuration. With no ID (local and preview), nothing loads.
- Without a tag manager, `gtag.js` loads once from the root layout and `gtag("config", id)` runs once.
- `debug_mode: true` is set only on non-production builds. Debug events still reach reports, so the internal traffic filter excludes them.

## Page Views

- Client-routed sites get exactly one `page_view` per navigation, from one source:
  - enhanced measurement "Page changes based on browser history events" in the data stream (Google's recommendation for sites using the History API), or
  - a manual `gtag("event", "page_view", { page_location, page_title })` after each route change, with `send_page_view: false` in the config and history events turned off.
- DebugView confirms that `page_location` and `page_referrer` update on each navigation and that no page view fires twice.

## Events

- Use Google's recommended event names where one fits (`sign_up`, `login`, `generate_lead`, `search`, `purchase`). Custom events are `snake_case`.
- One typed module defines every event and its parameters. Components call it, never `gtag` directly.
- Limits: event names up to 40 characters, 25 parameters per event, parameter names up to 40 characters, values up to 100 characters (`page_location` 1,000, `page_title` 300).
- Custom parameters shown in reports are registered as custom dimensions in the property. Key events are marked in the property, not in code.

## Data Hygiene

- Never send personal data: no emails, names, phone numbers or user-typed text in events, parameters or URLs.
- Query parameters that can carry personal data are removed before they reach `page_location`, and the data stream's redaction settings are on.
- `user_id` is an opaque internal ID, sent only for signed-in users.
- Internal and developer traffic is filtered in the property.
