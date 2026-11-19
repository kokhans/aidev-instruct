---
description: OpenAPI documents from Microsoft.AspNetCore.OpenApi, Swagger UI and endpoint metadata in ASP.NET Core.
globs: ["**/*.cs", "**/*.csproj", "**/launchSettings.json"]
---

# ASP.NET Core OpenAPI

## Document

- `Microsoft.AspNetCore.OpenApi` builds the document: `AddOpenApi()` and `MapOpenApi()`. Never `AddSwaggerGen` or the full `Swashbuckle.AspNetCore` package.
- Documents default to OpenAPI 3.2. Set `OpenApiVersion` to `OpenApiSpecVersion.OpenApi3_1` only for tools that cannot read 3.2.
- `MapOpenApi()` and every UI are mapped only in Development. Consumers outside it get the build-time document.
- Transformers use the `Microsoft.OpenApi` types of the version `Microsoft.AspNetCore.OpenApi` depends on. Code written for an older major needs namespace and type updates.

## Swagger UI

- `Swashbuckle.AspNetCore.SwaggerUi` renders the built-in document: `app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "v1"))`.
- One `SwaggerEndpoint` per document. `launchUrl` `swagger` in `launchSettings.json` opens it on run.

## Metadata

- `TypedResults` return types describe responses. `Produces`, `ProducesProblem` and `ProducesValidationProblem` only for outcomes the signature cannot express.
- `WithName` sets a unique, stable operation ID, because client generators use it.
- Endpoints carry `WithSummary`, groups carry `WithTags`. XML doc comments flow into the document when `GenerateDocumentationFile` is on.
- `[Obsolete]` marks an endpoint or member `deprecated` in the document.
- Transformers read endpoint metadata and never hard-code paths.

For transformers, security schemes and build-time documents, use the `aspnetcore-openapi` skill.
