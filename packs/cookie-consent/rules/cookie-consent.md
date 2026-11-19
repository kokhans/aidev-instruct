---
description: Cookie consent with CookieConsent (`vanilla-cookieconsent`) and the legal pages that go with it.
globs: ["**/*consent*.ts", "**/*consent*.tsx", "**/*cookie*.ts", "**/*cookie*.tsx", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
---

# Cookie Consent

## Library

- Consent uses CookieConsent v3 from `vanilla-cookieconsent`, latest stable, with its CSS from `vanilla-cookieconsent/dist/cookieconsent.css`.
- `CookieConsent.run(config)` is called once, from a client-only entry after hydration. One config module holds categories, services and translations.
- `mode` stays `opt-in` (the default). Nothing optional runs before a choice.

## Categories

- `necessary` is `enabled` and `readOnly`. It covers only cookies the site cannot work without, including the consent cookie itself.
- `analytics` holds measurement tools. `marketing` exists only when ad or remarketing tags exist. Add a category for embeds (video, maps) when they set cookies.
- Each category lists its tools as `services` with a label, so visitors can choose per tool.
- Each category has `autoClear.cookies` with every first-party cookie its tools set, as names or regular expressions, so withdrawing consent removes them.

## Behavior

- "Accept all" and "Reject all" have equal weight on the first layer. Keep `equalWeightButtons` at its default `true` and never hide reject behind preferences.
- A "Cookie preferences" control in the footer of every page reopens the choices with `CookieConsent.showPreferences()` or `data-cc="show-preferencesModal"`.
- `revision` increases whenever the cookie policy or the list of tools changes, so every visitor is asked again.
- `respectGpc: true` honors Global Privacy Control: until the visitor chooses, optional categories stay off and the banner does not open by itself. No callback fires for the signal alone.
- The banner never covers the focused element and never blocks the page with `disablePageInteraction` unless the law requires it.
- Translations follow the page language, with `language.autoDetect: "document"` on multi-language sites.

## Wiring Tools

- `onConsent` (first choice and every page load) and `onChange` call one sync function. It reads `acceptedCategory` or `acceptedService` and tells each tool its state.
- Tools load from that sync function or a tag manager that respects consent. Prefer that over `<script type="text/plain" data-category>` tags, and verify any blocked inline script under the enforced CSP.
- Tool IDs come from configuration. With no ID (local and preview), the tool never loads.
- Third-party cookies on the vendor's domain cannot be cleared by `autoClear`. The vendor's own consent call clears them.

## Legal Pages

- Privacy policy and cookie policy are linked in the footer of every page. The cookie policy names every tool and cookie with provider, purpose and lifetime.
- An imprint exists where the law requires one, for example Germany and Austria.
- Each legal page shows its last-updated date and exists in every language the site serves.

Use the `cookie-consent-setup` skill for the config skeleton, category mapping and verification steps.
