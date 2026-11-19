---
description: Terraform configuration style, versions, state, secrets and change workflow.
globs: ["**/*.tf", "**/*.tfvars", "**/*.tftest.hcl", "**/.terraform.lock.hcl"]
---

# Terraform

## Versions

- `terraform.tf` holds the `terraform` block: `required_version` and every provider in `required_providers` with a `source` and a version constraint.
- `.terraform.lock.hcl` is committed. Provider upgrades run `terraform init -upgrade` and commit the lock file change.
- Registry modules pin a `version`. Git modules pin a tag or commit with `ref`.

## Files and Names

- `main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`, `terraform.tf`, `backend.tf` and `locals.tf`. Large configurations split resources by concern, such as `network.tf`.
- Names are descriptive nouns in `snake_case` and never repeat the resource type.
- Every variable has a `type` and a `description`, plus `validation` where values are constrained. Optional variables have a safe default.
- Every output has a `description`.
- `for_each` over a map or set for resources with distinct settings. `count` only for near-identical copies or a `0`/`1` toggle.
- Other resources are referenced by attribute, which creates the dependency. `depends_on` only for dependencies Terraform cannot see.

## State

- State lives in a remote backend with locking and encryption at rest, one state per environment and component.
- The S3 backend uses `use_lockfile = true`. `dynamodb_table` locking is deprecated.
- State files, `.terraform/`, plan files and secret `.tfvars` files are git-ignored.
- Environments use a directory per environment calling shared modules, or separate HCP Terraform workspaces. CLI workspaces do not separate production from other environments.

## Secrets

- `sensitive = true` only hides values from output. They are still written to state and plan files in plain text.
- Secrets passed to resources use write-only arguments (`*_wo` with `*_wo_version`) where the provider offers them, and ephemeral variables and `ephemeral` resources to read them, so they never reach state.
- Provider credentials come from OIDC or dynamic credentials, never from variables committed in `.tfvars`.

## Changes

- `terraform fmt` and `terraform validate` pass before commit. TFLint runs with the provider's ruleset.
- Every change is applied from a saved, reviewed plan: `terraform plan -out=tfplan`, then `terraform apply tfplan`.
- Renames, moves, imports and removals use `moved`, `import` and `removed` blocks, never `terraform state` commands.
- Modules have `terraform test` files (`*.tftest.hcl`) that cover their variables and outputs.
- `lifecycle { prevent_destroy = true }` protects stateful resources such as databases and buckets.

The `terraform-refactoring` skill covers moves, imports, removals and tests.
