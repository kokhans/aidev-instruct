import { CONFIG_FILE, type Config, defaultConfig, readLock, writeConfig } from "../config.ts";
import type { Feed } from "../feeds.ts";
import { loadFeeds, parseSource } from "../feeds.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import { loadConfig, type Options } from "../session.ts";

/** Handles `feeds`, `feeds add` and `feeds remove`. */
export async function feeds(
  io: IO,
  options: Options,
  [action, ...names]: string[],
  version: string,
): Promise<number> {
  const config = loadConfig(options);
  if (!action) return listFeeds(io, options, config);
  if (action === "add") return addFeed(io, options, config, names, version);
  if (action === "remove") return removeFeed(io, options, config, names);
  return fail(io, 'Use "feeds", "feeds add <name> <source>" or "feeds remove <name>".');
}

/** Prints each feed, whether its token variable is set, and the release the lock holds. */
function listFeeds(io: IO, options: Options, config: Config | undefined): number {
  const feeds = config?.feeds ?? [];
  if (!feeds.length) {
    io.out('No feeds in the config. Run "aidev-instruct feeds add <name> <source>".');
    return 0;
  }
  const lock = readLock(options.root);
  const env = options.env;
  for (const feed of feeds) {
    const token = feed.tokenEnv
      ? `${feed.tokenEnv} ${env[feed.tokenEnv] ? "set" : "unset"}`
      : "no token";
    const release = lock?.feeds[feed.name]?.tag ?? "no release";
    io.out(`${feed.name}  ${feed.source}  ${token}  ${release}`);
  }
  return 0;
}

/** Adds a feed, or changes its source and token variable. Reads the feed once before saving. */
async function addFeed(
  io: IO,
  options: Options,
  config: Config | undefined,
  [name, source]: string[],
  version: string,
): Promise<number> {
  if (!name || !source) {
    return fail(io, 'Use "feeds add <name> <source> [--tokenEnv <variable>]".');
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    return fail(io, `Feed name "${name}" must be kebab-case.`);
  }
  if (name === "official") {
    return fail(io, '"official" is reserved for the packs inside the CLI.');
  }
  if (options.tokenEnv !== undefined && !/^[A-Z][A-Z0-9_]*$/.test(options.tokenEnv)) {
    return fail(
      io,
      `"${options.tokenEnv}" is not a variable name. Use a name such as ACME_FEED_TOKEN.`,
    );
  }
  const parsed = parseSource(source);
  const saved = parsed.kind === "github" ? `github:${parsed.owner}/${parsed.repo}` : parsed.path;
  const feed: Feed = {
    name,
    source: saved,
    ...(options.tokenEnv === undefined ? {} : { tokenEnv: options.tokenEnv }),
  };
  await loadFeeds([feed], {
    root: options.root,
    mode: "latest",
    lock: {},
    cliVersion: version,
    fetch: options.fetch ?? fetch,
    cacheDir: options.cacheDir,
    env: options.env,
  });
  const base = config ?? defaultConfig();
  const existed = base.feeds.some((entry) => entry.name === name);
  const updated = {
    ...base,
    feeds: [...base.feeds.filter((entry) => entry.name !== name), feed],
  };
  if (!options.dryRun) writeConfig(options.root, updated);
  io.out(
    `${options.dryRun ? "Dry run: " : ""}${existed ? "Updated" : "Added"} feed "${name}" (${saved}).`,
  );
  return 0;
}

/** Removes a feed once no pack or stack in the config comes from it. */
function removeFeed(
  io: IO,
  options: Options,
  config: Config | undefined,
  [name]: string[],
): number {
  if (!name) return fail(io, 'Use "feeds remove <name>".');
  if (!config) return fail(io, `No ${CONFIG_FILE} in ${options.root}. Nothing is installed.`);
  if (!config.feeds.some((entry) => entry.name === name)) {
    return fail(io, `No feed "${name}" in ${CONFIG_FILE}.`);
  }
  const used = [
    ...config.packs
      .filter((entry) => entry.feed === name || entry.name.startsWith(`${name}-`))
      .map((entry) => `pack ${entry.name}`),
    ...config.stacks
      .filter((entry) => entry.feed === name || entry.name.startsWith(`${name}-`))
      .map((entry) => `stack ${entry.name}`),
  ];
  if (used.length) {
    return fail(io, `Feed "${name}" is still used by ${used.join(", ")}. Remove them first.`);
  }
  const updated = { ...config, feeds: config.feeds.filter((entry) => entry.name !== name) };
  if (!options.dryRun) writeConfig(options.root, updated);
  io.out(`${options.dryRun ? "Dry run: " : ""}Removed feed "${name}".`);
  return 0;
}
