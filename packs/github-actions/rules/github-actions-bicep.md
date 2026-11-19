---
description: Bicep validation, what-if and deployment workflows in GitHub Actions.
globs: ["**/.github/workflows/*.yml", "**/.github/workflows/*.yaml", "**/action.yml", "**/action.yaml"]
with: ["bicep"]
---

# GitHub Actions for Bicep

- Azure login uses `azure/login` with OIDC (`client-id`, `tenant-id`, `subscription-id`) and `permissions: id-token: write`. No client secrets or publish profiles.
- Deployments use `azure/bicep-deploy` with a `.bicepparam` file. It installs the Bicep CLI itself.
- Pull requests run `bicep lint`, the action's `validate` and `whatIf` operations, and surface the what-if output for review.
- Pull request jobs use a read-only identity with `validation-level: providerNoRbac`. Stack what-if also needs `Microsoft.Resources/deploymentStacksWhatIfResults/*`.
- The deploying identity has RBAC roles scoped to the target resource group, not the subscription. Deny settings on deployment stacks also need the Azure Deployment Stack Owner role.
- Deployments run on the default branch in a protected `environment`, with `type: deploymentStack` where the stack manages the resources' lifecycle.
- The federated credential subject matches the branch or environment that deploys.
