---
name: web-vitals
description: Measures, diagnoses and fixes Core Web Vitals (LCP, INP, CLS) on websites. Covers field measurement with the web-vitals library and attribution, the LCP phase breakdown, long tasks and INP, layout shift sources, image and font loading, caching headers and the back/forward cache. Use when a page fails Core Web Vitals, Search Console flags slow URLs, or a change adds images, fonts, third-party scripts or heavy interactions.
---

# Web Vitals

## References

| File | Covers |
| --- | --- |
| [lcp.md](references/lcp.md) | LCP phases, images, fonts, server time, preloading |
| [inp-and-cls.md](references/inp-and-cls.md) | Long tasks, input delay, rendering cost, layout shift sources |
| [caching.md](references/caching.md) | Cache headers per resource, CDN, back/forward cache |

## Workflow

1. Get field data first: Search Console Core Web Vitals report, PageSpeed Insights (Chrome UX Report section) or the project's own `web-vitals` reports. Find the failing metric, page group and device.
2. Reproduce in the lab with DevTools Performance panel, CPU throttling at 4x and network throttling, on the failing page type.
3. Read the attribution: `web-vitals/attribution` reports the LCP element and phases, the INP interaction and its slow phase, and the largest shifting element.
4. Fix the largest phase first using the matching reference.
5. Verify in the lab, then wait for field data (the Chrome UX Report is a 28-day rolling window).

## Measurement

- `onLCP`, `onINP` and `onCLS` from `web-vitals/attribution` send each metric with its attribution to the analytics endpoint using `navigator.sendBeacon`.
- Reports carry the route pattern, not the full URL, so pages group together.
- Client-routed sites may pass `{ reportSoftNavs: true }` (`web-vitals` 6) to report each route change in Chromium 151 and later. Read the page from the metric's `navigationURL`, not the current URL.
- When an analytics tool is installed, metrics go to it as events instead of a second pipeline.
