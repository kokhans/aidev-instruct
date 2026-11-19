---
name: pcf-react-controls
description: Builds and reviews Power Apps component framework code components as virtual React controls on the React 16.14.0 and Fluent UI 9.46.2 platform libraries. Covers pac pcf init, ControlManifest.Input.xml properties, data types and feature usage, the ReactControl class with init, updateView, getOutputs and destroy, field and dataset templates, host API differences between model-driven and canvas apps, release builds, versioning and packaging in a solution. Use when creating or changing a PCF control, its manifest or its React components, or when a control renders stale data, breaks in canvas apps or fails to import.
---

# PCF React Controls

## References

| File | Covers |
| --- | --- |
| [manifest.md](references/manifest.md) | Control, property, data types, data sets, feature usage, resources |
| [alm.md](references/alm.md) | Build modes, solution projects, versioning, canvas app updates |

## Create

```shell
pac pcf init --namespace Contoso --name OrderPicker --template field --framework react --run-npm-install
npm start watch
```

- `--name` and `--namespace` take letters and digits only; the namespace may contain single dots, never at the start or end.
- `npm start watch` opens the local test harness with a development build. It never reaches Dataverse.
- `npm run refreshTypes` (or any build) regenerates `generated/ManifestTypes.d.ts` from the manifest. Run it after every manifest change, before using new properties in code. Never edit the generated file.

## Control Class

```typescript
import * as React from "react";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { OrderPicker, OrderPickerProps } from "./OrderPicker";

export class OrderPickerControl implements ComponentFramework.ReactControl<IInputs, IOutputs> {
  private notifyOutputChanged!: () => void;
  private value: string | undefined;

  public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void): void {
    this.notifyOutputChanged = notifyOutputChanged;
    context.mode.trackContainerResize(true);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
    const props: OrderPickerProps = {
      value: context.parameters.order.raw ?? undefined,
      disabled: context.mode.isControlDisabled,
      width: context.mode.allocatedWidth,
      onCommit: this.handleCommit,
    };
    return React.createElement(OrderPicker, props);
  }

  public getOutputs(): IOutputs {
    return { order: this.value };
  }

  public destroy(): void {}

  private handleCommit = (value: string | undefined): void => {
    this.value = value;
    this.notifyOutputChanged();
  };
}
```

- The class is a thin adapter. All UI lives in function components such as `OrderPicker` that take plain props, so they render and test without the framework.
- `handleCommit` is a class field arrow function: the same reference every render, so memoized children do not re-render.
- `updateView` runs on every property bag change, including resize and visibility. Expensive derived data is memoized inside the component with `React.useMemo` on the inputs it depends on.
- `context.parameters.<name>.raw` is the typed value. `formatted`, `security` and `attributes` exist only on `bound` properties.
- `context.mode.isControlDisabled` and, for bound properties, `security` (field-level security) decide whether the control is read-only. Never assume edit rights.

## React and Fluent on the Platform

- The React rules of the `react` pack apply at the React 16.14.0 level: no API added in React 17 or later, even though model-driven apps load 17.0.2.
- Fluent UI 9 components come from `@fluentui/react-components` at the declared version. Components released after 9.46.2 are not used, even though 9.68.0 loads at runtime.
- Inputs that app makers set (colors, sizes) map to Fluent theme tokens, so a canvas app can style the control.

## Host Differences

| Capability | Model-driven apps | Canvas apps |
| --- | --- | --- |
| React version loaded | 17.0.2 | 16.14.0 |
| `context.webAPI` | Yes | No |
| `Lookup.Simple` properties | Yes | No |
| Updating to a new control version | Automatic after import | Maker opens the app, accepts the update, saves and publishes |

- `context.client.getFormFactor()` with `allocatedWidth` and `allocatedHeight` picks a layout for phone, tablet or web.
- `context.mode.setFullScreen(true)` gives a dataset control the whole screen where space is short.
- Code that calls an optional API checks for it first when its `uses-feature` is `required="false"`.

## Dataset Controls

- Rows come from `context.parameters.<dataset>.sortedRecordIds` in order and `records` by ID. Column metadata comes from `columns`. `loading` and `error` drive the empty and error states.
- Paging uses `paging.hasNextPage`, `paging.loadNextPage()` and `paging.setPageSize()`. Never load every page up front. Canvas apps on Dataverse return no `totalRecordCount`.
- Sorting sets `sorting`, filtering calls `filtering.setFilter()`, then one `refresh()` loads the data. `refresh()` resets paging to page 1, and a new sort resets the filter. Both work only with Dataverse data sources.
- Selection goes through `setSelectedRecordIds`, so the host's commands see it.
- `openDatasetItem(entityReference)` opens a record the way the host expects, including a custom `Mscrm.OpenRecordItem` command.
- Methods differ by host: `addColumn` and `linking` are model-driven only; `newRecord`, `delete` and `getCommands` are canvas only.

## Review Checklist

1. Manifest: `control-type="virtual"`, React `16.14.0`, at most one Fluent `platform-library` within the allowed versions.
2. No `ReactDOM.render` and no React or Fluent API newer than the declared versions.
3. `null` property values render a loading or empty state.
4. `notifyOutputChanged` fires on commit, not per keystroke.
5. CSS is scoped to the control class, with no global selectors.
6. No `localStorage`, `sessionStorage`, host DOM access or `formContext`.
7. The manifest version is raised for the release, and the release build is production.
