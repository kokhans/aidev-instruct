# `pac solution` Commands

Every command that talks to Dataverse takes `--environment <id or url>`. Without it, the active auth profile's environment is used.

## Project and Source

| Command | Use |
| --- | --- |
| `pac solution init --publisher-name <name> --publisher-prefix <prefix>` | New solution project. The prefix is 2 to 8 letters and digits, starts with a letter and never starts with `mscrm` |
| `pac solution clone --name <UniqueName>` | Project from an existing solution. `--packagetype` defaults to `Both`; pass `Unmanaged` for a source repository |
| `pac solution sync` | Pull the environment's current state into an existing project |
| `pac solution add-reference --path <folder>` | Add a plug-in or code component project to the `.cdsproj` |
| `pac solution add-solution-component --solutionUniqueName <name> --component <name or id> --componentType <type>` | Add an existing component to an unmanaged solution in Dataverse. `--AddRequiredComponents` adds its dependencies |
| `pac solution create-settings --solution-zip <zip> --settings-file <json>` | Deployment settings template. `--solution-folder` reads an unpacked folder instead |

`--include` on `clone`, `sync` and `export` adds organization settings such as `general` or `autonumbering`. Settings are environment-wide, so include them only when the solution owns them.

## Zip Files

| Command | Use |
| --- | --- |
| `pac solution export --name <UniqueName> --path <zip>` | Export a zip. `--managed` exports as managed |
| `pac solution unpack --zipfile <zip> --folder <dir>` | Extract to source. `--packagetype` defaults to `Unmanaged` |
| `pac solution pack --zipfile <zip> --folder <dir>` | Build a zip from source. `--packagetype Managed` needs a folder unpacked with `Both` |
| `pac solution version --buildversion <n> --revisionversion <n>` | Set the version in `Solution.xml`. `--patchversion` is deprecated and ignored |
| `pac solution online-version --solution-name <name> --solution-version <v>` | Set the version of the solution in Dataverse |

`--localize` on `clone`, `sync`, `unpack` and `pack` moves display strings into `.resx` files, which keeps translations reviewable.

## Environment

| Command | Use |
| --- | --- |
| `pac solution import --path <zip>` | Import. Without `--path`, the current folder must hold a `.cdsproj`; with `SolutionPackageType` `Both` the managed zip is used |
| `pac solution upgrade --solution-name <name>` | Apply a staged upgrade |
| `pac solution publish` | Publish all customizations |
| `pac solution list` | Installed solutions. `--json` for scripts |
| `pac solution delete --solution-name <name>` | Uninstall. Deleting a managed solution deletes the data in its custom tables and columns |
| `pac solution check --path <zip>` | Solution Checker. `--ruleSet` defaults to `Solution Checker`; use `AppSource Certification` for AppSource |

## Import Flags

| Flag | Effect |
| --- | --- |
| `--settings-file <json>` | Environment variable values and connection references |
| `--async`, `--max-async-wait-time <minutes>` | Asynchronous import, default wait 60 minutes |
| `--stage-and-upgrade` | Import and upgrade in one step, deleting components no longer in the solution |
| `--import-as-holding` | Import as a holding solution for a later `pac solution upgrade` |
| `--activate-plugins` | Activate plug-in steps and workflows after import |
| `--publish-changes` | Publish after a successful import |
| `--skip-lower-version` | Skip when the same or a higher version is installed |
| `--skip-dependency-check` | Skip the check against dependencies flagged as product updates |
| `--force-overwrite` | Overwrite unmanaged customizations in the target |
| `--targetversion` (export, clone) | Deprecated and ignored |

## Other Command Groups

| Command | Use |
| --- | --- |
| `pac auth create`, `list`, `select`, `who` | Auth profiles. `--deviceCode` where no browser is available |
| `pac modelbuilder build --outdirectory <dir> --settingsTemplateFile <json>` | Early-bound classes. `--writesettingsTemplateFile` writes `builderSettings.json` on the first run; the two flags never combine |
| `pac plugin init`, `pac plugin push` | Plug-in projects and updates |
| `pac pcf init`, `pac pcf push`, `pac pcf version` | Code components |
