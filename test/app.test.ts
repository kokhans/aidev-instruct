import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { WriteStream } from "node:tty";
import { styleText } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgram, type IO, run, VERSION } from "../src/app.ts";
import { CONFIG_FILE, LOCK_FILE } from "../src/config.ts";
import { hash } from "../src/sync.ts";
import { feedArchive } from "./feed-fixtures.ts";
import { createFixture, type Fixture } from "./fixtures.ts";

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

/** Runs the CLI against the fixture and returns the exit code and printed lines. */
async function cli(args: string[], context: Partial<Parameters<typeof run>[2]> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const io: IO = { out: (line) => out.push(line), err: (line) => err.push(line) };
  const code = await run(args, io, {
    cwd: fx.root,
    packsDir: fx.packsDir,
    stacksDir: fx.stacksDir,
    ...context,
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}
const json = (file: string) => JSON.parse(readFileSync(join(fx.root, file), "utf8"));
const setConfig = (value: unknown) =>
  writeFileSync(join(fx.root, CONFIG_FILE), JSON.stringify(value));

describe("general", () => {
  it("prints help and version", async () => {
    const help = createProgram({ out: () => undefined, err: () => undefined }).helpInformation();
    expect((await cli([])).out).toBe(help.replace(/\n$/, ""));
    expect((await cli(["status", "--help"])).out).toContain("--dry-run");
    expect((await cli(["init", "--help"])).out).toContain("--stacks <list>");
    expect(await cli(["-v"])).toEqual({ code: 0, out: VERSION, err: "" });
    expect((await cli(["init", "--version"])).out).toBe(VERSION);
  });

  it("fails on unknown commands and bad options", async () => {
    const unknown = await cli(["nope"]);
    expect(unknown.code).toBe(1);
    expect(unknown.err).toBe("error: unknown command 'nope'");
    expect((await cli(["status", "--nope"])).err).toMatch(/unknown option/);
  });

  it("takes a common option before or after the command", async () => {
    expect((await cli(["--dir", "sub", "targets"])).out).toContain("Default: copilot");
    expect((await cli(["targets", "--dir", "sub"])).out).toContain("Default: copilot");
    expect((await cli(["--dry-run", "init", "-p", "web"])).out).toContain("Dry run:");
    expect((await cli(["init", "-p", "web", "--dry-run"])).out).toContain("Dry run:");
  });

  it("uses the current folder and the shipped packs by default", async () => {
    const out: string[] = [];
    const code = await run(["targets"], { out: (l) => out.push(l), err: () => undefined });
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("copilot");
  });

  it("resolves --dir against the working directory", async () => {
    const { out } = await cli(["init", "-t", "claude", "--dir", "sub"]);
    expect(out).toContain(`Project: ${join(fx.root, "sub")}`);
  });
});

describe("init", () => {
  it("writes the config and lock, installs packs and prints notes", async () => {
    const { code, out } = await cli(["init", "-p", "web", "-t", "claude"]);
    expect(code).toBe(0);
    expect(json(CONFIG_FILE)).toEqual({ targets: ["claude"], packs: ["web"] });
    expect(Object.keys(json(LOCK_FILE).packs)).toEqual(["base", "web"]);
    expect(out).toContain("Next steps\n  base: Run `setup --now` first.");
    expect(out.indexOf("Next steps")).toBeGreaterThan(out.indexOf("Created"));
    expect(out).toContain(`Created ${CONFIG_FILE} and ${LOCK_FILE}.`);
  });

  it("refuses to run twice", async () => {
    await cli(["init"]);
    expect((await cli(["init"])).err).toContain("already exists");
  });

  it("uses the default targets without -t", async () => {
    await cli(["init"]);
    expect(json(CONFIG_FILE).targets).toEqual(["copilot", "claude", "cursor"]);
  });

  it("takes stacks and a folder", async () => {
    await cli(["init", "-p", "db", "-s", "site, ", "--path", "./apps/web/", "--targets", "claude"]);
    expect(json(CONFIG_FILE)).toEqual({
      targets: ["claude"],
      stacks: [{ name: "site", path: "apps/web" }],
      packs: [{ name: "db", path: "apps/web" }],
    });
    expect(json(LOCK_FILE).packs.web.paths).toEqual(["apps/web"]);
  });

  it("writes nothing on a dry run", async () => {
    const { out } = await cli(["init", "-p", "web", "--dry-run"]);
    expect(out).toContain("Dry run:");
    expect(out).not.toContain("Created");
    expect(fx.exists(CONFIG_FILE)).toBe(false);
  });

  it("rejects pack names without -p, and unknown names before writing", async () => {
    const bare = await cli(["init", "zod", "stripe"]);
    expect(bare.code).toBe(1);
    expect(bare.err).toBe("Pass packs with -p: aidev-instruct init -p zod,stripe");
    for (const args of [
      ["-t", "nope"],
      ["-s", "nope"],
      ["-p", "nope"],
      ["-p", "spa,ssr"],
    ]) {
      expect((await cli(["init", ...args])).code).toBe(1);
      expect(fx.exists(CONFIG_FILE)).toBe(false);
      expect(fx.exists(LOCK_FILE)).toBe(false);
    }
  });
});

describe("add and remove", () => {
  it("adds packs, creating the config when missing", async () => {
    const first = await cli(["add", "web"]);
    expect(first.out).toContain(`Created ${CONFIG_FILE}.`);
    const second = await cli(["add", "db", "--path", "api"]);
    expect(second.out).not.toContain("Created");
    expect(json(CONFIG_FILE).packs).toEqual(["web", { name: "db", path: "api" }]);
  });

  it("needs at least one pack and leaves the config alone on errors", async () => {
    expect((await cli(["add"])).err).toContain("Name at least one pack");
    await cli(["init", "-t", "claude"]);
    expect((await cli(["add", "nope"])).code).toBe(1);
    expect(json(CONFIG_FILE).packs).toEqual([]);
  });

  it("writes no config on a dry run", async () => {
    const { out } = await cli(["add", "web", "--dry-run"]);
    expect(out).not.toContain("Created");
    expect(fx.exists(CONFIG_FILE)).toBe(false);
  });

  it("removes packs and their files, and explains packs that stay", async () => {
    await cli(["init", "-p", "base,web", "-t", "claude"]);
    const { out } = await cli(["remove", "base", "web", "nope"]);
    expect(out).toContain('nope is not listed in "packs"');
    expect(json(CONFIG_FILE).packs).toEqual([]);
    expect(fx.exists(".claude/rules/react.md")).toBe(false);

    await cli(["init", "-t", "claude"]).catch(() => undefined);
    await cli(["add", "base", "web"]);
    const stays = await cli(["remove", "base"]);
    expect(stays.out).toContain("base stays installed: required by web.");
  });

  it("refuses to remove without a config", async () => {
    expect((await cli(["remove", "web"])).err).toContain("Nothing is installed");
  });

  it("keeps a pack that a stack in the config still includes", async () => {
    await cli(["init", "-s", "site", "-p", "web", "-t", "claude"]);
    const { out } = await cli(["remove", "web"]);
    expect(out).toContain("web stays installed: stack site includes it.");
    expect(fx.exists(".claude/rules/react.md")).toBe(true);
  });
});

describe("multiple paths", () => {
  /** A pack with one unversioned rule and one rule per technology version. */
  const writeCsharp = () => {
    fx.write(
      "packs/csharp/pack.json",
      JSON.stringify({
        name: "csharp",
        description: "C# guidance.",
        version: "1.0.0",
        tags: ["test"],
        latest: "15",
      }),
    );
    fx.write(
      "packs/csharp/rules/csharp.md",
      '---\ndescription: C#.\nglobs: ["**/*.cs"]\n---\n\n# C#\n',
    );
    for (const version of ["14", "15"]) {
      fx.write(
        `packs/csharp/rules/csharp-${version}.md`,
        `---\ndescription: C# ${version}.\nglobs: ["**/*.cs"]\nversion: "${version}"\n---\n\n# C# ${version}\n`,
      );
    }
  };

  it("applies one pack to every folder in its list", async () => {
    setConfig({
      targets: ["claude"],
      packs: [{ name: "web", path: ["apps/web", "apps/admin"] }],
    });
    expect((await cli(["update"])).code).toBe(0);
    const rule = fx.read(".claude/rules/react.md");
    expect(rule).toContain("apps/web/**/*.tsx");
    expect(rule).toContain("apps/admin/**/*.tsx");
  });

  it("runs two versions of one pack in their own folders", async () => {
    writeCsharp();
    setConfig({
      targets: ["claude"],
      packs: [
        { name: "csharp", version: "14", path: "legacy" },
        { name: "csharp", version: "15", path: "apps" },
      ],
    });
    expect((await cli(["update"])).code).toBe(0);
    expect(fx.read(".claude/rules/csharp.md")).toContain("legacy/**/*.cs");
    expect(fx.read(".claude/rules/csharp.md")).toContain("apps/**/*.cs");
    expect(fx.read(".claude/rules/csharp-14.md")).toContain("legacy/**/*.cs");
    expect(fx.read(".claude/rules/csharp-14.md")).not.toContain("apps/");
    expect(fx.read(".claude/rules/csharp-15.md")).toContain("apps/**/*.cs");
    expect(fx.read(".claude/rules/csharp-15.md")).not.toContain("legacy/");
    expect(json(LOCK_FILE).packs.csharp.paths).toEqual(["apps", "legacy"]);
  });

  it("fails two versions in overlapping folders and names both", async () => {
    writeCsharp();
    setConfig({
      targets: ["claude"],
      packs: [
        { name: "csharp", version: "14", path: "apps" },
        { name: "csharp", version: "15", path: "apps/web" },
      ],
    });
    const { code, err } = await cli(["update"]);
    expect(code).toBe(1);
    expect(err).toContain(
      "Pack csharp is on version 14 in apps and on 15 in apps/web. Give each version its own folder with --path.",
    );
  });

  it("fails conflicting packs in a shared folder of a list", async () => {
    setConfig({
      targets: ["claude"],
      packs: [
        { name: "spa", path: ["apps/web"] },
        { name: "ssr", path: ["apps/web", "apps/ssr"] },
      ],
    });
    const { code, err } = await cli(["update"]);
    expect(code).toBe(1);
    expect(err).toContain("Packs spa and ssr cannot be installed together in apps/web.");
  });

  it("adds a pack with a comma-separated list of folders", async () => {
    const { code } = await cli(["add", "web", "--path", "apps/web,apps/admin"]);
    expect(code).toBe(0);
    expect(json(CONFIG_FILE).packs).toEqual([{ name: "web", path: ["apps/web", "apps/admin"] }]);
    expect(fx.read(".claude/rules/react.md")).toContain("apps/admin/**/*.tsx");
  });

  it("merges a repeated stack into one entry with both folders", async () => {
    expect((await cli(["stacks", "add", "site", "--path", "apps/a"])).code).toBe(0);
    expect((await cli(["stacks", "add", "site", "--path", "apps/b"])).code).toBe(0);
    expect(json(CONFIG_FILE).stacks).toEqual([{ name: "site", path: ["apps/a", "apps/b"] }]);
    expect(json(LOCK_FILE).packs.web.paths).toEqual(["apps/a", "apps/b"]);
  });

  it("removes one folder and keeps the other files", async () => {
    setConfig({
      targets: ["claude"],
      packs: [{ name: "web", path: ["apps/web", "apps/admin"] }],
    });
    await cli(["update"]);
    expect(fx.read(".claude/rules/react.md")).toContain("apps/admin/**/*.tsx");
    const { code } = await cli(["remove", "web", "--path", "apps/admin"]);
    expect(code).toBe(0);
    expect(json(CONFIG_FILE).packs).toEqual([{ name: "web", path: "apps/web" }]);
    expect(fx.exists(".claude/rules/react.md")).toBe(true);
    expect(fx.exists(".claude/rules/always.md")).toBe(true);
    expect(fx.read(".claude/rules/react.md")).toContain("apps/web/**/*.tsx");
    expect(fx.read(".claude/rules/react.md")).not.toContain("apps/admin");
    expect((await cli(["status"])).out).toContain("web   config  apps/web");
  });

  it("leaves a whole-project entry alone when removing one folder", async () => {
    setConfig({ targets: ["claude"], packs: ["web"] });
    await cli(["update"]);
    expect((await cli(["remove", "web", "--path", "apps/web"])).code).toBe(0);
    expect(json(CONFIG_FILE).packs).toEqual(["web"]);
    expect(fx.exists(".claude/rules/react.md")).toBe(true);
  });

  it("keeps the other folders when a path is not listed", async () => {
    setConfig({ targets: ["claude"], packs: [{ name: "web", path: ["apps/web"] }] });
    await cli(["update"]);
    expect((await cli(["remove", "web", "--path", "apps/other"])).code).toBe(0);
    expect(json(CONFIG_FILE).packs).toEqual([{ name: "web", path: "apps/web" }]);
    expect(fx.exists(".claude/rules/react.md")).toBe(true);
  });

  it("deletes an entry left with no folder", async () => {
    setConfig({ targets: ["claude"], packs: [{ name: "web", path: ["apps/web"] }] });
    await cli(["update"]);
    expect((await cli(["remove", "web", "--path", "apps/web"])).code).toBe(0);
    expect(json(CONFIG_FILE).packs).toEqual([]);
    expect(fx.exists(".claude/rules/react.md")).toBe(false);
  });

  it("takes name@version on add", async () => {
    writeCsharp();
    expect((await cli(["add", "csharp@14"])).code).toBe(0);
    expect(json(CONFIG_FILE).packs).toEqual([{ name: "csharp", version: "14" }]);
    expect(fx.read(".claude/rules/csharp-14.md")).toContain("**/*.cs");
  });

  it("takes --version on add", async () => {
    writeCsharp();
    expect((await cli(["add", "csharp", "--version", "14"])).code).toBe(0);
    expect(json(CONFIG_FILE).packs).toEqual([{ name: "csharp", version: "14" }]);
    expect(fx.exists(".claude/rules/csharp-14.md")).toBe(true);
    expect(fx.exists(".claude/rules/csharp-15.md")).toBe(false);
  });

  it("adds a second version as a new entry", async () => {
    writeCsharp();
    await cli(["add", "csharp@14", "--path", "legacy"]);
    await cli(["add", "csharp", "--version", "15", "--path", "apps"]);
    expect(json(CONFIG_FILE).packs).toEqual([
      { name: "csharp", version: "14", path: "legacy" },
      { name: "csharp", version: "15", path: "apps" },
    ]);
  });

  it("rejects a path that leaves the project before writing", async () => {
    const { code, err } = await cli(["add", "web", "--path", "../outside"]);
    expect(code).toBe(1);
    expect(err).toContain("inside the project");
    expect(fx.exists(CONFIG_FILE)).toBe(false);
  });
});

describe("stacks", () => {
  it("lists stacks and marks the ones in the config", async () => {
    expect((await cli(["stacks"])).out).toBe("  site: Site.\n    web");
    await cli(["stacks", "add", "site"]);
    expect((await cli(["stacks"])).out).toBe("* site: Site.\n    web\n\n* in the config");
  });

  it("says when no stacks exist", async () => {
    rmSync(fx.stacksDir, { recursive: true });
    expect((await cli(["stacks"])).out).toBe("No stacks available.");
  });

  it("adds and removes stacks", async () => {
    const added = await cli(["stacks", "add", "site", "--path", "web"]);
    expect(added.out).toContain(`Created ${CONFIG_FILE}.`);
    expect(json(CONFIG_FILE).stacks).toEqual([{ name: "site", path: "web" }]);
    expect(fx.exists(".claude/rules/react.md")).toBe(true);
    await cli(["stacks", "remove", "site"]);
    expect(json(CONFIG_FILE).stacks).toBeUndefined();
    expect(fx.exists(".claude/rules/react.md")).toBe(false);
    expect((await cli(["stacks", "add", "site", "--dry-run"])).out).not.toContain("Created");
  });

  it("validates the action, names and config", async () => {
    expect((await cli(["stacks", "nope"])).err).toContain('Use "stacks add');
    expect((await cli(["stacks", "add"])).err).toContain("Name at least one stack");
    expect((await cli(["stacks", "remove", "site"])).err).toContain("Nothing is installed");
    expect((await cli(["stacks", "add", "nope"])).err).toContain('Unknown stack "nope"');
  });
});

describe("targets", () => {
  it("lists targets with and without a config", async () => {
    const without = await cli(["targets"]);
    expect(without.out).toContain("  claude ");
    expect(without.out).toContain("Default: copilot, claude, cursor");
    expect(without.out).not.toContain("* in the config");
    await cli(["init", "-t", "claude"]);
    const withConfig = await cli(["targets"]);
    expect(withConfig.out).toContain("* claude ");
    expect(withConfig.out).toContain("* in the config");
  });

  it("adds and removes targets", async () => {
    await cli(["init", "-p", "base", "-t", "claude"]);
    await cli(["targets", "add", "codex"]);
    expect(json(CONFIG_FILE).targets).toEqual(["claude", "codex"]);
    expect(fx.exists(".codex/agents/reviewer.toml")).toBe(true);
    await cli(["targets", "remove", "codex"]);
    expect(fx.exists(".codex")).toBe(false);
  });

  it("validates the action, the names and that one target stays", async () => {
    expect((await cli(["targets", "add", "codex"])).err).toContain('Run "aidev-instruct init"');
    await cli(["init", "-t", "claude"]);
    expect((await cli(["targets", "nope"])).err).toContain('Use "targets add');
    expect((await cli(["targets", "add", "nope"])).err).toContain("Unknown target(s): nope");
    expect((await cli(["targets", "remove", "claude"])).err).toContain("Keep at least one target.");
  });
});

describe("update", () => {
  it("needs a config", async () => {
    expect((await cli(["update"])).err).toContain('Run "aidev-instruct init"');
  });

  it("applies config edits, and --orig keeps a copy of files changed by hand", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    writeFileSync(join(fx.root, ".claude/rules/react.md"), "# Mine\n");
    fx.write("packs/web/rules/react.md", "---\ndescription: R.\n---\n# React v2\n");
    const kept = await cli(["update"]);
    expect(kept.out).toContain(
      "skip    .claude/rules/react.md  (changed by hand, use --orig to keep a copy or --force to overwrite)",
    );
    const orig = await cli(["update", "--orig"]);
    expect(orig.out).toContain(
      "update  .claude/rules/react.md  (your version saved as .claude/rules/react.md.orig)",
    );
    expect(orig.out).toContain(
      "Note: .claude/rules/react.md.orig holds a version changed by hand.",
    );
    writeFileSync(join(fx.root, ".claude/rules/react.md"), "# Again\n");
    expect((await cli(["update", "--orig"])).out).toContain(
      "(resolve .claude/rules/react.md.orig first)",
    );
  });

  it("uses modified from the config and explains unmanaged files", async () => {
    fx.write("project/.claude/rules/react.md", "# Project rule\n");
    setConfig({ targets: ["claude"], packs: ["web"] });
    expect((await cli(["update"])).out).toContain(
      "(file exists and is not managed, use --orig or --force)",
    );
    setConfig({ targets: ["claude"], packs: ["web"], modified: "orig" });
    expect((await cli(["update"])).out).toContain("(your version saved as");
  });

  it("fails an unknown target before writing anything", async () => {
    setConfig({ targets: ["claude", "Gemini"], packs: ["base"] });
    const { code, err } = await cli(["update"]);
    expect(code).toBe(1);
    expect(err).toBe(
      "Unknown target(s): gemini. Use copilot, claude, cursor, codex, antigravity, kiro, devin.",
    );
    expect(fx.exists(".claude")).toBe(false);
    expect(fx.exists(LOCK_FILE)).toBe(false);
  });
});

describe("check", () => {
  it("exits 0 when update would change nothing", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    expect(await cli(["check"])).toMatchObject({ code: 0 });
    expect((await cli(["check"])).out).toContain("Everything is up to date.");
  });

  it("exits 1 and lists pending config, hand edits, deleted files and new pack content", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    const lock = readFileSync(join(fx.root, LOCK_FILE), "utf8");
    setConfig({ targets: ["claude"], packs: ["web", "db"] });
    fx.write("project/.claude/rules/react.md", "# Mine\n");
    rmSync(join(fx.root, ".claude/rules/always.md"));
    fx.write("packs/web/skills/web-spec/references/seo.md", "# SEO v2\n");

    const { code, out } = await cli(["check"]);
    expect(code).toBe(1);
    expect(out).toContain("Pending packs to add: db");
    expect(out).toContain("create  .claude/rules/db.md");
    expect(out).toContain("skip    .claude/rules/react.md  (changed by hand");
    expect(out).toContain("create  .claude/rules/always.md");
    expect(out).toContain("update  .claude/skills/web-spec/references/seo.md");
    expect(out).toContain('Run "aidev-instruct update" to apply.');
    expect(readFileSync(join(fx.root, LOCK_FILE), "utf8")).toBe(lock);
    expect(fx.exists(".claude/rules/db.md")).toBe(false);
  });

  it("fails without a config", async () => {
    expect(await cli(["check"])).toMatchObject({ code: 1 });
  });
});

