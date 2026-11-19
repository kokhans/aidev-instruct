# Extension Indexers

C# 15 allows indexers inside C# 14 `extension` blocks. Indexers are instance members, so the block names its receiver.

```csharp
public static class SettingsExtensions
{
    extension(IDictionary<string, string> settings)
    {
        public string this[string section, string key]
        {
            get => settings[$"{section}:{key}"];
            set => settings[$"{section}:{key}"] = value;
        }
    }
}

settings["Logging", "Level"] = "Debug";
```

## Rules

- Extension indexers support what ordinary indexers support: `get` and `set`, expression bodies and `ref` returns.
- Lookup order, first applicable wins: an indexer on the receiver type, implicit `Index` or `Range` access through instance members, an extension indexer, implicit `Index` or `Range` access through extension members. An extension never replaces an instance indexer.
- An extension `Count` or `Length`, an extension `this[int]` and an extension `Slice(int, int)` make a type indexable from the end, sliceable and usable in list patterns. Classic `this`-parameter extension methods count too.

```csharp
extension(Readings readings)
{
    public int Count => readings.Values.Length;
    public int this[int index] => readings.Values[index];
    public Readings Slice(int start, int length) => new(readings.Values[start..(start + length)]);
}

_ = readings[^1];
_ = readings is [10, .., 40];
```

## Limitations

- Extension indexers are never used for arrays or `string`.
- Expression trees cannot contain extension property or indexer access, so they never appear in EF Core or other `IQueryable` lambdas.
- Extension `Count` and `Length` do not presize spreads: `[.. x]` grows as it enumerates.
