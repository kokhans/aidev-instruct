# Errors

Every error response is RFC 9457 problem details (`application/problem+json`).

## Setup

```csharp
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<UpstreamFailureHandler>();

app.UseExceptionHandler();
app.UseStatusCodePages();
```

- `AddProblemDetails()` registers `IProblemDetailsService`. The exception handler, status code pages, validation and `TypedResults.Problem` all write through it.
- `UseStatusCodePages()` turns empty 4xx and 5xx responses, such as 401, 403 and 404, into problem details.
- `CustomizeProblemDetails` in `AddProblemDetails` adds fields every response needs, such as a trace ID. Never exception text.
- The developer exception page shows details in Development. Other environments return a generic 500 body.

## Expected Failures

| Situation | Result |
| --- | --- |
| Input fails attributes | Automatic 400 from validation |
| Input valid but rule fails | `TypedResults.ValidationProblem(errors)` or `TypedResults.Problem(statusCode: 422)` |
| Resource missing | `TypedResults.NotFound()` |
| Caller lacks rights to this resource | `TypedResults.Forbid()` |
| State conflict, duplicate, stale version | `TypedResults.Conflict()` or `TypedResults.Problem(statusCode: 409, title: ...)` |
| Too many requests | 429 from the rate limiter |

Return these as typed results. Do not throw exceptions to produce them.

## Exception Handlers

`IExceptionHandler` maps exceptions the app cannot avoid, such as a failing upstream service:

```csharp
internal sealed class UpstreamFailureHandler(IProblemDetailsService problems) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not HttpRequestException)
        {
            return false;
        }

        context.Response.StatusCode = StatusCodes.Status502BadGateway;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            Exception = exception,
            ProblemDetails = { Title = "A dependency failed. Try again later." },
        });
    }
}
```

- Handlers run in registration order. Return `false` for exceptions they do not own.
- No catch-all handler that turns every exception into 400.

## Binding Failures

- Malformed JSON or unparseable route and query values produce 400 problem details.
- Endpoint filters run even when binding fails, so a filter sees `HttpContext.Response.StatusCode` 400 and can replace that response.
- In Development, binding failures throw `BadHttpRequestException` by default. Set `RouteHandlerOptions.ThrowOnBadRequest` to `false` to see the same 400 the filter sees.
