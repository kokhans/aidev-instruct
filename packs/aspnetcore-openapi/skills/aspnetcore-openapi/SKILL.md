---
name: aspnetcore-openapi
description: Sets up and tunes OpenAPI documents in ASP.NET Core with Microsoft.AspNetCore.OpenApi and Swagger UI. Covers document and UI setup, OpenAPI 3.2 and 3.1, endpoint metadata, HTTP QUERY and server-sent events, document, operation and schema transformers, bearer security schemes, build-time document generation and linting. Use when adding or changing the API document, Swagger UI, client generation inputs or OpenAPI checks in CI.
---

# ASP.NET Core OpenAPI

The document comes from `Microsoft.AspNetCore.OpenApi`. Swashbuckle supplies only the Swagger UI assets.

## Setup

```csharp
builder.Services.AddOpenApi();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "v1"));
}
```

- Packages: `Microsoft.AspNetCore.OpenApi` and `Swashbuckle.AspNetCore.SwaggerUi`. Never the full `Swashbuckle.AspNetCore` package or `AddSwaggerGen`.
- `MapOpenApi()` serves `/openapi/{documentName}.json`. The default document name is `v1`. `MapOpenApi("/openapi/{documentName}.yaml")` serves YAML.
- Swagger UI is at `/swagger`. Set `launchUrl` to `swagger` in `launchSettings.json` to open it on run.
- The document and every UI stay Development only. Publish the build-time document instead when consumers need it.
- More documents: `AddOpenApi("v2")` with `ShouldInclude` to pick endpoints, and one `SwaggerEndpoint` per document.
- `IOpenApiDocumentProvider`, keyed by document name, reads a document from code outside a request.

## Version

- Generated documents target OpenAPI 3.2 by default.
- Set `options.OpenApiVersion = OpenApiSpecVersion.OpenApi3_1` only when a client generator or gateway cannot read 3.2. Build-time generation takes `--openapi-version OpenApi3_1` in `OpenApiGenerateDocumentsOptions`.
- `Microsoft.AspNetCore.OpenApi` depends on a new major of `Microsoft.OpenApi`. Transformers written for an older one need namespace and type updates.

## Metadata

- `TypedResults` return types describe responses. Add `Produces`, `ProducesProblem` or `ProducesValidationProblem` only for outcomes the signature cannot express.
- `WithName` sets the operation ID. Names are unique and stable, because client generators use them.
- `WithSummary` and `WithDescription` on endpoints, `WithTags` on groups.
- XML doc comments on handlers and DTOs flow into the document when `GenerateDocumentationFile` is on.
- `[Obsolete]` endpoints and members are marked `deprecated` automatically.
- `[Description]` on DTO properties sets schema descriptions.
- `MapMethods("/search", ["QUERY"], ...)` documents an HTTP QUERY operation. 3.2 documents show it as `query`, 3.0 and 3.1 documents under `x-oai-additionalOperations`.
- `TypedResults.ServerSentEvents` with `SseItem<T>` items documents the event schema as `itemSchema` in 3.2.
- File results document as `type: string, format: binary`.

## Transformers

- `AddDocumentTransformer` for document-wide data: servers, contact, security schemes.
- `AddOperationTransformer` for per-operation changes, such as adding security requirements where `RequireAuthorization` applies.
- `AddSchemaTransformer` for type-level changes.
- Bearer auth: add the security scheme in a document transformer, and a requirement on operations with authorization metadata.
- Transformers read endpoint metadata. They never hard-code paths.

## Build-Time Document

```xml
<PropertyGroup>
  <OpenApiDocumentsDirectory>$(MSBuildProjectDirectory)</OpenApiDocumentsDirectory>
  <OpenApiGenerateDocumentsOnBuild>true</OpenApiGenerateDocumentsOnBuild>
  <OpenApiGenerationEnvironment>Development</OpenApiGenerationEnvironment>
</PropertyGroup>
```

- `Microsoft.Extensions.ApiDescription.Server` writes the document on `dotnet build`. `OpenApiDocumentsDirectory` sets the output folder.
- `OpenApiGenerationEnvironment` sets the environment the app starts in during generation.
- `OpenApiGenerateDocumentsOptions` takes `--document-name` and `--file-name` to limit and rename the output.
- Generation starts the app with the entry assembly `GetDocument.Insider`. Skip registrations that need live services, such as database connections or service defaults, when `Assembly.GetEntryAssembly()?.GetName().Name` is `GetDocument.Insider`.
- Commit the generated document when client code or contract tests depend on it, and fail CI when it changes unexpectedly.
- Lint the document with Spectral (`extends: ["spectral:oas"]`) in CI.

## Review

Flag on review:

- `AddSwaggerGen` or the full `Swashbuckle.AspNetCore` package next to the built-in document.
- `MapOpenApi()` or Swagger UI reachable outside Development.
- Duplicate or missing `WithName` on endpoints that client generators use.
- `Produces` calls that repeat what `TypedResults` already declares.
