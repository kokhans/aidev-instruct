---
description: ASP.NET Core minimal APIs for endpoints, validation, ProblemDetails, auth, options and health checks.
globs: ["**/*.cs", "**/appsettings*.json"]
---

# ASP.NET Core

## Endpoints

- Minimal APIs. Handlers return `TypedResults`. A handler with several outcomes declares `Results<Ok<T>, NotFound, ...>`, which also documents every outcome.
- `MapGroup` shares a route prefix, tags, authorization and filters across related endpoints.
- Request and response bodies are record DTOs. Persistence entities never cross the HTTP boundary.
- Route values carry constraints: `{id:guid}`, `{page:int:min(1)}`.
- Handlers take `CancellationToken` and pass it on. `[AsParameters]` groups many route and query values.
- C# unions bind in JSON bodies and responses, never in route, query, header or form values.

## Validation

- `builder.Services.AddValidation()` validates query, header and body parameters before the handler runs.
- Rules are `System.ComponentModel.DataAnnotations` attributes on DTOs. Cross-field rules implement `IValidatableObject`.
- Rules that need I/O derive from `AsyncValidationAttribute` or implement `IAsyncValidatableObject`, and honor the `CancellationToken`.
- Types the source generator cannot reach from an endpoint signature get `[ValidatableType]`.
- Failed validation returns a 400 problem details response with field errors. Handlers never repeat checks the attributes already make.

## Errors

- `AddProblemDetails()`, `UseExceptionHandler()` and `UseStatusCodePages()`: every error body is `application/problem+json`.
- Expected failures return typed results: `NotFound`, `Conflict`, `TypedResults.Problem`, `TypedResults.ValidationProblem`. Never throw to produce them.
- `IExceptionHandler` implementations map exceptions the app cannot avoid to status codes.
- Problem responses outside Development never contain exception messages or stack traces.

## Auth

- A fallback authorization policy requires an authenticated user. Public endpoints opt out with `AllowAnonymous()`.
- Policies are named in `AddAuthorizationBuilder()` and applied with `RequireAuthorization("policy")` on groups or endpoints.
- Resource checks call `IAuthorizationService.AuthorizeAsync`. No ad hoc claim checks in handlers.
- Bearer tokens for APIs called by other services or SPAs on another origin. Cookies for same-site browser apps.

## Configuration

- Settings bind to options classes: `AddOptions<T>().BindConfiguration("Section").ValidateDataAnnotations().ValidateOnStart()`. Bad configuration fails at startup.
- Services inject `IOptions<T>`, or `IOptionsMonitor<T>` for values that reload. Never `IConfiguration` outside startup.
- Secrets come from user secrets in development and environment variables or a vault in production. Never from `appsettings.json`.

## Health

- `AddHealthChecks()` registers a check per dependency. A liveness endpoint runs no dependency checks, a readiness endpoint runs them.
- Health endpoints use `ShortCircuit()`, which skips the rest of the middleware pipeline.
- Health responses never include connection strings or exception details.

For endpoint examples, validation, errors and security setup, use the `aspnetcore-minimal-api` skill.
