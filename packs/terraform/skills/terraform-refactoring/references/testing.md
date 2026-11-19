# Testing Modules

## Files

- Tests are `*.tftest.hcl` files next to the module or in its `tests` folder, run with `terraform test`.
- Each file has `run` blocks executed in order. A `run` defaults to `command = apply`, which creates real infrastructure and destroys it at the end of the file.
- Unit tests set `command = plan` and create nothing.

## Assertions

```hcl
run "names_bucket_from_prefix" {
  command = plan

  variables {
    prefix = "app"
  }

  assert {
    condition     = aws_s3_bucket.this.bucket == "app-logs"
    error_message = "Bucket name must use the prefix."
  }
}
```

- `assert` blocks reference resources, outputs and earlier `run` outputs.
- `expect_failures` lists the variables, outputs, checks or resources whose conditions must fail, which tests `validation` blocks and preconditions. A run lists one such object, except `check` blocks, because other failures halt the run.
- Failures are expected only in the run's own `command`, so a run testing variable validation sets `command = plan`.
- Variables set at file level apply to every `run`. Run-level values override them.

## Mocks

- `mock_provider` replaces a provider with generated values, so `apply` tests run without cloud credentials.
- `override_resource` and `override_data` fix the values of specific resources or data sources, such as IDs other resources consume.
- Mocked tests cover logic: names, counts, conditional resources, outputs. Integration tests with real providers run in a sandbox account on a schedule or before release.

## CI

- `terraform test` runs in the pull request workflow after `terraform validate`.
- Tests that apply real infrastructure use a dedicated account or subscription and a unique name prefix per run.
