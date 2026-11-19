import { resolve as resolvePath } from "node:path";
import {
  type Config,
  type Lock,
  type LockedPack,
  readConfig,
  readLock,
  writeConfig,
} from "./config.ts";
import type { FeedLock, FeedMode } from "./feeds.ts";
import { loadFeeds } from "./feeds.ts";
import { type IO, noteText, report, style } from "./output.ts";
import {
  type Entry,
  loadPacks,
  loadStacks,
  type Pack,
  parseRef,
  requestsFor,
  type Stack,
} from "./packs.ts";
import { normalizePath } from "./scope.ts";
import type { SyncResult } from "./sync.ts";
import { type SyncOptions, sync } from "./sync.ts";
import { changeKind, compareVersions } from "./versions.ts";

/** Where to run, and where packs and stacks come from. Tests point these at fixtures. */
export interface Context {
  cwd?: string;
  packsDir?: string;
  stacksDir?: string;
  /** Replaces the global fetch for feed tests. */
  fetch?: typeof fetch;
  cacheDir?: string;
  env?: NodeJS.ProcessEnv;
  /** The Node version doctor checks. Defaults to the running one. */
  nodeVersion?: string;
}

/** Options shared by every command. */
export interface Options {
  root: string;
  packsDir?: string;
  stacksDir?: string;
  targets?: string;
  stacks?: string;
  packs?: string;
  /** The folders from `--path`, already split on commas and repeatable. */
  path: string[];
  version?: string;
  tokenEnv?: string;
  bump: string[];
  orig: boolean;
  force: boolean;
  dryRun: boolean;
  fetch?: typeof fetch;
  cacheDir?: string;
  env: NodeJS.ProcessEnv;
  nodeVersion?: string;
}

/** The packs and stacks a command works with: official ones, then feed ones. */
export interface World {
  packs: Map<string, Pack>;
  stacks: Map<string, Stack>;
  /** The feed each feed item comes from. */
  origins: Map<string, string>;
  /** The release each GitHub feed is read at. */
  feeds: Record<string, FeedLock>;
}

/** The CLI version, which every session needs for feeds and the lock. */
export interface Session {
  version: string;
  nodeRange: string;
}

/** Resolves `--dir` against the working directory and fills the context defaults. */
export function optionsOf(
  values: {
    dir?: string;
    targets?: string;
    stacks?: string;
    packs?: string;
    path?: string[];
    version?: string;
    tokenEnv?: string;
    bump?: string[];
    orig?: boolean;
    force?: boolean;
    dryRun?: boolean;
  },
  context: Context,
): Options {
  return {
    root: resolvePath(context.cwd ?? process.cwd(), values.dir ?? "."),
    packsDir: context.packsDir,
    stacksDir: context.stacksDir,
    targets: values.targets,
    stacks: values.stacks,
    packs: values.packs,
    path: values.path ?? [],
    version: values.version,
    tokenEnv: values.tokenEnv,
    bump: values.bump ?? [],
    orig: values.orig ?? false,
    force: values.force ?? false,
    dryRun: values.dryRun ?? false,
    fetch: context.fetch,
    cacheDir: context.cacheDir,
    env: context.env ?? process.env,
    nodeVersion: context.nodeVersion,
  };
}

/** Loads the official items and every feed the config lists. */
export async function world(
  io: IO,
  options: Options,
  config: Config | undefined,
  mode: FeedMode,
  version: string,
): Promise<World> {
  const packs = loadPacks(options.packsDir);
  const stacks = loadStacks(options.stacksDir);
  const feeds = config?.feeds ?? [];
  if (!feeds.length) return { packs, stacks, origins: new Map(), feeds: {} };
  const loaded = await loadFeeds(feeds, {
    root: options.root,
    mode,
    lock: readLock(options.root)?.feeds ?? {},
    cliVersion: version,
    officialPacks: packs.keys(),
    officialStacks: stacks.keys(),
    fetch: options.fetch ?? fetch,
    cacheDir: options.cacheDir,
    env: options.env,
  });
  for (const notice of loaded.notices) io.out(`Note: ${notice}`);
  return {
    packs: new Map([...packs, ...loaded.packs]),
    stacks: new Map([...stacks, ...loaded.stacks]),
    origins: loaded.origins,
    feeds: loaded.lock,
  };
}

/** Fails when a config entry names a feed the item does not come from. */
export function assertFeeds(config: Config, current: World) {
  const entries = [
    ...config.stacks.map((entry) => ["Stack", entry] as const),
    ...config.packs.map((entry) => ["Pack", entry] as const),
  ];
  for (const [label, entry] of entries) {
    if (!entry.feed) continue;
    const origin = current.origins.get(entry.name);
    if (origin !== entry.feed) {
      throw new Error(
        `${label} "${entry.name}" must come from feed "${entry.feed}", but it comes from ${
          origin ? `feed "${origin}"` : "the official packs"
        }.`,
      );
    }
  }
}

/** The message for a project installed by a newer CLI, or undefined when the lock is not newer. */
export function downgradeProblem(lock: Lock | undefined, version: string): string | undefined {
  if (!lock?.version || compareVersions(lock.version, version) <= 0) return undefined;
  return `This project was installed with ${lock.version}. This CLI is ${version}. Run npx aidev-instruct@${lock.version} update, or pass --force to downgrade.`;
}