describe("clean", () => {
  it("deletes every file and the lock, keeps the config and local items, and update restores them", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    fx.write("project/.aidev-instruct/rules/mine.md", "---\ndescription: Mine.\n---\n# Mine\n");
    await cli(["update"]);

    const { code, out } = await cli(["clean"]);
    expect(code).toBe(0);
    expect(out).toContain("delete  .claude/rules/react.md");
    expect(out).toContain("delete  .claude/rules/mine.md");
    expect(out).toContain(`Deleted ${LOCK_FILE}.`);
    expect(fx.exists(".claude")).toBe(false);
    expect(fx.exists(LOCK_FILE)).toBe(false);
    expect(fx.exists(CONFIG_FILE)).toBe(true);
    expect(fx.exists(".aidev-instruct/rules/mine.md")).toBe(true);

    await cli(["update"]);
    expect(fx.exists(".claude/rules/react.md")).toBe(true);
    expect(fx.exists(".claude/rules/mine.md")).toBe(true);
  });

  it("deletes only the files the lock lists and the lock", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    fx.write("project/.claude/rules/project.md", "---\ndescription: Ours.\n---\n# Ours\n");
    const lock = json(LOCK_FILE);
    const owned = Object.keys(lock.files).sort();

    const { out } = await cli(["clean"]);
    expect(out).toContain(`Deleted ${LOCK_FILE}.`);
    for (const path of owned) expect(fx.exists(path), path).toBe(false);
    expect(fx.exists(".claude/rules/project.md")).toBe(true);
  });

  it("skips files changed by hand unless --orig or --force", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    fx.write("project/.claude/rules/react.md", "# Mine\n");
    const kept = await cli(["clean", "--dry-run"]);
    expect(kept.out).toContain("skip    .claude/rules/react.md  (changed by hand");
    expect(fx.exists(LOCK_FILE)).toBe(true);

    await cli(["clean", "--orig"]);
    expect(fx.read(".claude/rules/react.md.orig")).toBe("# Mine\n");
    expect(fx.exists(".claude/rules/react.md")).toBe(false);

    await cli(["update"]);
    fx.write("project/.claude/rules/react.md", "# Again\n");
    await cli(["clean", "--force"]);
    expect(fx.exists(".claude/rules/react.md")).toBe(false);
  });

  it("reports nothing to clean without a lock, and cleans without a config", async () => {
    expect((await cli(["clean"])).out).toContain("Nothing to clean.");
    await cli(["init", "-p", "web", "-t", "claude"]);
    rmSync(join(fx.root, CONFIG_FILE));
    await cli(["clean"]);
    expect(fx.exists(".claude")).toBe(false);
  });
});

