---
description: Power Apps code components as virtual React controls on platform libraries with React 16.14.0 and Fluent UI 9.46.2, covering the manifest, the ReactControl lifecycle, host APIs and release builds.
globs: ["**/ControlManifest.Input.xml", "**/*.pcfproj", "**/*.ts", "**/*.tsx"]
---

# Power Apps Component Framework

## Project

- New controls are virtual React controls: `pac pcf init --namespace <ns> --name <Name> --template field --framework react --run-npm-install`. Use `--template dataset` for grids and lists.
- A standard control is never converted by editing its manifest. Create a new control from the React template and move the code.
- React controls work in model-driven and canvas apps only. Power Pages does not update them when other fields change.

## Platform Libraries

- The manifest sets `control-type="virtual"` and declares the libraries in `resources`:

```xml
<platform-library name="React" version="16.14.0" />
<platform-library name="Fluent" version="9.46.2" />
```

- React is 16.14.0. Fluent UI 9 (`@fluentui/react-components`) accepts 9.4.0 to 9.46.2; Fluent UI 8 (`@fluentui/react`) accepts 8.29.0 or 8.121.1. A manifest declares Fluent 8 or 9, never both, and drops the Fluent element when it uses neither.
- Code uses no React or Fluent API newer than the declared versions. At runtime a model-driven app loads React 17.0.2 and a canvas app React 16.14.0, and Fluent UI 9 loads as 9.68.0, but the build and the contract are the declared versions.
- `package.json` pins `react`, `@types/react` and the Fluent package to the declared versions, so type checking fails on newer APIs.
- React and Fluent never get bundled: the platform provides them. Other dependencies are bundled. Never load scripts with a `<script>` tag.

## Lifecycle

- `init(context, notifyOutputChanged, state)` has no container. Store `notifyOutputChanged`, start network requests, and call `context.mode.trackContainerResize(true)` when the layout needs `allocatedWidth` and `allocatedHeight`.
- `updateView(context)` returns a `React.ReactElement` built from `context.parameters`. It never calls `ReactDOM.render`.
- Property values are `null` while data loads. Components render a loading or empty state for `null`, and a later `updateView` brings the value.
- `notifyOutputChanged` fires when the user commits a value (blur, selection, end of drag), not on every keystroke. `getOutputs` returns the values of the `bound` and `output` properties.
- `destroy` removes event listeners, timers and sockets created outside React.
- Dataset controls never call `dataset.refresh()` without a reason: every call reloads data from the server.

## Host Boundaries

- Code uses only documented members of `ComponentFramework.Context`. No access to the host page DOM outside the control, and no `formContext`: a control must work in every host.
- Check that each API exists in every target host: `context.webAPI` is not available in canvas apps. Features such as `WebAPI` are declared in `feature-usage` with `uses-feature`.
- `context.webAPI` calls count toward service protection and entitlement limits. Request only the needed columns and rows.
- CSS is scoped to the control's generated class, such as `.Contoso\.OrderPicker`. Never style global selectors.
- No `localStorage` or `sessionStorage`. State that must persist goes to a bound property or Dataverse.
- Network calls are asynchronous. Never block with synchronous `XMLHttpRequest`.

## Build and Release

- Dataverse gets production builds only. Set `<PcfBuildMode>production</PcfBuildMode>` in the `.pcfproj` for `pac pcf push`, and build solutions with `msbuild /p:configuration=Release`.
- Every release raises the control's manifest version, at least PATCH (`pac pcf version --strategy manifest`). Without it, apps keep the old control.
- `pac pcf push --publisher-prefix <prefix>` is for development environments only. Releases ship in a solution project that references the control (`pac solution add-reference`).

For manifest details, dataset controls, testing and ALM, use the `pcf-react-controls` skill.
