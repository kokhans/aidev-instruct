import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyFeedRelease,
  applyRelease,
  formatPlan,
  gitSource,
  parseBumps,
  planFeedRelease,
  planRelease,
  type ReleaseSource,
  release,
} from "../src/release.ts";

const temp = () => mkdtempSync(join(tmpdir(), "aidev-release-"));
const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A fake repository state at the tag: a tag name and the files it held. */
function fakeSource(tag: string | undefined, files: Record<string, string>): ReleaseSource {
  return {
    lastTag: () => tag,
    filesAt: (_tag, dir) =>
      Object.keys(files)
        .filter((path) => path.startsWith(`${dir}/`))
        .map((path) => path.slice(dir.length + 1)),
    readAt: (_tag, path) => files[path],
    commits: (_tag, _dir) => ["A commit subject."],
  };
}

const manifest = (name: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    name,
    description: `${name} pack.`,
    version: "1.4.2",
    requires: [],
    ...extra,
  });

const stack = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    name: "site",
    description: "Site.",
    version: "1.1.0",
    packs: ["react"],
    ...extra,
  });

/** Files of the starting project: one pack, one stack and a source folder. */
function base(): Record<string, string> {
  return {
    "package.json": JSON.stringify({ name: "cli", version: "0.6.0" }),
    "packs/react/pack.json": manifest("react"),
    "packs/react/rules/react.md": "# React\n\n- Old text.\n",
    "stacks/site.json": stack(),
    "src/main.ts": "export const a = 1;\n",
  };
}

