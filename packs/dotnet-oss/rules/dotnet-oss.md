---
description: Open-source NuGet dependencies only. Commercial packages are never added, revenue-capped and copyleft licenses are flagged.
globs: ["**/*.csproj", "**/*.fsproj", "**/Directory.Packages.props", "**/Directory.Build.props", "**/packages.lock.json"]
---

# Open-Source .NET Dependencies

- Every new package has an OSI-approved license on the exact version added, preferably MIT, Apache-2.0 or BSD. Check it on nuget.org before adding, because licenses change between major versions.
- The tables below win over the license expression. `AutoMapper` 15 lists `RPL-1.5`, which is OSI-approved, and is still commercial.
- GPL and AGPL packages are flagged like revenue-capped ones.
- Never add a commercial package, a package that needs a paid license key, or a major version that moved to a commercial license.
- A commercial package already in the project is reported with a replacement plan, never removed silently.
- A flagged package is added only after the user confirms the license condition fits the organization.
- Pin the last open-source major version only as a bridge with a stated end date, never as the final answer.

## Commercial: Never Add

| Package | Replace with |
| --- | --- |
| `AutoMapper` 15 and later | Hand-written mapping methods, or `Riok.Mapperly` (source generator) |
| `MediatR` 13 and later | Handlers injected and called directly, or `Mediator.SourceGenerator` |
| `MassTransit` 9 and later | `WolverineFx`, `Rebus`, `Paramore.Brighter` or the broker's own SDK. `MassTransit` 8 (Apache-2.0) is a bridge only: no support beyond 2026 is announced |
| `NServiceBus` | `WolverineFx`, `Rebus`, `Paramore.Brighter` |
| `FluentAssertions` 8 and later | xUnit `Assert`, `AwesomeAssertions` or `Shouldly` |
| `EPPlus` 5 and later | `ClosedXML`, `MiniExcel`, `DocumentFormat.OpenXml` |
| `IronPdf`, `Aspose.PDF` | `Microsoft.Playwright` HTML to PDF, `PdfPig` to read PDFs |
| `Aspose.Words`, `Aspose.Cells`, `Aspose.Slides` | `DocumentFormat.OpenXml`, `ClosedXML` |
| `Duende.IdentityServer` | `OpenIddict`, or an external identity provider |
| Syncfusion, Telerik, DevExpress UI suites | `MudBlazor`, `Microsoft.FluentUI.AspNetCore.Components`, `Radzen.Blazor` |
| Xceed (`Extended.Wpf.Toolkit`, Xceed Words) | Built-in WPF controls, `DocumentFormat.OpenXml` |
| Hangfire Pro, Hangfire Ace | `Hangfire.Core` features, or `Quartz` |
| `Z.EntityFramework.Extensions.EFCore` | `ExecuteUpdate` and `ExecuteDelete`, `SqlBulkCopy`, Npgsql binary `COPY`, `linq2db` bulk copy |

## Flag, Not Ban

| Package | Condition |
| --- | --- |
| `QuestPDF` | Free under USD 1M annual gross revenue, and for open-source projects, charities and academia. Public sector bodies and listed companies pay at any revenue |
| `SixLabors.ImageSharp` and other Six Labors packages | Paid as a direct dependency of a for-profit company with USD 1M or more annual gross revenue. Free for open-source software, transitive use and non-profits. A direct reference needs a Six Labors license key at build time. Alternatives: `SkiaSharp`, `Magick.NET`, `NetVips` |
| Duende IdentityServer Community Edition | Under USD 1M revenue and USD 3M capital |
| `EFCore.BulkExtensions` | Dual license, free under USD 1M revenue |
| Syncfusion Community License | Under USD 1M revenue, 5 developers, 10 employees and USD 3M outside capital |
| `PDFsharp` 6.5 and later | AGPL-3.0: network use obliges publishing the source |
| `Polly` majors released after November 16, 2026 | Open Source Maintenance Fee for direct references by companies that earn USD 20,000 or more from the product. Existing versions and use through `Microsoft.Extensions.Http.Resilience` are exempt |

## Free

- `Polly` 8 (BSD-3-Clause) and `Microsoft.Extensions.Http.Resilience` (MIT).
- `Hangfire.Core` (LGPL-3.0), free for commercial use.

For an audit of an existing project and per-library migration notes, use the `dotnet-oss-audit` skill.
