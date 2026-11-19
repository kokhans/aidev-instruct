import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "./fs.ts";
import { covers, describeScope, intersect, overlaps, type Scope, scopeOf, union } from "./scope.ts";
import { isPin, isRange, satisfies } from "./versions.ts";

/** A pack as described by its `pack.json`. */
export interface Pack {
  name: string;
  description: string;
  /** The pack release version, shown by feeds and the website. */
  version: string;
  /** What the pack covers, for search and filtering on the website. */
  tags: string[];
  /** Contributors to credit. */
  authors: string[];
  requires: string[];
  /** Packs that cannot be installed together with this one. */
  conflicts: string[];
  /** Release version ranges of the packs this one requires, keyed by pack name. */
  packVersions: Record<string, string>;
  /** Lines printed after the pack is installed. */
  notes: string[];
  /** The technology version a project gets when it names none, for packs with versioned items. */
  latest?: string;
  dir: string;
}

/** The folders where an installed pack is on one technology version. */
export interface PackVersion {
  /** `undefined` for a pack without versions. */
  version?: string;
  scope: Scope;
}

/** Why a pack is installed: config stacks that name it, packs that require it, or the config. */
export interface PackFrom {
  /** Config stacks whose `packs` list names this pack. */
  stacks?: string[];
  /** Installed packs whose `requires` names this pack. */
  requiredBy?: string[];
  /** True when `packs` in the config lists this pack. */
  config?: boolean;
}

/** An installed pack, the folders it applies to, and its version in each of them. */
export interface ResolvedPack extends Pack {
  scope: Scope;
  versions: PackVersion[];
  from: PackFrom;
  /** A config version that overrides a `requires` pin, one line per pin. */
  warnings: string[];
}

/** A pack name with an optional technology version: `csharp` or `csharp@7.3`. */
export function parseRef(ref: string): { name: string; version?: string } {
  const at = ref.indexOf("@");
  return at < 0 ? { name: ref } : { name: ref.slice(0, at), version: ref.slice(at + 1) };
}

/** A named set of packs from `stacks/<name>.json`. */
export interface Stack {
  name: string;
  description: string;
  /** The stack release version, bumped by `bun run release`. */
  version: string;
  packs: string[];
}

/** A pack or stack named in the config, with optional folders and a technology version. */
export interface Entry {
  name: string;
  /** The folders the entry applies to. Missing means the whole project. */
  path?: string[];
  version?: string;
  /** The feed the item must come from, when the config asserts it. */
  feed?: string;
}

/** A pack to install, the folders it applies to, and the version the config sets. */
export interface PackRequest {
  name: string;
  scope: Scope;
  version?: string;
  /** Why the config asks for the pack: a stack names it, or `packs` lists it. */
  from?: Pick<PackFrom, "stacks" | "config">;
}

/** Packs ship next to the CLI: `<package>/packs` from both `src/` and `dist/`. */
export const PACKS_DIR = fileURLToPath(new URL("../packs", import.meta.url));

/** Stacks ship next to the CLI: `<package>/stacks`. */
export const STACKS_DIR = fileURLToPath(new URL("../stacks", import.meta.url));

/** Returns a list of strings from a JSON value, or fails with the file and key. */
function stringList(value: unknown, file: string, key: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
    throw new Error(`${file}: "${key}" must be a list of names`);
  }
  return value;
}

/** Reads `packVersions`, keeping only string ranges. The validator reports a bad shape. */
function versionMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

/** Loads every pack folder that has a `pack.json`, keyed by name. A missing folder means none. */
export function loadPacks(dir = PACKS_DIR): Map<string, Pack> {
  const packs = new Map<string, Pack>();
  if (!existsSync(dir)) return packs;
  for (const name of readdirSync(dir).sort()) {
    const manifest = join(dir, name, "pack.json");
    if (!existsSync(manifest)) continue;
    const json = readJson(manifest);
    if (json.name !== name) throw new Error(`${manifest}: "name" must be "${name}"`);
    packs.set(name, {
      name,
      description: typeof json.description === "string" ? json.description : "",
      version: typeof json.version === "string" ? json.version : "",
      tags: stringList(json.tags, manifest, "tags"),
      authors: stringList(json.authors, manifest, "authors"),
      requires: stringList(json.requires, manifest, "requires"),
      conflicts: stringList(json.conflicts, manifest, "conflicts"),
      packVersions: versionMap(json.packVersions),
      notes: stringList(json.notes, manifest, "notes"),
      ...(typeof json.latest === "string" ? { latest: json.latest } : {}),
      dir: join(dir, name),
    });
  }
  return packs;
}

