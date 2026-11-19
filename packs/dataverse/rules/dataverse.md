---
description: Microsoft Dataverse solutions, publishers, table names, environment variables, the pac CLI and service protection limits.
globs: ["**/*.cdsproj", "**/Solution.xml", "**/Customizations.xml", "**/solution.yml", "**/*.cs", "**/*.ts", "**/*.tsx"]
---

# Dataverse

## Solutions

- Every customization lives in a custom unmanaged solution in a development environment, never in the Default solution.
- One custom publisher with a meaningful prefix owns every component. Choose the prefix before creating components: names of existing components never change.
- The unmanaged solution is the source and goes into source control. Test, UAT and production environments get only managed solutions, exported from it as build artifacts.
- A managed solution never goes into the environment that holds its unmanaged original.
- A release that removes components imports as an upgrade (`pac solution import --stage-and-upgrade` or `pac solution upgrade`). An update or patch never deletes components.
- A solution package stays under 95 MB.

## Names

- SDK code uses the lowercase `LogicalName` of tables and columns. Web API code uses the `EntitySetName`.
- Custom schema names carry the publisher prefix. Dataverse checks only that a prefix exists, not that it is the right one.
- Table ownership (`UserOwned` or `OrganizationOwned`) is fixed at creation.
- Records synced from another system get an alternate key on the external ID, so integrations use upsert instead of lookups.

## Environment Variables

- Values that differ per environment are environment variables, never constants in code or rows in a custom settings table.
- Solutions carry the definition and optional default value. Remove the current value from the solution before export, so each target environment sets its own.
- Automated imports supply values and connection references through a deployment settings file: `pac solution create-settings`, then `pac solution import --settings-file`.
- Code reads `environmentvariablevalue.value` and falls back to `environmentvariabledefinition.defaultvalue`. Dataverse exposes no cache to custom code, and values hold at most 2,000 characters.
- Secrets use the Secret type backed by Azure Key Vault, never Text.

## `pac` CLI

- Each environment has a named auth profile: `pac auth create --name <name> --environment <id or url>`. `--url` is deprecated.
- CI authenticates as a service principal, preferably with workload identity federation (`--githubFederated` or `--azureDevOpsFederated`, with `--tenant` and `--applicationId`), never as a user.
- `pac solution check` runs Solution Checker before every release.
- Early-bound classes come from `pac modelbuilder build` with `--entitynamesfilter` and `--messagenamesfilter`, regenerated from a committed `builderSettings.json`. `CrmSvcUtil.exe` is replaced.

## Service Protection Limits

- Limits apply per user and per web server over a 5-minute sliding window. Defaults: 6,000 requests, 20 minutes of combined execution time, 52 concurrent requests. They vary by environment, so code never hard-codes them.
- The Web API returns `429` with `Retry-After` in seconds. The SDK throws `OrganizationServiceFault` with error code `-2147015902` (requests), `-2147015903` (execution time) or `-2147015898` (concurrency) and `Retry-After` in `ErrorDetails`.
- Clients wait for `Retry-After` and retry. Interactive apps show a busy state, never the raw error.
- Batching never bypasses limits: it trades request count for execution time, and entitlement limits count every operation in a batch.
- Operations from plug-ins do not count as requests, but their time adds to the request that triggered them.

For solution projects, source control, deployment settings and `pac` commands in depth, use the `dataverse-alm` skill.