describe("next steps", () => {
  afterEach(() => vi.unstubAllEnvs());
  const terminal = () =>
    Object.assign(new PassThrough(), {
      isTTY: true,
      getColorDepth: WriteStream.prototype.getColorDepth,
      hasColors: WriteStream.prototype.hasColors,
    }) as unknown as NodeJS.WriteStream;
  const install = async (stream: NodeJS.WriteStream) => {
    const out: string[] = [];
    await run(
      ["init", "-p", "web", "-t", "claude"],
      { out: (line) => out.push(line), err: () => undefined, stream },
      { cwd: fx.root, packsDir: fx.packsDir, stacksDir: fx.stacksDir },
    );
    return out.join("\n");
  };
  const plain = "Next steps\n  base: Run `setup --now` first.";

  it("colors the heading, the pack and the command in a terminal", async () => {
    vi.stubEnv("NO_COLOR", undefined);
    vi.stubEnv("FORCE_COLOR", "3");
    const raw = (format: Parameters<typeof styleText>[0], text: string) =>
      styleText(format, text, { validateStream: false });
    expect(await install(terminal())).toContain(
      `${raw(["bold", "yellow"], "Next steps")}\n  ${raw("bold", "base")}: Run ${raw("cyan", "setup --now")} first.`,
    );
  });

  it("prints the note as written with NO_COLOR or without a terminal", async () => {
    vi.stubEnv("FORCE_COLOR", undefined);
    vi.stubEnv("NO_COLOR", "1");
    expect(await install(terminal())).toContain(plain);
    rmSync(join(fx.root, CONFIG_FILE));
    rmSync(join(fx.root, LOCK_FILE));
    vi.stubEnv("NO_COLOR", undefined);
    expect(await install(new PassThrough() as unknown as NodeJS.WriteStream)).toContain(plain);
  });

  it("prints notes only for packs that were not installed before", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    expect((await cli(["add", "db"])).out).not.toContain("Next steps");
  });
});