/** Loads every stack file, keyed by name. A missing folder means no stacks. */
export function loadStacks(dir = STACKS_DIR): Map<string, Stack> {
  const stacks = new Map<string, Stack>();
  if (!existsSync(dir)) return stacks;
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".json")) continue;
    const path = join(dir, file);
    const json = readJson(path);
    const name = file.slice(0, -".json".length);
    if (json.name !== name) throw new Error(`${path}: "name" must be "${name}"`);
    stacks.set(name, {
      name,
      description: typeof json.description === "string" ? json.description : "",
      version: typeof json.version === "string" ? json.version : "",
      packs: stringList(json.packs, path, "packs"),
    });
  }
  return stacks;
}

/**
 * Turns config stacks and packs into pack requests. A stack's folder applies to all its packs.
 * A config entry's `version`, or a stack's `name@version`, sets the pack's technology version.
 */
export function requestsFor(
  stacks: Entry[],
  packs: Entry[],
  definitions: Map<string, Stack>,
): PackRequest[] {
  const requests: PackRequest[] = [];
  const request = (
    ref: string,
    path: string[] | undefined,
    version: string | undefined,
    from: PackRequest["from"],
  ) => {
    const parsed = parseRef(ref);
    const chosen = version ?? parsed.version;
    requests.push({
      name: parsed.name,
      scope: scopeOf(path),
      ...(chosen === undefined ? {} : { version: chosen }),
      from,
    });
  };
  for (const entry of stacks) {
    const stack = definitions.get(entry.name);
    if (!stack) {
      throw new Error(`Unknown stack "${entry.name}". Run "aidev-instruct stacks" to see stacks.`);
    }
    for (const ref of stack.packs) request(ref, entry.path, undefined, { stacks: [entry.name] });
  }
  for (const entry of packs) request(entry.name, entry.path, entry.version, { config: true });
  return requests;
}

/** A wish for a pack's version in some folders. A config version beats a pin, a pin a default. */
interface VersionClaim {
  name: string;
  scope: Scope;
  version?: string;
  level: 0 | 1 | 2;
  /** The pack whose `requires` set the pin. */
  requiredBy?: string;
}

/** A minimum a `requires` range sets, checked against the version resolved in its folders. */
interface VersionRequirement {
  name: string;
  range: string;
  scope: Scope;
  requiredBy: string;
}

/**
 * Returns the requested packs and everything they require, dependencies first. A required
 * pack applies wherever a pack that needs it applies. Conflicting packs are an error.
 *
 * Each pack also gets its technology version per folder: a version in the config wins over a
 * `requires` pin such as `csharp@7.3`, a pin wins over the pack's `latest`. Two versions of
 * one pack in overlapping folders are an error, because rule globs cannot exclude a folder.
 */
