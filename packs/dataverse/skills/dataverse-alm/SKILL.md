---
name: dataverse-alm
description: Moves Dataverse solutions between environments with the pac CLI. Covers solution projects (.cdsproj), clone, sync, export, unpack and pack, managed and unmanaged builds, versioning, upgrade imports, deployment settings files for environment variables and connection references, Solution Checker and CI authentication. Use when setting up source control or a pipeline for a Power Platform solution, adding a plug-in or code component to a solution, importing into test or production, or when an import fails on missing values, dependencies or versions.
---

# Dataverse ALM

## References

| File | Covers |
| --- | --- |
| [pac-solution.md](references/pac-solution.md) | `pac solution` commands, flags and when to use each |
| [deployment-settings.md](references/deployment-settings.md) | Deployment settings file, environment variable values, connection references |

## Environments

| Environment | Solution type | Who changes it |
| --- | --- | --- |
| Development | Unmanaged | Makers and developers |
| Build | Unmanaged import, managed export | Pipeline only |
| Test, UAT, production | Managed | Pipeline only |

- Segmented solutions that are developed separately usually need one development environment each.
- A managed solution is a build artifact. It is never edited, unpacked to change, or committed as the source.

## Source Control

1. Create the project once: `pac solution clone --name <UniqueName>` for an existing solution, or `pac solution init --publisher-name <name> --publisher-prefix <prefix>` for a new one.
2. After changes in the development environment, pull them with `pac solution sync`, review the diff and commit.
3. Plug-in and code component projects join the solution project with `pac solution add-reference --path <project folder>`, so one build produces the solution zip.
4. The build restores and builds the `.cdsproj` (`dotnet build` or `msbuild /restore /p:configuration=Release`). Uncomment `SolutionPackageType` in the `.cdsproj` and set `Managed`, `Unmanaged` or `Both`.
5. Commit the unmanaged form only. Committing both managed and unmanaged XML duplicates every change.

- `pac solution clone` creates a project you can add components to. `pac solution export` plus `unpack` only edits what the zip already contains.
- Native Dataverse Git integration and `pac solution clone` write the YAML source control format (`solutions/<name>/solution.yml`). `pac solution pack` detects it from the `solutions/` folder. It needs `pac` 2.4.1 or later.
- Never edit `Customizations.xml` except for ribbons, forms, SiteMap and saved queries. Defining new components by editing solution files is unsupported.
- Generated output stays out of source control: `bin/`, `obj/`, solution zips, and the `bundle.js`, built CSS and `ControlManifest.xml` of code components.

## Versioning

- The solution version in `Solution.xml` is `MAJOR.MINOR.BUILD.REVISION`. The pipeline sets `BUILD` and `REVISION` with `pac solution version --buildversion <n> --revisionversion <n>`.
- Every code component release raises at least its manifest PATCH version (`pac pcf version --strategy manifest`). Model-driven apps keep the cached control otherwise.
- `pac solution import --skip-lower-version` skips the import when the same or a higher version is installed, so a rerun of the pipeline does nothing.

## Import

```shell
pac auth create --name test --environment https://contoso-test.crm.dynamics.com --githubFederated --tenant <tenant id> --applicationId <app id>
pac solution import --path out/Contoso_managed.zip --settings-file deploy/test.settings.json --async --activate-plugins
```

- `--async` for large solutions. `--max-async-wait-time` defaults to 60 minutes.
- `--stage-and-upgrade` when the release deletes components, otherwise the removed tables, columns or steps stay in the target.
- Base solutions install before the solutions that depend on them. An import that lacks a base solution fails and names it.

## Checks

- `pac solution check --path <zip> --geo <geo> --outputDirectory <dir>` runs Solution Checker. The pipeline fails on Critical and High results.
- `--ruleLevelOverride` lowers a rule only with a recorded reason.

## CI Authentication

| Runner | `pac auth create` flags |
| --- | --- |
| GitHub Actions | `--githubFederated --tenant --applicationId` |
| Azure Pipelines | `--azureDevOpsFederated --tenant --applicationId` |
| Azure host with managed identity | `--managedIdentity` |
| Anything else | `--applicationId --clientSecret --tenant`, secret from the CI secret store |

The service principal is an application user in every target environment, with only the roles the import needs.
