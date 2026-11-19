import { rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LOCAL_DIR, LOCK_FILE, readLock } from "../src/config.ts";
import type { PackRequest } from "../src/packs.ts";
import type { Scope } from "../src/scope.ts";
import { type SyncOptions, type SyncResult, sync } from "../src/sync.ts";
import { createFixture, type Fixture } from "./fixtures.ts";

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

const req = (name: string, scope: Scope = null): PackRequest => ({ name, scope });
const run = (names: string[], extra: Partial<SyncOptions> = {}) =>
  sync({
    root: fx.root,
    requests: names.map((n) => req(n)),
    targets: ["claude"],
    version: "1.0.0",
    packsDir: fx.packsDir,
    ...extra,
  });
const kinds = (result: SyncResult) =>
  Object.fromEntries(
    result.actions.map((a) => [a.path, a.kind === "skip" ? `skip:${a.reason}` : a.kind]),
  );
const action = (result: SyncResult, path: string) => result.actions.find((a) => a.path === path);
const edit = (path: string, content: string) => fx.write(`project/${path}`, content);
const RULE = ".claude/rules/react.md";

describe("files", () => {
  it("installs packs with their requirements and records them in the lock", () => {
    const result = run(["web"]);
    expect(result.installed.map((p) => p.name)).toEqual(["base", "web"]);
    expect(Object.keys(result.lock.files)).toEqual([
      ".claude/agents/reviewer.md",
      ".claude/rules/always.md",
      ".claude/rules/react.md",
      ".claude/skills/web-spec/references/seo.md",
      ".claude/skills/web-spec/SKILL.md",
    ]);
    expect(readLock(fx.root)?.files[RULE]?.pack).toBe("web");
    expect(readLock(fx.root)?.packs).toEqual({
      base: { requires: [], version: "1.0.0", from: { requiredBy: ["web"] } },
      web: { requires: ["base"], version: "1.0.0", from: {} },
    });
    expect(result.lock.version).toBe("1.0.0");
  });

  it("records the folders of scoped packs", () => {
    const result = run([], { requests: [req("web", ["apps/web"])] });
    expect(result.lock.packs.web).toEqual({
      requires: ["base"],
      version: "1.0.0",
      paths: ["apps/web"],
      from: {},
    });
    expect(fx.read(RULE)).toContain("apps/web/**/*.tsx");
  });

  it("reports unchanged files on a second run", () => {
    run(["web"]);
    expect(new Set(Object.values(kinds(run(["web"]))))).toEqual(new Set(["unchanged"]));
  });

  it("updates files that were not changed by hand", () => {
    run(["web"]);
    fx.write("packs/web/rules/react.md", "---\ndescription: R.\n---\n# React v2\n");
    expect(kinds(run(["web"]))[RULE]).toBe("update");
    expect(fx.read(RULE)).toContain("# React v2");
  });

  it("keeps files changed by hand unless forced, and remembers they were changed", () => {
    run(["web"]);
    edit(RULE, "# Mine\n");
    fx.write("packs/web/rules/react.md", "---\ndescription: R.\n---\n# React v2\n");
    expect(kinds(run(["web"]))[RULE]).toBe("skip:modified");
    expect(kinds(run(["web"]))[RULE]).toBe("skip:modified");
    expect(fx.read(RULE)).toBe("# Mine\n");
    expect(kinds(run(["web"], { force: true }))[RULE]).toBe("update");
    expect(fx.read(RULE)).toContain("# React v2");
  });

  it("never overwrites a file it did not create", () => {
    edit(RULE, "# Project rule\n");
    expect(kinds(run(["web"]))[RULE]).toBe("skip:unmanaged");
    expect(fx.read(RULE)).toBe("# Project rule\n");
    expect(run(["web"]).lock.files[RULE]).toBeUndefined();
  });

  it("saves files changed by hand as .orig and writes the new version", () => {
    run(["web"]);
    edit(RULE, "# Mine\n");
    fx.write("packs/web/rules/react.md", "---\ndescription: R.\n---\n# React v2\n");
    const result = run(["web"], { modified: "orig" });
    expect(action(result, RULE)).toEqual({ kind: "update", path: RULE, orig: true });
    expect(fx.read(`${RULE}.orig`)).toBe("# Mine\n");
    expect(fx.read(RULE)).toContain("# React v2");
    expect(result.notices).toContain(
      `${RULE}.orig holds a version changed by hand. Compare, merge and delete it.`,
    );
  });

  it("does not replace an existing .orig", () => {
    edit(RULE, "# Project rule\n");
    edit(`${RULE}.orig`, "# Older\n");
    expect(kinds(run(["web"], { modified: "orig" }))[RULE]).toBe("skip:orig-exists");
    expect(fx.read(`${RULE}.orig`)).toBe("# Older\n");
  });

  it("backs up an unmanaged file with the same name", () => {
    edit(RULE, "# Project rule\n");
    expect(action(run(["web"], { modified: "orig" }), RULE)).toMatchObject({
      kind: "update",
      orig: true,
    });
    expect(fx.read(`${RULE}.orig`)).toBe("# Project rule\n");
  });

  it("removes files of dropped packs and prunes empty folders", () => {
    run(["web", "db"]);
    const result = run(["db"]);
    expect(kinds(result)[RULE]).toBe("delete");
    expect(fx.exists(".claude/skills")).toBe(false);
    expect(fx.exists(".claude/rules/db.md")).toBe(true);
  });

  it("ignores dropped files that are already gone", () => {
    run(["web"]);
    fx.cleanup();
    fx = createFixture();
    run(["web"]);
    edit(RULE, "");
    rmSync(join(fx.root, RULE));
    expect(action(run(["base"]), RULE)).toBeUndefined();
  });

  it("keeps, backs up or forces dropped files changed by hand", () => {
    run(["web"]);
    edit(RULE, "# Mine\n");
    expect(kinds(run(["base"]))[RULE]).toBe("skip:modified");
    expect(fx.read(RULE)).toBe("# Mine\n");

    edit(`${RULE}.orig`, "# Older\n");
    expect(kinds(run(["base"], { modified: "orig" }))[RULE]).toBe("skip:orig-exists");

    rmSync(join(fx.root, `${RULE}.orig`));
    expect(action(run(["base"], { modified: "orig" }), RULE)).toEqual({
      kind: "delete",
      path: RULE,
      orig: true,
    });
    expect(fx.exists(RULE)).toBe(false);
    expect(fx.read(`${RULE}.orig`)).toBe("# Mine\n");
  });

  it("deletes dropped files changed by hand when forced", () => {
    run(["web"]);
    edit(RULE, "# Mine\n");
    expect(kinds(run(["base"], { force: true }))[RULE]).toBe("delete");
    expect(fx.exists(RULE)).toBe(false);
  });

  it("changes nothing on a dry run", () => {
    run(["web"], { dryRun: true });
    expect(fx.exists(".claude")).toBe(false);
    expect(fx.exists(LOCK_FILE)).toBe(false);
    run(["web"]);
    edit(RULE, "# Mine\n");
    run(["base"], { dryRun: true, modified: "orig" });
    expect(fx.exists(`${RULE}.orig`)).toBe(false);
    run(["base"], { dryRun: true, force: true });
    expect(fx.exists(RULE)).toBe(true);
  });

  it("rejects unknown packs", () => {
    expect(() => run(["nope"])).toThrow(/Unknown pack "nope"/);
  });
});

describe("notices", () => {
  it("reports unused excludes", () => {
    expect(run(["web"], { exclude: ["nope"] }).notices).toEqual([
      'exclude: "nope" matches no installed item.',
    ]);
  });

  it("reports upstream changes to items a project replaces, once", () => {
    fx.write(`project/${LOCAL_DIR}/rules/react.md`, "---\ndescription: Ours.\n---\n# Ours\n");
    expect(run(["web"]).notices).toEqual([]);
    fx.write("packs/web/rules/react.md", "---\ndescription: R.\n---\n# React v2\n");
    expect(run(["web"]).notices[0]).toMatch(/^rules\/react: web changed it upstream/);
    expect(run(["web"]).notices).toEqual([]);
    expect(fx.read(RULE)).toContain("# Ours");
  });
});
