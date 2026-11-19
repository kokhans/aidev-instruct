---
name: cookie-consent-setup
description: Sets up and verifies CookieConsent (`vanilla-cookieconsent`) on a website. Covers the config skeleton, categories and services, auto-clear patterns, translations, the shared consent sync function that analytics and ad tools hook into, the footer preferences control, revisions, and a verification checklist for cookies before and after a choice. Use when adding the consent banner, adding or removing a tracking tool, changing the cookie policy, or debugging cookies that appear before consent.
---

# Cookie Consent Setup

## Config Skeleton

```ts
import * as CookieConsent from "vanilla-cookieconsent";

CookieConsent.run({
  revision: 1,
  respectGpc: true,
  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: {
      autoClear: { cookies: [{ name: /^_ga/ }, { name: /^_cl(ck|sk)$/ }] },
      services: {
        ga4: { label: "Google Analytics" },
        clarity: { label: "Microsoft Clarity" },
      },
    },
    marketing: {
      autoClear: { cookies: [{ name: /^_gcl_/ }, { name: /^_uet(sid|vid)$/ }] },
    },
  },
  onConsent: syncConsent,
  onChange: syncConsent,
  language: {
    default: "en",
    autoDetect: "document",
    translations: { en: messages },
  },
});
```

- The services and cookies shown are examples. `messages` holds `consentModal` (`title`, `description`, `acceptAllBtn`, `acceptNecessaryBtn`, `showPreferencesBtn`) and `preferencesModal` (`sections` per category, with the cookie table).
- Keep only the categories and services the site really uses. Every cookie in `autoClear` also appears in the cookie policy.

## Sync Function

- `syncConsent` is the single place where consent reaches tools. Each installed tool adds one line to it, mapping categories to its own consent API.
- It reads state with `CookieConsent.acceptedCategory(name)` or `acceptedService(service, category)`, and runs only from the `onConsent` and `onChange` callbacks, never at module load. `onConsent` fires on the first choice and on every later page load.
- It is safe to call repeatedly: every call sends the full current state, not a diff.

## Defaults Before the Banner

- Tools with a consent mode (Google, Microsoft UET) get a denied default in an inline script in `<head>`, before any tag loads and before CookieConsent runs.
- The inline script carries the CSP nonce or its hash is in the policy.
- Tools without a consent mode load only from `syncConsent` after their category is accepted.

## Footer Control

- A button labelled "Cookie preferences" in the footer: `<button type="button" data-cc="show-preferencesModal">`, or an `onClick` that calls `CookieConsent.showPreferences()`.
- It is a `<button>`, not a link, because it opens a dialog.

## Changing Tools or Policy

1. Add or remove the service, its `autoClear` cookies and its row in the cookie table.
2. Update the cookie policy page and its last-updated date.
3. Increase `revision`, optionally with a `revisionMessage` that says what changed.

## Verification

1. Clear site data, load the page and do nothing: no analytics or ad cookies exist, and tag requests carry denied consent.
2. Accept all: tools load and set their cookies, and each vendor's debugger shows consent granted.
3. Open preferences and reject analytics: `_ga*` and `_cl*` cookies disappear and tools report denied.
4. Reload: the choice persists and no banner shows.
5. Increase `revision` in a preview build: the banner shows again.
6. With Global Privacy Control enabled and cleared site data: the banner stays closed, optional categories stay off, and the footer control still opens preferences.
