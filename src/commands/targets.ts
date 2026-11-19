import { CONFIG_FILE } from "../config.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import { apply, loadConfig, type Options, world } from "../session.ts";
import { DEFAULT_TARGETS, parseTargets, TARGETS } from "../targets.ts";
import { unique } from "../util.ts";

/** Handles `targets add` and `targets remove`. */
export async function changeTargets(
  io: IO,
  options: Options,
  action: "add" | "remove",
  names: string[],
  version: string,
): Promise<number> {
  const config = loadConfig(options);
  if (!config) return fail(io, `No ${CONFIG_FILE} in ${options.root}. Run "aidev-instruct init".`);
  const ids = parseTargets(names);
  const targets =
    action === "add"
      ? unique([...config.targets, ...ids])
      : config.targets.filter((t) => !ids.includes(t));
  if (!targets.length) return fail(io, "Keep at least one target.");
  const next = { ...config, targets };
  apply(io, options, next, await world(io, options, next, "locked", version), version);
  return 0;
}

/** Prints every target, marking the ones this project uses. */
export function listTargets(io: IO, options: Options): number {
  const config = loadConfig(options);
  const active: string[] = config?.targets ?? [];
  const width = Math.max(...TARGETS.map((t) => t.id.length));
  for (const target of TARGETS) {
    const mark = active.includes(target.id) ? "*" : " ";
    const folders = target.folders;
    io.out(
      `${mark} ${target.id.padEnd(width)}  ${target.name}: rules ${folders.rules}, skills ${folders.skills}, agents ${folders.agents}`,
    );
  }
  io.out(`\nDefault: ${DEFAULT_TARGETS.join(", ")}${config ? "  * in the config" : ""}`);
  return 0;
}