describe("list", () => {
  it("lists packs without a project", async () => {
    const { out } = await cli(["list"]);
    expect(out).toContain("  web   web pack. (requires base)");
    expect(out).not.toContain("* installed");
  });

  it("marks installed, required, pending and removed packs", async () => {
    await cli(["init", "-p", "web,db", "-t", "claude"]);
    setConfig({ targets: ["claude"], packs: ["web", "auth"] });
    const { out } = await cli(["list"]);
    expect(out).toContain("* web ");
    expect(out).toContain("+ base ");
    expect(out).toContain("> auth ");
    expect(out).toContain("- db ");
    expect(out).toContain("  spa ");
    expect(out).toContain("* installed  + installed as a requirement");
  });

  it("falls back to the lock without a config", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    rmSync(join(fx.root, CONFIG_FILE));
    expect((await cli(["list"])).out).toContain("+ web ");
  });
});

describe("status", () => {
  it("needs a config", async () => {
    expect((await cli(["status"])).out).toContain('Run "aidev-instruct init"');
  });

  it("shows pending packs, targets and folders from the lock", async () => {
    await cli(["init", "-p", "web,db", "-t", "claude"]);
    setConfig({ targets: ["cursor"], packs: ["web", { name: "db", path: "api" }, "auth"] });
    const { out } = await cli(["status"]);
    expect(out).toContain("Installed packs:\n  base  required by web\n  web   config\n");
    expect(out).toContain("  db    config\n");
    expect(out).toContain("Installed targets: claude\n");
    expect(out).toContain("Pending packs to add: auth");
    expect(out).toContain("Pending targets to add: cursor");
    expect(out).toContain("Pending targets to remove: claude");
    expect(out).toContain("Pending folder changes: db");
    expect(out).toContain('Run "aidev-instruct update" to apply.');
  });

  it("names the stack and the requiring pack of an installed pack", async () => {
    await cli(["init", "-s", "site", "-t", "claude"]);
    expect(json(LOCK_FILE).packs).toEqual({
      base: { requires: [], version: "1.0.0", from: { requiredBy: ["web"] } },
      web: { requires: ["base"], version: "1.0.0", from: { stacks: ["site"] } },
    });
    setConfig({ targets: ["claude"], stacks: ["site"], packs: ["base"] });
    await cli(["update"]);
    expect(json(LOCK_FILE).packs.base.from).toEqual({ requiredBy: ["web"], config: true });
    const { out } = await cli(["status"]);
    expect(out).toContain("  base  required by web, config\n");
    expect(out).toContain("  web   stack site\n");
    const stays = await cli(["remove", "base"]);
    expect(stays.out).toContain("base stays installed: required by web.");
  });

  it("shows removed packs, a config without a lock, and a CLI version that differs from the lock", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    const lock = json(LOCK_FILE);
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify({ ...lock, version: "0.0.1" }));
    setConfig({ targets: ["claude"], packs: [] });
    const { out } = await cli(["status"]);
    expect(out).toContain("Pending packs to remove: base, web");
    expect(out).toContain(`Installed with 0.0.1. This CLI is ${VERSION}.`);

    rmSync(join(fx.root, LOCK_FILE));
    const fresh = await cli(["status"]);
    expect(fresh.out).toContain("Installed packs: none");
    expect(fresh.out).toContain("Installed targets: none");
  });

  it("names a pack whose version changed since the lock", async () => {
    await cli(["init", "-p", "db", "-t", "claude"]);
    fx.write(
      "packs/db/pack.json",
      JSON.stringify({ name: "db", description: "db pack.", version: "1.1.0" }),
    );
    const line = "db 1.0.0 -> 1.1.0 (minor)";
    expect((await cli(["status"])).out).toContain(line);
    const check = await cli(["check"]);
    expect(check.code).toBe(1);
    expect(check.out).toContain(line);
    expect((await cli(["update"])).out).toContain(line);
    expect(json(LOCK_FILE).packs.db.version).toBe("1.1.0");
    expect((await cli(["status"])).out).not.toContain(line);
  });

  it("fails a lock without a pack version or source", async () => {
    await cli(["init", "-p", "db", "-t", "claude"]);
    const lock = json(LOCK_FILE);
    lock.packs.db = { requires: [] };
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify(lock));
    const { code, err } = await cli(["status"]);
    expect(code).toBe(1);
    expect(err).toContain('"packs.db.version" is required');
  });

  it("is quiet when everything is installed", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    const { out } = await cli(["status"]);
    expect(out).toContain("Everything is up to date.");
    expect(out).not.toContain("Pending");
    expect(out).not.toContain('Run "aidev-instruct update"');
  });
});

/** Writes a folder feed next to the project, with one pack, one stack and a React pack. */
function writeFeed(name = "acme") {
  fx.write(`${name}/feed.json`, JSON.stringify({ name, version: "1.0.0", cli: ">=0.1.0" }));
  fx.write(
    `${name}/packs/${name}-api/pack.json`,
    JSON.stringify({
      name: `${name}-api`,
      description: "API pack.",
      version: "1.0.0",
      tags: ["api"],
    }),
  );
  fx.write(
    `${name}/packs/${name}-api/rules/${name}-api.md`,
    "---\ndescription: API rules.\n---\n\n# API\n\n- Fine.\n",
  );
  fx.write(
    `${name}/packs/${name}-react/pack.json`,
    JSON.stringify({
      name: `${name}-react`,
      description: "React pack.",
      version: "1.0.0",
      tags: ["react"],
      requires: ["web"],
    }),
  );
  fx.write(
    `${name}/packs/${name}-react/rules/${name}-react.md`,
    "---\ndescription: React rules.\n---\n\n# React\n",
  );
  fx.write(
    `${name}/stacks/${name}-site.json`,
    JSON.stringify({
      name: `${name}-site`,
      description: "Site.",
      version: "1.0.0",
      packs: [`${name}-api`],
    }),
  );
}

/** A GitHub feed archive with one pack and a feed manifest. */
function archive(tag = "v1.0.0") {
  return feedArchive({
    "feed.json": JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    "packs/acme-api/pack.json": JSON.stringify({
      name: "acme-api",
      description: "API pack.",
      version: tag,
      tags: ["api"],
    }),
    "packs/acme-api/rules/acme-api.md": "---\ndescription: API rules.\n---\n\n# API\n",
  });
}

