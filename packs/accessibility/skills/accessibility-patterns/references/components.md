# Component Patterns

## Dialogs and Popovers

- Modal dialogs use `<dialog>` opened with `showModal()`. The browser makes the rest of the page inert and closes it on Escape.
- The dialog has a name from its heading through `aria-labelledby`. Focus starts on the first meaningful control, or on the dialog itself for long content.
- On close, focus returns to the element that opened it.
- Non-modal popups (menus, tooltips, pickers) use the `popover` attribute with `popovertarget`. Light dismiss and Escape come for free.
- The cookie banner never traps focus unless it blocks the page, and never hides the focused element.

## Menus and Navigation

- Site navigation is a list of links, not `role="menu"`. `menu` and `menuitem` are for application menus with arrow-key behavior.
- A disclosure button toggles a submenu with `aria-expanded` and `aria-controls`.
- The current page link has `aria-current="page"`.

## Tabs, Accordions and Disclosures

- Accordions use `<details>` and `<summary>`, or a button with `aria-expanded`.
- Tabs use `tablist`, `tab` and `tabpanel`. Arrow keys move between tabs, Tab moves into the panel. Only the active tab is in the tab order.
- Use tabs only when panels are peers. Content people need to compare goes on one page.

## Comboboxes and Autocomplete

- Prefer a native `<select>` or `<input list>` when they fit.
- A custom combobox follows the ARIA combobox pattern: `aria-expanded`, `aria-activedescendant` or roving focus, and a result count in a live region.

## Carousels

- Carousels never auto-advance, or have a visible pause control and stop on hover and focus.
- Each slide is reachable by keyboard. Previous and next buttons have names.

## Tables

- Data tables use `<th>` with `scope` and a `<caption>`. Layout never uses tables.
- Sortable columns put `aria-sort` on the header and use a button inside it.

## Live Regions and Route Changes

- A polite live region (`role="status"`) exists in the initial HTML before text is written into it.
- Errors that need immediate attention use `role="alert"`, sparingly.
- On client-side navigation: update `document.title`, move focus to the `<h1>` (with `tabindex="-1"`) or announce the title in a live region, and restore scroll position on back and forward.

## Forms

- Every field has a visible `<label>`. Placeholder text never replaces it.
- Related fields are grouped in `<fieldset>` with `<legend>`.
- Errors are text next to the field, linked with `aria-describedby`, with `aria-invalid="true"`. After a failed submit, focus moves to an error summary or the first invalid field.
- Inputs use the right `type`, `inputmode` and `autocomplete` tokens.
