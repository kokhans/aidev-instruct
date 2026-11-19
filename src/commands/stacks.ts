import { addEntries, CONFIG_FILE, defaultConfig } from "../config.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import { apply, entry, loadConfig, type Options, world } from "../session.ts";
import { removeEntries } from "./remove.ts";

/** Handles `stacks add` and `stacks remove`. */
export async function changeStacks(
  io: IO,
  options: Options,
  action: "add" | "remove",
  names: string[],
  version: string,
): Promise<number> {
  const existing = loadConfig(options);
  if (!names.length) return fail(io, 'Name at least one stack. Run "aidev-instruct stacks".');
  if (action === "remove" && !existing) {
    return fail(io, `No ${CONFIG_FILE} in ${options.root}. Nothing is installed.`);
  }
  const config = existing ?? defaultConfig();
  const stacks =
    action === "add"
      ? addEntries(
          config.stacks,
          names.map((name) => entry(name, options)),
        )
      : removeEntries(config.stacks, names, options.path);
  const next = { ...config, stacks };
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

/** Prints every stack with its packs, marking the ones in the config. */
export async function listStacks(io: IO, options: Options, version: string): Promise<number> {
  const config = loadConfig(options);
  const active = (config?.stacks ?? []).map((s) => s.name);
  const stacks = [...(await world(io, options, config, "locked", version)).stacks.values()];
  if (!stacks.length) {
    io.out("No stacks available.");
    return 0;
  }
  for (const stack of stacks) {
    const mark = active.includes(stack.name) ? "*" : " ";
    io.out(`${mark} ${stack.name}: ${stack.description}`);
    io.out(`    ${stack.packs.join(", ")}`);
  }
  if (active.length) io.out("\n* in the config");
  return 0;
}
