---
name: responsive-check
description: Verifies a UI change across screen widths, heights, zoom levels, input modes, colour schemes, reduced motion and print, and reports the sizes checked. Use after changing layout, components or CSS, before calling UI work done.
---

# Responsive Check

Check the changed components and the pages that use them, not only the page you edited.

## Setup

- Run the app locally and open each changed route.
- Use the browser's device toolbar, or the project's browser test tool when one is installed. Never install a new tool only for this check.
- Prepare the longest real content: the longest product name, translated string, user name and number the UI can show.

## Checks

| Area | Check | Passes When |
| --- | --- | --- |
| Width | 320, 390, 430, 768, 1024, 1440 and 2560 px | No horizontal scroll, clipped text, overlap or stretched line length |
| Height | 812 x 375 landscape and 390 x 844 phone | Sticky headers, dialogs and full-height sections still fit and scroll |
| Zoom | 200% browser zoom and a larger default font size | Text grows, nothing overlaps, content reflows to one column where needed |
| Pointer | Mouse, touch emulation and keyboard only | Every action works without hover, focus is visible and in order |
| Content | Longest real strings at 320 px | Text wraps or scrolls inside its own box |
| Motion | `prefers-reduced-motion: reduce` | Movement is gone or a fade, layout and content are unchanged |
| Colour | Light, dark and `forced-colors: active` | Text stays readable, controls keep visible borders and focus rings |
| Print | Print preview of articles and legal pages | No navigation or banners, dark text on white, link URLs shown |

## Emulation

| Condition | How |
| --- | --- |
| Reduced motion, colour scheme, forced colours | Chrome DevTools Rendering panel, or `emulateMedia` in Playwright |
| Touch | Device toolbar with a touch device, or a Playwright context with `hasTouch` |
| Print | Rendering panel `print` media type, or the browser print preview |
| Font size | Browser settings, not page zoom |

## Fixing

- Fix the cause in the component: intrinsic layout, wrapping, `min-height`, container queries. Never add a breakpoint for one device.
- Re-run the failing check and the width checks after each fix, because fixes often move the problem to another width.

## Report

List each check with pass or fail, the widths and conditions checked, and any issue left open with the route and size where it appears.
