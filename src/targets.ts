import { stringify } from "./frontmatter.ts";
import type { Agent, Rule } from "./items.ts";
import { orList } from "./util.ts";

/** A file written for a target. */
export interface OutputFile {
  path: string;
  content: string;
}

/** An AI coding tool the CLI writes files for, and the formats it reads. */
export interface Target {
  id: string;
  /** Product name, as the vendor writes it. */
  name: string;
  /** The folders the target reads, relative to the project root. */
  folders: { rules: string; skills: string; agents: string };
  /** Writes one rule in the target's own format. */
  rule: (rule: Rule) => OutputFile;
  /** Writes one subagent in the target's own format. */
  agent: (agent: Agent) => OutputFile;
}

/** The shared Agent Skills folder that Codex and Antigravity read. */
const AGENTS_SKILLS = ".agents/skills";

/** Sentence added to every copy of a read-only agent. Only Cursor enforces `readonly` by itself. */
export const READ_ONLY_NOTE = "Read-only: never edit files or run commands that change state.";

/** Claude Code tool names mapped to the GitHub Copilot tool aliases. */
const COPILOT_TOOLS: Record<string, string> = {
  Read: "read",
  Grep: "search",
  Glob: "search",
  Bash: "execute",
  Edit: "edit",
  Write: "edit",
  WebFetch: "web",
  WebSearch: "web",
};

/**
 * Claude Code tool names mapped to Antigravity tool names: the subagent docs name `view_file`,
 * `grep_search`, `run_command` and `replace_file_content`, the SDK tool list the others.
 */
const ANTIGRAVITY_TOOLS: Record<string, string> = {
  Read: "view_file",
  Grep: "grep_search",
  Glob: "find_file",
  Bash: "run_command",
  Edit: "replace_file_content",
  Write: "create_file",
  WebFetch: "read_url_content",
  WebSearch: "search_web",
};

/** Claude Code tool names mapped to Kiro tool categories. */
const KIRO_TOOLS: Record<string, string> = {
  Read: "read",
  Grep: "read",
  Glob: "read",
  Bash: "shell",
  Edit: "write",
  Write: "write",
  WebFetch: "web",
  WebSearch: "web",
};

/** Claude Code tool names mapped to the Devin tool names its permissions docs list. */
const DEVIN_TOOLS: Record<string, string | null> = {
  Read: "read",
  Grep: "grep",
  Glob: "glob",
  Bash: "exec",
  Edit: "edit",
  Write: "edit",
  WebFetch: null,
  WebSearch: null,
};

/** Every Claude Code tool name an agent may list. Each target maps all of them. */
export const AGENT_TOOLS = Object.keys(COPILOT_TOOLS);

/**
 * Maps Claude Code tool names through a table. `null` drops a tool the target has no
 * equivalent for. A name missing from the table is an error.
 */
function mapTools(agent: Agent, table: Record<string, string | null>, target: string): string[] {
  const tools = agent.tools.flatMap((tool) => {
    const mapped = table[tool];
    if (mapped === undefined) throw new Error(`${agent.path}: no ${target} tool for "${tool}"`);
    return mapped === null ? [] : [mapped];
  });
  return [...new Set(tools)];
}

/** Writes markdown with a frontmatter block. */
function markdown(path: string, data: Parameters<typeof stringify>[0], body: string): OutputFile {
  return { path, content: stringify(data, body) };
}

/** The agent's instructions, with the read-only sentence for a read-only agent. */
export function agentBody(agent: Agent): string {
  const body = agent.body.replace(/^\n+/, "");
  return agent.readonly ? `${body.trimEnd()}\n\n${READ_ONLY_NOTE}\n` : body;
}

/** Rule with `trigger` and a comma-separated `globs` string, as Antigravity and Devin read it. */
function triggerRule(dir: string, rule: Rule): OutputFile {
  return markdown(
    `${dir}/${rule.name}.md`,
    rule.globs.length
      ? { trigger: "glob", description: rule.description, globs: rule.globs.join(",") }
      : { trigger: "always_on", description: rule.description },
    rule.body,
  );
}

/** Markdown agent with name, description, tools and the agent's instructions as the body. */
function toolsAgent(path: string, agent: Agent, tools: string[]): OutputFile {
  return markdown(
    path,
    { name: agent.name, description: agent.description, tools },
    agentBody(agent),
  );
}

/**
 * A rule as a skill, for Codex, which loads skills by description and has no rules with file
 * patterns. The `-rules` suffix keeps it apart from a pack skill of the same name.
 */
export function ruleSkill(rule: Rule): OutputFile {
  const name = `${rule.name}-rules`;
  const files = rule.globs.length
    ? `Use when working on files matching ${orList(rule.globs)}.`
    : "Use when working on any file.";
  return markdown(
    `${AGENTS_SKILLS}/${name}/SKILL.md`,
    { name, description: `${rule.description.trim()} ${files}` },
    rule.body,
  );
}

/** Writes a TOML string, as a literal block when possible so markdown stays readable. */
function tomlString(value: string): string {
  return value.includes("'''") ? JSON.stringify(value) : `'''\n${value}'''`;
}

