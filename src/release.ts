import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { subset } from "semver";
import { walk } from "./fs.ts";
import { renderTemplate } from "./templates.ts";
import { bumpVersion, isSemver, type Kind, largest } from "./versions.ts";

/** Reads the state of the repository at the last release tag. */
export interface ReleaseSource {
  /** The last `v*` tag, or `undefined` on a repository without one. */
  lastTag: () => string | undefined;
  /** Files of a folder at the tag, relative to that folder and with forward slashes. */
  filesAt: (tag: string, dir: string) => string[];
  /** One file at the tag, or `undefined` when it did not exist. */
  readAt: (tag: string, path: string) => string | undefined;
  /** Commit subjects since the tag that touched a folder. */
  commits: (tag: string, dir: string) => string[];
}

/** Runs git in the repository. A command that fails returns `undefined` instead of throwing. */
export function gitSource(root: string): ReleaseSource {
  const git = (args: string[]): string =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const optional = (args: string[]): string | undefined => {
    try {
      return git(args);
    } catch {
      return undefined;
    }
  };
  return {
    lastTag: () =>
      optional(["describe", "--tags", "--abbrev=0", "--match", "v*"])?.trim() || undefined,
    filesAt: (tag, dir) =>
      (optional(["ls-tree", "-r", "--name-only", tag, "--", dir]) ?? "")
        .split("\n")
        .filter(Boolean)
        .map((path) => path.slice(dir.length + 1)),
    readAt: (tag, path) => optional(["show", `${tag}:${path}`]),
    commits: (tag, dir) =>
      (optional(["log", "--format=%s", `${tag}..HEAD`, "--", dir]) ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
  };
}

/** One pack or stack the release changes. */
export interface ReleaseChange {
  kind: "pack" | "stack";
  name: string;
  /** The version at the last tag, or an empty string for a new pack or stack. */
  from: string;
  to: string;
  bump: Kind;
  reasons: string[];
}

/** What `bun run release` or `feed release` will do. */
export interface ReleasePlan {
  tag?: string;
  changes: ReleaseChange[];
  cli: { from: string; to: string; bump: Kind };
  /** Changelog entries: the file, then the version and the lines under it. */
  changelogs: Map<string, { version: string; lines: string[] }>;
}

export interface ReleaseOptions {
  root: string;
  source?: ReleaseSource;
  /** Raises the bump of a pack or stack by name. */
  bumps?: Record<string, Kind>;
  /** Raises the CLI bump. */
  cliBump?: Kind;
}

/** Lists the files of a folder, leaving out the changelog the release writes. */
const packFiles = (dir: string) => walk(dir).filter((path) => path !== "CHANGELOG.md");

const isItemFile = (path: string) => /^(rules|skills|agents)\//.test(path);

/** Names an item file for a changelog: `skill tanstack-ai`, `rule zod`. */
function itemLabel(path: string): string {
  const [kind, name] = path.split("/") as [string, string];
  const single = kind === "skills" ? "skill" : kind.replace(/s$/, "");
  return `${single} ${name.replace(/\.md$/, "")}`;
}

/** Reads a JSON file, returning `{}` for invalid text. */
function json(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** Reads a list field such as `requires`, sorted so order alone is no change. */
function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string").sort()
    : [];
}

/** A manifest without the `version` a release rewrites. */
function comparable(value: Record<string, unknown>): string {
  const { version: _version, ...rest } = value;
  return JSON.stringify(rest);
}

/** Collects changes and their largest bump. */
class Changes {
  bump: Kind = "none";
  readonly reasons: string[] = [];

  add(kind: Kind, reason: string) {
    this.bump = largest(this.bump, kind);
    if (!this.reasons.includes(reason)) this.reasons.push(reason);
  }
}

/** Reads the contents of a file now, with line endings normalized. */
function readNow(root: string, path: string): string | undefined {
  const full = join(root, path);
  return existsSync(full) ? readFileSync(full, "utf8").replace(/\r\n/g, "\n") : undefined;
}

/** True when a file differs from its state at the tag, was added or was deleted. */
function differs(root: string, source: ReleaseSource, tag: string, path: string): boolean {
  const before = source.readAt(tag, path)?.replace(/\r\n/g, "\n");
  return before !== readNow(root, path);
}

/** Detects the bump of one pack from its files and its manifest. */
function packBump(
  root: string,
  source: ReleaseSource,
  tag: string,
  name: string,
  current: Record<string, unknown>,
  atTag: Record<string, unknown>,
): Changes {
  const dir = `packs/${name}`;
  const files = packFiles(join(root, dir));
  const before = source.filesAt(tag, dir);
  const changes = new Changes();

  const items = files.filter(isItemFile);
  const oldItems = before.filter(isItemFile);
  for (const path of oldItems.filter((entry) => !items.includes(entry))) {
    changes.add("major", `removed ${itemLabel(path)}`);
  }
  for (const path of items.filter((entry) => !oldItems.includes(entry))) {
    changes.add("minor", `added ${itemLabel(path)}`);
  }

  if (JSON.stringify(list(atTag.requires)) !== JSON.stringify(list(current.requires))) {
    changes.add("major", "requires changed");
  }
  const conflicts = list(current.conflicts);
  const oldConflicts = list(atTag.conflicts);
  for (const other of conflicts.filter((entry) => !oldConflicts.includes(entry))) {
    changes.add("major", `conflicts with ${other}`);
  }
  for (const other of oldConflicts.filter((entry) => !conflicts.includes(entry))) {
    changes.add("minor", `no longer conflicts with ${other}`);
  }
  const ranges = rangeMap(current.packVersions);
  const oldRanges = rangeMap(atTag.packVersions);
  const rangeOf = (entries: [string, string][]) => new Map(entries);
  const nowRanges = rangeOf(ranges);
  const oldRangeOf = rangeOf(oldRanges);
  for (const [name] of ranges.filter(([entry]) => !oldRangeOf.has(entry))) {
    changes.add("major", `packVersions adds ${name}`);
  }
  for (const [name] of oldRanges.filter(([entry]) => !nowRanges.has(entry))) {
    changes.add("minor", `packVersions drops ${name}`);
  }
  for (const [name, range] of ranges) {
    const before = oldRangeOf.get(name);
    if (before === undefined || before === range) continue;
    changes.add(rangeKind(before, range), `packVersions ${name} ${before} -> ${range}`);
  }
  if (JSON.stringify(atTag.notes ?? []) !== JSON.stringify(current.notes ?? [])) {
    changes.add("minor", "notes changed");
  }
  if (text(atTag.latest) !== text(current.latest)) changes.add("minor", "latest changed");

  const others = [...new Set([...files, ...before])].filter(
    (path) =>
      path !== "pack.json" &&
      (!isItemFile(path) || (files.includes(path) && before.includes(path))),
  );
  const changed = others.find((path) => differs(root, source, tag, `${dir}/${path}`));
  if (changes.bump === "none") {
    if (changed) changes.add("patch", `${changed} changed`);
    else if (comparable(atTag) !== comparable(current)) changes.add("patch", "pack.json changed");
  }
  return changes;
}

/** Reads `packVersions` as sorted name-range pairs. */
function rangeMap(value: unknown): [string, string][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value)
    .map(([name, range]) => [name, String(range)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b, "en"));
}