describe("feeds", () => {
  it("installs packs and stacks from a folder feed and shows the feed column", async () => {
    writeFeed();
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      packs: [{ name: "acme-api", feed: "acme" }, "db"],
    });
    const update = await cli(["update"]);
    expect(update.code).toBe(0);
    expect(fx.exists(".claude/rules/acme-api.md")).toBe(true);
    expect(json(LOCK_FILE).packs["acme-api"]).toMatchObject({
      requires: [],
      version: "1.0.0",
      from: { config: true },
    });

    const status = await cli(["status"]);
    expect(status.out).toContain("acme-api");
    expect(status.out).toContain("official");
    expect(status.out).toContain("acme");
    const list = await cli(["list"]);
    expect(list.out).toContain("official");
    expect(list.out).toContain("acme");
    expect((await cli(["check"])).code).toBe(0);

    await cli(["remove", "acme-api"]);
    expect(fx.exists(".claude/rules/acme-api.md")).toBe(false);
  });

  it("installs a feed stack, and a feed pack that requires an official pack", async () => {
    writeFeed();
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      stacks: ["acme-site"],
      packs: [],
    });
    expect((await cli(["update"])).code).toBe(0);
    expect(fx.exists(".claude/rules/acme-api.md")).toBe(true);
    expect((await cli(["stacks"])).out).toContain("acme-site");

    const added = await cli(["add", "acme-react"]);
    expect(added.code).toBe(0);
    expect(fx.exists(".claude/rules/react.md")).toBe(true);
    expect(json(LOCK_FILE).packs.web).toBeDefined();
  });

  it("fails when a config entry names a different feed", async () => {
    writeFeed();
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      packs: [{ name: "acme-api", feed: "other" }],
    });
    const { code, err } = await cli(["update"]);
    expect(code).toBe(1);
    expect(err).toContain('must come from feed "other", but it comes from feed "acme"');

    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      packs: [{ name: "db", feed: "acme" }],
    });
    const official = await cli(["update"]);
    expect(official.code).toBe(1);
    expect(official.err).toContain("but it comes from the official packs");
  });

  it("reads a GitHub feed, records the release and reports a newer one", async () => {
    const cacheDir = join(fx.temp, "cache");
    let release = { tag: "v1.0.0", commit: "aaa" };
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest"))
        return new Response(JSON.stringify({ tag_name: release.tag }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: release.commit }));
      if (url.includes("/tarball/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://codeload.test/archive" },
        });
      }
      return new Response(archive(release.tag), { status: 200 });
    }) as unknown as typeof fetch;
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct" }],
      packs: ["acme-api"],
    });

    const update = await cli(["update"], { fetch: fetchFn, cacheDir });
    expect(update.code).toBe(0);
    expect(json(LOCK_FILE).feeds).toEqual({ acme: { tag: "v1.0.0", commit: "aaa" } });

    release = { tag: "v1.1.0", commit: "bbb" };
    const check = await cli(["check"], { fetch: fetchFn, cacheDir });
    expect(check.code).toBe(1);
    expect(check.out).toContain("Feed acme: v1.0.0 -> v1.1.0");

    const status = await cli(["status"], {
      fetch: () => {
        throw new Error("no fetch expected");
      },
      cacheDir,
    });
    expect(status.code).toBe(0);
    expect(status.out).toContain("acme-api");
  });

  it("warns when a tag moved and passes check on the same release", async () => {
    const cacheDir = join(fx.temp, "cache");
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest"))
        return new Response(JSON.stringify({ tag_name: "v1.0.0" }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: "aaa" }));
      if (url.includes("/tarball/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://codeload.test/archive" },
        });
      }
      return new Response(archive(), { status: 200 });
    }) as unknown as typeof fetch;
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct" }],
      packs: ["acme-api"],
    });
    await cli(["update"], { fetch: fetchFn, cacheDir });

    const lock = json(LOCK_FILE);
    lock.feeds = { acme: { tag: "v1.0.0", commit: "old" } };
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify(lock));
    const moved = await cli(["update"], { fetch: fetchFn, cacheDir });
    expect(moved.out).toContain("tag v1.0.0 moved from old to aaa");

    const check = await cli(["check"], { fetch: fetchFn, cacheDir });
    expect(check.code).toBe(0);
  });

  it("reports a feed release the lock does not have yet", async () => {
    const cacheDir = join(fx.temp, "cache");
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest"))
        return new Response(JSON.stringify({ tag_name: "v1.0.0" }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: "aaa" }));
      if (url.includes("/tarball/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://codeload.test/archive" },
        });
      }
      return new Response(archive(), { status: 200 });
    }) as unknown as typeof fetch;
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct" }],
      packs: ["acme-api"],
    });
    const check = await cli(["check"], { fetch: fetchFn, cacheDir });
    expect(check.code).toBe(1);
    expect(check.out).toContain("Feed acme: new release v1.0.0");
  });
});

describe("feeds command", () => {
  it("says when the config has no feeds", async () => {
    expect((await cli(["feeds"])).out).toContain(
      'No feeds in the config. Run "aidev-instruct feeds add',
    );
    setConfig({ targets: ["claude"], packs: [] });
    expect((await cli(["feeds"])).out).toContain(
      'No feeds in the config. Run "aidev-instruct feeds add',
    );
  });

  it("lists each feed with its token variable and the locked release", async () => {
    setConfig({
      targets: ["claude"],
      feeds: [
        { name: "acme", source: "github:acme/aidev-instruct", tokenEnv: "AIDEV_TEST_FEED_TOKEN" },
        { name: "beta", source: "../beta" },
      ],
      packs: [],
    });
    writeFileSync(
      join(fx.root, LOCK_FILE),
      JSON.stringify({
        lockfileVersion: 1,
        version: VERSION,
        targets: [],
        packs: {},
        feeds: { acme: { tag: "v1.2.0", commit: "c" } },
        overrides: {},
        files: {},
      }),
    );
    const { out } = await cli(["feeds"], { env: { AIDEV_TEST_FEED_TOKEN: "secret" } });
    expect(out).toContain("acme  github:acme/aidev-instruct  AIDEV_TEST_FEED_TOKEN set  v1.2.0");
    expect(out).toContain("beta  ../beta  no token  no release");
    expect(out).not.toContain("secret");
    const unset = await cli(["feeds"], { env: {} });
    expect(unset.out).toContain("AIDEV_TEST_FEED_TOKEN unset");
    const fromProcess = await cli(["feeds"]);
    expect(fromProcess.out).toContain("AIDEV_TEST_FEED_TOKEN unset");
  });

  it("adds a folder feed, installs nothing and writes no lock", async () => {
    writeFeed();
    const added = await cli(["feeds", "add", "acme", "../acme"]);
    expect(added.code).toBe(0);
    expect(added.out).toContain('Added feed "acme" (../acme).');
    expect(json(CONFIG_FILE)).toEqual({
      targets: ["copilot", "claude", "cursor"],
      feeds: [{ name: "acme", source: "../acme" }],
      packs: [],
    });
    expect(fx.exists(LOCK_FILE)).toBe(false);
  });

  it("saves a GitHub URL as github: and replaces an existing feed", async () => {
    const cacheDir = join(fx.temp, "cache");
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest"))
        return new Response(JSON.stringify({ tag_name: "v1.0.0" }));
      if (url.includes("/commits/")) return new Response(JSON.stringify({ sha: "aaa" }));
      if (url.includes("/tarball/")) {
        return new Response(null, {
          status: 302,
          headers: { location: "https://codeload.test/archive" },
        });
      }
      return new Response(archive(), { status: 200 });
    }) as unknown as typeof fetch;
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../old" }],
      packs: [],
    });
    const { out } = await cli(
      [
        "feeds",
        "add",
        "acme",
        "https://github.com/acme/aidev-instruct",
        "--tokenEnv",
        "ACME_FEED_TOKEN",
      ],
      { fetch: fetchFn, cacheDir, env: { ACME_FEED_TOKEN: "t" } },
    );
    expect(out).toContain('Updated feed "acme" (github:acme/aidev-instruct).');
    expect(json(CONFIG_FILE).feeds).toEqual([
      { name: "acme", source: "github:acme/aidev-instruct", tokenEnv: "ACME_FEED_TOKEN" },
    ]);
  });

  it("writes nothing on a dry run", async () => {
    writeFeed();
    const { out } = await cli(["feeds", "add", "acme", "../acme", "--dry-run"]);
    expect(out).toContain("Dry run: Added feed");
    expect(fx.exists(CONFIG_FILE)).toBe(false);
  });

  it("rejects bad names, a reserved name, a bad variable and missing arguments", async () => {
    writeFeed();
    expect((await cli(["feeds", "add"])).err).toContain('Use "feeds add');
    expect((await cli(["feeds", "add", "Acme", "../acme"])).err).toContain("must be kebab-case");
    expect((await cli(["feeds", "add", "official", "../acme"])).err).toContain("reserved");
    expect((await cli(["feeds", "add", "acme", "../acme", "--tokenEnv", "acme"])).err).toContain(
      "is not a variable name",
    );
    expect((await cli(["feeds", "nope"])).err).toContain('Use "feeds"');
  });

  it("rejects the old option spelling with the unknown option message", async () => {
    writeFeed();
    const old = await cli(["feeds", "add", "acme", "../acme", `--token${"-"}env`, "ACME_TOKEN"]);
    expect(old.code).toBe(1);
    expect(old.err).toContain(`unknown option '--token${"-"}env'`);
    expect(fx.exists(CONFIG_FILE)).toBe(false);
  });

  it("rejects a feed it cannot read and names the reason", async () => {
    const missing = await cli(["feeds", "add", "acme", "../nope"]);
    expect(missing.code).toBe(1);
    expect(missing.err).toContain("does not exist");

    const unset = await cli(
      ["feeds", "add", "acme", "github:acme/aidev-instruct", "--tokenEnv", "ACME_FEED_TOKEN"],
      { env: {} },
    );
    expect(unset.err).toContain("Set ACME_FEED_TOKEN");
  });

  it("removes a feed once no pack or stack uses it", async () => {
    writeFeed();
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      packs: ["acme-api"],
    });
    const blocked = await cli(["feeds", "remove", "acme"]);
    expect(blocked.code).toBe(1);
    expect(blocked.err).toContain("still used by pack acme-api");

    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      stacks: ["acme-site"],
      packs: [],
    });
    expect((await cli(["feeds", "remove", "acme"])).err).toContain("still used by stack acme-site");

    setConfig({ targets: ["claude"], feeds: [{ name: "acme", source: "../acme" }], packs: [] });
    const dry = await cli(["feeds", "remove", "acme", "--dry-run"]);
    expect(dry.out).toContain('Dry run: Removed feed "acme".');
    expect(json(CONFIG_FILE).feeds).toHaveLength(1);
    expect((await cli(["feeds", "remove"])).err).toContain('Use "feeds remove <name>"');
    expect((await cli(["feeds", "remove", "other"])).err).toContain('No feed "other"');
    expect((await cli(["feeds", "remove", "acme"])).out).toContain('Removed feed "acme".');
    expect(json(CONFIG_FILE).feeds).toBeUndefined();
  });

  it("removes a feed without a config only when one exists", async () => {
    expect((await cli(["feeds", "remove", "acme"])).err).toContain("Nothing is installed");
  });
});

