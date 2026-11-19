# Refactoring Blocks

## Moved

```hcl
moved {
  from = aws_s3_bucket.logs
  to   = module.logging.aws_s3_bucket.this
}
```

- `from` and `to` are resource or module addresses, including instance keys such as `aws_instance.web[0]` to `aws_instance.web["a"]`.
- Moving a whole module needs one block for the module address, not one per resource.
- Chains of moves are allowed. Old blocks stay in shared modules so callers on any older version can upgrade.
- A plan that shows `destroy` and `create` for a renamed resource is missing a `moved` block.

## Import

```hcl
import {
  to = azurerm_resource_group.main
  id = "/subscriptions/.../resourceGroups/main"
}
```

- The `id` is the provider's import ID for the resource type, documented on the resource page. Providers that support resource identity accept `identity` instead.
- Without an existing `resource` block, `terraform plan -generate-config-out=generated.tf` writes one. The generated code is cleaned up and moved into the right file before commit.
- The plan must show the import and no changes to the imported resource. Differences mean the configuration does not match reality yet.
- Import blocks with `for_each` adopt many similar resources at once.
- After apply, import blocks can be deleted or kept as a record. They have no further effect.

## Removed

```hcl
removed {
  from = aws_instance.legacy
  lifecycle {
    destroy = false
  }
}
```

- `destroy = false` removes the resource from state and leaves it running. Without it, Terraform destroys the resource.
- The `resource` block is deleted in the same change.
- Only destroy-time provisioners (`when = destroy`) are allowed inside `removed`.
