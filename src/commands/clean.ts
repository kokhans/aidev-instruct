import { rmSync } from "node:fs";
import { join } from "node:path";
import { LOCK_FILE, readLock } from "../config.ts";
import type { IO } from "../output.ts";
import { print, report } from "../output.ts";
import { loadConfig, type Options } from "../session.ts";
import { sync } from "../sync.ts";

/**
 * Deletes every file the lock lists, then the lock. Keeps the config and `.aidev-instruct/`,
 * so `update` restores everything. Files changed by hand are skipped unless `--force` or
 * `--orig` is set.
 */
export function clean(io: IO, options: Options, version: string): number {
  const lock = readLock(options.root);
  if (!lock) return print(io, `No ${LOCK_FILE} in ${options.root}. Nothing to clean.`);
  const config = loadConfig(options);
  const result = sync({
    root: options.root,
    requests: [],
    targets: [],
    version,
    modified: options.orig ? "orig" : (config?.modified ?? "keep"),
    force: options.force,
    dryRun: options.dryRun,
    skipLocal: true,
  });
  report(io, result, options.dryRun);
  if (!options.dryRun) {
    rmSync(join(options.root, LOCK_FILE));
    io.out(`Deleted ${LOCK_FILE}. Run "aidev-instruct update" to install again.`);
  }
  return 0;
}