describe("feed command", () => {
  it("rejects a bad name, a reserved name and an existing file", async () => {
    expect((await cli(["feed", "init"])).err).toContain('Use "feed init <name>"');
    expect((await cli(["feed", "init", "Acme"])).err).toContain("must be kebab-case");
    expect((await cli(["feed", "init", "official"])).err).toContain("reserved");
    fx.write("project/README.md", "# Taken\n");
    expect((await cli(["feed", "init", "acme"])).err).toContain("README.md already exists");
    expect((await cli(["feed", "nope"])).err).toContain('Use "feed init <name>"');
  });

  it("creates a feed, validates it, releases it and installs from the folder", async () => {
    const created = await cli(["feed", "init", "acme"]);
    expect(created.code).toBe(0);
    for (const file of [
      "feed.json",
      "AGENTS.md",
      "README.md",
      "packs/acme-example/pack.json",
      "packs/acme-example/rules/acme-example.md",
      "stacks/.gitkeep",
      ".github/workflows/ci.yml",
      ".github/workflows/release.yml",
    ]) {
      expect(fx.exists(file), file).toBe(true);
    }
    expect(json("feed.json")).toEqual({ name: "acme", version: "1.0.0", cli: `>=${VERSION}` });
    expect(fx.read(".github/workflows/ci.yml")).toContain("actions/checkout@v7");
    expect(fx.read(".github/workflows/release.yml")).toContain("actions/setup-node@v7");
    expect((await cli(["feed", "init", "acme"])).code).toBe(1);
    expect((await cli(["feed", "validate"])).out).toContain("No problems.");
    expect((await cli(["feed", "validate", "extra"])).err).toContain('Use "feed validate"');

    fx.write(
      "project/packs/plain/pack.json",
      JSON.stringify({
        name: "plain",
        description: "Plain guidance.",
        version: "1.0.0",
        tags: ["test"],
      }),
    );
    const unprefixed = await cli(["feed", "validate"]);
    expect(unprefixed.code).toBe(1);
    expect(unprefixed.out).toContain('every pack name starts with "acme-"');
    rmSync(join(fx.root, "packs/plain"), { recursive: true });

    fx.write(
      "project/packs/acme-api/pack.json",
      JSON.stringify({
        name: "acme-api",
        description: "API guidance.",
        version: "1.0.0",
        tags: ["api"],
      }),
    );
    fx.write(
      "project/packs/acme-api/rules/acme-api.md",
      '---\ndescription: API rules.\nglobs: ["**/*.ts"]\n---\n\n# API\n\n- Keep it small.\n',
    );
    expect((await cli(["feed", "validate"])).code).toBe(0);

    const git = (args: string[]) => execFileSync("git", args, { cwd: fx.root, encoding: "utf8" });
    git(["init"]);
    git(["config", "user.name", "Test"]);
    git(["config", "user.email", "test@example.com"]);
    git(["add", "-A"]);
    git(["commit", "-m", "First"]);

    const dry = await cli(["feed", "release", "--dry-run"]);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain("First release:");
    const released = await cli(["feed", "release"]);
    expect(released.code).toBe(0);
    expect(released.out).toContain("Committed Release 1.0.0 and tagged v1.0.0.");
    expect(git(["tag", "--list", "v1.0.0"]).trim()).toBe("v1.0.0");
    expect((await cli(["feed", "release"])).err).toContain("Nothing changed since v1.0.0.");

    const consumer = join(fx.temp, "consumer");
    mkdirSync(consumer);
    const addedFeed = await cli(["--dir", consumer, "feeds", "add", "acme", "../project"]);
    expect(addedFeed.code).toBe(0);
    const installed = await cli(["--dir", consumer, "add", "acme-api"]);
    expect(installed.code).toBe(0);
    expect(readFileSync(join(consumer, ".claude/rules/acme-api.md"), "utf8")).toContain("# API");

    writeFileSync(
      join(fx.root, "packs/acme-api/rules/acme-api.md"),
      '---\ndescription: API rules.\nglobs: ["**/*.ts"]\n---\n\n# API\n\n- Keep it smaller.\n',
    );
    const second = await cli(["feed", "release"]);
    expect(second.code).toBe(0);
    expect(second.out).toContain("acme-api");
    expect(second.out).toContain("1.0.0 -> 1.0.1");
    expect(json("feed.json").version).toBe("1.0.1");
    expect(git(["tag", "--list", "v1.0.1"]).trim()).toBe("v1.0.1");

    writeFileSync(
      join(fx.root, "packs/acme-api/rules/acme-api.md"),
      '---\ndescription: API rules.\nglobs: ["**/*.ts"]\n---\n\n# API\n\n- Keep it smallest.\n',
    );
    const raised = await cli([
      "feed",
      "release",
      "--bump",
      "other=patch",
      "--bump",
      "acme-api=major",
      "--dry-run",
    ]);
    expect(raised.out).toContain("acme-api");
    expect(raised.out).toContain("1.0.1 -> 2.0.0");
    expect(raised.out).toContain("Feed              1.0.1 -> 2.0.0");
  }, 30000);

  it("raises a feed bump and reports a missing feed.json", async () => {
    expect((await cli(["feed", "validate"])).err).toContain("feed.json is missing");
    fx.write(
      "project/feed.json",
      JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    );
    fx.write(
      "project/packs/acme-api/pack.json",
      JSON.stringify({ name: "acme-api", description: "API guidance.", version: "1.0.0" }),
    );
    const plan = await cli(["feed", "release", "--bump", "acme-api=major", "--dry-run"]);
    expect(plan.code).toBe(0);
    expect(plan.out).toContain("acme-api");
    expect(plan.out).toContain("First release:");
    expect((await cli(["feed", "release", "extra"])).err).toContain('Use "feed release"');
  });

  it("reports an invalid feed manifest", async () => {
    fx.write("project/feed.json", JSON.stringify({ name: "Acme", version: "1", cli: "nope" }));
    const { code, out } = await cli(["feed", "validate"]);
    expect(code).toBe(1);
    expect(out).toContain('feed.json: name "Acme" must be kebab-case');
    expect(out).toContain('feed.json: "version" must be a semantic version');
    expect(out).toContain('feed.json: "cli" must be a range');
  });
});

