---
name: accessibility-patterns
description: Accessible patterns and checks for websites at WCAG 2.2 level AA. Covers the criteria new in WCAG 2.2, keyboard and screen reader behavior of dialogs, menus, tabs, disclosures, comboboxes and carousels, live regions, client-side navigation, automated and manual testing, and accessibility statements under the European Accessibility Act. Use when building or reviewing interactive components, fixing an accessibility report, or preparing an accessibility audit.
---

# Accessibility Patterns

## References

| File | Covers |
| --- | --- |
| [wcag-22.md](references/wcag-22.md) | Criteria added in WCAG 2.2, the AA checks most often failed, legal context |
| [components.md](references/components.md) | Dialogs, menus, tabs, disclosures, comboboxes, carousels, tables, live regions, route changes |
| [testing.md](references/testing.md) | Automated checks, manual keyboard and screen reader passes, what each one catches |

## Workflow

1. Check whether a native element or attribute does the job: `<dialog>`, `<details>`, `popover`, `<select>`, `inert`. Native behavior beats custom ARIA.
2. When a custom widget is unavoidable, follow its pattern in `components.md` and the WAI-ARIA Authoring Practices Guide.
3. Prefer an accessible headless primitive library already in the project over hand-written ARIA.
4. Test with `testing.md`: automated checks first, then keyboard, then a screen reader.

## Decisions

- No ARIA is better than wrong ARIA. A `role` promises keyboard behavior that the code must deliver.
- `aria-label` never replaces visible text that sighted users read. The accessible name contains the visible label text.
- Hidden content uses `hidden`, `inert` or `display: none`, never only `opacity: 0` or off-screen positioning for interactive elements.
- Overlays and accessibility widgets that claim to fix a site automatically are never used.
