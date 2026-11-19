import { CONFIG_FILE, type Lock, readLock } from "../config.ts";
import type { IO } from "../output.ts";
import { describe, fail } from "../output.ts";
import {
  downgradeProblem,
  loadConfig,
  type Options,
  pending,
  preview,
  type World,
  world,
} from "../session.ts";
/**
 * Prints what `update` would change, without writing. Exits 1 when it would change anything:
 * config entries not installed yet, files changed or deleted by hand, new pack content, or a
 * feed release newer than the lock.
 */
export async function check(io: IO, options: Options, version: string): Promise<number> {
  const config = loadConfig(options);
  if (!config) return fail(io, `No ${CONFIG_FILE} in ${options.root}. Run "aidev-instruct init".`);
  const lock = readLock(options.root);
  const problem = downgradeProblem(lock, version);
  if (problem) return fail(io, problem);
  const current = await world(io, options, config, "latest", version);
  const result = preview(options, config, current, version);
  const lines = [...pending(lock, config, result), ...feedChanges(lock, current)];
  for (const line of lines) io.out(line);
  const changed = result.actions.filter((a) => a.kind !== "unchanged");
  for (const action of changed) io.out(describe(action));
  if (!lines.length && !changed.length) {
    io.out("Everything is up to date.");
    return 0;
  }
  io.out(`
${changed.length} file change(s). Run "aidev-instruct update" to apply.`);
  return 1;
}

/** Names each feed whose latest release differs from the release in the lock. */
function feedChanges(lock: Lock | undefined, current: World): string[] {
  return Object.entries(current.feeds).flatMap(([name, release]) => {
    const locked = lock?.feeds[name];
    if (!locked) return [`Feed ${name}: new release ${release.tag}`];
    if (locked.commit === release.commit) return [];
    return [`Feed ${name}: ${locked.tag} -> ${release.tag}`];
  });
}
