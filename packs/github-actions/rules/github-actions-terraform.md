---
description: Terraform plan and apply workflows in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["terraform"]
---

# GitHub Actions for Terraform

- `hashicorp/setup-terraform` installs an exact version through `terraform_version`, inside the range that `required_version` allows.
- Pull requests run `terraform fmt -check -recursive`, `terraform init -input=false`, `terraform validate` and `terraform plan -input=false -out=tfplan`, and post the plan summary to the pull request.
- Apply runs only on the default branch, in a protected `environment`, from the reviewed plan file: `terraform apply -input=false tfplan`.
- Plan and apply jobs authenticate to the cloud and the state backend with OIDC.
- Plan files contain secrets in plain text. They are uploaded as short-lived artifacts only when apply consumes them, never printed.
- One workflow run at a time per state: deploy jobs share a `concurrency` group per environment with `cancel-in-progress: false`.
- `-lock=false` is never used in CI.
