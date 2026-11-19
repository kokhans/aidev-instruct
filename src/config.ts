import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Feed, FeedLock } from "./feeds.ts";
import { readJson, writeJson } from "./fs.ts";
import { KINDS } from "./items.ts";
import type { Entry, PackFrom } from "./packs.ts";
import { normalizePath } from "./scope.ts";
import { DEFAULT_TARGETS, parseTargets, type TargetId } from "./targets.ts";
import { entryJson, unique } from "./util.ts";

/** Config file. People edit it, and so do `add`, `remove`, `stacks` and `targets`. */
export const CONFIG_FILE = ".aidev-instruct.json";

/** Lock file. Every install rewrites it. Never edited by hand. */
export const LOCK_FILE = ".aidev-instruct.lock.json";

/** The project's own rules, skills and agents, in pack layout. The CLI never writes here. */
export const LOCAL_DIR = ".aidev-instruct";

/**
 * What to do with a file changed by hand when an install would change or delete it.
 * `keep` leaves it and reports it. `orig` saves it as `<file>.orig` and writes the new version.
 */
export const MODIFIED = ["keep", "orig"] as const;
export type Modified = (typeof MODIFIED)[number];

/** What the project asks for. */
export interface Config {
  targets: TargetId[];
  /** Company feeds that serve packs and stacks, in config order. */
  feeds: Feed[];
  stacks: Entry[];
  packs: Entry[];
  /** Item names, or `kind/name`, never installed from packs. */
  exclude: string[];
  modified: Modified;
}

/** An installed pack, the packs it requires, and its folders when it does not cover the project. */
export interface LockedPack {
  requires: string[];
  paths?: string[];
  /** The pack version this install wrote. */
  version: string;
  /** Why the pack is installed. */
  from: PackFrom;
}

/** A file the CLI wrote, with its source pack and the hash of what it wrote. */
export interface LockedFile {
  pack: string;
  hash: string;
}

/** A local item that replaces a pack item. */
export interface LockedOverride {
  /** Pack whose item the local item replaces. */
  pack: string;
  /** Hash of that pack item's source at the last install. */
  hash: string;
}

/** What is installed. */
export interface Lock {
  lockfileVersion: 1;
  version: string;
  targets: TargetId[];
  packs: Record<string, LockedPack>;
  /** The release each GitHub feed was read at. */
  feeds: Record<string, FeedLock>;
  overrides: Record<string, LockedOverride>;
  /** Files the CLI owns completely. */
  files: Record<string, LockedFile>;
}

/** Returns a config with the given targets and nothing installed. */
export function defaultConfig(targets: TargetId[] = [...DEFAULT_TARGETS]): Config {
  return { targets, feeds: [], stacks: [], packs: [], exclude: [], modified: "keep" };
}

/**
 * Checks one `exclude` entry: a name, or `kind/name` with `rules`, `skills` or `agents` before
 * the slash. An unknown kind is an error, so a typo cannot look like an entry that matches nothing.
 */
