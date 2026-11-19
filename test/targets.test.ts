import { describe, expect, it } from "vitest";
import type { Agent, Rule } from "../src/items.ts";
import {
  agentBody,
  parseTargets,
  READ_ONLY_NOTE,
  ruleSkill,
  TARGETS,
  type Target,
  type TargetId,
  targetsById,
} from "../src/targets.ts";

const scoped: Rule = {
  name: "react",
  title: "React",
  description: "React rules.",
  globs: ["**/*.tsx", "**/*.jsx"],
  body: "\n# React\n\n- Pure.\n",
};
const always: Rule = { ...scoped, name: "always", title: "Always", globs: [], body: "# Always\n" };
const agent = (extra: Partial<Agent> = {}): Agent => ({
  name: "reviewer",
  description: "Reviews.",
  tools: ["Read", "Grep", "Glob", "Bash", "WebFetch"],
  readonly: true,
  body: "\n# Reviewer\n",
  source: "---\nname: reviewer\n---\n\n# Reviewer\n",
  path: "agents/reviewer.md",
  ...extra,
});
const target = (id: TargetId): Target => targetsById([id])[0] as Target;
const rule = (id: TargetId, r: Rule) => target(id).rule(r);
const agentFile = (id: TargetId, a = agent()) => target(id).agent(a);

describe("TARGETS", () => {
  it("holds the seven tools with native rules, skills and agents", () => {
    expect(TARGETS.map((t) => t.id)).toEqual([
      "copilot",
      "claude",
      "cursor",
      "codex",
      "antigravity",
      "kiro",
      "devin",
    ]);
  });

  it("gives each target its own skill folder, except the shared .agents/skills", () => {
    expect(Object.fromEntries(TARGETS.map((t) => [t.id, t.folders.skills]))).toEqual({
      copilot: ".github/skills",
      claude: ".claude/skills",
      cursor: ".cursor/skills",
      codex: ".agents/skills",
      antigravity: ".agents/skills",
      kiro: ".kiro/skills",
      devin: ".devin/skills",
    });
  });
});

describe("rules", () => {
  it("Copilot uses applyTo, with ** for every file", () => {
    expect(rule("copilot", scoped)).toEqual({
      path: ".github/instructions/react.instructions.md",
      content:
        '---\nname: React\ndescription: React rules.\napplyTo: "**/*.tsx,**/*.jsx"\n---\n\n# React\n\n- Pure.\n',
    });
    expect(rule("copilot", always).content).toContain('applyTo: "**"');
  });

  it("Claude Code uses a paths list, and no frontmatter for every file", () => {
    expect(rule("claude", scoped)).toEqual({
      path: ".claude/rules/react.md",
      content: '---\npaths:\n  - "**/*.tsx"\n  - "**/*.jsx"\n---\n\n# React\n\n- Pure.\n',
    });
    expect(rule("claude", always).content).toBe("# Always\n");
  });

  it("Cursor uses unquoted globs and alwaysApply", () => {
    expect(rule("cursor", scoped)).toEqual({
      path: ".cursor/rules/react.mdc",
      content:
        "---\ndescription: React rules.\nglobs: **/*.tsx,**/*.jsx\nalwaysApply: false\n---\n\n# React\n\n- Pure.\n",
    });
    expect(rule("cursor", always).content).toContain("globs: \nalwaysApply: true");
  });

  it("Codex gets each rule as a <rule>-rules skill", () => {
    expect(rule("codex", scoped)).toEqual(ruleSkill(scoped));
    expect(ruleSkill(scoped)).toEqual({
      path: ".agents/skills/react-rules/SKILL.md",
      content:
        "---\nname: react-rules\ndescription: React rules. Use when working on files matching **/*.tsx or **/*.jsx.\n---\n\n# React\n\n- Pure.\n",
    });
    expect(ruleSkill({ ...scoped, globs: ["a/**", "b/**", "c/**"] }).content).toContain(
      "matching a/**, b/** or c/**.",
    );
    expect(ruleSkill({ ...scoped, globs: ["apps/web/**/*.tsx"] }).content).toContain(
      "matching apps/web/**/*.tsx.",
    );
    expect(ruleSkill(always).content).toContain(
      "description: React rules. Use when working on any file.",
    );
  });

  it("Antigravity and Devin use trigger and a globs string", () => {
    expect(rule("antigravity", scoped)).toEqual({
      path: ".agents/rules/react.md",
      content:
        '---\ntrigger: glob\ndescription: React rules.\nglobs: "**/*.tsx,**/*.jsx"\n---\n\n# React\n\n- Pure.\n',
    });
    expect(rule("antigravity", always).content).toContain("trigger: always_on");
    expect(rule("devin", scoped).path).toBe(".devin/rules/react.md");
  });

  it("Kiro uses inclusion with fileMatchPattern", () => {
    expect(rule("kiro", scoped).content).toContain(
      'inclusion: fileMatch\nfileMatchPattern:\n  - "**/*.tsx"',
    );
    expect(rule("kiro", always).content).toContain("inclusion: always");
  });
});

