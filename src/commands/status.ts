import { CONFIG_FILE, readLock } from "../config.ts";
import type { IO } from "../output.ts";
import { print, report } from "../output.ts";
import {
  downgradeProblem,
  loadConfig,
  type Options,
  pending,
  preview,
  printInstalledPacks,
  world,
} from "../session.ts";

/** Prints what is installed according to the lock, and what `update` would change. */
export async function status(io: IO, options: Options, version: string): Promise<number> {
  const { root } = options;
  const config = loadConfig(options);
  if (!config) return print(io, `No ${CONFIG_FILE} in ${root}. Run "aidev-instruct init".`);
  const lock = readLock(root);
  const current = await world(io, options, config, "locked", version);
  const result = preview(options, config, current, version);

  printInstalledPacks(io, lock, current);
  io.out(`Installed targets: ${lock?.targets.join(", ") || "none"}`);
  for (const line of pending(lock, config, result)) io.out(line);
  if (lock?.version && lock.version !== version) {
    const hint = downgradeProblem(lock, version);
    io.out(
      hint
        ? `Installed with ${lock.version}. This CLI is ${version}. Run npx aidev-instruct@${lock.version} update, or pass --force to downgrade.`
        : `Installed with ${lock.version}. This CLI is ${version}.`,
    );
  }
  io.out("");
  report(io, result);
  const changed = result.actions.some((a) => a.kind !== "unchanged" && a.kind !== "skip");
  if (changed) io.out('Run "aidev-instruct update" to apply.');
  return 0;
}
