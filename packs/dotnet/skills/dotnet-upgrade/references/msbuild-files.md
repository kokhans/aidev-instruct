# Shared Build Files

Target shapes for the files the `dotnet-build` and `dotnet-packages` rules describe. Versions are examples: use the latest stable releases.

## `global.json`

```json
{
  "sdk": {
    "version": "11.0.100",
    "rollForward": "latestFeature"
  },
  "test": {
    "runner": "Microsoft.Testing.Platform"
  }
}
```

With committed `packages.lock.json` files, `rollForward` is `disable`.

## `Directory.Build.props`

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net11.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisLevel>latest</AnalysisLevel>
    <AnalysisMode>Recommended</AnalysisMode>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);CS1591</NoWarn>
    <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
  </PropertyGroup>
  <PropertyGroup Condition="'$(CI)' == 'true'">
    <ContinuousIntegrationBuild>true</ContinuousIntegrationBuild>
  </PropertyGroup>
  <PropertyGroup Condition="$(MSBuildProjectName.EndsWith('Tests'))">
    <OutputType>Exe</OutputType>
    <UseMicrosoftTestingPlatformRunner>true</UseMicrosoftTestingPlatformRunner>
  </PropertyGroup>
</Project>
```

## `Directory.Packages.props`

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    <CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="xunit.v3" Version="4.0.3" />
    <PackageVersion Include="Microsoft.Testing.Extensions.CodeCoverage" Version="18.12.0" />
    <PackageVersion Include="Microsoft.Extensions.TimeProvider.Testing" Version="11.0.0" />
  </ItemGroup>
</Project>
```

Create it with `dotnet new packagesprops`, then move every `Version` from project files into a `PackageVersion` item.

## `nuget.config`

```xml
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
</configuration>
```

With a second feed, add `packageSourceMapping` so every package pattern resolves from one source. Set the minimum publish age with `dotnet nuget update source nuget.org --min-publish-age-hours 24 --configfile nuget.config`.

## Converting a Solution

```shell
dotnet sln MyApp.sln migrate
dotnet build MyApp.slnx
dotnet test --solution MyApp.slnx
```

The command fails when an `.slnx` with the same name exists. Delete the `.sln` only after both commands pass.
