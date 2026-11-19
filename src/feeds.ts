import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { readJson } from "./fs.ts";
import { loadPacks, loadStacks, type Pack, type Stack } from "./packs.ts";
import { extractTarGz } from "./tar.ts";
import { satisfies } from "./versions.ts";

/** A feed from the config. `source` is `github:<owner>/<repo>` or a folder path. */
export interface Feed {
  name: string;
  source: string;
  /** The environment variable that holds the token, never the token. */
  tokenEnv?: string;
}

/** `feed.json`, which every feed repository has at its root. */
export interface FeedManifest {
  name: string;
  version: string;
  cli: string;
}

/** The release a project installed from a feed. */
export interface FeedLock {
  tag: string;
  commit: string;
}

/** `locked` keeps the release the lock records; `latest` asks GitHub for the newest one. */
export type FeedMode = "locked" | "latest";

export interface FeedOptions {
  /** The project folder, against which a folder source is resolved. */
  root: string;
  mode: FeedMode;
  lock: Record<string, FeedLock>;
  cliVersion: string;
  /** Official pack and stack names, so a feed cannot shadow one. */
  officialPacks?: Iterable<string>;
  officialStacks?: Iterable<string>;
  /** The fetch to use. The CLI passes the global one; tests pass a fake. */
  fetch: typeof fetch;
  cacheDir?: string;
  env?: NodeJS.ProcessEnv;
}

export interface FeedLoad {
  packs: Map<string, Pack>;
  stacks: Map<string, Stack>;
  /** The feed each feed pack or stack comes from. */
  origins: Map<string, string>;
  /** The release each GitHub feed is read at, for the lock. */
  lock: Record<string, FeedLock>;
  notices: string[];
}

/** A parsed feed source. */
export type Source =
  | { kind: "github"; owner: string; repo: string }
  | { kind: "folder"; path: string };

