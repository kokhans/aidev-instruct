---
description: Bicep authoring, modules, parameters files, secrets, linting and deployment for Azure infrastructure.
globs: ["**/*.bicep", "**/*.bicepparam", "**/bicepconfig.json"]
---

# Bicep

## Modules

- Common resources come from Azure Verified Modules: `br/public:avm/res/<provider>/<resource>:<version>`, pinned to an exact version. Non-AVM modules are retired from the public registry.
- Shared internal modules live in a private registry (`br:<registry>.azurecr.io/...`) or template specs, with aliases in `bicepconfig.json`. Registry references use the native `*.azurecr.io` host: custom domains fail with `BCP446`.
- Modules omit the `name` property, so each nested deployment gets a unique generated name and concurrent deployments do not collide.

## Parameters and Types

- Each environment has a `.bicepparam` file with `using './main.bicep'`, such as `main.dev.bicepparam` and `main.prod.bicepparam`. Shared values go in a base file pulled in with `extends`.
- Parameters hold only values that change between deployments, each with `@description`. Naming parameters set `@minLength` and `@maxLength`.
- Object parameters use user-defined types, shared through `@export()` and `import`. No untyped `object` or `array` parameters.
- `@allowed` is used sparingly, because it blocks new SKUs.
- Defaults are safe and cheap to deploy.
- `location` defaults to `resourceGroup().location` and is never hard-coded on resources.

## Secrets

- Secret parameters are `@secure()` and have no default. Parameters files never hold secret values; they use `getSecret` from Key Vault or `readEnvironmentVariable`.
- Outputs never return secrets. A module that must return one marks the output `@secure()`.
- Keys of other resources are read through `existing` and `listKeys()` where needed, never passed around in outputs.
- Workloads authenticate with managed identities and role assignments instead of keys or connection strings.

## Resources

- Symbolic names never contain `name`. Resource names come from interpolation with a prefix and `uniqueString(resourceGroup().id)`, because `uniqueString` can start with a digit.
- References use symbolic names (`storage.id`, `storage.properties.primaryEndpoints`) for implicit dependencies. No `resourceId()`, `reference()` or needless `dependsOn`.
- Child resources use `parent` or nesting, never names built with `/`.
- Each resource uses a recent stable API version. Preview versions only when a needed property requires one.
- Outputs return resource properties, not hand-built URLs.

## Linting

- `bicepconfig.json` enables the rules that are off by default: `use-recent-api-versions`, `use-recent-module-versions`, `no-hardcoded-location`, `no-module-name`, `use-user-defined-types` and the `use-description-*` rules. Security rules are raised to `error`.
- `bicep lint` passes with no warnings. Suppressions use `#disable-next-line <rule>`, with a `//` comment above it giving the reason.

## Deployment

- Every change is previewed with what-if before it applies: `az deployment group what-if`, or `az stack-whatif group create` for a deployment stack.
- Resource lifecycles are managed with deployment stacks (`az stack group create`), with `--action-on-unmanage` chosen on purpose and `--deny-settings-mode denyDelete` or stronger for production.
- Deployments run from CI with OIDC, not from a laptop.
