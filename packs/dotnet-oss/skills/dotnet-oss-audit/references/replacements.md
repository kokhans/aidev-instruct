# Replacements

License facts as of November 2026. Recheck the license of the exact version before acting.

## Commercial Packages

| Package | Commercial from | Last open-source line | Replacement | Effort | Notes |
| --- | --- | --- | --- | --- | --- |
| `AutoMapper` | 15.0 | 14.x | Hand-written mapping methods or `Riok.Mapperly` (Apache-2.0) | Medium | Mapperly generates mappings at compile time and reports unmapped members as diagnostics |
| `MediatR` | 13.0 | 12.x | Direct handler calls through DI, or `Mediator.SourceGenerator` (MIT) | Medium | Pipeline behaviors become decorators or endpoint filters. Notifications become explicit calls or a channel |
| `MassTransit` | 9.0 | 8.x (Apache-2.0), no support beyond 2026 announced | `WolverineFx` (MIT), `Rebus` (MIT), `Paramore.Brighter` (MIT), or `Azure.Messaging.ServiceBus` and `RabbitMQ.Client` directly | Large | Map sagas, outbox and retry policies before picking. Wolverine and Brighter both ship an outbox |
| `NServiceBus` | Always | None | Same as MassTransit | Large | Free for development, paid per endpoint in production |
| `FluentAssertions` | 8.0 | 7.x (Apache-2.0) | xUnit `Assert`, `AwesomeAssertions` (Apache-2.0 community fork), `Shouldly` (BSD-3-Clause) | Small with `AwesomeAssertions` | Moving to `AwesomeAssertions` is mostly a package and namespace swap |
| `EPPlus` | 5.0 | 4.x | `ClosedXML` (MIT), `MiniExcel` (Apache-2.0) for streaming large files, `DocumentFormat.OpenXml` (MIT) for full control | Medium | Version 5 and later need a commercial license for any commercial use |
| `IronPdf` | Always | None | `Microsoft.Playwright` (MIT) to print HTML to PDF, `PdfPig` (Apache-2.0) to read and extract | Medium | Playwright needs a browser in the runtime image |
| `Aspose.*` | Always | None | `DocumentFormat.OpenXml`, `ClosedXML`, `PdfPig` | Medium to large | Format conversion such as DOCX to PDF has no full open-source equal in .NET. Say so in the plan |
| `Duende.IdentityServer` | Always (community edition capped) | `IdentityServer4`, unmaintained | `OpenIddict` (Apache-2.0), or an external identity provider | Large | Never fall back to `IdentityServer4`: it gets no security fixes |
| Syncfusion, Telerik, DevExpress | Always | None | `MudBlazor` (MIT), `Microsoft.FluentUI.AspNetCore.Components` (MIT), `Radzen.Blazor` (MIT) | Large | Replace screen by screen. Grids and charts take most of the effort |
| Xceed | Always for commercial use | None | Built-in WPF controls, `DocumentFormat.OpenXml` | Medium | |
| Hangfire Pro, Hangfire Ace | Always | None | `Hangfire.Core` (LGPL-3.0) features, `Quartz` (Apache-2.0) | Medium | Batches (Pro) and throttling (Ace) become explicit job continuations or a `Channel<T>` |
| `Z.EntityFramework.Extensions.EFCore` | Always | None | EF Core `ExecuteUpdate` and `ExecuteDelete`, `SqlBulkCopy`, Npgsql `BeginBinaryImport`, `linq2db` (MIT) bulk copy | Medium | Set-based updates and deletes need no library at all |

## Flagged Packages

| Package | Free when | Otherwise |
| --- | --- | --- |
| `QuestPDF` | Annual gross revenue under USD 1M, open-source projects, charities and academia. Never public sector bodies or listed companies | Professional or Enterprise license, or `Microsoft.Playwright` HTML to PDF |
| `SixLabors.ImageSharp`, `SixLabors.Fonts`, `SixLabors.ImageSharp.Drawing` | Open-source or source-available software, a transitive dependency, a non-profit, or a for-profit company under USD 1M annual gross revenue. Direct references need a license key at build time, free for community use | Commercial license, or `SkiaSharp` (MIT), `Magick.NET` (Apache-2.0), `NetVips` (MIT) |
| Duende IdentityServer Community Edition | Revenue under USD 1M and outside capital under USD 3M | Paid license, or `OpenIddict` |
| `EFCore.BulkExtensions` | Revenue under USD 1M, non-profit or open-source use | Commercial license, or the EF Core and provider APIs above |
| Syncfusion Community License | Revenue under USD 1M, at most 5 developers and 10 employees, outside capital under USD 3M | Paid license, or the Blazor libraries above |
| `PDFsharp`, `PDFsharp-MigraDoc` 6.5 and later | AGPL-3.0 obligations are acceptable | Earlier MIT 6.x versions as a bridge, or `Microsoft.Playwright` |
| `AutoMapper`, `MediatR` community license | Revenue under USD 5M, non-profits, education and non-production use | Still treated as commercial: the community license needs registration and depends on revenue |

## Free

| Package | License |
| --- | --- |
| `Polly`, `Polly.Core` 8.x | BSD-3-Clause. Majors released after November 16, 2026 ask an Open Source Maintenance Fee for direct references by companies that earn USD 20,000 or more from the product |
| `Microsoft.Extensions.Http.Resilience` | MIT |
| `Hangfire.Core` and its storage packages | LGPL-3.0, free for commercial use |
| `MassTransit` 8.x | Apache-2.0, no support beyond 2026 announced |
| `FluentAssertions` 7.x | Apache-2.0, bug fixes only |
