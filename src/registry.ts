/**
 * Builds `registry.json` for the website: every official pack and stack with its items and
 * metadata. `bun run registry` writes it.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { listItems } from "./items.ts";
import { loadPacks, loadStacks } from "./packs.ts";
import { isPin } from "./versions.ts";

/** Builds the registry. Private feeds have no registry: a project reads their `feed.json`. */
export function registry(packs = loadPacks(), stacks = loadStacks()): string {
  const entries = [...packs.values()].map((pack) => ({
    name: pack.name,
    description: pack.description,
    version: pack.version,
    tags: pack.tags,
    authors: pack.authors,
    ...(pack.latest === undefined ? {} : { latest: pack.latest }),
    requires: pack.requires,
    conflicts: pack.conflicts,
    notes: pack.notes,
    items: listItems(pack.dir, pack.name).map((item) => ({
      kind: item.kind,
      name: item.name,
      with: item.with,
      ...(item.version === undefined
        ? {}
        : { version: item.version, versionKind: isPin(item.version) ? "exact" : "range" }),
    })),
  }));
  const named = [...stacks.values()].map((stack) => ({
    name: stack.name,
    description: stack.description,
    version: stack.version,
    packs: stack.packs,
  }));
  return `${JSON.stringify({ packs: entries, stacks: named }, null, 2)}\n`;
}

/** Writes `registry.json` under `root`. */
export function writeRegistry(root: string) {
  writeFileSync(join(root, "registry.json"), registry());
}
