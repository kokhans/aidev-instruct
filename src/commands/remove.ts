import { CONFIG_FILE } from "../config.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import type { Entry } from "../packs.ts";
import { parseRef } from "../packs.ts";
import { normalizePath } from "../scope.ts";
import { apply, loadConfig, type Options, world } from "../session.ts";

/** Removes packs from the config. Packs another pack or a stack needs stay installed. */
export async function remove(
  io: IO,
  options: Options,
  names: string[],
  version: string,
): Promise<number> {
  const config = loadConfig(options);
  if (!config) return fail(io, `No ${CONFIG_FILE} in ${options.root}. Nothing is installed.`);
  const wanted = names.map((name) => parseRef(name).name);
  for (const name of wanted.filter((n) => !config.packs.some((p) => p.name === n))) {
    io.out(`${name} is not listed in "packs" of ${CONFIG_FILE}.`);
  }
  const next = { ...config, packs: removeEntries(config.packs, wanted, options.path) };
  const result = apply(
    io,
    options,
    next,
    await world(io, options, next, "locked", version),
    version,
  );
  for (const pack of result.installed.filter((p) => wanted.includes(p.name))) {
    const why = [
      ...(pack.from.stacks ?? []).map((stack) => `stack ${stack} includes it`),
      ...(pack.from.requiredBy ?? []).map((name) => `required by ${name}`),
    ];
    io.out(`${pack.name} stays installed: ${why.join("; ")}.`);
  }
  return 0;
}

/**
 * Drops the named entries, or only the given folders when some are passed. An entry left
 * with no folder goes away. `remove` and `stacks remove` share this.
 */
export function removeEntries(entries: Entry[], names: string[], folders: string[]): Entry[] {
  const clean = folders.map(normalizePath).filter(Boolean);
  return entries.flatMap((entry) => {
    if (!names.includes(entry.name)) return [entry];
    if (!clean.length) return [];
    if (entry.path === undefined) return [entry];
    const kept = entry.path.filter((path) => !clean.includes(path));
    return kept.length ? [{ ...entry, path: kept }] : [];
  });
}
