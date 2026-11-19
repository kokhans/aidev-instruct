# Control Manifest

`ControlManifest.Input.xml` is the source. The build writes `ControlManifest.xml` to `out/`, which is never edited or committed.

## Example

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Contoso" constructor="OrderPicker" version="1.2.3"
           display-name-key="OrderPicker_Display" description-key="OrderPicker_Desc"
           control-type="virtual">
    <type-group name="numbers">
      <type>Whole.None</type>
      <type>Decimal</type>
    </type-group>
    <property name="order" display-name-key="Order_Display" description-key="Order_Desc"
              of-type="SingleLine.Text" usage="bound" required="true" />
    <property name="maxItems" display-name-key="MaxItems_Display"
              of-type-group="numbers" usage="input" default-value="10" />
    <feature-usage>
      <uses-feature name="WebAPI" required="true" />
    </feature-usage>
    <resources>
      <code path="index.ts" order="1" />
      <css path="css/OrderPicker.css" order="1" />
      <platform-library name="React" version="16.14.0" />
      <platform-library name="Fluent" version="9.46.2" />
    </resources>
  </control>
</manifest>
```

## Control

| Attribute | Rule |
| --- | --- |
| `namespace`, `constructor` | Never renamed after the first release |
| `version` | `MAJOR.MINOR.PATCH`. Raise at least PATCH on every release |
| `control-type` | `virtual` for React controls on platform libraries. Changing it does not convert a control |
| `display-name-key`, `description-key` | Keys into `.resx` resources when the control is localized |

## Properties

| `usage` | Meaning |
| --- | --- |
| `bound` | Bound to a column the control can change. Has `formatted`, `security` and `attributes` |
| `input` | Read-only value: a column or a static value set by the maker. `default-value` is allowed |
| `output` | A value the control returns. `of-type="Object"` works only on outputs |

- `of-type` or `of-type-group` sets the data type. A `type-group` lets one property accept several numeric types.
- `Lookup.Simple` works only in model-driven apps. A manifest with a data set wraps `Lookup.Simple` properties inside the `data-set` element.
- Unsupported types: `Lookup.Customer`, `Lookup.Owner`, `Lookup.PartyList`, `Lookup.Regarding`, `Status`, `Status Reason`, `Whole.Duration`, `Whole.Language`, `Whole.TimeZone` and file columns.
- `pfx-default-value` sets a Power Fx default in canvas apps and wins over `default-value`.
- Renaming or removing a property is a breaking change for every form and app that configured it. Add a new property instead.

## Feature Usage

| Manifest | Host supports the feature | Host does not |
| --- | --- | --- |
| `required="true"` | API present, no check needed | Warning at design time, load fails at runtime |
| `required="false"` | API present | API is `null`, the control adapts |
| Not declared | API is `null` | API is `null` |

- `WebAPI` is declared before using `context.webAPI`. It exists only in model-driven apps.
- `uses-feature` applies to model-driven apps.

## Resources

- One `code` element points at `index.ts`.
- `css` files hold only selectors scoped to `.<namespace>\.<constructor>`.
- Platform libraries: React `16.14.0`; Fluent `9.46.2` (any 9.4.0 to 9.46.2) or Fluent `8.29.0` or `8.121.1`. One Fluent version at most.
- Never reference shared libraries through manifest library nodes. Bundle them.
