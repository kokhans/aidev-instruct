import type { Entry } from "./packs.ts";

/** Removes duplicates and keeps the first occurrence's order. */
export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** Splits a comma-separated option into trimmed names. */
export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Joins names as "a, b or c". */
export function orList(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

/** The JSON form of an entry: a plain name, or an object with one folder written as a string. */
export type EntryJson = {
  name: string;
  path?: string | string[];
  version?: string;
  feed?: string;
};

/** Writes an entry as a plain name when it has no folder, version or feed. */
export function entryJson(entry: Entry): string | EntryJson {
  const path = entry.path?.length === 1 ? entry.path[0] : entry.path;
  if (path === undefined && !entry.version && !entry.feed) return entry.name;
  return {
    name: entry.name,
    ...(path === undefined ? {} : { path }),
    ...(entry.version === undefined ? {} : { version: entry.version }),
    ...(entry.feed === undefined ? {} : { feed: entry.feed }),
  };
}
