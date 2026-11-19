# WCAG 2.2

## Criteria Added in 2.2

| Criterion | Level | Requirement |
| --- | --- | --- |
| 2.4.11 Focus Not Obscured (Minimum) | AA | The focused element is never fully hidden by sticky headers, footers, banners or chat widgets. |
| 2.5.7 Dragging Movements | AA | Every drag action (sliders, reordering, maps) has a single-pointer alternative such as buttons. |
| 2.5.8 Target Size (Minimum) | AA | Pointer targets are at least 24 x 24 CSS px, or a 24 px circle around each target does not overlap another. Inline links in text are exempt. |
| 3.2.6 Consistent Help | A | Help links (contact, chat, FAQ) appear in the same relative order on every page that has them. |
| 3.3.7 Redundant Entry | A | Data entered earlier in a process is filled in or offered for selection, never asked for again. |
| 3.3.8 Accessible Authentication (Minimum) | AA | Login never requires remembering, transcribing or solving a puzzle. Paste, password managers, passkeys and email links are allowed. |

4.1.1 Parsing is removed in 2.2. Do not report it.

## Most Often Failed AA Checks

- 1.1.1: missing or useless alt text on images and icon buttons.
- 1.3.1: visual structure (headings, lists, tables, field groups) missing from the markup.
- 1.4.3 and 1.4.11: low contrast of text, placeholders, borders and focus rings.
- 1.4.10 Reflow: horizontal scrolling at 320 px width.
- 1.4.12 Text Spacing: content clipped when line height, letter and word spacing increase.
- 1.4.13 Content on Hover or Focus: tooltips that cannot be dismissed with Escape or hovered.
- 2.1.1 and 2.1.2: mouse-only controls and keyboard traps.
- 2.4.3 and 2.4.7: illogical focus order and invisible focus.
- 3.3.1 and 3.3.2: errors shown only by color, fields without labels.
- 4.1.2: custom controls without name, role or state.
- 4.1.3: status messages that screen readers never announce.

## Legal Context

- The European Accessibility Act applies since 28 June 2025 to many consumer services in the EU, including e-commerce, banking and transport.
- EN 301 549 V4.1.1 (2 September 2026) moves to WCAG 2.2 level AA. V3.2.1, based on WCAG 2.1, stays the harmonised standard until V4.1.1 is cited in the Official Journal of the EU.
- Services in scope publish how they meet the requirements, usually as an accessibility statement: conformance status, known gaps, a feedback contact and the date of the last review.
