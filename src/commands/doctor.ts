import { existsSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILE, type Config, LOCAL_DIR, type Lock, readConfig, readLock } from "../config.ts";
import { defaultCacheDir, parseSource } from "../feeds.ts";
import { parse } from "../frontmatter.ts";
import { readText } from "../fs.ts";
import { LOCAL_PACK, listItems, readAgent, readRule } from "../items.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import { requestsFor, resolve } from "../packs.ts";
import { type Options, type World, world } from "../session.ts";
import { hash } from "../sync.ts";
import { satisfies } from "../versions.ts";

/** One line of `doctor` output. */
interface DoctorCheck {
  status: "pass" | "warn" | "fail";
  label: string;
  detail?: string;
  fix?: string;
}

/** Checks Node, the config, feeds, the cache, the lock and the project's own items. */
export async function doctor(
  io: IO,
  options: Options,
  names: string[],
  nodeRange: string,
  version: string,
): Promise<number> {
  if (names.length) return fail(io, 'Use "aidev-instruct doctor".');
  const checks: DoctorCheck[] = [];
  const add = (status: DoctorCheck["status"], label: string, detail?: string, fix?: string) =>
    checks.push({
      status,
      label,
      ...(detail === undefined ? {} : { detail }),
      ...(fix ? { fix } : {}),
    });

  const node = options.nodeVersion ?? process.versions.node;
  if (satisfies(node, nodeRange)) add("pass", "Node", node);
  else add("fail", "Node", `${node} is below ${nodeRange}`, `install Node ${nodeRange}.`);

  let config: Config | undefined;
  try {
    config = readConfig(options.root);
    if (config) add("pass", "Config", config.targets.join(", "));
    else add("pass", "Config", "no config");
  } catch (error) {
    add("fail", "Config", (error as Error).message, `fix ${CONFIG_FILE}.`);
  }

  const { root } = options;
  let current: World | undefined;
  let feedError: Error | undefined;
  const noticeIo: IO = {
    ...io,
    out: (line) => add("warn", "Feeds", line.replace(/^Note: /, "")),
  };
  if (config) {
    try {
      current = await world(noticeIo, options, config, "latest", version);
    } catch (error) {
      feedError = error as Error;
    }
  }
  if (feedError?.message.includes("comes from")) {
    add("fail", "Names", feedError.message, "rename one of them.");
  } else {
    add("pass", "Names");
  }
  if (feedError && !feedError.message.includes("comes from")) {
    add("fail", "Feeds", feedError.message, "fix the feed, its source or its token variable.");
  } else if (config?.feeds.length) {
    add("pass", "Feeds", `${config.feeds.length} feed(s)`);
  }
  if (current && config?.feeds.length) {
    for (const feed of config.feeds) {
      const release = current.feeds[feed.name]?.tag ?? "folder";
      const packs = [...current.packs.values()]
        .filter((pack) => current.origins.get(pack.name) === feed.name)
        .map((pack) => `${pack.name} ${pack.version}`)
        .sort();
      add("pass", `Feed ${feed.name}`, `${release}. ${packs.join(", ") || "no packs"}.`);
    }
  }

  const lock = readLock(root);
  const cacheDir = options.cacheDir ?? defaultCacheDir(options.env);
  let cacheChecked = false;
  for (const feed of config?.feeds ?? []) {
    if (parseSource(feed.source).kind === "folder") continue;
    const locked = lock?.feeds[feed.name];
    if (!locked) continue;
    cacheChecked = true;
    if (existsSync(join(cacheDir, feed.name, locked.commit))) {
      add("pass", "Cache", `${feed.name} ${locked.tag}`);
    } else if (feedError) {
      add(
        "fail",
        "Cache",
        `release ${locked.tag} of ${feed.name} is not cached`,
        'connect to GitHub and run "aidev-instruct update".',
      );
    } else {
      add(
        "warn",
        "Cache",
        `release ${locked.tag} of ${feed.name} is not cached`,
        'the next "aidev-instruct update" downloads it.',
      );
    }
  }
  if (!cacheChecked) add("pass", "Cache", "nothing to cache");

  if (!lock) {
    if (config?.packs.length || config?.stacks.length) {
      add("fail", "Lock", "nothing is installed", 'run "aidev-instruct update".');
    } else {
      add("pass", "Lock", "no lock");
    }
  } else {
    const problem = lockProblem(config, current, lock);
    if (problem) add("fail", "Lock", problem, 'run "aidev-instruct update".');
    else add("pass", "Lock");
    for (const [path, file] of Object.entries(lock.files)) {
      const full = join(root, path);
      if (!existsSync(full) || hash(readText(full)) !== file.hash) {
        add(
          "warn",
          "Lock",
          `${path} changed by hand`,
          'run "aidev-instruct update" with --orig or --force.',
        );
      }
    }
  }

  let localFailed = false;
  const localDir = join(root, LOCAL_DIR);
  for (const item of existsSync(localDir) ? listItems(localDir, LOCAL_PACK) : []) {
    try {
      if (item.kind === "rules") readRule(item.path);
      else if (item.kind === "agents") readAgent(item.path);
      else {
        const { data } = parse(readText(join(item.path, "SKILL.md")));
        if (typeof data.name !== "string" || typeof data.description !== "string") {
          throw new Error("name and description are required");
        }
      }
    } catch (error) {
      localFailed = true;
      add(
        "fail",
        "Local items",
        `${item.kind}/${item.name}: ${(error as Error).message}`,
        "fix it or delete it.",
      );
    }
  }
  if (!localFailed) add("pass", "Local items");

  for (const check of checks) {
    const detail = check.detail === undefined ? "" : `: ${check.detail}`;
    io.out(
      `${check.status.padEnd(4)}  ${check.label}${detail}${check.fix ? ` Fix: ${check.fix}` : ""}`,
    );
  }
  return checks.some((check) => check.status === "fail") ? 1 : 0;
}

/** Names the first difference between the config and the lock. */
function lockProblem(
  config: Config | undefined,
  current: World | undefined,
  lock: Lock,
): string | undefined {
  if (!config || !current) return undefined;
  try {
    const wanted = resolve(requestsFor(config.stacks, config.packs, current.stacks), current.packs)
      .map((pack) => pack.name)
      .sort();
    if (JSON.stringify(wanted) !== JSON.stringify(Object.keys(lock.packs).sort())) {
      return "the config and the lock list different packs";
    }
  } catch (error) {
    return (error as Error).message;
  }
  const targets = [...config.targets].sort();
  if (JSON.stringify(targets) !== JSON.stringify([...lock.targets].sort())) {
    return "the config and the lock list different targets";
  }
  return undefined;
}
