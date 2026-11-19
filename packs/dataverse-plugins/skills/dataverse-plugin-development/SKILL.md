---
name: dataverse-plugin-development
description: Writes, registers and reviews Dataverse plug-ins and custom workflow activities in C# 7.3 on .NET Framework 4.8. Covers the IPlugin and PluginBase patterns, pipeline stages, synchronous and asynchronous steps, filtering attributes, pre and post images, shared variables, CreateMultiple and UpdateMultiple plug-ins, exceptions and retries, tracing, external HTTP calls, plug-in packages with pac plugin init and pac plugin push, and testable code. Use when adding or changing a plug-in, a step registration or a workflow activity, when a plug-in times out, runs twice or fails to register, or when moving from ILMerge to a plug-in package.
---

# Dataverse Plug-In Development

## References

| File | Covers |
| --- | --- |
| [pipeline.md](references/pipeline.md) | Stages, modes, images, filtering attributes, shared variables, bulk messages |
| [packaging.md](references/packaging.md) | Project file, plug-in packages, signing, `pac plugin push`, registration, updates |

## Plug-In Shape

```csharp
namespace Contoso.Plugins
{
    public sealed class ValidateOrder : IPlugin
    {
        private readonly string _unsecureConfig;

        public ValidateOrder(string unsecureConfig, string secureConfig)
        {
            _unsecureConfig = unsecureConfig;
        }

        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var tracing = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            var factory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var service = factory.CreateOrganizationService(context.UserId);

            var target = context.InputParameters["Target"] as Entity;
            if (target == null)
            {
                return;
            }

            try
            {
                new OrderRules(service, tracing).Validate(target);
            }
            catch (InvalidPluginExecutionException)
            {
                throw;
            }
            catch (Exception ex)
            {
                tracing.Trace("ValidateOrder failed: {0}", ex.ToString());
                throw new InvalidPluginExecutionException("The order could not be validated. Contact your administrator.", ex);
            }
        }
    }
}
```

- The class has no mutable fields. Configuration from the step registration arrives in the constructor: `unsecure` for visible settings, `secure` for values only system administrators can read.
- Logic lives in plain classes such as `OrderRules` that take `IOrganizationService` and `ITracingService`. Unit tests pass fakes of those interfaces; the plug-in class only wires services.
- `CreateOrganizationService(context.UserId)` runs as the calling user, or the user set in the step's impersonation. `null` runs as the system user: use it only when the logic must bypass the caller's privileges, and say why in a comment.
- `PluginBase` from `pac plugin init` wraps the same services in `ILocalPluginContext`. The Visual Studio tools generate slightly different signatures, so one project uses one generator.

## Exceptions

| Situation | Code |
| --- | --- |
| Business rule rejects the operation | `throw new InvalidPluginExecutionException("Plain-text reason")` in PreValidation |
| Unexpected error | Catch, trace, throw `InvalidPluginExecutionException` with a generic message and the inner exception |
| Transient failure in an asynchronous step | `throw new InvalidPluginExecutionException(OperationStatus.Retry, code, message)`: the async service tries four times |
| One record of a bulk message fails | `InvalidPluginExecutionException(message, exceptionDetails)` with the record ID or index in the dictionary |

- Any exception in a synchronous step inside the transaction rolls back the whole operation. Cancel in PreValidation, before the transaction, when possible: `context.IsInTransaction` says whether you are already inside one.
- Messages are plain text. Model-driven apps do not render HTML in the error dialog.
- Exceptions other than `InvalidPluginExecutionException` reach the user as "An unexpected error occurred from ISV code."
- Asynchronous step errors go to the System Job (`asyncoperation`) record, never to a user.

## Tracing

- Trace logging is off until enabled in the environment settings. Logs land in the `plugintracelog` table.
- `tracing.Trace(format, args)` with format placeholders, never string concatenation of large payloads. The trace log per execution is limited.
- Trace the decision points and the error path. In loops over `Targets`, trace only failures, with the item index.

## External Calls

```csharp
using (var client = new HttpClient())
{
    client.Timeout = TimeSpan.FromSeconds(15);
    client.DefaultRequestHeaders.ConnectionClose = true;
    var response = client.GetAsync(url).GetAwaiter().GetResult();
    response.EnsureSuccessStatusCode();
}
```

- Plug-ins are synchronous code, so the call blocks with `GetAwaiter().GetResult()`; there is no `async` `Execute`.
- The timeout is set from the service's measured response time plus a small buffer. The `HttpClient` default of 100 seconds leaves almost nothing of the 2-minute budget.
- Outbound TLS certificates must have a valid chain the sandbox can verify.
- Calls that may take seconds belong in an asynchronous step, or in Azure via a service endpoint or webhook registered on the step.

## Workflow Activities

- A custom workflow activity derives from `CodeActivity`, declares `InArgument<T>` and `OutArgument<T>` properties with `[Input]` and `[Output]`, and reads context through `context.GetExtension<IWorkflowContext>()`.
- The same stateless, threading and time rules apply. A synchronous workflow or custom action runs the activity inside the user's request, so it also takes at most 2 seconds.
- Declarative business logic comes first. Write an activity only when a declarative process cannot do the job.

## Debugging

- `pac tool prt` opens the Plug-in Registration tool. Its Plug-in Profiler captures a failing execution so it can be replayed in a local debugger.
- Analytics in the Power Platform admin center (Analytics, Dataverse, Plug-ins) shows execution times and failures per plug-in.
