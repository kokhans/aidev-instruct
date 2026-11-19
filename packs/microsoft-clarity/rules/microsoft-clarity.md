---
description: Microsoft Clarity loading, masking, custom tags and consent for websites.
globs: ["**/*analytics*.ts", "**/*analytics*.tsx", "**/*clarity*.ts", "**/*clarity*.tsx", "**/*tracking*.ts", "**/layout.tsx", "**/root.tsx", "**/__root.tsx", "**/*.html"]
---

# Microsoft Clarity

## Loading

- The project ID comes from configuration. With no ID (local and preview), Clarity never loads.
- Clarity loads once per page load, from exactly one source: a tag manager, the `@microsoft/clarity` package (`Clarity.init(projectId)`), or the official snippet. Never two.

## Consent

- Consent mode is on for the project (Settings, Setup, cookies turned off), so Clarity sets no cookies until it receives consent. Since 31 October 2025 Clarity requires a consent signal for visitors from the EEA, the UK and Switzerland.
- Consent goes through `clarity("consentv2", { ad_Storage, analytics_Storage })` (`Clarity.consentV2` in the package), with `"granted"` or `"denied"` for both keys. Note the capital `S`.
- `Clarity.consentV2()` without arguments grants both. Always pass both keys.
- The v1 `clarity("consent")` call is planned for deprecation and never grants consent. `clarity("consent", false)` only erases Clarity cookies and stops tracking.
- Clarity reads Google Consent Mode `analytics_storage` and `ad_storage` automatically when they exist on the page.
- Verify in the console with `clarity("metadata", (d, upgrade, consent) => console.log(consent), false, true, true)`: both values are `DENIED` before a choice.

## Privacy

- Masking mode is Strict or Balanced (the default), never Relaxed. Inputs and drop-downs are masked in every mode.
- Elements with personal or sensitive content carry `data-clarity-mask="true"`. `data-clarity-unmask="true"` is used only on static marketing text.
- Pages with payment, account or health data are excluded or fully masked.
- Custom tags (`clarity("set", key, value)`) and `identify` never carry emails, names or other personal data. `identify` takes an opaque internal ID.
- Clarity is not used on sites that target users under 18.

## Events

- Custom events (`clarity("event", name)`) and tags come from the same typed tracking module as other analytics, never from components directly.
- `clarity("upgrade", reason)` marks sessions worth keeping when Clarity samples recordings, such as checkout errors.
