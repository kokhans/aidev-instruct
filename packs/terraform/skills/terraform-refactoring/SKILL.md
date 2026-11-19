---
name: terraform-refactoring
description: Changes existing Terraform configurations without recreating or orphaning infrastructure. Covers renaming and moving resources and modules with moved blocks, adopting existing infrastructure with import blocks, dropping resources from management with removed blocks, and testing modules with terraform test and mock providers. Use when restructuring Terraform code, splitting or extracting modules, bringing manually created resources under Terraform, or adding tests to a module.
---

# Terraform Refactoring

## Workflow

1. Run `terraform plan` on the unchanged code. It must show no changes before refactoring starts.
2. Change the code and add the `moved`, `import` or `removed` blocks in the same commit.
3. Run `terraform plan -out=tfplan`. A refactor shows moves, imports or forgets, and no `destroy` or `replace` on stateful resources.
4. Review and apply the saved plan.
5. Keep `moved` blocks in shared modules so every caller can upgrade. Remove them from root modules once every state has applied them.

## Choosing a Block

| Goal | Block | Reference |
| --- | --- | --- |
| Rename a resource, move it into or out of a module, switch `count` to `for_each` | `moved` | [refactoring.md](references/refactoring.md) |
| Manage an existing cloud resource | `import` | [refactoring.md](references/refactoring.md) |
| Stop managing a resource without deleting it | `removed` with `destroy = false` | [refactoring.md](references/refactoring.md) |
| Prove a module's behavior before and after a change | `terraform test` | [testing.md](references/testing.md) |

## Never

- `terraform state mv`, `state rm` and `import` commands in shared environments. Blocks are reviewed in pull requests and plans; commands are not.
- `-target` as a routine step. It is for recovery only.
- Editing state files by hand.
- Refactoring and changing resource arguments in the same plan. Moves go first, behavior changes in a later change.