/** Every supported target. The order is the order `targets` shows. */
export const TARGETS = [
  {
    id: "copilot",
    name: "GitHub Copilot",
    folders: {
      rules: ".github/instructions",
      skills: ".github/skills",
      agents: ".github/agents",
    },
    rule: (rule: Rule) =>
      markdown(
        `.github/instructions/${rule.name}.instructions.md`,
        {
          name: rule.title,
          description: rule.description,
          applyTo: rule.globs.length ? rule.globs.join(",") : "**",
        },
        rule.body,
      ),
    agent: (agent: Agent) =>
      toolsAgent(
        `.github/agents/${agent.name}.agent.md`,
        agent,
        mapTools(agent, COPILOT_TOOLS, "Copilot"),
      ),
  },
  {
    id: "claude",
    name: "Claude Code",
    folders: { rules: ".claude/rules", skills: ".claude/skills", agents: ".claude/agents" },
    rule: (rule: Rule) =>
      markdown(
        `.claude/rules/${rule.name}.md`,
        { paths: rule.globs.length ? rule.globs : undefined },
        rule.body,
      ),
    agent: (agent: Agent) => ({
      path: `.claude/agents/${agent.name}.md`,
      content: agent.readonly
        ? `${agent.source.trimEnd()}

${READ_ONLY_NOTE}
`
        : agent.source,
    }),
  },
  {
    id: "cursor",
    name: "Cursor",
    folders: { rules: ".cursor/rules", skills: ".cursor/skills", agents: ".cursor/agents" },
    /** Cursor's docs show the globs unquoted and comma-separated. */
    rule: (rule: Rule) => {
      const always = rule.globs.length === 0;
      const header = [
        "---",
        `description: ${rule.description}`,
        `globs: ${always ? "" : rule.globs.join(",")}`,
        `alwaysApply: ${always}`,
        "---",
      ];
      return {
        path: `.cursor/rules/${rule.name}.mdc`,
        content: `${header.join("\n")}\n\n${rule.body.replace(/^\n+/, "")}`,
      };
    },
    agent: (agent: Agent) =>
      markdown(
        `.cursor/agents/${agent.name}.md`,
        {
          name: agent.name,
          description: agent.description,
          readonly: agent.readonly || undefined,
        },
        agentBody(agent),
      ),
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    folders: { rules: AGENTS_SKILLS, skills: AGENTS_SKILLS, agents: ".codex/agents" },
    rule: ruleSkill,
    agent: (agent: Agent) => ({
      path: `.codex/agents/${agent.name}.toml`,
      content: [
        `name = ${JSON.stringify(agent.name)}`,
        `description = ${JSON.stringify(agent.description)}`,
        `developer_instructions = ${tomlString(agentBody(agent))}`,
        "",
      ].join("\n"),
    }),
  },
  {
    id: "antigravity",
    name: "Google Antigravity",
    folders: { rules: ".agents/rules", skills: AGENTS_SKILLS, agents: ".agents/agents" },
    rule: (rule: Rule) => triggerRule(".agents/rules", rule),
    agent: (agent: Agent) =>
      toolsAgent(
        `.agents/agents/${agent.name}.md`,
        agent,
        mapTools(agent, ANTIGRAVITY_TOOLS, "Antigravity"),
      ),
  },
  {
    id: "kiro",
    name: "Kiro",
    folders: { rules: ".kiro/steering", skills: ".kiro/skills", agents: ".kiro/agents" },
    rule: (rule: Rule) =>
      markdown(
        `.kiro/steering/${rule.name}.md`,
        rule.globs.length
          ? { inclusion: "fileMatch", fileMatchPattern: rule.globs }
          : { inclusion: "always" },
        rule.body,
      ),
    agent: (agent: Agent) =>
      toolsAgent(`.kiro/agents/${agent.name}.md`, agent, mapTools(agent, KIRO_TOOLS, "Kiro")),
  },
  {
    id: "devin",
    name: "Devin",
    folders: { rules: ".devin/rules", skills: ".devin/skills", agents: ".devin/agents" },
    rule: (rule: Rule) => triggerRule(".devin/rules", rule),
    agent: (agent: Agent) =>
      toolsAgent(`.devin/agents/${agent.name}.md`, agent, mapTools(agent, DEVIN_TOOLS, "Devin")),
  },
] as const satisfies readonly Target[];

export type TargetId = (typeof TARGETS)[number]["id"];

/** Targets used when the project does not choose. */
export const DEFAULT_TARGETS: readonly TargetId[] = ["copilot", "claude", "cursor"];

/** Validates target ids, removing duplicates. */
export function parseTargets(values: string[]): TargetId[] {
  const ids = [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))];
  const known = TARGETS.map((t) => t.id as string);
  const invalid = ids.filter((id) => !known.includes(id));
  if (invalid.length) {
    throw new Error(`Unknown target(s): ${invalid.join(", ")}. Use ${known.join(", ")}.`);
  }
  if (!ids.length) throw new Error(`Choose at least one target: ${known.join(", ")}.`);
  return ids as TargetId[];
}

/** Returns target definitions in `TARGETS` order. */
export function targetsById(ids: readonly TargetId[]): Target[] {
  return TARGETS.filter((t) => ids.includes(t.id));
}