export function checkExclude(entry: string) {
  const slash = entry.lastIndexOf("/");
  if (slash === -1) return;
  const kind = entry.slice(0, slash);
  if (!(KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unknown exclude kind "${kind}". Use rules/, skills/ or agents.`);
  }
}

/** Reads the config, or returns `undefined` when the project has none. */
export function readConfig(root: string): Config | undefined {
  const path = join(root, CONFIG_FILE);
  if (!existsSync(path)) return undefined;
  const json = readJson(path);
  const targets = json.targets ?? [...DEFAULT_TARGETS];
  const exclude = json.exclude ?? [];
  if (!isStringList(targets) || !isStringList(exclude)) {
    throw new Error(`${CONFIG_FILE}: "targets" and "exclude" must be lists of names.`);
  }
  const modified = json.modified ?? "keep";
  if (!(MODIFIED as readonly unknown[]).includes(modified)) {
    throw new Error(`${CONFIG_FILE}: "modified" must be one of ${MODIFIED.join(", ")}.`);
  }
  const excluded = unique(exclude);
  for (const entry of excluded) checkExclude(entry);
  return {
    targets: targets.length ? parseTargets(targets) : [...DEFAULT_TARGETS],
    feeds: parseFeeds(json.feeds),
    stacks: parseEntries(json.stacks, "stacks"),
    packs: parseEntries(json.packs, "packs"),
    exclude: excluded,
    modified: modified as Modified,
  };
}

/** Writes the config. Empty lists and the default `modified` are left out. */
export function writeConfig(root: string, config: Config) {
  const json: Record<string, unknown> = { targets: config.targets };
  if (config.feeds.length) json.feeds = config.feeds;
  if (config.stacks.length) json.stacks = config.stacks.map(entryJson);
  json.packs = config.packs.map(entryJson);
  if (config.exclude.length) json.exclude = config.exclude;
  if (config.modified !== "keep") json.modified = config.modified;
  writeJson(join(root, CONFIG_FILE), json);
}

/** Reads the lock, or returns `undefined` when nothing was installed yet. */
export function readLock(root: string): Lock | undefined {
  const path = join(root, LOCK_FILE);
  if (!existsSync(path)) return undefined;
  const lock = readJson(path);
  if (lock.lockfileVersion !== 1) {
    throw new Error(`${path}: "lockfileVersion" must be 1.`);
  }
  for (const key of ["version", "targets", "packs", "feeds", "overrides", "files"]) {
    if (lock[key] === undefined) throw new Error(`${path}: "${key}" is required.`);
  }
  for (const [name, pack] of Object.entries(lock.packs as Record<string, unknown>)) {
    for (const field of ["requires", "version", "from"]) {
      if ((pack as Record<string, unknown>)[field] === undefined) {
        throw new Error(`${path}: "packs.${name}.${field}" is required.`);
      }
    }
  }
  return lock as unknown as Lock;
}

/** Writes the lock. */
export function writeLock(root: string, lock: Lock) {
  writeJson(join(root, LOCK_FILE), lock);
}

/**
 * Adds entries to a list. An entry with the same name and version merges its folders into the
 * existing one, and a different version appends a new entry.
 */
export function addEntries(list: Entry[], added: Entry[]): Entry[] {
  const entries = [...list];
  for (const entry of added) {
    const index = entries.findIndex(
      (other) => other.name === entry.name && other.version === entry.version,
    );
    if (index < 0) entries.push(entry);
    else entries[index] = mergeEntry(entries[index] as Entry, entry);
  }
  return entries;
}

/** Merges two entries of the same name and version: folders are a union, `feed` must agree. */
function mergeEntry(entry: Entry, added: Entry): Entry {
  if (entry.feed && added.feed && entry.feed !== added.feed) {
    throw new Error(
      `"${entry.name}" comes from feed "${entry.feed}" and feed "${added.feed}". Keep one.`,
    );
  }
  const folders = [...new Set([...(entry.path ?? []), ...(added.path ?? [])])];
  const whole = entry.path === undefined || added.path === undefined;
  const feed = entry.feed ?? added.feed;
  return {
    name: entry.name,
    ...(entry.version === undefined ? {} : { version: entry.version }),
    ...(whole || !folders.length ? {} : { path: folders }),
    ...(feed === undefined ? {} : { feed }),
  };
}

/**
 * Parses `"name"` or `{ "name": "...", "path": "...", "version": "...", "feed": "..." }`
 * entries. `path` is a folder or a list of folders; entries with the same name and version
 * merge.
 */
function parseEntries(value: unknown, key: string): Entry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${CONFIG_FILE}: "${key}" must be a list.`);
  const entries = value.map((item): Entry => {
    if (typeof item === "string") return { name: item };
    if (!item || typeof item !== "object" || typeof item.name !== "string") {
      throw new Error(`${CONFIG_FILE}: every "${key}" entry needs a name.`);
    }
    for (const field of ["version", "feed"]) {
      if (item[field] !== undefined && typeof item[field] !== "string") {
        throw new Error(`${CONFIG_FILE}: "${field}" of ${item.name} must be a string.`);
      }
    }
    const paths = pathsOf(item.path, item.name);
    return {
      name: item.name,
      ...(paths.length ? { path: paths } : {}),
      ...(item.version ? { version: item.version as string } : {}),
      ...(item.feed ? { feed: item.feed as string } : {}),
    };
  });
  return entries.reduce<Entry[]>((list, entry) => addEntries(list, [entry]), []);
}

/** Reads an entry's `path`, which is a folder or a list of folders, and cleans each one. */
function pathsOf(value: unknown, name: string): string[] {
  if (value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  if (!list.every((path) => typeof path === "string")) {
    throw new Error(`${CONFIG_FILE}: "path" of ${name} must be a string or a list of strings.`);
  }
  return [...new Set((list as string[]).map(normalizePath).filter(Boolean))];
}

/** Parses `feeds`, checking names, sources and token variables. */
function parseFeeds(value: unknown): Feed[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${CONFIG_FILE}: "feeds" must be a list.`);
  const feeds = value.map((item): Feed => {
    if (!item || typeof item !== "object") {
      throw new Error(`${CONFIG_FILE}: every "feeds" entry needs a name and a source.`);
    }
    const { name, source, tokenEnv } = item as Record<string, unknown>;
    if (typeof name !== "string" || typeof source !== "string") {
      throw new Error(`${CONFIG_FILE}: every "feeds" entry needs a name and a source.`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      throw new Error(`${CONFIG_FILE}: feed name "${name}" must be kebab-case.`);
    }
    if (name === "official") {
      throw new Error(`${CONFIG_FILE}: "official" is reserved for the packs inside the CLI.`);
    }
    if (tokenEnv !== undefined) {
      if (typeof tokenEnv !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(tokenEnv)) {
        throw new Error(
          `${CONFIG_FILE}: "tokenEnv" of ${name} must be a variable name such as ACME_FEED_TOKEN.`,
        );
      }
    }
    return { name, source, ...(tokenEnv === undefined ? {} : { tokenEnv }) };
  });
  const names = feeds.map((feed) => feed.name);
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  if (duplicate) throw new Error(`${CONFIG_FILE}: feed "${duplicate}" is listed twice.`);
  return feeds;
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
