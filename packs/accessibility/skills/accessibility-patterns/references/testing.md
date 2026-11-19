# Accessibility Testing

Automated tools find only part of WCAG issues. Every release also needs a keyboard pass and a screen reader pass.

## Automated

| Tool | Use |
| --- | --- |
| `axe-core` through `@axe-core/playwright` | Scan each page type and each open state (dialog, menu, error state) in end-to-end tests. Fail on serious and critical violations. |
| Lighthouse accessibility audit | Quick check of a single page. Not a conformance claim. |
| Linter rules for JSX accessibility | Catch missing alt text, invalid ARIA and click handlers on non-interactive elements while editing. |

## Keyboard Pass

1. Tab from the address bar: the skip link appears first and works.
2. Every interactive element is reachable, in visual order, with visible focus that is never covered.
3. Enter and Space activate buttons. Escape closes dialogs, menus and popovers, and focus returns.
4. No keyboard trap anywhere, including embeds and the cookie banner.

## Visual Pass

1. 200% browser zoom and a 320 px wide viewport: no horizontal scrolling, nothing clipped.
2. Text spacing override (line height 1.5, paragraph spacing 2, letter spacing 0.12, word spacing 0.16): nothing clipped.
3. `prefers-reduced-motion: reduce` and `forced-colors: active` emulated in DevTools.
4. Contrast of text, borders, icons and focus rings checked in each theme.

## Screen Reader Pass

| Platform | Pairing |
| --- | --- |
| Windows | NVDA with Firefox or Chrome |
| macOS and iOS | VoiceOver with Safari |
| Android | TalkBack with Chrome |

Check headings and landmarks lists, form labels and errors, button names and states, live announcements and route changes.
