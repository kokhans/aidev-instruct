---
name: dotnet-oss-audit
description: Audits the NuGet dependencies of a .NET repository for commercial, revenue-capped and copyleft licenses, and writes a replacement plan for each finding. Use when asked for a license or dependency audit, before adding a package whose license is unclear, when a package moves to a new major version, or when AutoMapper, MediatR, MassTransit, NServiceBus, FluentAssertions, EPPlus, IronPDF, Aspose, Duende IdentityServer, Syncfusion, Telerik, DevExpress, Xceed, Hangfire Pro, Entity Framework Extensions, QuestPDF, ImageSharp or PDFsharp appears in a project.
---

# .NET Open-Source Audit

The audit reports. It never removes or upgrades a package without the user's go-ahead.

## Workflow

1. List every package with its resolved version: `dotnet package list --include-transitive --format json`. Read `Directory.Packages.props` too, because `GlobalPackageReference` items and centrally pinned versions live there.
2. Match each package against the tables in the `dotnet-oss` rule. Match on the package ID prefix: `Aspose.*`, `Syncfusion.*`, `Telerik.*`, `DevExpress.*`, `Xceed.*`, `Hangfire.Pro.*`, `Hangfire.Ace.*`, `Z.EntityFramework.*`, `SixLabors.*`.
3. For every other package, read the license expression of the resolved version on nuget.org. A license URL or license file instead of an SPDX expression needs a manual read.
4. Treat a version boundary as the finding: `AutoMapper` 14 is open source, `AutoMapper` 15 is commercial. Record the last open-source version.
5. For transitive findings, run `dotnet nuget why <id>` and name the direct package that pulls it in.
6. Write the report below. Take the replacement and its effort from [replacements.md](references/replacements.md).

## Report

| Package | Version | License | Category | Direct or via | Replacement | Effort |
| --- | --- | --- | --- | --- | --- | --- |

- Category is `commercial`, `flagged` or `unclear`.
- Effort is `small` (configuration or a few call sites), `medium` (one feature area) or `large` (cross-cutting).
- Order findings by category, then effort.
- End with the bridge decisions: which findings stay pinned on an open-source version, and until when.

## Rules

- A license key, a license registration call such as `QuestPDF.Settings.License`, or a nag message at run time marks a package as commercial or flagged, whatever its NuGet metadata says.
- "Source available" is not open source.
- A package with no license metadata is `unclear` until its repository license is read.
- Dual-licensed packages are `flagged` with the condition that makes them free.