describe("info", () => {
  it("searches only the official packs without a config", async () => {
    const bare = await cli(["info", "nope"]);
    expect(bare.code).toBe(1);
    expect(bare.err).toBe('Unknown pack or stack "nope". Searched the official packs.');
  });

  it("shows an official pack and an official stack", async () => {
    const pack = await cli(["info", "web"]);
    expect(pack.code).toBe(0);
    expect(pack.out).toContain("Feed: official");
    expect(pack.out).toContain("Description: web pack.");
    expect(pack.out).toContain("Versioned items: none");
    expect(pack.out).toContain("Requires: base");
    expect(pack.out).toContain("Conflicts: none");
    expect(pack.out).toContain("Authors: none");
    expect(pack.out).toContain("Install: aidev-instruct add web");

    const stack = await cli(["info", "site"]);
    expect(stack.out).toContain("Packs: web");
    expect(stack.out).toContain("Install: aidev-instruct init -s site");

    const noted = await cli(["info", "base"]);
    expect(noted.out).toContain("Note: Run `setup --now` first.");

    fx.write(
      "packs/versioned/pack.json",
      JSON.stringify({
        name: "versioned",
        description: "Versioned guidance.",
        version: "1.0.0",
        tags: ["test"],
        latest: "2",
      }),
    );
    fx.write(
      "packs/versioned/rules/versioned-2.md",
      '---\ndescription: Versioned rule.\nversion: "2"\n---\n\n# Versioned\n',
    );
    const versioned = await cli(["info", "versioned"]);
    expect(versioned.out).toContain("Tags: test");
    expect(versioned.out).toContain("Latest: 2");
    expect(versioned.out).toContain("Versioned items: versioned-2");
  });

  it("shows a private feed pack and names the feeds it searched", async () => {
    writeFeed();
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      packs: [],
    });
    const pack = await cli(["info", "acme-api"]);
    expect(pack.out).toContain("Feed: acme");
    expect(pack.out).toContain("Install: aidev-instruct add acme-api");

    const stack = await cli(["info", "acme-site"]);
    expect(stack.out).toContain("Packs: acme-api");

    const unknown = await cli(["info", "nope"]);
    expect(unknown.code).toBe(1);
    expect(unknown.err).toBe(
      'Unknown pack or stack "nope". Searched the official packs, feed "acme".',
    );
    expect((await cli(["info"])).err).toContain('Use "info <pack or stack>"');
  });

  it("never writes the config", async () => {
    writeFeed();
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "../acme" }],
      packs: [],
    });
    const before = fx.read(CONFIG_FILE);
    await cli(["info", "acme-api"]);
    expect(fx.read(CONFIG_FILE)).toBe(before);
    expect(fx.exists(LOCK_FILE)).toBe(false);
  });

  it("uses a cached feed release when GitHub is unreachable", async () => {
    const cacheDir = join(fx.temp, "cache");
    const release = join(cacheDir, "acme", "aaa");
    mkdirSync(join(release, "packs", "acme-api", "rules"), { recursive: true });
    writeFileSync(
      join(release, "feed.json"),
      JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    );
    writeFileSync(
      join(release, "packs", "acme-api", "pack.json"),
      JSON.stringify({ name: "acme-api", description: "API pack.", version: "1.0.0" }),
    );
    writeFileSync(
      join(release, "packs", "acme-api", "rules", "acme-api.md"),
      "---\ndescription: API rules.\n---\n\n# API\n",
    );
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct" }],
      packs: [],
    });
    writeFileSync(
      join(fx.root, LOCK_FILE),
      JSON.stringify({
        lockfileVersion: 1,
        version: VERSION,
        targets: [],
        packs: {},
        feeds: { acme: { tag: "v1.0.0", commit: "aaa" } },
        overrides: {},
        files: {},
      }),
    );
    const { out } = await cli(["info", "acme-api"], {
      cacheDir,
      fetch: () => {
        throw new Error("offline");
      },
    });
    expect(out).toContain('Note: Feed "acme": GitHub is unreachable');
    expect(out).toContain("Feed: acme");
  });
});

describe("downgrade guard", () => {
  const newerLock = () => {
    const lock = json(LOCK_FILE);
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify({ ...lock, version: "999.0.0" }));
  };

  it("refuses to write with an older CLI and names both versions", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    newerLock();
    const update = await cli(["update"]);
    expect(update.code).toBe(1);
    expect(update.err).toContain("This project was installed with 999.0.0.");
    expect(update.err).toContain("or pass --force to downgrade.");
    expect(json(LOCK_FILE).version).toBe("999.0.0");
    expect((await cli(["add", "db"])).code).toBe(1);
    const check = await cli(["check"]);
    expect(check.code).toBe(1);
    expect(check.err).toContain("installed with 999.0.0");
    const status = await cli(["status"]);
    expect(status.out).toContain("Installed with 999.0.0. This CLI is");
    expect(status.out).toContain("pass --force to downgrade");

    const lock = json(LOCK_FILE);
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify({ ...lock, version: "0.0.1" }));
    const older = await cli(["status"]);
    expect(older.out).toContain("Installed with 0.0.1. This CLI is");
    expect(older.out).not.toContain("--force");
  });

  it("names the removed files and backs up hand edits with --orig", async () => {
    await cli(["init", "-p", "web", "-t", "claude"]);
    const lock = json(LOCK_FILE);
    const ghost = ".claude/rules/ghost.md";
    lock.version = "999.0.0";
    lock.files[ghost] = { pack: "web", hash: hash("# Ghost\n") };
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify(lock));
    fx.write(`project/${ghost}`, "# Ghost\n# Edited\n");

    const dry = await cli(["update", "--force", "--dry-run"]);
    expect(dry.code).toBe(0);
    expect(dry.out).toContain("Downgrade 999.0.0 -> ");
    expect(dry.out).toContain(`removing 1 file: ${ghost}.`);
    expect(fx.exists(ghost)).toBe(true);

    const ghost2 = ".claude/rules/ghost2.md";
    lock.files[ghost2] = { pack: "web", hash: hash("# Ghost2\n") };
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify(lock));
    fx.write(`project/${ghost2}`, "# Ghost2\n");

    const forced = await cli(["update", "--force", "--orig"]);
    expect(forced.code).toBe(0);
    expect(forced.out).toContain(`removing 2 files: ${ghost}, ${ghost2}.`);
    expect(fx.exists(ghost)).toBe(false);
    expect(fx.read(`${ghost}.orig`)).toBe("# Ghost\n# Edited\n");
    expect(fx.exists(ghost2)).toBe(false);
    expect(json(LOCK_FILE).version).toBe(VERSION);

    const again = json(LOCK_FILE);
    writeFileSync(join(fx.root, LOCK_FILE), JSON.stringify({ ...again, version: "999.0.0" }));
    const clean = await cli(["update", "--force"]);
    expect(clean.code).toBe(0);
    expect(clean.out).toContain("removing 0 files.");
  });
});

describe("technology versions", () => {
  const real = { packsDir: undefined, stacksDir: undefined };

  it("refuses to downgrade React for Next.js and allows separate folders", async () => {
    expect(
      (await cli(["init", "-p", "nextjs-spa", "--path", "apps/web", "-t", "claude"], real)).code,
    ).toBe(0);
    const blocked = await cli(["add", "pcf"], real);
    expect(blocked.code).toBe(1);
    expect(blocked.err).toContain("Pack nextjs requires react >=19");
    expect(blocked.err).toContain("Give each one its own folder with --path");
    expect(fx.exists(".claude/rules/react-19.md")).toBe(true);
    expect(fx.exists(".claude/rules/react-16.md")).toBe(false);
    const both = await cli(["add", "pcf", "--path", "src/controls"], real);
    expect(both.code).toBe(0);
    expect(fx.exists(".claude/rules/react-16.md")).toBe(true);
  });
});