/** Writes the current files of a project and plans against the given tag state. */
function plan(
  current: Record<string, string>,
  options: {
    atTag?: Record<string, string>;
    tag?: string;
    bumps?: Record<string, string>;
    cliBump?: string;
  } = {},
) {
  const root = temp();
  created.push(root);
  for (const [path, content] of Object.entries(current)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return {
    root,
    result: planRelease({
      root,
      source: fakeSource("tag" in options ? options.tag : "v1.0.0", options.atTag ?? base()),
      ...(options.bumps
        ? { bumps: options.bumps as Record<string, "major" | "minor" | "patch"> }
        : {}),
      ...(options.cliBump ? { cliBump: options.cliBump as "major" | "minor" | "patch" } : {}),
    }),
  };
}

const only = (result: ReturnType<typeof plan>["result"]) =>
  result.changes[0] as NonNullable<(typeof result.changes)[number]>;

describe("planRelease", () => {
  it("bumps a pack by patch when only the text of an item changes", () => {
    const current = base();
    current["packs/react/rules/react.md"] = "# React\n\n- New text.\n";
    const change = only(plan(current).result);
    expect(change).toMatchObject({
      kind: "pack",
      name: "react",
      from: "1.4.2",
      to: "1.4.3",
      bump: "patch",
      reasons: ["rules/react.md changed"],
    });
  });

  it("bumps a pack by major when an item is removed or requires changes", () => {
    const removed = base();
    delete removed["packs/react/rules/react.md"];
    expect(only(plan(removed).result)).toMatchObject({
      to: "2.0.0",
      bump: "major",
      reasons: ["removed rule react"],
    });
    const requires = base();
    requires["packs/react/pack.json"] = manifest("react", { requires: ["typescript"] });
    expect(only(plan(requires).result)).toMatchObject({
      to: "2.0.0",
      reasons: ["requires changed"],
    });
  });

  it("bumps a pack by major when it gains a conflict, and by minor when it loses one", () => {
    const gained = base();
    gained["packs/react/pack.json"] = manifest("react", { conflicts: ["nextjs"] });
    expect(only(plan(gained).result)).toMatchObject({
      to: "2.0.0",
      reasons: ["conflicts with nextjs"],
    });
    const lost = base();
    lost["packs/react/pack.json"] = manifest("react", { conflicts: [] });
    const atTag = base();
    atTag["packs/react/pack.json"] = manifest("react", { conflicts: ["nextjs"] });
    expect(only(plan(lost, { atTag }).result)).toMatchObject({
      to: "1.5.0",
      reasons: ["no longer conflicts with nextjs"],
    });
  });

  it("classifies packVersions changes by compatibility", () => {
    const files = (range?: string) => {
      const current = base();
      current["packs/react/pack.json"] = manifest("react", {
        requires: ["dotnet"],
        ...(range ? { packVersions: { dotnet: range } } : {}),
      });
      return current;
    };
    const change = (from: string | undefined, to: string | undefined) =>
      only(plan(files(to), { atTag: files(from) }).result);
    expect(change(undefined, ">=1.4.2")).toMatchObject({
      to: "2.0.0",
      reasons: ["packVersions adds dotnet"],
    });
    expect(change(">=1.4.2", undefined)).toMatchObject({
      to: "1.5.0",
      reasons: ["packVersions drops dotnet"],
    });
    expect(change(">=1.4.0", ">=1.5.0")).toMatchObject({
      to: "2.0.0",
      reasons: ["packVersions dotnet >=1.4.0 -> >=1.5.0"],
    });
    expect(change(">=1.5.0", ">=1.4.0")).toMatchObject({
      to: "1.5.0",
      reasons: ["packVersions dotnet >=1.5.0 -> >=1.4.0"],
    });
    expect(change(">=1.0.0 <2", ">=1.5.0 <3")).toMatchObject({ to: "2.0.0" });
    expect(change("not-a-range", ">=1.0.0")).toMatchObject({ to: "2.0.0" });
    const odd = files(">=1.0.0");
    const atTag = base();
    atTag["packs/react/pack.json"] = manifest("react", {
      requires: ["dotnet"],
      packVersions: "bad",
    });
    expect(only(plan(odd, { atTag }).result)).toMatchObject({ to: "2.0.0" });
    const twoRanges = base();
    twoRanges["packs/react/pack.json"] = manifest("react", {
      requires: ["dotnet", "react"],
      packVersions: { react: ">=1.0.0", dotnet: ">=1.0.0" },
    });
    const noRanges = base();
    noRanges["packs/react/pack.json"] = manifest("react", { requires: ["dotnet", "react"] });
    expect(only(plan(twoRanges, { atTag: noRanges }).result)).toMatchObject({ to: "2.0.0" });
  });

  it("bumps a pack by minor for an added item, a note or a new latest version", () => {
    const added = base();
    added["packs/react/skills/react-forms/SKILL.md"] = "---\nname: react-forms\n---\n\n# Forms\n";
    expect(only(plan(added).result)).toMatchObject({
      to: "1.5.0",
      bump: "minor",
      reasons: ["added skill react-forms"],
    });
    const notes = base();
    notes["packs/react/pack.json"] = manifest("react", { notes: ["Run `x`."] });
    expect(only(plan(notes).result)).toMatchObject({ to: "1.5.0", reasons: ["notes changed"] });
    const latest = base();
    latest["packs/react/pack.json"] = manifest("react", { latest: "19" });
    expect(only(plan(latest).result)).toMatchObject({ to: "1.5.0", reasons: ["latest changed"] });
  });

  it("bumps a pack by patch for a metadata-only change", () => {
    const current = base();
    current["packs/react/pack.json"] = manifest("react", { tags: ["react", "ui"] });
    expect(only(plan(current).result)).toMatchObject({
      to: "1.4.3",
      reasons: ["pack.json changed"],
    });
  });

  it("reports a pack once when two files of one skill are removed", () => {
    const atTag = base();
    atTag["packs/react/skills/react-forms/SKILL.md"] = "# Forms\n";
    atTag["packs/react/skills/react-forms/references/a.md"] = "# A\n";
    const change = only(plan(base(), { atTag }).result);
    expect(change.reasons).toEqual(["removed skill react-forms"]);
  });

  it("removes agents and adds skills with their own reasons", () => {
    const atTag = base();
    atTag["packs/react/agents/reviewer.md"] = "# Reviewer\n";
    const current = base();
    current["packs/react/skills/react-forms/SKILL.md"] = "# Forms\n";
    const change = only(plan(current, { atTag }).result);
    expect(change.reasons).toEqual(["removed agent reviewer", "added skill react-forms"]);
  });

  it("bumps a stack by major, minor and patch for its changes", () => {
    const removed = base();
    removed["stacks/site.json"] = stack({ packs: [] });
    expect(only(plan(removed).result)).toMatchObject({
      kind: "stack",
      to: "2.0.0",
      reasons: ["removed pack react"],
    });
    const added = base();
    added["stacks/site.json"] = stack({ packs: ["react", "zod"] });
    expect(only(plan(added).result)).toMatchObject({ to: "1.2.0", reasons: ["added pack zod"] });
    const text = base();
    text["stacks/site.json"] = stack({ description: "New site." });
    expect(only(plan(text).result)).toMatchObject({ to: "1.1.1", reasons: ["stack changed"] });
  });

  it("starts a new pack or stack at 1.0.0", () => {
    const current = base();
    current["packs/zod/pack.json"] = manifest("zod");
    current["stacks/api.json"] = stack({ name: "api" });
    const result = plan(current).result;
    expect(result.changes).toEqual([
      expect.objectContaining({ kind: "pack", name: "zod", from: "", to: "1.0.0", bump: "none" }),
      expect.objectContaining({ kind: "stack", name: "api", from: "", to: "1.0.0", bump: "none" }),
    ]);
  });

  it("starts a pack without a version at the tag at 1.0.0", () => {
    const atTag = base();
    atTag["packs/react/pack.json"] = JSON.stringify({ name: "react", description: "React pack." });
    const change = only(plan(base(), { atTag }).result);
    expect(change).toMatchObject({ from: "", to: "1.0.0", bump: "none" });
  });

  it("treats an unreadable manifest at the tag as a new pack", () => {
    const atTag = base();
    atTag["packs/react/pack.json"] = "{ nope";
    const change = only(plan(base(), { atTag }).result);
    expect(change).toMatchObject({ from: "", to: "1.0.0" });
  });

  it("raises a bump with --bump and never lowers one", () => {
    const current = base();
    current["packs/react/rules/react.md"] = "# React\n\n- New text.\n";
    expect(only(plan(current, { bumps: { react: "major" } }).result).bump).toBe("major");
    const major = base();
    delete major["packs/react/rules/react.md"];
    expect(only(plan(major, { bumps: { react: "patch" } }).result).bump).toBe("major");
  });

  it("gives the CLI the largest pack bump, a patch for a source change, or --cli", () => {
    const current = base();
    current["packs/react/pack.json"] = manifest("react", { notes: ["Run `x`."] });
    expect(plan(current).result.cli).toEqual({ from: "0.6.0", to: "0.7.0", bump: "minor" });

    const source = base();
    source["src/main.ts"] = "export const a = 2;\n";
    const srcPlan = plan(source).result;
    expect(srcPlan.changes).toEqual([]);
    expect(srcPlan.cli).toEqual({ from: "0.6.0", to: "0.6.1", bump: "patch" });

    const file = base();
    file["src/extra.ts"] = "export {};\n";
    expect(plan(file).result.cli.bump).toBe("patch");

    expect(plan(base(), { cliBump: "major" }).result.cli).toEqual({
      from: "0.6.0",
      to: "1.0.0",
      bump: "major",
    });
  });

  it("compares files the tag does not have, deleted files and folders without a manifest", () => {
    const current = base();
    current["packs/react/NOTES.md"] = "# Notes\n";
    current["packs/empty/rules/x.md"] = "# X\n";
    expect(only(plan(current).result)).toMatchObject({
      name: "react",
      to: "1.4.3",
      reasons: ["NOTES.md changed"],
    });
    const atTag = base();
    atTag["packs/react/NOTES.md"] = "# Notes\n";
    expect(only(plan(base(), { atTag }).result).reasons).toEqual(["NOTES.md changed"]);
  });

  it("falls back when a manifest or the CLI has no version", () => {
    const current = base();
    current["packs/react/pack.json"] = manifest("react", { version: "x" });
    current["packs/react/rules/react.md"] = "# React\n\n- New text.\n";
    current["package.json"] = JSON.stringify({ name: "cli" });
    const result = plan(current).result;
    expect(result.changes[0]).toMatchObject({ to: "0.0.1" });
    expect(result.cli).toEqual({ from: "0.0.0", to: "0.0.1", bump: "patch" });
  });

  it("treats a missing src folder as no source change", () => {
    const current = base();
    delete current["src/main.ts"];
    expect(plan(current).result.cli.bump).toBe("patch");
    const same = base();
    same["packs/react/rules/react.md"] = "# React\n\n- New text.\n";
    const { root } = plan(same);
    const source = fakeSource("v1.0.0", base());
    const faulty: ReleaseSource = {
      ...source,
      filesAt: (tag, dir) => (dir === "src" ? ["main.ts"] : source.filesAt(tag, dir)),
      readAt: (tag, path) => (path === "src/main.ts" ? undefined : source.readAt(tag, path)),
    };
    expect(planRelease({ root, source: faulty }).cli.bump).toBe("patch");
  });

  it("plans a first release without a tag", () => {
    const result = plan(base(), { tag: undefined, atTag: {} }).result;
    expect(result.tag).toBeUndefined();
    expect(result.changes).toEqual([
      expect.objectContaining({ name: "react", to: "1.0.0", bump: "none", reasons: ["new pack"] }),
      expect.objectContaining({ name: "site", to: "1.0.0", bump: "none", reasons: ["new stack"] }),
    ]);
    expect(result.cli).toEqual({ from: "0.6.0", to: "0.6.0", bump: "none" });
  });
});

describe("release", () => {
  const io = () => {
    const out: string[] = [];
    const err: string[] = [];
    return {
      out,
      err,
      print: { out: (line: string) => out.push(line), err: (line: string) => err.push(line) },
    };
  };

  it("prints the plan and writes nothing on a dry run", () => {
    const current = base();
    current["packs/react/rules/react.md"] = "# React\n\n- New text.\n";
    const { root, result } = plan(current);
    const log = io();
    const code = release({ dryRun: true, bumps: {}, cliBump: "none" }, log.print, {
      root,
      source: fakeSource("v1.0.0", base()),
    });
    expect(code).toBe(0);
    expect(log.out.join("\n")).toContain("Changes since v1.0.0:");
    expect(log.out.join("\n")).toMatch(
      /react\s+1\.4\.2 -> 1\.4\.3\s+patch\s+rules\/react\.md changed/,
    );
    expect(result.changes).toHaveLength(1);
    expect(JSON.parse(readFileSync(join(root, "packs/react/pack.json"), "utf8")).version).toBe(
      "1.4.2",
    );
  });

  it("exits 1 when nothing changed, and on an error", () => {
    const { root } = plan(base());
    const log = io();
    expect(
      release({ dryRun: true, bumps: {}, cliBump: "none" }, log.print, {
        root,
        source: fakeSource("v1.0.0", base()),
      }),
    ).toBe(1);
    expect(log.err.join("\n")).toContain("Nothing changed since v1.0.0.");

    const missing = io();
    const empty = temp();
    created.push(empty);
    expect(
      release({ dryRun: false, bumps: {}, cliBump: "none" }, missing.print, { root: empty }),
    ).toBe(1);
    expect(missing.err.join("\n")).toContain("package.json");

    const nothing = io();
    const emptyProject = temp();
    created.push(emptyProject);
    writeFileSync(join(emptyProject, "package.json"), JSON.stringify({ version: "0.1.0" }));
    expect(
      release({ dryRun: true, bumps: {}, cliBump: "none" }, nothing.print, { root: emptyProject }),
    ).toBe(1);
    expect(nothing.err.join("\n")).toBe("Nothing to release.");
  });

  it("applies a release in a git repository and reports the commit", () => {
    const root = temp();
    created.push(root);
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git(["init"]);
    git(["config", "user.name", "Test"]);
    git(["config", "user.email", "test@example.com"]);
    for (const [path, content] of Object.entries(base())) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    git(["add", "-A"]);
    git(["commit", "-m", "First"]);
    git(["tag", "v1.0.0"]);
    writeFileSync(join(root, "packs/react/rules/react.md"), "# React\n\n- New text.\n");

    const log = io();
    const code = release({ dryRun: false, bumps: {}, cliBump: "none" }, log.print, { root });
    expect(code).toBe(0);
    expect(log.out.join("\n")).toContain("Committed Release 0.6.1 and tagged v0.6.1.");
    expect(git(["tag", "--list", "v0.6.1"]).trim()).toBe("v0.6.1");
  }, 30000);

  it("parses --bump pairs and rejects anything else", () => {
    expect(parseBumps(["react=major", "zod=patch"])).toEqual({ react: "major", zod: "patch" });
    expect(() => parseBumps(["react=big"])).toThrow("Use --bump <name>=<major|minor|patch>");
    expect(() => parseBumps(["react"])).toThrow("Use --bump");
  });

  it("formats a new pack and the CLI line", () => {
    const current = base();
    current["packs/zod/pack.json"] = manifest("zod");
    const lines = formatPlan(plan(current).result);
    expect(lines[0]).toBe("Changes since v1.0.0:");
    expect(lines.join("\n")).toMatch(/zod\s+1\.0\.0\s+new\s+new pack/);
    expect(lines.at(-1)).toBe("CLI               0.6.0 -> 0.6.0");
    expect(formatPlan(plan(base(), { tag: undefined, atTag: {} }).result)[0]).toBe(
      "First release:",
    );
  });
});

describe("applyRelease", () => {
  it("writes versions and changelogs for real git history", () => {
    const root = temp();
    created.push(root);
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git(["init"]);
    git(["config", "user.name", "Test"]);
    git(["config", "user.email", "test@example.com"]);
    for (const [path, content] of Object.entries(base())) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    writeFileSync(join(root, "packs/react/CHANGELOG.md"), "# Changelog\n\n## 1.4.2\n\n- Old.\n");
    git(["add", "-A"]);
    git(["commit", "-m", "First"]);
    git(["tag", "v1.0.0"]);

    const source = gitSource(root);
    expect(source.lastTag()).toBe("v1.0.0");
    expect(source.filesAt("v1.0.0", "packs/react")).toContain("pack.json");
    expect(source.filesAt("nope", "packs/react")).toEqual([]);
    expect(source.readAt("nope", "packs/react/pack.json")).toBeUndefined();
    expect(source.commits("nope", "packs/react")).toEqual([]);
    expect(source.commits("v1.0.0", "packs/react")).toEqual([]);

    writeFileSync(join(root, "packs/react/rules/react.md"), "# React\n\n- New text.\n");
    writeFileSync(join(root, "src/main.ts"), "export const a = 2;\n");
    const result = planRelease({ root });
    expect(result.changes[0]).toMatchObject({ name: "react", to: "1.4.3", bump: "patch" });
    expect(result.cli).toEqual({ from: "0.6.0", to: "0.6.1", bump: "patch" });

    applyRelease(result, { root });
    expect(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version).toBe("0.6.1");
    expect(readFileSync(join(root, "packs/react/CHANGELOG.md"), "utf8")).toBe(
      "# Changelog\n\n## 1.4.3\n\n- rules/react.md changed\n\n## 1.4.2\n\n- Old.\n",
    );
    expect(git(["tag", "--list", "v0.6.1"]).trim()).toBe("v0.6.1");
    expect(git(["log", "-1", "--format=%s"]).trim()).toBe("Release 0.6.1");
  }, 30000);

  it("writes nothing on a dry run", () => {
    const current = base();
    current["packs/react/rules/react.md"] = "# React\n\n- New text.\n";
    const { root, result } = plan(current);
    applyRelease(result, { root, dryRun: true });
    expect(JSON.parse(readFileSync(join(root, "packs/react/pack.json"), "utf8")).version).toBe(
      "1.4.2",
    );
    expect(existsSync(join(root, "packs/react/CHANGELOG.md"))).toBe(false);
  });

  it("writes a stack changelog", () => {
    const current = base();
    current["stacks/site.json"] = stack({ description: "New site." });
    const { root, result } = plan(current);
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git(["init"]);
    git(["config", "user.name", "Test"]);
    git(["config", "user.email", "test@example.com"]);
    applyRelease(result, { root });
    expect(readFileSync(join(root, "stacks/CHANGELOG.md"), "utf8")).toBe(
      "# Changelog\n\n## 1.1.1\n\n- stack changed\n",
    );
    expect(JSON.parse(readFileSync(join(root, "stacks/site.json"), "utf8")).version).toBe("1.1.1");
  });

  it("creates a changelog that does not exist yet", () => {
    const current = base();
    current["packs/react/pack.json"] = manifest("react", { notes: ["Run `x`."] });
    const { root, result } = plan(current);
    const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git(["init"]);
    git(["config", "user.name", "Test"]);
    git(["config", "user.email", "test@example.com"]);
    applyRelease(result, { root });
    expect(readFileSync(join(root, "packs/react/CHANGELOG.md"), "utf8")).toBe(
      "# Changelog\n\n## 1.5.0\n\n- notes changed\n",
    );
  });

  it("plans a feed release without a version and writes nothing on a dry run", () => {
    const root = temp();
    created.push(root);
    mkdirSync(join(root, "packs", "acme-api"), { recursive: true });
    writeFileSync(join(root, "feed.json"), JSON.stringify({ name: "acme", cli: ">=0.1.0" }));
    writeFileSync(
      join(root, "packs", "acme-api", "pack.json"),
      JSON.stringify({ name: "acme-api", description: "API pack.", version: "1.0.0" }),
    );
    const plan = planFeedRelease({ root, source: fakeSource(undefined, {}) });
    expect(plan.feed).toEqual({ from: "0.0.0", to: "0.0.0", bump: "none" });
    applyFeedRelease(plan, { root, dryRun: true });
    expect(JSON.parse(readFileSync(join(root, "feed.json"), "utf8"))).toEqual({
      name: "acme",
      cli: ">=0.1.0",
    });
    expect(existsSync(join(root, "packs", "acme-api", "CHANGELOG.md"))).toBe(false);
  });
});
