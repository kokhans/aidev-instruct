---
name: aspnetcore-minimal-api
description: Builds and reviews ASP.NET Core minimal API endpoints with TypedResults, route groups, built-in DataAnnotations validation including async rules, ProblemDetails for every error, authorization, rate limiting, options validation and health checks. Use when adding or changing HTTP endpoints, request or response DTOs, error handling, middleware order or auth rules in a .NET web app.
---

# ASP.NET Core Minimal APIs

## References

| File | Covers |
| --- | --- |
| [validation.md](references/validation.md) | `AddValidation`, attributes, cross-field and async rules, localization |
| [errors.md](references/errors.md) | ProblemDetails setup, exception handlers, status mapping, binding failures |
| [security.md](references/security.md) | Authentication, authorization, CORS, antiforgery, rate limiting |

Read only the references the task touches.

## Endpoint Checklist

1. Route lives in a `MapGroup` that already carries the prefix, tags and authorization.
2. Request body is a record DTO with validation attributes. Route and query values are typed and constrained (`{id:guid}`).
3. Handler parameters: route and query values, body DTO, services, `CancellationToken` last.
4. Return type lists every outcome: `Results<Ok<OrderDto>, NotFound>`. Use `TypedResults`, not `Results`.
5. Data access returns the response DTO, not a persistence entity.
6. Endpoint has `WithName` when another endpoint links to it, and `WithSummary`.
7. Authorization is explicit: a policy on the group or endpoint, or `AllowAnonymous()`.
8. An integration test covers success, validation failure, not found and forbidden.

## Example

```csharp
var orders = app.MapGroup("/orders")
    .WithTags("Orders")
    .RequireAuthorization("orders");

orders.MapGet("/{id:guid}", GetOrder).WithName("GetOrder").WithSummary("Get one order");
orders.MapPost("/", CreateOrder).WithSummary("Create an order");

static async Task<Results<Ok<OrderDto>, NotFound>> GetOrder(
    Guid id, OrderService orders, CancellationToken ct)
{
    var order = await orders.FindAsync(id, ct);
    return order is null ? TypedResults.NotFound() : TypedResults.Ok(order);
}

static async Task<CreatedAtRoute<OrderDto>> CreateOrder(
    CreateOrderRequest request, OrderService orders, CancellationToken ct)
{
    var order = await orders.CreateAsync(request, ct);
    return TypedResults.CreatedAtRoute(order, "GetOrder", new { id = order.Id });
}

public sealed record CreateOrderRequest(
    [Required, StringLength(64)] string CustomerId,
    [Range(0.01, 1_000_000)] decimal Total);

public sealed record OrderDto(Guid Id, string CustomerId, decimal Total);
```

## Program Setup

Services:

```csharp
builder.Services.AddProblemDetails();
builder.Services.AddValidation();
builder.Services.AddHealthChecks();
builder.Services.AddOptions<PaymentOptions>()
    .BindConfiguration("Payments")
    .ValidateDataAnnotations()
    .ValidateOnStart();
```

Pipeline order:

1. `UseForwardedHeaders()` first when the app runs behind a proxy.
2. `UseExceptionHandler()` and `UseStatusCodePages()`, so every later failure becomes problem details.
3. `UseHttpsRedirection()` and `UseHsts()` outside Development when the app terminates TLS itself.
4. `UseCors()` before authentication when browsers call from another origin.
5. `UseAuthentication()`, `UseAuthorization()`, then `UseRateLimiter()` when limits depend on the user.
6. Endpoints: groups and `MapHealthChecks`.

`WebApplication` adds routing, authentication and authorization middleware on its own. Call them explicitly only to control their order.

## Options

- One options class per configuration section, with DataAnnotations or an `IValidateOptions<T>` implementation for rules across properties.
- Source-generated validators (`[OptionsValidator]` on a partial class implementing `IValidateOptions<T>`) for trimmed or native AOT apps.
- `ValidateOnStart()` on every options registration.

## Health Checks

- Liveness: `MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).ShortCircuit()` runs no checks and proves the process responds.
- Readiness: tag dependency checks with `"ready"` and map `/health/ready` with a predicate on that tag.
- `[ShortCircuit]` on a handler, or `ShortCircuit()` on the endpoint, skips the middleware after routing.
- Health responses never include connection strings or exception details.

## Review

Flag on review:

- `Results.*` instead of `TypedResults.*`, or `IResult` return types that hide outcomes.
- Persistence entities returned from endpoints.
- Manual `if (string.IsNullOrEmpty(...)) return BadRequest` checks that an attribute covers.
- Errors returned as plain strings or custom JSON shapes instead of problem details.
- `IConfiguration["..."]` reads outside startup.
- Missing `CancellationToken` on handlers that do I/O.
- Endpoints without explicit authorization metadata when no fallback policy exists.
