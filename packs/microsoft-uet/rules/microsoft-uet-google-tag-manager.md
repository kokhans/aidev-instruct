---
description: Microsoft UET configured inside a Google Tag Manager container.
globs: ["**/*analytics*.ts", "**/*uet*.ts", "**/*gtm*.ts"]
with: ["google-tag-manager"]
---

# Microsoft UET in Google Tag Manager

- UET is configured only in the container with the official "Microsoft Advertising Universal Event Tracking" template. Remove any UET snippet from the code first.
- One tag with track type "UET config/page view" fires on All Pages with the UET tag ID from a constant variable. "Enable automatic tracking for page view events" is on for client-routed sites.
- Custom events are separate tags of the same type, fired by Custom Event triggers on data layer events, with values from Data Layer variables and the config tag as setup tag in tag sequencing.

## Consent

- The template reads consent from GTM's consent state, so the Google Consent Mode default and updates from page code cover UET.
- "Enable consent updates" stays on (the default). Turn on "Inherit initial consent" as well: the page always sets an explicit denied default, and the UET tag can fire after a stored choice was already sent.
- With the template's consent options on, page code sends no `uetq` consent default or updates, including from the consent sync function. Microsoft's manual `uetq` pushes are only a fallback when Tag Helper shows no `asc` parameter.
- With basic consent mode, the UET tags also set "Require additional consent for tag to fire" with `ad_storage`.
- Validate with GTM Preview and UET Tag Helper together.
