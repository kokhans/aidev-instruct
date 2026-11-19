---
description: Container images for .NET apps, with SDK container publishing or a Dockerfile.
globs: ["**/Dockerfile", "**/Dockerfile.*", "**/*.Dockerfile", "**/.dockerignore", "**/*.csproj", "**/Directory.Build.props"]
with: ["dotnet"]
---

# Docker for .NET

- Apps without OS packages to install are containerized by the SDK: `dotnet publish /t:PublishContainer`. No Dockerfile is needed.
- SDK publishing sets `ContainerRepository`, `ContainerImageTags` and `ContainerFamily` in the project. Base images are inferred from the target framework.
- Dockerfiles build on `mcr.microsoft.com/dotnet/sdk:<version>` and run on `mcr.microsoft.com/dotnet/aspnet:<version>` (web), `runtime` (console) or `runtime-deps` (self-contained and native AOT).
- The restore step copies the solution, project files, `Directory.*.props`, `global.json` and NuGet config before the sources, and caches `/root/.nuget/packages`.
- Production images use the `-chiseled` variants when the app sets `InvariantGlobalization`, and `-chiseled-extra` when it needs ICU or time zone data.
- .NET images ship a non-root `app` user, but only chiseled images run as it by default. Other final stages set `USER $APP_UID`, a numeric UID that Kubernetes `runAsNonRoot` accepts.
- ASP.NET Core images listen on port 8080 (`ASPNETCORE_HTTP_PORTS`). The app does not bind port 80.
- Chiseled images have no shell. Health checks use the orchestrator's HTTP probe.
