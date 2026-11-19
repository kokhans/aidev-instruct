---
name: pack-versions
description: Use when adding a pack or changing its technology versions. Finds the current stable version, the minimum supported version and the required peers in the official documentation, then fills `latest`, `requires` and item `version` in `pack.json` and records the source in the pack changelog. Never guesses a version from memory.
---

# Pack Versions

A pack declares the technology versions its guidance holds for: `latest` in `pack.json`, pins or ranges in `requires`, and exact or range `version` in items. Every version comes from the official documentation, with the URL recorded in the pack changelog.

## Find the Facts

Use the technology's own docs, registry metadata or release notes. A blog post, a forum answer or memory is not a source.

| Fact              | Where to look                                                                  |
| ----------------- | ------------------------------------------------------------------------------ |
| Current stable    | The install or upgrade page, release notes, or the package's `latest` dist-tag |
| Minimum supported | `peerDependencies`, the framework support table, or the requirements page      |
| Required peers    | `peerDependencies` and the installation instructions                           |
| Item versions     | The release notes or migration guide that changed the behavior the item covers |

Record each URL and the date you checked it for the changelog entry.

## Fill pack.json

| Field            | Rule                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `latest`         | Exact version, such as `"19"` or `"7.3"`. Required when the pack has versioned items.                         |
| `requires` pin   | `name@7.3` when the platform fixes one version, such as `react@16` for PCF.                                   |
| `requires` range | `name@>=18` when a span of versions works. The range must include the dependency's `latest`.                  |
| `requires` bare  | Only for a pack that has no `latest`.                                                                         |
| Item `version`   | `19` for one version, named `<pack>-19`; `>=16 <20` for a span, with a unique name; absent for every version. |

- Never require a versioned pack without a version; the validator fails it.
- Prefer the widest range the official docs support, not the narrowest you have seen used.
- A pin is a compatibility claim: use it only when the docs say one version works.
- `packVersions` is different: it checks the release version of another pack, such as `{"dotnet": ">=1.4.2"}`. `requires` checks technology versions. Do not mix them.

## Examples

Next.js requires React 19, and the React pack ships items for 16 and 19:

```json
{
  "requires": ["react@>=19"],
  "latest": "19"
}
```

PCF controls run on the React 16.14 the platform ships:

```json
{
  "requires": ["dataverse", "typescript", "react@16"]
}
```

## Verify

1. `bun run validate <pack>`.
2. `bun run sandbox init -p <pack>` and read the generated files.
3. `bun run check`.

## Changelog

Add a line to `packs/<pack>/CHANGELOG.md`. Say which version started or stopped being supported, why, and link the source. A range change without a source is not finished.