describe("doctor", () => {
  it("reports each feed's release and pack versions", async () => {
    writeFeed();
    setConfig({ targets: ["claude"], feeds: [{ name: "acme", source: "../acme" }], packs: [] });
    const { code, out } = await cli(["doctor"]);
    expect(code).toBe(0);
    expect(out).toContain("pass  Feed acme: folder. acme-api 1.0.0, acme-react 1.0.0.");
  });
  it("reports a feed without packs", async () => {
    fx.write(
      "emptyfeed/feed.json",
      JSON.stringify({ name: "empty", version: "1.0.0", cli: ">=0.1.0" }),
    );
    fx.write("emptyfeed/stacks/.gitkeep", "");
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "empty", source: "../emptyfeed" }],
      packs: [],
    });
    const { code, out } = await cli(["doctor"]);
    expect(code).toBe(0);
    expect(out).toContain("pass  Feed empty: folder. no packs.");
  });
  it("passes a project without a config", async () => {
    const bare = await cli(["doctor"]);
    expect(bare.code).toBe(0);
    expect(bare.out).toContain("pass  Config: no config");
    expect(bare.out).toContain("pass  Lock: no lock");
  });

  it("passes a healthy project and fails a bad Node", async () => {
    await cli(["init", "-p", "db", "-t", "claude"]);
    const healthy = await cli(["doctor"]);
    expect(healthy.code).toBe(0);
    expect(healthy.out).toContain("pass  Node");
    expect(healthy.out).toContain("pass  Config");
    expect(healthy.out).toContain("pass  Lock");
    expect(healthy.out).toContain("pass  Local items");
    expect(healthy.out).not.toContain("warn");
    expect(healthy.out).not.toContain("fail");

    const old = await cli(["doctor"], { nodeVersion: "18.0.0" });
    expect(old.code).toBe(1);
    expect(old.out).toContain("fail  Node: 18.0.0 is below >=22");
  });

  it("fails an invalid config and an unknown target", async () => {
    writeFileSync(join(fx.root, CONFIG_FILE), "{ nope");
    const invalid = await cli(["doctor"]);
    expect(invalid.code).toBe(1);
    expect(invalid.out).toContain("fail  Config");

    setConfig({ targets: ["gemini"], packs: [] });
    const unknown = await cli(["doctor"]);
    expect(unknown.code).toBe(1);
    expect(unknown.out).toContain("fail  Config: Unknown target(s): gemini.");
    expect((await cli(["doctor", "extra"])).err).toContain('Use "aidev-instruct doctor"');

    setConfig({ targets: ["claude"], packs: [], exclude: ["packs/react"] });
    const excluded = await cli(["doctor"]);
    expect(excluded.code).toBe(1);
    expect(excluded.out).toContain(
      'fail  Config: Unknown exclude kind "packs". Use rules/, skills/ or agents.',
    );
  });

  it("fails a name that two feeds ship", async () => {
    writeFeed("acme");
    writeFeed("acme-api");
    const shared = JSON.stringify({
      name: "acme-api-x",
      description: "Shared guidance.",
      version: "1.0.0",
    });
    fx.write("acme/packs/acme-api-x/pack.json", shared);
    fx.write("acme-api/packs/acme-api-x/pack.json", shared);
    setConfig({
      targets: ["claude"],
      feeds: [
        { name: "acme", source: "../acme" },
        { name: "acme-api", source: "../acme-api" },
      ],
      packs: [],
    });
    const { code, out } = await cli(["doctor"]);
    expect(code).toBe(1);
    expect(out).toContain("fail  Names");
  });

  it("fails a feed whose token variable is unset, or that has no release", async () => {
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct", tokenEnv: "ACME_FEED_TOKEN" }],
      packs: [],
    });
    const unset = await cli(["doctor"], { env: {} });
    expect(unset.code).toBe(1);
    expect(unset.out).toContain("fail  Feeds");
    expect(unset.out).toContain("ACME_FEED_TOKEN");

    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct" }],
      packs: [],
    });
    const missing = await cli(["doctor"], {
      fetch: (async () => new Response("nope", { status: 404 })) as unknown as typeof fetch,
      cacheDir: join(fx.temp, "empty-cache"),
    });
    expect(missing.out).toContain('fail  Feeds: Feed "acme": HTTP 404');
  });

  it("fails the cache when GitHub is down and warns when the locked release is missing", async () => {
    setConfig({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct" }],
      packs: [],
    });
    writeFileSync(
      join(fx.root, LOCK_FILE),
      JSON.stringify({
        lockfileVersion: 1,
        version: VERSION,
        targets: ["claude"],
        packs: {},
        feeds: { acme: { tag: "v1.0.0", commit: "old" } },
        overrides: {},
        files: {},
      }),
    );
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const failed = await cli(["doctor"], { fetch: down, cacheDir: join(fx.temp, "no-cache") });
    expect(failed.code).toBe(1);
    expect(failed.out).toContain("fail  Feeds");
    expect(failed.out).toContain("fail  Cache");

    const cacheDir = join(fx.temp, "cache");
    const release = join(cacheDir, "acme", "new");
    mkdirSync(join(release, "packs", "acme-api", "rules"), { recursive: true });
    writeFileSync(
      join(release, "feed.json"),
      JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    );
    writeFileSync(
      join(release, "packs", "acme-api", "pack.json"),
      JSON.stringify({ name: "acme-api", description: "API pack.", version: "1.0.0" }),
    );
    writeFileSync(
      join(release, "packs", "acme-api", "rules", "acme-api.md"),
      "---\ndescription: API rules.\n---\n\n# API\n",
    );
    const fetchFn = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/releases/latest"))
        return new Response(JSON.stringify({ tag_name: "v1.1.0" }));
      return new Response(JSON.stringify({ sha: "new" }));
    }) as unknown as typeof fetch;
    const warn = await cli(["doctor"], { fetch: fetchFn, cacheDir });
    expect(warn.code).toBe(0);
    expect(warn.out).toContain("warn  Cache");
    expect(warn.out).toContain("pass  Feed acme: v1.1.0. acme-api 1.0.0.");

    const oldCache = join(fx.temp, "old-cache");
    const oldRelease = join(oldCache, "acme", "old");
    mkdirSync(join(oldRelease, "packs", "acme-api"), { recursive: true });
    writeFileSync(
      join(oldRelease, "feed.json"),
      JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
    );
    writeFileSync(
      join(oldRelease, "packs", "acme-api", "pack.json"),
      JSON.stringify({ name: "acme-api", description: "API pack.", version: "1.0.0" }),
    );
    const offline = await cli(["doctor"], { fetch: down, cacheDir: oldCache });
    expect(offline.code).toBe(0);
    expect(offline.out).toContain('warn  Feeds: Feed "acme": GitHub is unreachable');
    expect(offline.out).toContain("pass  Cache: acme v1.0.0");
  });

  it("fails a lock that disagrees with the config and warns about hand edits", async () => {
    await cli(["init", "-p", "db", "-t", "claude"]);
    setConfig({ targets: ["claude"], packs: ["db", "web"] });
    const mismatch = await cli(["doctor"]);
    expect(mismatch.code).toBe(1);
    expect(mismatch.out).toContain("fail  Lock: the config and the lock list different packs");

    setConfig({ targets: ["claude"], packs: ["spa", "ssr"] });
    const conflict = await cli(["doctor"]);
    expect(conflict.out).toContain("fail  Lock: Packs spa and ssr cannot be installed together");

    setConfig({ targets: ["claude"], packs: ["db", "web"] });
    await cli(["update"]);
    setConfig({ targets: ["cursor"], packs: ["db", "web"] });
    expect((await cli(["doctor"])).out).toContain("different targets");

    setConfig({ targets: ["claude"], packs: ["db"] });
    await cli(["update"]);
    writeFileSync(join(fx.root, ".claude/rules/db.md"), "# hand edited\n");
    const edited = await cli(["doctor"]);
    expect(edited.code).toBe(0);
    expect(edited.out).toContain("warn  Lock: .claude/rules/db.md changed by hand");
  });

  it("fails a broken item in .aidev-instruct", async () => {
    await cli(["init", "-t", "claude"]);
    fx.write("project/.aidev-instruct/rules/broken.md", "# Broken\n\n- No frontmatter.\n");
    fx.write(
      "project/.aidev-instruct/agents/ok.md",
      "---\nname: ok\ndescription: Fine.\ntools: Read\n---\n\n# Ok\n",
    );
    fx.write(
      "project/.aidev-instruct/skills/broken/SKILL.md",
      "---\nname: broken\n---\n\n# Broken\n",
    );
    fx.write(
      "project/.aidev-instruct/skills/noname/SKILL.md",
      "---\ndescription: No name.\n---\n\n# Noname\n",
    );
    fx.write(
      "project/.aidev-instruct/skills/good/SKILL.md",
      "---\nname: good\ndescription: Fine.\n---\n\n# Good\n",
    );
    const { code, out } = await cli(["doctor"]);
    expect(code).toBe(1);
    expect(out).toContain("fail  Local items: rules/broken");
    expect(out).toContain("fail  Local items: skills/broken: name and description are required");
    expect(out).toContain("fail  Local items: skills/noname: name and description are required");
  });

  it("fails the lock when nothing is installed", async () => {
    await cli(["init", "-p", "db", "-t", "claude"]);
    rmSync(join(fx.root, LOCK_FILE));
    const { code, out } = await cli(["doctor"]);
    expect(code).toBe(1);
    expect(out).toContain("fail  Lock: nothing is installed");
  });
});
