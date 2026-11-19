# Static Interface Members on Older Runtimes

C# 15 allows non-virtual static interface members when the target runtime has no default interface method support, such as .NET Framework or `netstandard2.0`. Multi-targeted libraries can keep helpers on the interface.

```csharp
public interface IMeasurement
{
    public static double ToMeters(double centimeters) => centimeters / 100;
}

double meters = IMeasurement.ToMeters(250);
```

## Rules

- Callers use the interface name, never an implementing type.
- These still need runtime support, so they stay out of down-level targets:
  - instance default implementations,
  - `static abstract` and `static virtual` members,
  - `protected`, `protected internal` and `private protected` interface members.
