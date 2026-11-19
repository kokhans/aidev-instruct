import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  LOCAL_DIR,
  type Lock,
  type LockedFile,
  type LockedPack,
  type Modified,
  readLock,
  writeLock,
} from "./config.ts";
import type { FeedLock } from "./feeds.ts";
import { pruneEmptyDirs } from "./fs.ts";
import { loadPacks, type Pack, type PackRequest, type ResolvedPack, resolve } from "./packs.ts";
import { render } from "./render.ts";
import type { TargetId } from "./targets.ts";

/** Why a file was left alone. */
export type SkipReason = "modified" | "unmanaged" | "orig-exists";

/**
 * What sync did, or would do, to one file. `orig` means the version changed by hand was saved
 * as `<path>.orig` first.
 */
export type Action =
  | { kind: "create" | "update" | "delete" | "unchanged"; path: string; orig?: boolean }
  | { kind: "skip"; path: string; reason: SkipReason };

export interface SyncOptions {
  root: string;
  requests: PackRequest[];
  targets: TargetId[];
  version: string;
  exclude?: string[];
  modified?: Modified;
  force?: boolean;
  dryRun?: boolean;
  packsDir?: string;
  /** Packs already loaded, including feed packs. Loaded from `packsDir` when missing. */
  packs?: Map<string, Pack>;
  /** The release each feed is read at, recorded in the lock. */
  feeds?: Record<string, FeedLock>;
  /** Leaves out the project's own items in `.aidev-instruct/`, so nothing is written. Used by `clean`. */
  skipLocal?: boolean;
}

export interface SyncResult {
  actions: Action[];
  installed: ResolvedPack[];
  lock: Lock;
  /** Messages that are not file changes. */
  notices: string[];
}

/** Hashes text with line endings normalized. */
export function hash(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

/**
 * Brings the project in line with the requested packs and targets, then rewrites the lock.
 * A file changed by hand since the last sync is kept unless `force` is set. With
 * `modified: "orig"` it is saved as `<path>.orig` and replaced, unless that backup already
 * exists. A kept file keeps its old hash in the lock, so it still counts as changed next time.
 */
export function sync(options: SyncOptions): SyncResult {
  const { root, force = false, dryRun = false, modified = "keep" } = options;
  const previousLock = readLock(root);
  const previous = previousLock?.files ?? {};
  const installed = resolve(options.requests, options.packs ?? loadPacks(options.packsDir));
  const rendered = render(installed, {
    targets: options.targets,
    exclude: options.exclude ?? [],
    localDir: options.skipLocal ? undefined : join(root, LOCAL_DIR),
  });

  const notices = [
    ...rendered.unusedExcludes.map((name) => `exclude: "${name}" matches no installed item.`),
    ...installed.flatMap((pack) => pack.warnings),
  ];
  for (const override of rendered.overrides) {
    const before = previousLock?.overrides[override.item];
    if (before && before.hash !== override.hash) {
      notices.push(
        `${override.item}: ${override.pack} changed it upstream. Your ${LOCAL_DIR}/${override.item} is kept: compare and merge by hand.`,
      );
    }
  }

  const actions: Action[] = [];
  const full = (path: string) => join(root, path);
  const readExisting = (path: string) =>
    existsSync(full(path)) ? readFileSync(full(path), "utf8") : undefined;
  const write = (path: string, content: string) => {
    if (dryRun) return;
    mkdirSync(dirname(full(path)), { recursive: true });
    writeFileSync(full(path), content);
  };
  const remove = (path: string) => {
    if (dryRun) return;
    rmSync(full(path));
    pruneEmptyDirs(root, dirname(full(path)));
  };
  /** Saves a version changed by hand as `<path>.orig`. Returns false when a backup exists. */
  const backUp = (path: string, text: string): boolean => {
    if (existsSync(full(`${path}.orig`))) return false;
    write(`${path}.orig`, text);
    return true;
  };

  const files: Record<string, LockedFile> = {};
  for (const [path, { content, pack }] of rendered.files) {
    const next = hash(content);
    const text = readExisting(path);
    const current = text === undefined ? undefined : hash(text);
    const recorded = previous[path]?.hash;

    if (text === undefined) {
      actions.push({ kind: "create", path });
    } else if (current === next) {
      actions.push({ kind: "unchanged", path });
    } else if (recorded !== undefined && current === recorded) {
      actions.push({ kind: "update", path });
    } else if (modified === "orig" && backUp(path, text)) {
      actions.push({ kind: "update", path, orig: true });
    } else if (force) {
      actions.push({ kind: "update", path });
    } else {
      const reason: SkipReason =
        modified === "orig" ? "orig-exists" : recorded ? "modified" : "unmanaged";
      actions.push({ kind: "skip", path, reason });
      if (recorded) files[path] = { pack, hash: recorded };
      continue;
    }
    files[path] = { pack, hash: next };
    if (current !== next) write(path, content);
  }

  for (const [path, entry] of Object.entries(previous)) {
    if (rendered.files.has(path)) continue;
    const text = readExisting(path);
    if (text === undefined) continue;
    if (hash(text) === entry.hash) {
      actions.push({ kind: "delete", path });
    } else if (modified === "orig" && backUp(path, text)) {
      actions.push({ kind: "delete", path, orig: true });
    } else if (force) {
      actions.push({ kind: "delete", path });
    } else {
      actions.push({
        kind: "skip",
        path,
        reason: modified === "orig" ? "orig-exists" : "modified",
      });
      files[path] = entry;
      continue;
    }
    remove(path);
  }

  for (const path of Object.keys(files)) {
    if (existsSync(full(`${path}.orig`))) {
      notices.push(`${path}.orig holds a version changed by hand. Compare, merge and delete it.`);
    }
  }

  const lock: Lock = {
    lockfileVersion: 1,
    version: options.version,
    targets: options.targets,
    packs: Object.fromEntries(installed.map((pack) => [pack.name, lockedPack(pack)])),
    feeds: options.feeds ?? previousLock?.feeds ?? {},
    overrides: Object.fromEntries(
      rendered.overrides.map(({ item, pack, hash }) => [item, { pack, hash }]),
    ),
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
  };
  if (!dryRun) writeLock(root, lock);

  return { actions, installed, lock, notices };
}

/** Lock entry for a pack. Folders are recorded only when the pack does not cover the project. */
function lockedPack(pack: ResolvedPack): LockedPack {
  const entry: LockedPack = { requires: pack.requires, version: pack.version, from: pack.from };
  if (pack.scope !== null) entry.paths = pack.scope;
  return entry;
}