/** `major` when the new range is narrower or incomparable, `minor` when it is wider. */
function rangeKind(before: string, after: string): Kind {
  try {
    if (subset(after, before)) return "major";
    if (subset(before, after)) return "minor";
  } catch {
    return "major";
  }
  return "major";
}

/** Detects the bump of one stack from its file. */
function stackBump(current: Record<string, unknown>, atTag: Record<string, unknown>): Changes {
  const changes = new Changes();
  const packs = list(current.packs);
  const old = list(atTag.packs);
  for (const pack of old.filter((entry) => !packs.includes(entry))) {
    changes.add("major", `removed pack ${pack}`);
  }
  for (const pack of packs.filter((entry) => !old.includes(entry))) {
    changes.add("minor", `added pack ${pack}`);
  }
  if (comparable(atTag) !== comparable(current) && changes.bump === "none") {
    changes.add("patch", "stack changed");
  }
  return changes;
}

/** The packs and stacks a release changes, and the changelog entries to write. */
interface DetectedChanges {
  tag?: string;
  changes: ReleaseChange[];
  changelogs: Map<string, { version: string; lines: string[] }>;
}

/** Compares `packs/` and `stacks/` with the last `v*` tag. */
function detectChanges(options: {
  root: string;
  source: ReleaseSource;
  bumps: Record<string, Kind>;
}): DetectedChanges {
  const { root, source, bumps } = options;
  const tag = source.lastTag();
  const changes: ReleaseChange[] = [];
  const changelogs = new Map<string, { version: string; lines: string[] }>();

  const collect = (
    kind: "pack" | "stack",
    name: string,
    current: Record<string, unknown>,
    atTag: string | undefined,
    detect: (previous: Record<string, unknown>) => Changes,
  ) => {
    const version = text(current.version);
    const isNew = atTag === undefined;
    const previous = atTag === undefined ? {} : json(atTag);
    const from = text(previous.version);
    const needsVersion = !isNew && !isSemver(from);
    const detected = isNew ? new Changes() : detect(previous);
    if (isNew) detected.reasons.push(`new ${kind}`);
    const bump = isNew ? "none" : largest(detected.bump, bumps[name] ?? "none");
    if (!isNew && !needsVersion && bump === "none") return;
    const to =
      isNew || needsVersion ? "1.0.0" : bumpVersion(isSemver(version) ? version : "0.0.0", bump);
    const reasons = detected.reasons;
    changes.push({ kind, name, from, to, bump: needsVersion ? "none" : bump, reasons });
    const folder = kind === "pack" ? `packs/${name}` : "stacks";
    changelogs.set(`${folder}/CHANGELOG.md`, { version: to, lines: reasons });
  };

  const packsDir = join(root, "packs");
  for (const name of existsSync(packsDir) ? readdirSync(packsDir).sort() : []) {
    const manifest = join(packsDir, name, "pack.json");
    if (!existsSync(manifest)) continue;
    const current = json(readFileSync(manifest, "utf8"));
    const atTag = tag === undefined ? undefined : source.readAt(tag, `packs/${name}/pack.json`);
    collect("pack", name, current, atTag, (previous) =>
      packBump(root, source, tag as string, name, current, previous),
    );
  }

  const stacksDir = join(root, "stacks");
  for (const file of existsSync(stacksDir)
    ? readdirSync(stacksDir)
        .filter((entry) => entry.endsWith(".json"))
        .sort()
    : []) {
    const name = file.slice(0, -".json".length);
    const current = json(readFileSync(join(stacksDir, file), "utf8"));
    const atTag = tag === undefined ? undefined : source.readAt(tag, `stacks/${file}`);
    collect("stack", name, current, atTag, (previous) => stackBump(current, previous));
  }

  return { ...(tag === undefined ? {} : { tag }), changes, changelogs };
}