/** Parses `github:owner/repo`, `https://github.com/owner/repo` or a folder path. */
export function parseSource(source: string): Source {
  const github = /^(?:github:|https:\/\/github\.com\/)([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(
    source,
  );
  if (github) return { kind: "github", owner: github[1] as string, repo: github[2] as string };
  return { kind: "folder", path: source };
}

/** The cache folder for downloaded releases, under `AIDEV_INSTRUCT_CACHE` or the user folder. */
export function defaultCacheDir(env: NodeJS.ProcessEnv = {}): string {
  return env.AIDEV_INSTRUCT_CACHE ?? join(homedir(), ".cache", "aidev-instruct");
}

/** Reads `feed.json` and checks the name, the version and the CLI range. */
export function readFeedManifest(dir: string, cliVersion?: string): FeedManifest {
  const path = join(dir, "feed.json");
  if (!existsSync(path)) throw new Error(`${path} is missing. Every feed has a feed.json.`);
  const json = readJson(path);
  for (const key of ["name", "version", "cli"]) {
    if (typeof json[key] !== "string") throw new Error(`${path}: "${key}" is required`);
  }
  const manifest = json as unknown as FeedManifest;
  if (cliVersion && !satisfies(cliVersion, manifest.cli)) {
    throw new Error(
      `Feed "${manifest.name}" needs aidev-instruct ${manifest.cli}. This CLI is ${cliVersion}.`,
    );
  }
  return manifest;
}

/** The token for a feed, read from the variable `tokenEnv` names. */
function tokenOf(feed: Feed, env: NodeJS.ProcessEnv): string | undefined {
  if (!feed.tokenEnv) return undefined;
  const token = env[feed.tokenEnv];
  if (!token) {
    throw new Error(
      `Set ${feed.tokenEnv} to a GitHub token that can read ${feed.source}, or run "aidev-instruct feeds add ${feed.name} <source>" with the right variable.`,
    );
  }
  return token;
}

/** Calls GitHub with the feed's token. The token goes only to `api.github.com`. */
async function request(
  url: string,
  token: string | undefined,
  options: FeedOptions,
): Promise<Response> {
  const run = options.fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "aidev-instruct",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return run(url, { headers, redirect: "manual" });
}

/** Calls the GitHub API, and names the feed when the call fails. */
async function api(
  feed: Feed,
  url: string,
  token: string | undefined,
  options: FeedOptions,
): Promise<Response> {
  const response = await request(url, token, options);
  if (response.status === 404) {
    throw new Error(
      `Feed "${feed.name}": HTTP 404 for ${feed.source}. The repository does not exist, the token cannot read it, or it has no release yet.`,
    );
  }
  if (!response.ok) throw new Error(`Feed "${feed.name}": HTTP ${response.status} for ${url}.`);
  return response;
}

/** Downloads the tarball of a commit without sending the token to the download host. */
async function download(
  feed: Feed,
  source: { owner: string; repo: string },
  commit: string,
  dir: string,
  token: string | undefined,
  options: FeedOptions,
) {
  const run = options.fetch;
  const response = await request(
    `https://api.github.com/repos/${source.owner}/${source.repo}/tarball/${commit}`,
    token,
    options,
  );
  let archive = response;
  const location = response.headers.get("location");
  if (location) {
    archive = await run(location);
    if (!archive.ok)
      throw new Error(`Feed "${feed.name}": HTTP ${archive.status} for ${location}.`);
  } else if (!archive.ok) {
    throw new Error(`Feed "${feed.name}": HTTP ${archive.status} for the release archive.`);
  }
  try {
    await extractTarGz(Buffer.from(await archive.arrayBuffer()), dir);
  } catch (error) {
    throw new Error(
      `Feed "${feed.name}": the release archive for ${commit} could not be extracted: ${(error as Error).message}`,
    );
  }
}

/** A feed folder, and the release it holds for a GitHub source. */
interface ResolvedFeed {
  dir: string;
  release?: FeedLock;
}

/** Reads the feed at its latest release, or at the release the lock records. */
async function resolveFeed(
  feed: Feed,
  options: FeedOptions,
  notices: string[],
): Promise<ResolvedFeed> {
  const source = parseSource(feed.source);
  if (source.kind === "folder") {
    const dir = isAbsolute(source.path) ? source.path : resolve(options.root, source.path);
    if (!existsSync(dir)) {
      throw new Error(`Feed "${feed.name}" points to ${source.path}, which does not exist.`);
    }
    return { dir };
  }

  const cacheDir = options.cacheDir ?? defaultCacheDir(options.env);
  const dir = join(cacheDir, feed.name);
  const locked = options.lock[feed.name];
  if (options.mode === "locked" && locked && existsSync(join(dir, locked.commit))) {
    return { dir: join(dir, locked.commit), release: locked };
  }

  try {
    const token = tokenOf(feed, options.env ?? process.env);
    const release = (await (
      await api(
        feed,
        `https://api.github.com/repos/${source.owner}/${source.repo}/releases/latest`,
        token,
        options,
      )
    ).json()) as { tag_name?: string };
    if (!release.tag_name) throw new Error(`Feed "${feed.name}" has no published release yet.`);
    const tag = release.tag_name;
    const commit = (await (
      await api(
        feed,
        `https://api.github.com/repos/${source.owner}/${source.repo}/commits/${tag}`,
        token,
        options,
      )
    ).json()) as { sha?: string };
    if (!commit.sha) throw new Error(`Feed "${feed.name}": tag ${tag} has no commit.`);
    if (locked && locked.tag === tag && locked.commit !== commit.sha) {
      notices.push(
        `Feed "${feed.name}": tag ${tag} moved from ${locked.commit} to ${commit.sha}. A tag should never move.`,
      );
    }
    const releaseDir = join(dir, commit.sha);
    if (!existsSync(releaseDir)) {
      await download(feed, source, commit.sha, releaseDir, token, options);
    }
    return { dir: releaseDir, release: { tag, commit: commit.sha } };
  } catch (error) {
    if (locked && existsSync(join(dir, locked.commit))) {
      notices.push(
        `Feed "${feed.name}": GitHub is unreachable, using release ${locked.tag} from the cache.`,
      );
      return { dir: join(dir, locked.commit), release: locked };
    }
    throw error;
  }
}

/** Loads every feed's packs and stacks, and names each item's feed. */
export async function loadFeeds(feeds: Feed[], options: FeedOptions): Promise<FeedLoad> {
  const result: FeedLoad = {
    packs: new Map(),
    stacks: new Map(),
    origins: new Map(),
    lock: {},
    notices: [],
  };
  const packOwners = new Map<string, string>();
  const stackOwners = new Map<string, string>();
  for (const name of options.officialPacks ?? []) packOwners.set(name, "the official packs");
  for (const name of options.officialStacks ?? []) stackOwners.set(name, "the official packs");

  for (const feed of feeds) {
    const resolved = await resolveFeed(feed, options, result.notices);
    const manifest = readFeedManifest(resolved.dir, options.cliVersion);
    if (manifest.name !== feed.name) {
      throw new Error(
        `Feed "${feed.name}" points to a feed named "${manifest.name}". Change "name" in feed.json or the feed entry.`,
      );
    }
    if (resolved.release) result.lock[feed.name] = resolved.release;

    for (const [kind, loaded, owners] of [
      ["packs", loadPacks(join(resolved.dir, "packs")), packOwners],
      ["stacks", loadStacks(join(resolved.dir, "stacks")), stackOwners],
    ] as const) {
      for (const name of loaded.keys()) {
        if (!name.startsWith(`${feed.name}-`)) {
          throw new Error(
            `Feed "${feed.name}" ships "${name}", but every pack and stack name starts with "${feed.name}-".`,
          );
        }
        const owner = owners.get(name);
        if (owner)
          throw new Error(`${name} comes from ${owner} and feed "${feed.name}". Rename one.`);
        owners.set(name, `feed "${feed.name}"`);
        result.origins.set(name, feed.name);
      }
      for (const [name, value] of loaded) {
        if (kind === "packs") result.packs.set(name, value as Pack);
        else result.stacks.set(name, value as Stack);
      }
    }
  }
  return result;
}
