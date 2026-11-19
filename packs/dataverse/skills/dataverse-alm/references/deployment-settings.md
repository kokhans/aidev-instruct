# Deployment Settings

A deployment settings file gives environment variable values and connection IDs to an automated import, so nobody enters them by hand.

## Format

```json
{
  "EnvironmentVariables": [
    { "SchemaName": "contoso_ApiBaseUrl", "Value": "https://api.test.contoso.com" }
  ],
  "ConnectionReferences": [
    {
      "LogicalName": "contoso_sharepointonline_ref",
      "ConnectionId": "ef3d1cbb2c3b4e7987e02486584689d3",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
    }
  ]
}
```

## Workflow

1. Generate the template from the build output: `pac solution create-settings --solution-zip <zip> --settings-file deploy/<env>.settings.json`.
2. Keep one file per target environment in source control. Values that are secrets never go in the file: use a Secret environment variable backed by Azure Key Vault, or let the pipeline substitute the value from its secret store.
3. Fill `ConnectionId` with a connection that already exists in the target. The connection must belong to the owner of the connection reference or be shared with that owner, or the import fails validation.
4. Import with `pac solution import --settings-file deploy/<env>.settings.json`.
5. Regenerate the template when the solution gains or loses an environment variable or connection reference, and diff it against the committed files.

## Environment Variable Values

- The value in the solution wins over the default value. Remove the current value from the solution before export (in the solution, on the variable: Current Value, Remove from this solution) so the target value comes from the settings file.
- A value imported inside a managed solution can only be deleted by an upgrade to a version that no longer contains it.
- Values in a managed solution are visible only through the Default solution.
- Dataverse does not validate values. The settings file and any code that writes values must produce what the consumers expect.
- Value and default value hold at most 2,000 characters. Display and schema names hold at most 100.
- Canvas apps and cloud flows can take up to an hour to pick up a changed value.
- Relational configuration data belongs in tables moved with the Configuration Migration tool, not in environment variables.
