---
description: ASP.NET Core integration tests with WebApplicationFactory, test services, test authentication and HTTP contract assertions.
globs: ["**/*Tests/**/*.cs", "**/*Tests.cs", "**/*Tests.csproj"]
---

# ASP.NET Core Integration Tests

## Host

- HTTP endpoints are tested through `WebApplicationFactory<Program>` from `Microsoft.AspNetCore.Mvc.Testing` and its `HttpClient`.
- `Program` from top-level statements is already public. Never add `public partial class Program`.
- One factory per test run, shared through `[assembly: AssemblyFixture(typeof(ApiFactory))]`. Never one per test class.
- The factory runs the `Testing` environment. `UseSetting` in `ConfigureWebHost` overrides configuration that startup reads.

## Dependencies

- Infrastructure the app owns (database, cache, broker) runs for real in a container started by the fixture.
- Third-party HTTP services, `TimeProvider` and other clocks are replaced in `ConfigureTestServices`.
- Tests move time with `FakeTimeProvider.Advance`, never `Task.Delay`.
- Background work exposes a completion signal, or the test polls with a timeout and the test cancellation token.

## Assertions

- Tests assert the HTTP contract first: status code, headers and the problem details body.
- Side effects are checked through the app's services or storage after the response, never through state shared with the app.
- Every protected endpoint has a test for 401 without credentials and 403 with insufficient rights.
- Every endpoint with validation has a test for the 400 validation problem.

For the factory fixture, test authentication and flaky test fixes, use the `aspnetcore-integration-testing` skill.
