---
name: aspnetcore-efcore-postgresql
description: Builds the database part of ASP.NET Core integration tests on PostgreSQL with Testcontainers, EF Core migrations and Respawn. Covers the factory fixture that starts one container per run, applies migrations, resets data between tests, and seeding and asserting through EF Core. Use when integration tests of an ASP.NET Core app with EF Core and PostgreSQL need a database, or when database tests are slow, flaky or leak data between tests.
with: ["efcore-postgresql"]
---

# ASP.NET Core Integration Tests with PostgreSQL

## Packages

```xml
<ItemGroup>
  <PackageReference Include="Testcontainers.PostgreSql" />
  <PackageReference Include="Respawn" />
</ItemGroup>
```

Both are open source. The image tag matches the production PostgreSQL major version.

## Factory Fixture

```csharp
[assembly: AssemblyFixture(typeof(ApiFactory))]

public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18-alpine").Build();
    private Respawner _respawner = null!;

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();

        using (var scope = Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.MigrateAsync();
        }

        await using var connection = new NpgsqlConnection(_postgres.GetConnectionString());
        await connection.OpenAsync();
        _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = ["public"],
            TablesToIgnore = ["__EFMigrationsHistory"],
        });
    }

    public async Task ResetDatabaseAsync()
    {
        await using var connection = new NpgsqlConnection(_postgres.GetConnectionString());
        await connection.OpenAsync();
        await _respawner.ResetAsync(connection);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", _postgres.GetConnectionString());
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}
```

- The container starts before `Services` is first touched, so the host reads the container's connection string.
- Migrations run once. A failing migration fails the whole run, which is intended.
- Tables filled by migrations with reference data go in `TablesToIgnore`, or the reset wipes them.

## Isolation

```csharp
public sealed class CreateOrderTests(ApiFactory factory) : IAsyncLifetime
{
    public async ValueTask InitializeAsync() => await factory.ResetDatabaseAsync();
    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
```

- Reset per test class or per test. Classes that reset the shared database run serially: put them in one collection, or turn off parallelization for the assembly.
- Alternative to resets: every test creates rows with unique keys and asserts only on its own rows. That keeps full parallelism and suits large suites.

## Seeding and Assertions

- Seed through the API, or through a scoped `AppDbContext` from `factory.Services.CreateScope()`.
- Assert database state through a new scope and context after the response. Never reuse the seeding context, whose tracked entities hide what the app wrote.
- Assertions on timestamps compare UTC values. Npgsql returns `timestamptz` as UTC `DateTime` or zero-offset `DateTimeOffset`.

## Speed

- One container per run. Never one per test class.
- Resetting with Respawn deletes rows and keeps the schema, which is faster than dropping the database and migrating again.