/** Plans the release of the CLI repository. */
export function planRelease(options: ReleaseOptions): ReleasePlan {
  const { root, source = gitSource(root), bumps = {}, cliBump = "none" } = options;
  const detected = detectChanges({ root, source, bumps });
  const { tag, changes, changelogs } = detected;
  const cliFrom = text(json(readFileSync(join(root, "package.json"), "utf8")).version) || "0.0.0";
  const highest = changes.reduce<Kind>((kind, change) => largest(kind, change.bump), "none");
  const wanted =
    tag === undefined
      ? largest("none", cliBump)
      : largest(largest(highest, srcChanged(root, source, tag) ? "patch" : "none"), cliBump);
  return {
    ...(tag === undefined ? {} : { tag }),
    changes,
    cli: { from: cliFrom, to: bumpVersion(cliFrom, wanted), bump: wanted },
    changelogs,
  };
}

/** One feed release: the changed packs and stacks, and the feed version they produce. */
export interface FeedReleasePlan {
  tag?: string;
  changes: ReleaseChange[];
  changelogs: Map<string, { version: string; lines: string[] }>;
  feed: { from: string; to: string; bump: Kind };
}

/** Plans a feed release. The feed version gets the largest pack or stack bump. */
export function planFeedRelease(options: {
  root: string;
  source?: ReleaseSource;
  bumps?: Record<string, Kind>;
}): FeedReleasePlan {
  const { root, source = gitSource(root), bumps = {} } = options;
  const detected = detectChanges({ root, source, bumps });
  const from = text(json(readFileSync(join(root, "feed.json"), "utf8")).version) || "0.0.0";
  const highest = detected.changes.reduce<Kind>(
    (kind, change) => largest(kind, change.bump),
    "none",
  );
  const bump = detected.tag === undefined ? "none" : highest;
  return { ...detected, feed: { from, to: bumpVersion(from, bump), bump } };
}

/** Writes the new versions and changelogs, then commits `Release <version>` and tags it. */
export function applyRelease(plan: ReleasePlan, options: { root: string; dryRun?: boolean }): void {
  const { root, dryRun = false } = options;
  if (dryRun) return;
  writeChanges(plan.changes, plan.changelogs, root);
  setVersion(join(root, "package.json"), plan.cli.to);
  commitRelease(root, plan.cli.to);
}

/** Writes a feed release: pack versions, changelogs and the feed version, then commits and tags. */
export function applyFeedRelease(
  plan: FeedReleasePlan,
  options: { root: string; dryRun?: boolean },
): void {
  const { root, dryRun = false } = options;
  if (dryRun) return;
  writeChanges(plan.changes, plan.changelogs, root);
  setVersion(join(root, "feed.json"), plan.feed.to);
  commitRelease(root, plan.feed.to);
}

