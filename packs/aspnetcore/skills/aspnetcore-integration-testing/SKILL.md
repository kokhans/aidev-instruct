---
name: aspnetcore-integration-testing
description: Sets up and writes ASP.NET Core integration tests with xUnit v3 and WebApplicationFactory. Covers the test project, one shared factory fixture, configuration overrides, fake external services and clocks, test authentication, assertions on problem details and fixes for slow or flaky suites. Use when adding the first integration test to a .NET API, testing auth or validation behavior end to end, or when integration tests are slow or flaky.
---

# ASP.NET Core Integration Testing

## Test Project

```xml
<PropertyGroup>
  <OutputType>Exe</OutputType>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="xunit.v3" />
  <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" />
  <PackageReference Include="Microsoft.Extensions.TimeProvider.Testing" />
</ItemGroup>
```

- Versions live in `Directory.Packages.props`. The project also references the web project.
- `Program` from top-level statements is already public through a source generator. Do not add `public partial class Program`.
- Containers for owned infrastructure need Docker or a compatible runtime locally and in CI.

## Factory Fixture

One factory for the whole run:

```csharp
[assembly: AssemblyFixture(typeof(ApiFactory))]

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public FakeTimeProvider Time { get; } = new(DateTimeOffset.Parse("2026-01-01T00:00:00Z"));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Payments:BaseUrl", "https://payments.test");
        builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<TimeProvider>(Time);
            services.AddSingleton<IPaymentGateway, FakePaymentGateway>();
        });
    }
}
```

- `UseSetting` overrides configuration early enough for values read during startup.
- `ConfigureTestServices` runs after the app's registrations, so its registrations win.
- When the fixture starts containers, it implements `IAsyncLifetime` and starts them in `InitializeAsync`, before anything touches `Services` or `CreateClient`.
- Typed `HttpClient` dependencies are replaced with a fake `HttpMessageHandler` through `AddHttpClient<T>().ConfigurePrimaryHttpMessageHandler(...)`, not by mocking the client.

## Tests

```csharp
public sealed class CreateOrderTests(ApiFactory factory)
{
    [Fact]
    public async Task Rejects_missing_customer_with_validation_problem()
    {
        var ct = TestContext.Current.CancellationToken;
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/orders", new { total = 10m }, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>(ct);
        Assert.NotNull(problem);
        Assert.Contains("CustomerId", problem.Errors.Keys);
    }
}
```

- Assert on the HTTP contract first (status, headers, problem details), then on side effects.
- Move the clock with `factory.Time.Advance(...)` instead of waiting.
- `CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false })` when a test checks redirects.
- `WithWebHostBuilder` creates a second host with different settings. Use it rarely: every call starts a new app.

## Authentication

- Prefer real tokens when the app validates JWTs locally: `dotnet user-jwts` keys or a test signing key configured for the `Testing` environment.
- Otherwise register a test scheme in `ConfigureTestServices`: an `AuthenticationHandler<AuthenticationSchemeOptions>` that builds a `ClaimsPrincipal` from a request header, added with `AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { })`.
- Policies that name a specific scheme also need the test scheme, or the test proves nothing about authorization.
- Every protected endpoint has a test for 401 without credentials and 403 with insufficient claims.

## Speed and Flakiness

- One factory and one set of containers per run. Never one per test class.
- Never `Task.Delay` to wait for background work. Expose a completion signal or poll with a timeout and the test cancellation token.
- `dotnet test` runs up to one test project per processor in parallel (`--max-parallel-test-modules`), and each project with containers starts its own. Budget CI memory for that.
- A test that fails only in CI usually depends on time zone, culture or ordering. Fix the dependency, do not retry.
