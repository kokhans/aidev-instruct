# Packaging and Deployment

## Project

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net48</TargetFramework>
    <PowerAppsTargetsPath>$(MSBuildExtensionsPath)\Microsoft\VisualStudio\v$(VisualStudioVersion)\PowerApps</PowerAppsTargetsPath>
    <AssemblyVersion>1.0.0.0</AssemblyVersion>
    <FileVersion>1.0.0.0</FileVersion>
    <ProjectTypeGuids>{4C25E9B5-9FA6-436c-8E19-B395D2A65FAF};{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}</ProjectTypeGuids>
  </PropertyGroup>
</Project>
```

- Create it with `pac plugin init --skip-signing` in an empty folder; the folder name becomes the project name. `--author` sets the package authors.
- The generated project already targets `net48` and is in the format plug-in packages need. Set the package versions.
- A shared class library in the package starts from a .NET or .NET Standard SDK-style template, then sets `TargetFramework` to the plug-in's .NET Framework target.
- Every build writes the `.nupkg` to `bin\Debug`, `bin\Release` or `bin\outputPackages`, depending on the configuration. That file is what gets registered.
- Plug-in projects opt out of repository-wide `Directory.Build.props` settings that need a newer C#, such as `Nullable` or a raised `LangVersion`.

## Plug-In Packages

| Rule | Reason |
| --- | --- |
| Use a package even with no dependencies yet | Adding one later is much harder |
| Never ILMerge | Unsupported. Packages replace it |
| No custom workflow activities in a package | Not supported. They stay in a signed assembly |
| No unmanaged code or low-level Windows APIs such as GDI | Unsupported in the sandbox |
| Hundreds of `IPlugin` classes import slowly | 1,000 types took about 15 minutes to import |
| Name and version fixed after first upload | Changing them through the API fails |
| On-premises not supported | Packages are an online feature |

- Dependencies come from NuGet `PackageReference` items or assembly references; the build places them in the package.
- `System.Text.Json` goes in the package when code uses it, because the sandbox copy may differ.
- Signed assemblies cannot load unsigned ones. Either sign nothing or sign everything in the package.

## Register and Update

1. First registration: open the Plug-in Registration tool with `pac tool prt`, register the `.nupkg` as a new package and pick the unmanaged solution. Then register steps on the assembly it lists under the package.
2. Updates from the command line: `pac plugin push --pluginId <package id> --pluginFile <path to .nupkg> --configuration Release`. `--type Assembly` pushes a plain assembly instead.
3. An update that removes a plug-in type used by a step is rejected. Unregister those steps first, then push.
4. A package cannot be unregistered while any of its assemblies has steps.

## Plain Assemblies

- Without a package, the assembly is strong-name signed (`pac plugin init` signs unless `--skip-signing`, or `--signing-key-file-path` names a key) and is registered through the Plug-in Registration tool.
- Plain assemblies may reference only the documented SDK assemblies and core .NET Framework assemblies. All other logic is inside the one DLL.
- Isolation mode is Sandbox and location is Database. The other options apply only on-premises.
