# Security

## Authentication

- JWT bearer for APIs: `AddAuthentication().AddJwtBearer()`, configured from the `Authentication:Schemes:Bearer` section. Authority and audience are always validated.
- Cookies for same-site browser apps. Cookie auth returns 401 and 403 to API endpoints instead of redirecting to a login page.
- Local tokens during development come from `dotnet user-jwts create`.
- Identity data the app owns uses ASP.NET Core Identity. Never hand-rolled password hashing.

## Authorization

```csharp
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
    .AddPolicy("orders", policy => policy.RequireClaim("scope", "orders"));
```

- The fallback policy protects every endpoint without explicit metadata. `AllowAnonymous()` marks public ones.
- Policies are named and declared once. Endpoints and groups reference them with `RequireAuthorization("name")`.
- Attributes implementing `IAuthorizationRequirementData` carry their own requirements and work on endpoints, controllers and SignalR hubs.
- Rules that depend on the resource (owner, tenant) use `IAuthorizationService.AuthorizeAsync(user, resource, policy)` in the handler and return `TypedResults.Forbid()` on failure.
- Return 404 instead of 403 when revealing that a resource exists is itself a leak.
- Tenant and owner filters also apply in the query, not only after loading.

## CORS

- `AddCors` with a named policy that lists exact origins. Never `AllowAnyOrigin` together with credentials.
- `UseCors()` runs before authentication. Apply the policy to the groups that need it with `RequireCors("name")`.
- Same-origin apps need no CORS policy.

## Antiforgery

- Endpoints that bind forms (`[FromForm]`, `IFormFile`) validate antiforgery tokens through `AddAntiforgery()` and `UseAntiforgery()`.
- `DisableAntiforgery()` only on form endpoints authenticated by bearer tokens, which browsers do not attach on their own.
- JSON endpoints with cookie auth rely on `SameSite` cookies plus a CORS policy that rejects foreign origins.

## Rate Limiting

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("api", limiter =>
    {
        limiter.PermitLimit = 100;
        limiter.Window = TimeSpan.FromMinutes(1);
    });
});

app.UseRateLimiter();
app.MapGroup("/api").RequireRateLimiting("api");
```

- Login, token, password reset and sign-up endpoints always have a strict limiter.
- Partition by user ID for authenticated traffic and by client IP for anonymous traffic.
- Behind a proxy, `UseForwardedHeaders` with `KnownProxies` or `KnownIPNetworks` set runs first, so the client IP is real.
- `OnRejected` copies `MetadataName.RetryAfter` to the `Retry-After` header.

## Transport and Headers

- HTTPS only. `UseHsts()` outside Development when the app terminates TLS.
- Request size limits stay at their defaults unless an endpoint needs more. Raise them per endpoint, not globally.
- Never return stack traces, SQL or internal IDs of other tenants in any response.
