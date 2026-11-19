import { addEntries, CONFIG_FILE, type Config, defaultConfig } from "../config.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import { apply, entry, loadConfig, type Options, world } from "../session.ts";

/** Adds packs to the config, creating the config with default targets when missing. */
export async function add(
  io: IO,
  options: Options,
  names: string[],
  version: string,
): Promise<number> {
  if (!names.length) return fail(io, 'Name at least one pack. Run "aidev-instruct list".');
  const existing = loadConfig(options);
  const config: Config = existing ?? defaultConfig();
  const packs = addEntries(
    config.packs,
    names.map((name) => entry(name, options)),
  );
  const next = { ...config, packs };
  apply(
    io,
    options,
    next,
    await world(io, options, next, "locked", version),
    version,
    existing ? undefined : `Created ${CONFIG_FILE}.`,
  );
  return 0;
}
