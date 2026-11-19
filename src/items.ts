import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { parse, removeKey } from "./frontmatter.ts";
import { readText, walk } from "./fs.ts";
import type { ResolvedPack } from "./packs.ts";
import { intersect, type Scope, union } from "./scope.ts";
import { isPin, satisfies } from "./versions.ts";

/** Item kinds, named after their folders in a pack. */
export const KINDS = ["rules", "skills", "agents"] as const;
export type Kind = (typeof KINDS)[number];

/** Pack name recorded for items from the project's own `.aidev-instruct/` folder. */
export const LOCAL_PACK = "local";

/** One rule, skill or agent, identified across packs by kind and name. */
export interface Item {
  kind: Kind;
  name: string;
  pack: string;
  /** Rule or agent file, or skill folder. */
  path: string;
  /** Packs that must also be installed for this item to apply. */
  with: string[];
  /** Folders the item applies to. */
  scope: Scope;
  /** The technology version the item is written for. Unversioned items hold for every version. */
  version?: string;
}

/** A rule as written in a pack. No globs means it applies to every file. */
export interface Rule {
  name: string;
  title: string;
  description: string;
  globs: string[];
  body: string;
}

/** A subagent as written in a pack, in Claude Code format. */
export interface Agent {
  name: string;
  description: string;
  /** Claude Code tool names, such as `Read` and `Bash`. */
  tools: string[];
  readonly: boolean;
  body: string;
  /** The file as written without `with`, for tools that read the Claude Code format. */
  source: string;
  path: string;
}

/** A file inside a skill folder, relative to that folder. */
export interface SkillFile {
  file: string;
  content: string;
}

/** Reads and validates a rule file. */
export function readRule(path: string): Rule {
  const { data, body } = parse(readText(path));
  const globs = data.globs ?? [];
  if (!Array.isArray(globs)) throw new Error(`${path}: "globs" must be a list`);
  if (typeof data.description !== "string") throw new Error(`${path}: "description" is required`);
  return {
    name: basename(path, ".md"),
    title: /^# (.+)$/m.exec(body)?.[1]?.trim() ?? basename(path, ".md"),
    description: data.description,
    globs,
    body,
  };
}

/** Reads and validates an agent file. */
export function readAgent(path: string): Agent {
  const source = removeKey(removeKey(readText(path), "with"), "version");
  const { data, body } = parse(source);
  if (typeof data.name !== "string" || typeof data.description !== "string") {
    throw new Error(`${path}: "name" and "description" are required`);
  }
  const tools = typeof data.tools === "string" ? data.tools.split(",") : (data.tools ?? []);
  if (!Array.isArray(tools)) throw new Error(`${path}: "tools" must be a list`);
  return {
    name: data.name,
    description: data.description,
    tools: tools.map((tool) => tool.trim()).filter(Boolean),
    readonly: data.readonly === true,
    body,
    source,
    path,
  };
}

/** Reads every file of a skill folder. `with` is removed from `SKILL.md`. */
export function readSkill(dir: string): SkillFile[] {
  return walk(dir).map((file) => {
    const content = readText(join(dir, file));
    return {
      file,
      content: file === "SKILL.md" ? removeKey(removeKey(content, "with"), "version") : content,
    };
  });
}

/** Reads the `with` list and the `version` of a rule, agent or skill. */
function readMeta(kind: Kind, path: string): { with: string[]; version?: string } {
  const file = kind === "skills" ? join(path, "SKILL.md") : path;
  if (!existsSync(file)) return { with: [] };
  const { data } = parse(readText(file));
  const list = data.with ?? [];
  if (!Array.isArray(list)) throw new Error(`${file}: "with" must be a list`);
  if (data.version === undefined) return { with: list };
  if (typeof data.version !== "string") throw new Error(`${file}: "version" must be a string`);
  return { with: list, version: data.version };
}