/** Installs the config, then saves it. Prints notes for packs that were not installed before. */
export function apply(
  io: IO,
  options: Options,
  config: Config,
  current: World,
  version: string,
  created?: string,
): SyncResult {
  assertFeeds(config, current);
  const previous = readLock(options.root);
  const problem = downgradeProblem(previous, version);
  if (problem && !options.force) throw new Error(problem);
  const before = Object.keys(previous?.packs ?? {});
  const syncOptions: SyncOptions = {
    root: options.root,
    requests: requestsFor(config.stacks, config.packs, current.stacks),
    targets: config.targets,
    exclude: config.exclude,
    modified: options.orig ? "orig" : config.modified,
    version,
    force: options.force,
    dryRun: options.dryRun,
    packs: current.packs,
    feeds: current.feeds,
  };
  const planned = problem ? sync({ ...syncOptions, dryRun: true }) : undefined;
  if (planned && previous) {
    const removed = planned.actions
      .filter((action) => action.kind === "delete")
      .map((action) => action.path);
    io.out(
      `Downgrade ${previous.version} -> ${version}, removing ${removed.length} file${removed.length === 1 ? "" : "s"}${removed.length ? `: ${removed.join(", ")}` : ""}.`,
    );
  }
  const result = options.dryRun && planned ? planned : sync(syncOptions);
  if (!options.dryRun) writeConfig(options.root, config);
  report(io, result, options.dryRun);
  for (const line of versionChanges(previous, result.installed)) io.out(line);
  if (created && !options.dryRun) io.out(`\n${created}`);
  const notes = result.installed
    .filter((pack) => !before.includes(pack.name))
    .flatMap((pack) => pack.notes.map((note) => ({ pack: pack.name, note })));
  if (notes.length) {
    io.out(`\n${style(io, ["bold", "yellow"], "Next steps")}`);
    for (const { pack, note } of notes)
      io.out(`  ${style(io, "bold", pack)}: ${noteText(io, note)}`);
  }
  return result;
}

/** What `update` would do with the config, computed without writing. */
export function preview(
  options: Options,
  config: Config,
  current: World,
  version: string,
): SyncResult {
  return sync({
    root: options.root,
    requests: requestsFor(config.stacks, config.packs, current.stacks),
    targets: config.targets,
    exclude: config.exclude,
    modified: config.modified,
    version,
    dryRun: true,
    packs: current.packs,
  });
}

/** Describes config changes that are not installed yet. */
export function pending(lock: Lock | undefined, config: Config, result: SyncResult): string[] {
  const installed = Object.keys(lock?.packs ?? {});
  const wanted = result.installed.map((p) => p.name);
  const lines = versionChanges(lock, result.installed);
  const diff = (label: string, before: string[], after: string[]) => {
    const added = after.filter((x) => !before.includes(x));
    const removed = before.filter((x) => !after.includes(x));
    if (added.length) lines.push(`Pending ${label} to add: ${added.join(", ")}`);
    if (removed.length) lines.push(`Pending ${label} to remove: ${removed.join(", ")}`);
  };
  diff("packs", installed, wanted);
  diff("targets", lock?.targets ?? [], config.targets);
  const moved = result.installed.filter((pack) => {
    const locked = lock?.packs[pack.name];
    return locked && JSON.stringify(locked.paths ?? null) !== JSON.stringify(pack.scope);
  });
  if (moved.length) lines.push(`Pending folder changes: ${moved.map((p) => p.name).join(", ")}`);
  return lines;
}

/** Names each installed pack whose version differs from the one in the lock. */
export function versionChanges(
  lock: Lock | undefined,
  installed: SyncResult["installed"],
): string[] {
  return installed.flatMap((pack) => {
    const locked = lock?.packs[pack.name]?.version;
    if (!locked || !pack.version || locked === pack.version) return [];
    return [`${pack.name} ${locked} -> ${pack.version} (${changeKind(locked, pack.version)})`];
  });
}

/** Prints every installed pack with the folders it applies to and why it is there. */
export function printInstalledPacks(io: IO, lock: Lock | undefined, current: World) {
  const packs = Object.entries(lock?.packs ?? {});
  if (!packs.length) {
    io.out("Installed packs: none");
    return;
  }
  io.out("Installed packs:");
  const width = Math.max(...packs.map(([name]) => name.length));
  const showFeed = current.origins.size > 0;
  const sources = packs.map(([, entry]) => source(entry));
  const sourceWidth = Math.max(...sources.map((value) => value.length));
  for (const [index, [name, entry]] of packs.entries()) {
    const folders = entry.paths?.length ? `  ${entry.paths.join(", ")}` : "";
    if (!showFeed) {
      io.out(`  ${name.padEnd(width)}  ${sources[index]}${folders}`);
      continue;
    }
    const origin = current.origins.get(name) ?? "official";
    io.out(
      `  ${name.padEnd(width)}  ${(sources[index] as string).padEnd(sourceWidth)}  ${origin}${folders}`,
    );
  }
}

/** Describes the reasons a locked pack is installed, such as `stack site` or `required by web`. */
export function source(entry: LockedPack): string {
  const from = entry.from;
  return [
    ...(from.stacks ?? []).map((stack) => `stack ${stack}`),
    ...(from.requiredBy ?? []).map((pack) => `required by ${pack}`),
    ...(from.config ? ["config"] : []),
  ].join(", ");
}

/** Builds a config entry from a `name` or `name@version`, the `--version` option and `--path`. */
export function entry(name: string, options: Options): Entry {
  const parsed = parseRef(name);
  const version = parsed.version ?? options.version;
  const paths = [...new Set(options.path.map(normalizePath).filter(Boolean))];
  return {
    name: parsed.name,
    ...(paths.length ? { path: paths } : {}),
    ...(version === undefined ? {} : { version }),
  };
}

/** Reads the config, or returns `undefined` when the project has none. The read never writes. */
export function loadConfig(options: Options): Config | undefined {
  return readConfig(options.root);
}
