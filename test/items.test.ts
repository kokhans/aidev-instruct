import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  excludes,
  itemHash,
  listItems,
  readAgent,
  readRule,
  readSkill,
  selectItems,
} from "../src/items.ts";
import { loadPacks, type ResolvedPack } from "../src/packs.ts";
import type { Scope } from "../src/scope.ts";
import { createFixture, type Fixture } from "./fixtures.ts";

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

/** Resolved fixture packs with the given folders, in the given order. */
const packs = (entries: [string, Scope][]): ResolvedPack[] => {
  const all = loadPacks(fx.packsDir);
  return entries.map(([name, scope]) => ({ ...(all.get(name) as ResolvedPack), scope }));
};
const keys = (selection: ReturnType<typeof selectItems>) =>
  selection.items.map((i) => `${i.kind}/${i.name}`);

describe("readRule", () => {
  it("reads description, globs, title and body", () => {
    const rule = readRule(join(fx.packsDir, "web/rules/react.md"));
    expect(rule).toMatchObject({
      name: "react",
      title: "React",
      description: "React rules.",
      globs: ["**/*.tsx", "**/*.jsx"],
    });
    expect(readRule(join(fx.packsDir, "web/rules/always.md")).globs).toEqual([]);
  });

  it("falls back to the file name without an H1", () => {
    fx.write("rules/plain.md", "---\ndescription: D.\n---\n\nText\n");
    expect(readRule(join(fx.temp, "rules/plain.md")).title).toBe("plain");
  });

  it("requires a description and a globs list", () => {
    fx.write("rules/a.md", "---\nglobs: []\n---\n# A\n");
    expect(() => readRule(join(fx.temp, "rules/a.md"))).toThrow(/"description" is required/);
    fx.write("rules/b.md", "---\ndescription: D.\nglobs: x\n---\n# B\n");
    expect(() => readRule(join(fx.temp, "rules/b.md"))).toThrow(/"globs" must be a list/);
  });
});

describe("readAgent", () => {
  it("reads tools from a string or a list, and the read-only flag", () => {
    const agent = readAgent(join(fx.packsDir, "base/agents/reviewer.md"));
    expect(agent).toMatchObject({ name: "reviewer", tools: ["Read", "Grep"], readonly: true });
    fx.write("agents/a.md", "---\nname: a\ndescription: A.\ntools:\n  - Read\n---\n# A\n");
    expect(readAgent(join(fx.temp, "agents/a.md"))).toMatchObject({
      tools: ["Read"],
      readonly: false,
    });
    fx.write("agents/b.md", "---\nname: b\ndescription: B.\n---\n# B\n");
    expect(readAgent(join(fx.temp, "agents/b.md")).tools).toEqual([]);
  });

  it("removes with from the source", () => {
    const agent = readAgent(join(fx.packsDir, "auth/agents/auth-auditor.md"));
    expect(agent.source).not.toContain("with");
    expect(agent.source).toContain("name: auth-auditor");
  });

  it("requires name and description, and a tools list", () => {
    fx.write("agents/a.md", "---\nname: a\n---\n# A\n");
    expect(() => readAgent(join(fx.temp, "agents/a.md"))).toThrow(
      /"name" and "description" are required/,
    );
    fx.write("agents/b.md", "---\ndescription: B.\n---\n# B\n");
    expect(() => readAgent(join(fx.temp, "agents/b.md"))).toThrow(/"name" and "description"/);
    fx.write("agents/c.md", "---\nname: c\ndescription: C.\ntools: true\n---\n# C\n");
    expect(() => readAgent(join(fx.temp, "agents/c.md"))).toThrow(/"tools" must be a list/);
  });
});

describe("readSkill", () => {
  it("reads every file and removes with only from SKILL.md", () => {
    fx.write("packs/auth/skills/auth-db-guide/references/note.md", "with: kept\n");
    const files = readSkill(join(fx.packsDir, "auth/skills/auth-db-guide"));
    expect(files.map((f) => f.file)).toEqual(["SKILL.md", "references/note.md"]);
    expect(files[0]?.content).not.toContain("with");
    expect(files[1]?.content).toBe("with: kept\n");
  });
});

describe("listItems", () => {
  it("lists rules, skills and agents with their with lists and folder", () => {
    fx.write("packs/auth/rules/notes.txt", "ignored");
    fx.write("packs/auth/skills/stray.md", "ignored");
    const items = listItems(join(fx.packsDir, "auth"), "auth", ["api"]);
    expect(items.map((i) => [i.kind, i.name, i.with, i.scope])).toEqual([
      ["rules", "auth-db", ["db"], ["api"]],
      ["rules", "auth", [], ["api"]],
      ["skills", "auth-db-guide", ["db"], ["api"]],
      ["agents", "auth-auditor", ["db"], ["api"]],
    ]);
    expect(listItems(join(fx.packsDir, "db"), "db")[0]?.scope).toBeNull();
  });

  it("treats a skill folder without SKILL.md as having no with list", () => {
    fx.write("packs/db/skills/empty/references/a.md", "# A\n");
    expect(listItems(join(fx.packsDir, "db"), "db").find((i) => i.name === "empty")?.with).toEqual(
      [],
    );
  });

  it("rejects a with value that is not a list", () => {
    fx.write("packs/db/rules/bad.md", "---\ndescription: D.\nwith: auth\n---\n# Bad\n");
    expect(() => listItems(join(fx.packsDir, "db"), "db")).toThrow(/"with" must be a list/);
  });
});