/** Lists the rules, skills and agents in a pack folder. */
export function listItems(dir: string, pack: string, scope: Scope = null): Item[] {
  const items: Item[] = [];
  for (const kind of KINDS) {
    const base = join(dir, kind);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base).sort()) {
      const path = join(base, entry);
      if (kind === "skills" ? statSync(path).isDirectory() : entry.endsWith(".md")) {
        items.push({
          kind,
          name: basename(entry, ".md"),
          pack,
          path,
          ...readMeta(kind, path),
          scope,
        });
      }
    }
  }
  return items;
}

/** Hashes an item's source, to notice upstream changes to items a project replaces. */
export function itemHash(item: Item): string {
  const files =
    item.kind === "skills" ? walk(item.path).map((f) => join(item.path, f)) : [item.path];
  const hash = createHash("sha256");
  for (const file of files) hash.update(readText(file));
  return hash.digest("hex");
}

/** A local item that replaces a pack item, with the hash of the pack's version. */
export interface Override {
  item: string;
  pack: string;
  hash: string;
}

/** The items to install after integrations, exclusions and local replacements. */
export interface Selection {
  items: Item[];
  overrides: Override[];
  unusedExcludes: string[];
}

/**
 * Collects the items of the given packs. An item with `with` is kept only when every pack it
 * names is installed, and then applies only where all of them apply. Excluded items are
 * dropped, and local items replace pack items of the same kind and name.
 */
export function selectItems(
  packs: ResolvedPack[],
  exclude: string[],
  localDir?: string,
): Selection {
  const scopes = new Map(packs.map((pack) => [pack.name, pack.scope]));
  const items = new Map<string, Item>();
  const used = new Set<string>();

  /** Narrows an item to where its `with` packs apply, or returns undefined when one is missing. */
  const applicable = (item: Item): Item | undefined => {
    let scope = item.scope;
    for (const name of item.with) {
      if (!scopes.has(name)) return undefined;
      scope = intersect(scope, scopes.get(name) ?? null);
    }
    return scope !== null && scope.length === 0 ? undefined : { ...item, scope };
  };

  for (const pack of packs) {
    for (const listed of listItems(pack.dir, pack.name, pack.scope)) {
      const found = forVersion(listed, pack);
      if (!found) continue;
      const key = `${found.kind}/${found.name}`;
      const other = items.get(key);
      if (other) throw new Error(`Packs ${other.pack} and ${pack.name} both have ${key}`);
      const excludedBy = exclude.filter((entry) => excludes(entry, found.name, key));
      if (excludedBy.length) {
        for (const entry of excludedBy) used.add(entry);
        continue;
      }
      const item = applicable(found);
      if (item) items.set(key, item);
    }
  }

  const overrides: Override[] = [];
  for (const found of localDir ? listItems(localDir, LOCAL_PACK) : []) {
    const item = applicable(found);
    if (!item) continue;
    const key = `${item.kind}/${item.name}`;
    const upstream = items.get(key);
    if (upstream) overrides.push({ item: key, pack: upstream.pack, hash: itemHash(upstream) });
    items.set(key, item);
  }

  return {
    items: [...items.values()],
    overrides,
    unusedExcludes: exclude.filter((name) => !used.has(name)),
  };
}

/**
 * Narrows a versioned item to the folders where its pack is on that version or inside the
 * range, or returns undefined when no folder is. Unversioned items keep the pack's folders.
 */
function forVersion(item: Item, pack: ResolvedPack): Item | undefined {
  if (item.version === undefined) return item;
  const wanted = item.version;
  const matching = pack.versions.filter(
    (entry) =>
      entry.version !== undefined &&
      (isPin(wanted) ? entry.version === wanted : satisfies(entry.version, wanted)),
  );
  if (!matching.length) return undefined;
  const scope = matching.reduce<Scope>((all, entry) => union(all, entry.scope), []);
  return { ...item, scope };
}

/**
 * True when an `exclude` entry matches an item by name or `kind/name`. `*` matches any
 * characters within a name, so `tanstack-*` and `rules/tanstack-*` work.
 */
export function excludes(entry: string, name: string, key: string): boolean {
  const escaped = entry.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped.replaceAll("*", "[^/]*")}$`);
  return pattern.test(name) || pattern.test(key);
}
