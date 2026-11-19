---
description: Microsoft Clarity loaded from a Google Tag Manager container.
globs: ["**/*analytics*.ts", "**/*clarity*.ts", "**/*gtm*.ts"]
with: ["google-tag-manager"]
---

# Microsoft Clarity in Google Tag Manager

- Clarity is a tag in the container from the "Microsoft Clarity - Official" Community Template Gallery template, fired on all pages. Code never loads Clarity separately.
- One tag links to one Clarity project. The project ID is a constant variable in the container.
- Clarity honors Google Consent Mode signals by itself, so the consent defaults and updates sent for Google tags also cover Clarity.
- With basic consent mode, the tag sets "Require additional consent for tag to fire" with `analytics_storage`, so it loads only after consent.
- Custom identifiers and tags use the template's fields or the typed tracking module, never a Custom HTML tag.