describe("agents", () => {
  it("Claude Code copies the source, with the read-only sentence for a read-only agent", () => {
    expect(agentFile("claude")).toEqual({
      path: ".claude/agents/reviewer.md",
      content: `${agent().source}\n${READ_ONLY_NOTE}\n`,
    });
    expect(agentFile("claude", agent({ readonly: false })).content).toBe(agent().source);
  });

  it("Cursor writes .cursor/agents with readonly", () => {
    expect(agentFile("cursor")).toEqual({
      path: ".cursor/agents/reviewer.md",
      content: `---\nname: reviewer\ndescription: Reviews.\nreadonly: true\n---\n\n# Reviewer\n\n${READ_ONLY_NOTE}\n`,
    });
    expect(agentFile("cursor", agent({ readonly: false })).content).not.toContain("readonly");
  });

  it("maps tool names per target", () => {
    expect(agentFile("copilot").content).toContain(
      "tools:\n  - read\n  - search\n  - execute\n  - web",
    );
    expect(agentFile("antigravity").path).toBe(".agents/agents/reviewer.md");
    expect(agentFile("antigravity").content).toContain("  - view_file");
    expect(agentFile("antigravity", agent({ tools: ["Write"] })).content).toContain(
      "  - create_file",
    );
    expect(agentFile("kiro").content).toContain("tools:\n  - read\n  - shell\n  - web");
  });

  it("drops tools a target has no equivalent for", () => {
    expect(agentFile("devin").content).toContain("  - exec\n---");
    expect(agentFile("devin", agent({ tools: ["Edit", "Write"] })).content).toContain(
      "tools:\n  - edit\n---",
    );
  });

  it("fails on a tool a target cannot map", () => {
    expect(() => agentFile("copilot", agent({ tools: ["Teleport"] }))).toThrow(
      /agents\/reviewer\.md: no Copilot tool for "Teleport"/,
    );
  });

  it("Codex writes TOML", () => {
    expect(agentFile("codex")).toEqual({
      path: ".codex/agents/reviewer.toml",
      content: `name = "reviewer"\ndescription = "Reviews."\ndeveloper_instructions = '''\n# Reviewer\n\n${READ_ONLY_NOTE}\n'''\n`,
    });
    expect(
      agentFile("codex", agent({ body: "Use ''' here.\n", readonly: false })).content,
    ).toContain("developer_instructions = \"Use ''' here.\\n\"");
  });

  it("adds the read-only sentence to every target's copy of a read-only agent", () => {
    for (const t of TARGETS) {
      expect(t.agent(agent()).content, t.id).toContain(READ_ONLY_NOTE);
      expect(t.agent(agent({ readonly: false })).content, t.id).not.toContain(READ_ONLY_NOTE);
    }
    expect(agentBody(agent({ body: "\n\nText" }))).toBe(`Text\n\n${READ_ONLY_NOTE}\n`);
  });
});

describe("parseTargets", () => {
  it("normalizes case and spaces and removes duplicates", () => {
    expect(parseTargets([" Claude", "claude", "", "cursor"])).toEqual(["claude", "cursor"]);
  });

  it("rejects unknown and empty lists", () => {
    expect(() => parseTargets(["claude", "nope"])).toThrow(/Unknown target\(s\): nope/);
    expect(() => parseTargets([" "])).toThrow(/Choose at least one target/);
  });

  it("names the supported targets when one is unknown", () => {
    expect(() => parseTargets(["gemini"])).toThrow(
      "Unknown target(s): gemini. Use copilot, claude, cursor, codex, antigravity, kiro, devin.",
    );
  });
});

describe("targetsById", () => {
  it("keeps TARGETS order", () => {
    expect(targetsById(["cursor", "copilot"]).map((t) => t.id)).toEqual(["copilot", "cursor"]);
  });
});
