import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPacks, type ResolvedPack } from "../src/packs.ts";
import { addFile, type RenderedFile, render } from "../src/render.ts";
import type { Scope } from "../src/scope.ts";
import type { TargetId } from "../src/targets.ts";
import { createFixture, type Fixture } from "./fixtures.ts";

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

const packs = (entries: [string, Scope][]): ResolvedPack[] => {
  const all = loadPacks(fx.packsDir);
  return entries.map(([name, scope]) => ({ ...(all.get(name) as ResolvedPack), scope }));
};
const paths = (
  targets: TargetId[],
  entries: [string, Scope][] = [
    ["base", null],
    ["web", null],
  ],
) => [...render(packs(entries), { targets, exclude: [] }).files.keys()].sort();

describe("render", () => {
  it("writes each default target to its own folders only", () => {
    expect(paths(["copilot", "claude", "cursor"])).toEqual([
      ".claude/agents/reviewer.md",
      ".claude/rules/always.md",
      ".claude/rules/react.md",
      ".claude/skills/web-spec/SKILL.md",
      ".claude/skills/web-spec/references/seo.md",
      ".cursor/agents/reviewer.md",
      ".cursor/rules/always.mdc",
      ".cursor/rules/react.mdc",
      ".cursor/skills/web-spec/SKILL.md",
      ".cursor/skills/web-spec/references/seo.md",
      ".github/agents/reviewer.agent.md",
      ".github/instructions/always.instructions.md",
      ".github/instructions/react.instructions.md",
      ".github/skills/web-spec/SKILL.md",
      ".github/skills/web-spec/references/seo.md",
    ]);
  });

  it.each([
    ["copilot", ".github/"],
    ["claude", ".claude/"],
    ["cursor", ".cursor/"],
    ["codex", /^\.(agents\/skills|codex)\//],
    ["antigravity", ".agents/"],
    ["kiro", ".kiro/"],
    ["devin", ".devin/"],
  ] as [TargetId, string | RegExp][])("%s alone writes only its own folders", (id, prefix) => {
    const written = paths([id]);
    expect(written.length).toBe(5);
    for (const path of written) {
      if (typeof prefix === "string") expect(path.startsWith(prefix), path).toBe(true);
      else expect(path).toMatch(prefix);
    }
  });

  it("writes Codex rules as skills next to the pack skills", () => {
    expect(paths(["codex"])).toEqual([
      ".agents/skills/always-rules/SKILL.md",
      ".agents/skills/react-rules/SKILL.md",
      ".agents/skills/web-spec/SKILL.md",
      ".agents/skills/web-spec/references/seo.md",
      ".codex/agents/reviewer.toml",
    ]);
  });

  it("writes all seven targets together, with one shared .agents/skills copy", () => {
    const all = paths(["copilot", "claude", "cursor", "codex", "antigravity", "kiro", "devin"]);
    expect(all.filter((p) => p.startsWith(".agents/skills/web-spec/"))).toHaveLength(2);
    expect(all).toHaveLength(5 * 7 - 2);
    expect(all.filter((p) => p.includes("INSTRUCT") || p.endsWith("AGENTS.md"))).toEqual([]);
  });

  it("prefixes rule globs with the pack's folders", () => {
    const result = render(packs([["web", ["apps/web"]]]), { targets: ["claude"], exclude: [] });
    expect(result.files.get(".claude/rules/react.md")?.content).toContain("  - apps/web/**/*.tsx");
    expect(result.files.get(".claude/rules/always.md")?.content).toContain("  - apps/web/**");
    expect(result.files.get(".claude/rules/react.md")?.pack).toBe("web");
  });

  it("strips with from skills and agents it writes", () => {
    const result = render(
      packs([
        ["db", null],
        ["auth", null],
      ]),
      { targets: ["claude"], exclude: [] },
    );
    expect(result.files.get(".claude/skills/auth-db-guide/SKILL.md")?.content).not.toContain(
      "with",
    );
    expect(result.files.get(".claude/agents/auth-auditor.md")?.content).not.toContain("with");
  });

  it("passes on overrides and unused excludes", () => {
    fx.write("project/.aidev-instruct/rules/react.md", "---\ndescription: Ours.\n---\n# Ours\n");
    const result = render(packs([["web", null]]), {
      targets: ["claude"],
      exclude: ["nope"],
      localDir: join(fx.root, ".aidev-instruct"),
    });
    expect(result.overrides.map((o) => o.item)).toEqual(["rules/react"]);
    expect(result.unusedExcludes).toEqual(["nope"]);
  });
});

describe("addFile", () => {
  it("accepts the same content twice and rejects different content", () => {
    const files = new Map<string, RenderedFile>();
    addFile(files, { path: "a.md", content: "x\r\n" }, "p");
    addFile(files, { path: "a.md", content: "x\n" }, "q");
    expect(files.get("a.md")).toEqual({ content: "x\n", pack: "q" });
    expect(() => addFile(files, { path: "a.md", content: "y" }, "p")).toThrow(
      /Two targets write different content to a\.md/,
    );
  });
});
