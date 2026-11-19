# Pipeline and Registration

## Stages

| Stage | Transaction | Use |
| --- | --- | --- |
| PreValidation | Outside, unless an operation inside a transaction triggered it | Validate and cancel. Runs before security checks |
| PreOperation | Inside | Change values in `Target` before they are saved. Avoid cancelling here: the rollback is expensive |
| MainOperation | Inside | Only custom APIs and custom virtual table data providers |
| PostOperation | Inside when synchronous | Work that needs the saved record, changes to `OutputParameters`. Asynchronous steps run here, after the transaction |

- Asynchronous mode exists only for PostOperation steps.
- A PostOperation step that updates the record it fires on raises a new `Update`. Set values in PreOperation instead.
- A plug-in on `Create` of `systemuser` that performs an update must be asynchronous.
- `Execution Order` is set explicitly on every step. Steps with the same value for one stage, table and message run in no guaranteed order.
- Never register on `Execute`: every operation calls it.
- Changes to `customeraddress` and the other address tables are handled by steps on `account` or `contact`.
- Some specialized updates call `Update` plug-ins twice, so `Update` logic is idempotent.

## Retrieve and RetrieveMultiple

- Avoid steps on `Retrieve` and `RetrieveMultiple`: they slow down every read of the table.
- Filtering results belongs in PreOperation by changing `InputParameters["Query"]`, never in PostOperation by removing records, which breaks paging.
- A PreOperation filter handles both `QueryExpression` and `FetchExpression` with equivalent logic, without converting between them. `QueryByAttribute` cannot carry complex filters: reject it with `InvalidPluginExecutionException` when the filter is sensitive.

## Filtering Attributes

- Every `Update` step lists filtering attributes. Without them the plug-in runs on every update of the table.
- A step fires when a filtering column is in the request, whether or not its value changed. Callers send only changed columns.
- Never add the primary key: it is in every update, which disables the filter.
- On `UpdateMultiple`, the step runs when any record in `Targets` contains a filtering column, so code checks each entity for the columns it needs.
- Register a step once. A duplicate registration runs the plug-in twice.

## Images

- Pre and post images replace a `Retrieve` of the record being processed. Select only the columns the code reads. The default of all columns hurts performance.
- No pre image on `Create`, no post image on `Delete`. Post images exist only on PostOperation steps. A PostOperation `Update` step can have both.
- Code reads an image by the alias given at registration: `context.PreEntityImages["pre"]`.
- On `CreateMultiple` and `UpdateMultiple`, images are arrays aligned with `Targets`: cast the context to `IPluginExecutionContext4` and read `PreEntityImagesCollection[i]`. In `PluginBase`, replace `IPluginExecutionContext` with `IPluginExecutionContext4`.

## Context

- `InputParameters` can be changed in PreValidation and PreOperation. `OutputParameters` exist only in PostOperation.
- `SharedVariables` passes serializable values to a later step of the same operation. A PreOperation or PostOperation step reads values set in PreValidation of `Create`, `Update` or `Delete` from `context.ParentContext.SharedVariables`.
- A caller can pass the `tag` optional parameter, which arrives as the `tag` shared variable.
- Business logic does not depend on `ParentContext` outside documented cases: the order of operations can change.
- Tables in `InputParameters` are late-bound `Entity` objects. Read early-bound with `ToEntity<T>()`, never assign an early-bound object back.

## Bulk Messages

- `CreateMultiple` and `UpdateMultiple` share one pipeline with `Create` and `Update`. A step on either version runs for both kinds of request.
- New logic for tables written in bulk registers on `CreateMultiple` or `UpdateMultiple` and loops over `context.InputParameters["Targets"]`, an `EntityCollection`. The class loads once per batch, which is the gain.
- Logic that moves from `Create` to `CreateMultiple` leaves `Create` in the same release, or it runs twice. Solutions cannot disable the old step: Package Deployer custom code disables it during the release.
- Errors name the failing record: `InvalidPluginExecutionException(message, exceptionDetails)` with the ID, or the index in `Targets` when the ID is not set.
- Images on bulk steps multiply by the number of targets and can exceed the 116.85 MB message size sent to the sandbox.
- Plug-in code never sends bulk or batch messages itself.

## Solutions

- The Plug-in Registration tool adds assemblies and steps to the Default solution. Add the assembly or package and every step to your unmanaged solution; a step is not added with its assembly.
- Secure configuration is not exported with a step. Each environment sets it after import.
- Raising the build or revision of the assembly version updates in place, and steps follow. Raising major or minor registers a new assembly, and existing steps keep pointing at the old one until changed.
