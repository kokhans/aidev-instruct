---
description: Google Analytics 4 configured inside a Google Tag Manager container.
globs: ["**/*analytics*.ts", "**/*analytics*.tsx", "**/*tracking*.ts", "**/*gtm*.ts"]
with: ["google-tag-manager"]
---

# Google Analytics in Google Tag Manager

- GA4 is configured only in the container: a Google tag with the measurement ID on an Initialization trigger. Code never loads `gtag.js` separately.
- The measurement ID is a constant variable in the container, or a lookup by hostname when several environments share one container.
- Each GA4 event is a "Google Analytics: GA4 Event" tag fired by a Custom Event trigger on the matching data layer event name, with parameters from Data Layer variables.
- Client-routed sites follow Google's GTM setup: "Page changes based on browser history events" is off in the data stream, and a GA4 Event tag sends `page_view` on a History Change trigger, after a Google tag with `page_location`, `page_title` and `update: true` as its setup tag.
- Preview mode with Tag Assistant and GA4 DebugView together confirm each event once, with its parameters.
