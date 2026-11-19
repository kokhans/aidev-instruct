import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";

/** Reads a text file with line endings normalized. */
export function readText(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

/** Reads a JSON file and names the file when it is invalid. */
export function readJson(path: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${(error as Error).message}`);
  }
}

/** Writes a JSON file with two-space indentation and a trailing newline. */
export function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Lists files under a directory as forward-slash paths relative to it. */
export function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  const recurse = (current: string) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) recurse(full);
      else files.push(relative(dir, full).split(sep).join("/"));
    }
  };
  recurse(dir);
  return files;
}

/** Removes folders left empty by a delete, up to the project root. */
export function pruneEmptyDirs(root: string, dir: string) {
  let current = dir;
  while (current.startsWith(root) && current !== root && readdirSync(current).length === 0) {
    rmdirSync(current);
    current = dirname(current);
  }
}