export function resolve(requests: PackRequest[], packs: Map<string, Pack>): ResolvedPack[] {
  const ordered: Pack[] = [];
  const state = new Map<string, "visiting" | "done">();
  const scopes = new Map<string, Scope>();
  const claims: VersionClaim[] = [];
  const requirements: VersionRequirement[] = [];
  const origins = new Map<string, PackFrom>();

  /** Adds the reasons this pack is installed, from a config entry or a `requires` of another pack. */
  const record = (
    name: string,
    from: Pick<PackFrom, "stacks" | "requiredBy" | "config"> | undefined,
  ) => {
    if (!from) return;
    const found = origins.get(name) ?? {};
    const stacks = [...new Set([...(found.stacks ?? []), ...(from.stacks ?? [])])].sort();
    const requiredBy = [
      ...new Set([...(found.requiredBy ?? []), ...(from.requiredBy ?? [])]),
    ].sort();
    origins.set(name, {
      ...(stacks.length ? { stacks } : {}),
      ...(requiredBy.length ? { requiredBy } : {}),
      ...(found.config || from.config ? { config: true } : {}),
    });
  };

  const visit = (
    name: string,
    chain: string[],
    scope: Scope,
    claim: Omit<VersionClaim, "name" | "scope">,
    from?: Pick<PackFrom, "stacks" | "requiredBy" | "config">,
  ) => {
    const pack = packs.get(name);
    if (!pack) {
      const via = chain.length ? ` (required by ${chain.at(-1)})` : "";
      throw new Error(`Unknown pack "${name}"${via}. Run "aidev-instruct list" to see packs.`);
    }
    if (state.get(name) === "visiting") {
      throw new Error(`Circular requires: ${[...chain, name].join(" -> ")}`);
    }
    claims.push({ name, scope, ...claim });
    record(name, from);
    const before = scopes.get(name);
    const next = before === undefined ? scope : union(before, scope);
    const unchanged = state.get(name) === "done" && JSON.stringify(before) === JSON.stringify(next);
    if (unchanged) return;
    scopes.set(name, next);
    state.set(name, "visiting");
    for (const ref of pack.requires) {
      const dep = parseRef(ref);
      const wanted = dep.version;
      const range = wanted !== undefined && !isPin(wanted) && isRange(wanted);
      if (wanted !== undefined && range) {
        requirements.push({ name: dep.name, range: wanted, scope, requiredBy: name });
      }
      const pin =
        wanted === undefined || range
          ? { level: 0 as const }
          : { version: wanted, level: 1 as const, requiredBy: name };
      visit(dep.name, [...chain, name], scope, pin, { requiredBy: [name] });
    }
    if (!ordered.includes(pack)) ordered.push(pack);
    state.set(name, "done");
  };

  for (const request of requests) {
    const claim =
      request.version === undefined
        ? { level: 0 as const }
        : { version: request.version, level: 2 as const };
    visit(request.name, [], request.scope, claim, request.from);
  }

  const installed = new Map(ordered.map((pack) => [pack.name, pack]));
  for (const pack of ordered) {
    for (const ref of pack.conflicts) {
      const other = installed.get(parseRef(ref).name);
      if (!other) continue;
      const mine = scopes.get(pack.name) ?? null;
      const theirs = scopes.get(other.name) ?? null;
      if (!overlaps(mine, theirs)) continue;
      const where = intersect(mine, theirs);
      throw new Error(
        `Packs ${pack.name} and ${other.name} cannot be installed together in ${
          where === null ? "the whole project" : describeScope(where)
        }. Give each one its own folder with --path.`,
      );
    }
  }
  for (const pack of ordered) {
    for (const [name, range] of Object.entries(pack.packVersions)) {
      const target = installed.get(name);
      if (!target) continue;
      if (!satisfies(target.version, range)) {
        throw new Error(
          `Pack ${pack.name} needs ${name} ${range}, but ${name} here is ${target.version}.`,
        );
      }
    }
  }
  const versions = new Map(
    ordered.map((pack) => [
      pack.name,
      versionsOf(
        pack,
        claims.filter((c) => c.name === pack.name),
        requirements.filter((r) => r.name === pack.name),
      ),
    ]),
  );
  const warnings = new Map<string, string[]>(ordered.map((pack) => [pack.name, []]));
  for (const pack of ordered) {
    for (const claim of claims.filter((c) => c.name === pack.name)) {
      if (claim.level !== 1 || claim.version === undefined || claim.requiredBy === undefined)
        continue;
      if (!claims.some((other) => other.level === 2 && covers(other.scope, claim.scope))) continue;
      const resolved = (versions.get(pack.name) as PackVersion[]).find((version) =>
        overlaps(version.scope, claim.scope),
      );
      if (!resolved || resolved.version === undefined || resolved.version === claim.version)
        continue;
      const where = intersect(claim.scope, resolved.scope);
      (warnings.get(claim.requiredBy) as string[]).push(
        `${claim.requiredBy} requires ${pack.name}@${claim.version}; the config sets ${pack.name}@${resolved.version} in ${describeScope(where)}.`,
      );
    }
  }
  return ordered.map((pack) => ({
    ...pack,
    scope: scopes.get(pack.name) ?? null,
    versions: versions.get(pack.name) as PackVersion[],
    warnings: warnings.get(pack.name) as string[],
    from: origins.get(pack.name) ?? {},
  }));
}

/** Names a version in a message. */
const label = (v: PackVersion) => v.version ?? "(none)";

/** Picks the version per folder from a pack's claims, then fails on overlapping versions or an unmet minimum. */
function versionsOf(
  pack: Pack,
  claims: VersionClaim[],
  requirements: VersionRequirement[],
): PackVersion[] {
  const kept = claims.filter(
    (claim) =>
      !claims.some((other) => other.level > claim.level && covers(other.scope, claim.scope)),
  );
  const byVersion = new Map<string | undefined, Scope>();
  for (const claim of kept) {
    const version = claim.version ?? pack.latest;
    const known = byVersion.has(version);
    byVersion.set(
      version,
      known ? union(byVersion.get(version) as Scope, claim.scope) : claim.scope,
    );
  }
  const versions = [...byVersion].map(([version, scope]) =>
    version === undefined ? { scope } : { version, scope },
  );
  for (const [index, a] of versions.entries()) {
    for (const b of versions.slice(index + 1)) {
      if (overlaps(a.scope, b.scope)) {
        throw new Error(
          `Pack ${pack.name} is on version ${label(a)} in ${describeScope(a.scope)} and on ${label(b)} in ${describeScope(b.scope)}. Give each version its own folder with --path.`,
        );
      }
    }
  }
  for (const requirement of requirements) {
    for (const version of versions) {
      if (!overlaps(requirement.scope, version.scope)) continue;
      const where = intersect(requirement.scope, version.scope);
      const actual = version.version;
      if (actual !== undefined && satisfies(actual, requirement.range)) continue;
      throw new Error(
        `Pack ${requirement.requiredBy} requires ${pack.name} ${requirement.range} in ${describeScope(
          where,
        )}, but ${pack.name} is on version ${actual ?? "(none)"} there. Give each one its own folder with --path.`,
      );
    }
  }
  return versions;
}
