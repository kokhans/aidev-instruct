# Validation

Built-in minimal API validation comes from `Microsoft.Extensions.Validation`, driven by a source generator.

## Setup

- `builder.Services.AddValidation()` turns it on. Without it, attributes are not checked.
- Validated inputs: query, header and request body parameters. Record DTOs, classes, nested objects and collections are walked.
- Root types the generator cannot discover from an endpoint signature get `[ValidatableType]`. Types in another assembly need `AddValidation()` called from that assembly, through an extension method the host calls.
- `[SkipValidation]` excludes a property, parameter or type. `DisableValidation()` turns validation off for one endpoint.
- Failure returns 400 with problem details listing errors per field. Change the shape through `IProblemDetailsService` or `CustomizeProblemDetails`, never a hand-written filter.

## Attributes

| Need | Attribute |
| --- | --- |
| Present and non-empty | `[Required]` |
| Length | `[StringLength(max, MinimumLength = n)]`, `[MinLength]`, `[MaxLength]`, `[Length(min, max)]` |
| Numeric or date range | `[Range(min, max)]` |
| Format | `[EmailAddress]`, `[Url]`, `[Phone]`, `[RegularExpression]` |
| Allowed values | `[AllowedValues(...)]`, `[DeniedValues(...)]` |
| Bytes | `[Base64String]` |

Attributes on positional record parameters apply to the generated properties:

```csharp
public sealed record CreateUserRequest(
    [Required, EmailAddress] string Email,
    [Required, StringLength(100, MinimumLength = 2)] string Name);
```

## Custom Rules

- Single value, no I/O: derive from `ValidationAttribute` and override `IsValid(object?, ValidationContext)`.
- Several properties, no I/O: implement `IValidatableObject.Validate` and return `ValidationResult` items that name the members.
- Rules that need a database or remote call: derive from `AsyncValidationAttribute` and override `IsValidAsync(object?, ValidationContext, CancellationToken)`, or implement `IAsyncValidatableObject.ValidateAsync`.
- Async types still implement the synchronous member. Make it throw `InvalidOperationException` so synchronous validators cannot skip the rule silently.
- Resolve services inside a rule with `context.GetRequiredService<T>()`. Never constructor injection in attributes.
- Async validators can run concurrently. They are safe to run in parallel and pass the `CancellationToken` on.

```csharp
public sealed class UniqueEmailAttribute : AsyncValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext context) =>
        throw new InvalidOperationException("Validate with IsValidAsync.");

    protected override async Task<ValidationResult?> IsValidAsync(
        object? value, ValidationContext context, CancellationToken cancellationToken)
    {
        var users = context.GetRequiredService<IUserLookup>();
        return value is string email && await users.EmailExistsAsync(email, cancellationToken)
            ? new ValidationResult("That email is already registered.")
            : ValidationResult.Success;
    }
}
```

## What Validation Is Not

- Validation checks shape and simple invariants. Business rules that depend on current state (stock levels, permissions, workflow status) run in the handler and return `Conflict`, `Forbid` or `TypedResults.Problem`.
- Uniqueness checked during validation can still race. A unique index in the database is the real guarantee; map the violation to 409.

## Localization

- `AddLocalization()` before `AddValidation()` localizes messages and display names.
- Keys resolve against the resources of the type that declares the member. `ErrorMessage` is the first key tried, and `[Display(Name = ...)]` names the display name key.
- Without `ErrorMessage`, keys follow `{DeclaringType}_{MemberName}_{AttributeType}_Error`, then `{DeclaringType}_{AttributeType}_Error`, then `{AttributeType}_Error`, for example `CustomerModel_Name_RequiredAttribute_Error`.
- `ValidationOptions.LocalizerProvider` points all lookups at one shared resource type.
- Attributes with `ErrorMessageResourceType` bypass this pipeline.
- Custom attributes with extra placeholders implement `IValidationMessageFormatter`.