describe("itemHash", () => {
  it("changes when any file of the item changes", () => {
    const [skill] = listItems(join(fx.packsDir, "web"), "web").filter((i) => i.kind === "skills");
    const [rule] = listItems(join(fx.packsDir, "db"), "db");
    const before = [itemHash(skill as never), itemHash(rule as never)];
    fx.write("packs/web/skills/web-spec/references/seo.md", "# SEO v2\n");
    fx.write("packs/db/rules/db.md", "---\ndescription: D.\n---\n# DB v2\n");
    expect(itemHash(skill as never)).not.toBe(before[0]);
    expect(itemHash(rule as never)).not.toBe(before[1]);
  });
});

describe("selectItems", () => {
  it("applies a range item where the pack versions match", () => {
    fx.write(
      "packs/versioned/pack.json",
      JSON.stringify({
        name: "versioned",
        description: "Versioned guidance.",
        version: "1.0.0",
        tags: ["versioned"],
        latest: "19",
      }),
    );
    fx.write(
      "packs/versioned/rules/wide.md",
      '---\ndescription: Wide.\nversion: ">=16 <20"\n---\n\n# Wide\n',
    );
    const pack = loadPacks(fx.packsDir).get("versioned") as ResolvedPack;
    const both: ResolvedPack = {
      ...pack,
      scope: null,
      versions: [
        { version: "16", scope: ["legacy"] },
        { version: "19", scope: null },
      ],
      warnings: [],
    };
    expect(selectItems([both], []).items[0]?.scope).toBe(null);
    const outside: ResolvedPack = { ...both, versions: [{ version: "20", scope: null }] };
    expect(selectItems([outside], []).items).toEqual([]);
  });
  it("keeps with items only when their packs are installed", () => {
    expect(keys(selectItems(packs([["auth", null]]), []))).toEqual(["rules/auth"]);
    expect(
      keys(
        selectItems(
          packs([
            ["db", null],
            ["auth", null],
          ]),
          [],
        ),
      ),
    ).toEqual([
      "rules/db",
      "rules/auth-db",
      "rules/auth",
      "skills/auth-db-guide",
      "agents/auth-auditor",
    ]);
  });

  it("narrows with items to where every pack applies, and drops them when nothing overlaps", () => {
    const both = selectItems(
      packs([
        ["db", ["apps/api"]],
        ["auth", null],
      ]),
      [],
    );
    expect(both.items.find((i) => i.name === "auth-db")?.scope).toEqual(["apps/api"]);
    expect(both.items.find((i) => i.name === "auth")?.scope).toBeNull();
    const apart = selectItems(
      packs([
        ["db", ["apps/api"]],
        ["auth", ["apps/web"]],
      ]),
      [],
    );
    expect(keys(apart)).toEqual(["rules/db", "rules/auth"]);
  });

  it("excludes by name or kind/name and reports unused excludes", () => {
    const selection = selectItems(
      packs([
        ["base", null],
        ["web", null],
      ]),
      ["react", "skills/web-spec", "nope"],
    );
    expect(keys(selection)).toEqual(["agents/reviewer", "rules/always"]);
    expect(selection.unusedExcludes).toEqual(["nope"]);
  });

  it("matches * within a name, by name or kind/name", () => {
    const selection = selectItems(
      packs([
        ["base", null],
        ["web", null],
      ]),
      ["rules/*", "web-*", "rev*", "nope-*", "rules/web.*"],
    );
    expect(keys(selection)).toEqual([]);
    expect(selection.unusedExcludes).toEqual(["nope-*", "rules/web.*"]);
    expect(excludes("*", "web-spec", "skills/web-spec")).toBe(true);
    expect(excludes("skills*", "web-spec", "skills/web-spec")).toBe(false);
  });

  it("drops a rule and a skill of one name together, or only the kind named", () => {
    fx.write(
      "packs/web/skills/react/SKILL.md",
      "---\nname: react\ndescription: React skill.\n---\n\n# React\n",
    );
    const chosen = packs([
      ["base", null],
      ["web", null],
    ]);
    const both = selectItems(chosen, ["react"]);
    expect(keys(both)).toEqual(["agents/reviewer", "rules/always", "skills/web-spec"]);
    expect(both.unusedExcludes).toEqual([]);
    const rules = selectItems(chosen, ["rules/react"]);
    expect(keys(rules)).toEqual([
      "agents/reviewer",
      "rules/always",
      "skills/react",
      "skills/web-spec",
    ]);
    expect(selectItems(chosen, ["skills/react"]).unusedExcludes).toEqual([]);
  });

  it("rejects the same item in two packs", () => {
    fx.write("packs/db/rules/auth.md", "---\ndescription: D.\n---\n# Auth\n");
    expect(() =>
      selectItems(
        packs([
          ["db", null],
          ["auth", null],
        ]),
        [],
      ),
    ).toThrow(/Packs db and auth both have rules\/auth/);
  });

  it("adds local items, lets them replace pack items and records the upstream hash", () => {
    fx.write("project/.aidev-instruct/rules/react.md", "---\ndescription: Ours.\n---\n# Ours\n");
    fx.write("project/.aidev-instruct/rules/api.md", "---\ndescription: API.\n---\n# API\n");
    fx.write(
      "project/.aidev-instruct/rules/needs-db.md",
      '---\ndescription: N.\nwith: ["db"]\n---\n# N\n',
    );
    const selection = selectItems(packs([["web", null]]), [], join(fx.root, ".aidev-instruct"));
    expect(selection.items.find((i) => i.name === "react")?.pack).toBe("local");
    expect(keys(selection)).toContain("rules/api");
    expect(keys(selection)).not.toContain("rules/needs-db");
    expect(selection.overrides).toEqual([
      { item: "rules/react", pack: "web", hash: expect.stringMatching(/^[0-9a-f]{64}$/) },
    ]);
  });
});
