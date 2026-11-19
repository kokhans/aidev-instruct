# Code Component ALM

## Build Modes

| Command | Development build | Release build |
| --- | --- | --- |
| `npm start watch` | Always | Never |
| `npm run build` | Default | `npm run build -- --buildMode production` |
| `pac pcf push` | Default, or `PcfBuildMode` `development` | `PcfBuildMode` `production` in the `.pcfproj` |
| `msbuild` on a `.cdsproj` | Default | `msbuild /p:configuration=Release` |

- Development builds are large and slow, can be blocked on import, and fail Solution Checker with the `eval` rule. Only release builds reach Dataverse.
- `PcfBuildMode` goes in the `.pcfproj` `PropertyGroup` next to `OutputPath`:

```xml
<PcfBuildMode>production</PcfBuildMode>
```

## Solution Project

```shell
pac solution init --publisher-name Contoso --publisher-prefix contoso
pac solution add-reference --path ../OrderPicker
msbuild /restore /p:configuration=Release
```

- The publisher name and prefix match the publisher used in every environment.
- One `.cdsproj` can reference many `.pcfproj` projects; a `.pcfproj` holds one control.
- `SolutionPackageType` in the `.cdsproj` selects `Managed`, `Unmanaged` or `Both`.
- `pac pcf push` puts the control in the unmanaged `PowerAppsTools_<prefix>` solution, or in `--solution-unique-name`. Use it only in a development environment, then add the control to the real solution with the same publisher.
- Source control excludes `node_modules`, `generated`, `out`, `bin` and `obj`, which the `pac pcf init` `.gitignore` already lists.

## Solution Strategies

| Strategy | Use when |
| --- | --- |
| Segmented: controls in their own solution | Controls have their own release cycle or serve several environments and teams |
| Single: controls inside the app's solution | Controls change with the app |

- A segmented control solution installs before every solution that depends on it.
- When a mixed solution is unpacked with SolutionPackager, the pipeline builds each control and copies `bundle.js`, its CSS and `ControlManifest.xml` into `Controls/<prefix>_<namespace>.<name>/` before packing. Only the `*.data.xml` files are committed there.

## Versioning

- Control version `MAJOR.MINOR.PATCH` in the manifest; solution version `MAJOR.MINOR.BUILD.REVISION` in `Solution.xml`.
- Keep MAJOR and MINOR of the control and the solution in step. The pipeline sets PATCH with `pac pcf version --patchversion <n>`, or `pac pcf version --strategy manifest` raises it by one.
- Model-driven apps load the new version once the import raises the manifest version.
- Canvas apps keep a copy of the control. Makers open each app, accept the code component update, save and publish. One app cannot run two versions of a control.
