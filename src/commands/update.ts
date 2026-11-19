import { CONFIG_FILE } from "../config.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import { apply, loadConfig, type Options, world } from "../session.ts";

/** Installs what the config lists. */
export async function update(io: IO, options: Options, version: string): Promise<number> {
  const config = loadConfig(options);
  if (!config) return fail(io, `No ${CONFIG_FILE} in ${options.root}. Run "aidev-instruct init".`);
  apply(io, options, config, await world(io, options, config, "latest", version), version);
  return 0;
}
