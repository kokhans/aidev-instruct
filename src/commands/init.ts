import { CONFIG_FILE, defaultConfig, LOCK_FILE } from "../config.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import type { Entry } from "../packs.ts";
import { apply, entry, loadConfig, type Options, world } from "../session.ts";
import { DEFAULT_TARGETS, parseTargets } from "../targets.ts";
import { splitList } from "../util.ts";

/** Creates the config and the lock from `-t`, `-s` and `-p`. Never asks a question. */
export async function init(
  io: IO,
  options: Options,
  names: string[],
  version: string,
): Promise<number> {
  if (names.length) {
    return fail(io, `Pass packs with -p: aidev-instruct init -p ${names.join(",")}`);
  }
  if (loadConfig(options)) {
    return fail(
      io,
      `${CONFIG_FILE} already exists. Use "add", "stacks add", "targets add" or "update".`,
    );
  }
  const targets = options.targets ? parseTargets(options.targets.split(",")) : [...DEFAULT_TARGETS];
  const list = (value: string | undefined) =>
    splitList(value ?? "").map((name): Entry => entry(name, options));
  const config = {
    ...defaultConfig(targets),
    stacks: list(options.stacks),
    packs: list(options.packs),
  };
  apply(
    io,
    options,
    config,
    await world(io, options, config, "locked", version),
    version,
    `Created ${CONFIG_FILE} and ${LOCK_FILE}.`,
  );
  return 0;
}
