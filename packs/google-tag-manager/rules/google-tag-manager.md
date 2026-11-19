---
description: Google Tag Manager as the single loader for analytics and ad tags, with a typed data layer.
globs: ["**/*analytics*.ts", "**/*analytics*.tsx", "**/*tracking*.ts", "**/*gtm*.ts", "**/*gtm*.tsx", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
---

# Google Tag Manager

## Loading

- One web container per site. Analytics, ad and session tools are configured as tags inside it, never added as separate scripts in code.
- The container snippet goes in `<head>`, after the data layer initialization and any consent defaults, before other scripts.
- The container ID (`GTM-XXXXXXX`) comes from configuration. With no ID (local and most previews), the snippet is not rendered.
- Staging uses a GTM environment snippet (with `gtm_auth` and `gtm_preview`) or no container, never the live one.
- On client-routed sites the snippet renders once in the root layout, never per page.

## Data Layer

- One typed module owns every push: event names, parameter names and types. Components call it, never `dataLayer.push` or vendor globals directly.
- Event names are `snake_case` and stable. Changing one is a breaking change for every tag that triggers on it.
- No personal data in the data layer: no emails, names, phone numbers or free-text input, unless a tag feature requires hashed values and consent allows it.
- Client-side route changes produce exactly one page view per navigation, from one source: a History Change trigger or a pushed event, never both.

## Container

- Tags come from built-in tag types or Community Template Gallery templates. Custom HTML tags are the exception and are reviewed like code.
- Custom JavaScript variables are not used, because they need `'unsafe-eval'` in the CSP. Data Layer variables and custom templates replace them.
- Google tags rely on their built-in consent checks. Every other tag sets "Require additional consent for tag to fire" with the signals it needs, unless the vendor reads Google Consent Mode itself and the site uses advanced consent mode.
- Every publish is a named version with notes, tested first in Preview mode with Tag Assistant.
- Triggers use data layer events from the typed module, not CSS selectors or click text that changes with the design.