/** Writes each changed manifest and changelog. */
function writeChanges(
  changes: ReleaseChange[],
  changelogs: Map<string, { version: string; lines: string[] }>,
  root: string,
) {
  for (const change of changes) {
    const file =
      change.kind === "pack"
        ? join(root, "packs", change.name, "pack.json")
        : join(root, "stacks", `${change.name}.json`);
    setVersion(file, change.to);
  }
  for (const [path, entry] of changelogs) {
    writeChangelog(join(root, path), entry.version, entry.lines);
  }
}

/** Commits and tags a release. */
function commitRelease(root: string, version: string) {
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  git(["add", "-A"]);
  git(["commit", "-m", `Release ${version}`]);
  git(["tag", `v${version}`]);
}

/** True when `src/` differs from the tag. */
function srcChanged(root: string, source: ReleaseSource, tag: string): boolean {
  const before = source.filesAt(tag, "src");
  const files = walk(join(root, "src"));
  if (JSON.stringify(before) !== JSON.stringify(files)) return true;
  return files.some(
    (file) =>
      (source.readAt(tag, `src/${file}`) ?? "").replace(/\r\n/g, "\n") !==
      readNow(root, `src/${file}`),
  );
}

/** Replaces `version` in a JSON file and keeps every other field as it is. */
function setVersion(path: string, version: string) {
  const data = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  writeFileSync(path, `${JSON.stringify({ ...data, version }, null, 2)}\n`);
}

/** Prepends a section to a changelog. */
function writeChangelog(path: string, version: string, lines: string[]) {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const body = existing.replace(/^# Changelog\s*/, "").trimStart();
  const view = {
    version,
    bullets: lines.map((text) => ({ text })),
    previous: body ? `\n${body}` : "",
  };
  writeFileSync(path, renderTemplate("changelog.md.mustache", view));
}

/** Formats the plan the way `bun run release --dry-run` prints it. */
export function formatPlan(plan: ReleasePlan): string[] {
  return [...changeLines(plan), `CLI               ${plan.cli.from} -> ${plan.cli.to}`];
}

/** Formats a feed release plan. */
export function formatFeedPlan(plan: FeedReleasePlan): string[] {
  return [...changeLines(plan), `Feed              ${plan.feed.from} -> ${plan.feed.to}`];
}

/** Formats one line per changed pack or stack. */
function changeLines(plan: { tag?: string; changes: ReleaseChange[] }): string[] {
  const lines = [plan.tag ? `Changes since ${plan.tag}:` : "First release:"];
  const width = Math.max(0, ...plan.changes.map((change) => change.name.length));
  for (const change of plan.changes) {
    const kind = change.bump === "none" ? "new" : change.bump;
    const versions = change.from ? `${change.from} -> ${change.to}` : change.to;
    lines.push(
      `  ${change.name.padEnd(width)}  ${versions.padEnd(15)}  ${kind.padEnd(5)}  ${change.reasons.join(", ")}`,
    );
  }
  return lines;
}

/** Parses `--bump name=kind` pairs. */
export function parseBumps(values: string[]): Record<string, Kind> {
  const bumps: Record<string, Kind> = {};
  for (const value of values) {
    const [name, kind] = value.split("=");
    if (!name || !["major", "minor", "patch"].includes(kind ?? "")) {
      throw new Error(`Use --bump <name>=<major|minor|patch>: ${value}`);
    }
    bumps[name] = kind as Kind;
  }
  return bumps;
}

/** Where the release command prints. */
export interface ReleaseIO {
  out: (line: string) => void;
  err: (line: string) => void;
}

/** The release command shared by `bun run release` and `feed release`. */
export function release(
  args: { dryRun: boolean; bumps: Record<string, Kind>; cliBump: Kind },
  io: ReleaseIO,
  options: { root: string; source?: ReleaseSource },
): number {
  try {
    const plan = planRelease({
      root: options.root,
      ...(options.source ? { source: options.source } : {}),
      bumps: args.bumps,
      cliBump: args.cliBump,
    });
    if (!plan.changes.length && plan.cli.bump === "none") {
      io.err(plan.tag ? `Nothing changed since ${plan.tag}.` : "Nothing to release.");
      return 1;
    }
    for (const line of formatPlan(plan)) io.out(line);
    if (args.dryRun) return 0;
    applyRelease(plan, { root: options.root });
    io.out(`\nCommitted Release ${plan.cli.to} and tagged v${plan.cli.to}.`);
    return 0;
  } catch (error) {
    io.err((error as Error).message);
    return 1;
  }
}
