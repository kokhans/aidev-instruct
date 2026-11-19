/**
 * Builds `docs/PACKS.md`, `docs/STACKS.md` and the generated sections of `docs/CLI.md`.
 * `bun run docs` writes them, and the content test fails when the files are out of date.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ENV_VARS } from "./env.ts";
import { listItems } from "./items.ts";
import { loadPacks, loadStacks, type Pack, requestsFor, resolve } from "./packs.ts";
import { TARGETS } from "./targets.ts";
import { renderTemplate } from "./templates.ts";

/** Formats names as a comma-separated list of code spans. */
const code = (names: string[]) => names.map((n) => `\`${n}\``).join(", ");

/** Describes what a pack installs: rules, skills, agents and integration items. */
function contents(pack: Pack): string {
  const items = listItems(pack.dir, pack.name);
  const plain = (kind: string) =>
    items.filter((i) => i.kind === kind && !i.with.length).map((i) => i.name);
  const parts: string[] = [];
  for (const [kind, label] of [
    ["rules", "Rules"],
    ["skills", "Skills"],
    ["agents", "Agents"],
  ] as const) {
    const names = plain(kind);
    if (names.length) parts.push(`${label}: ${code(names)}`);
  }
  const integrations = items.filter((i) => i.with.length);
  if (integrations.length) {
    parts.push(
      `With: ${integrations.map((i) => `\`${i.name}\` (${i.with.join(", ")})`).join(", ")}`,
    );
  }
  return parts.join("<br>");
}

/** Escapes text for a table cell. */
const cell = (text: string) => text.replace(/\|/g, "\\|");

/** The row of one pack in `docs/PACKS.md`. */
function packRow(pack: Pack) {
  const relations = [
    pack.requires.length ? code(pack.requires) : "",
    pack.conflicts.length ? `Conflicts: ${code(pack.conflicts)}` : "",
  ].filter(Boolean);
  return {
    name: pack.name,
    description: cell(pack.description),
    relations: relations.join("<br>"),
    contents: contents(pack),
  };
}

/** Builds `docs/PACKS.md` from the packs, sorted by name. */
export function packsDoc(packs = loadPacks()): string {
  const rows = [...packs.values()].sort((a, b) => a.name.localeCompare(b.name)).map(packRow);
  return renderTemplate("docs/packs.md.mustache", { rows });
}

/** Builds `docs/STACKS.md`. */
export function stacksDoc(packs = loadPacks(), stacks = loadStacks()): string {
  const rows = [...stacks.values()].map((stack) => {
    const installed = resolve(requestsFor([{ name: stack.name }], [], stacks), packs);
    return {
      name: stack.name,
      description: cell(stack.description),
      packs: code(stack.packs),
      count: installed.length,
    };
  });
  return renderTemplate("docs/stacks.md.mustache", { rows });
}

/** The page that owns the generated sections, as the error messages name it. */
export const CLI_DOC = "docs/CLI.md";

/** Markers around the generated target folder table in `docs/CLI.md`. */
export const TARGETS_MARKERS = {
  start: "<!-- generated:targets:start -->",
  end: "<!-- generated:targets:end -->",
};

/** Markers around the generated environment variable table in `docs/CLI.md`. */
export const ENV_MARKERS = {
  start: "<!-- generated:env:start -->",
  end: "<!-- generated:env:end -->",
};

/** The target folder table, built from `TARGETS`. */
export function targetsTable(): string {
  const rows = TARGETS.map(
    (target) =>
      `| \`${target.id}\` | \`${target.folders.rules}\` | \`${target.folders.skills}\` | \`${target.folders.agents}\` |`,
  );
  return ["| Target | Rules | Skills | Agents |", "| --- | --- | --- | --- |", ...rows].join("\n");
}

/** The environment variable table, built from `ENV_VARS`. */
export function envTable(): string {
  const rows = ENV_VARS.map(
    (variable) => `| ${variable.name} | ${variable.readBy} | ${variable.does} |`,
  );
  return ["| Variable | Read by | Does |", "| --- | --- | --- |", ...rows].join("\n");
}

/** Replaces the text between two markers, and fails when a marker is missing. */
export function replaceSection(
  text: string,
  markers: { start: string; end: string },
  content: string,
): string {
  const start = text.indexOf(markers.start);
  if (start === -1) throw new Error(`${CLI_DOC}: missing ${markers.start}`);
  const end = text.indexOf(markers.end, start);
  if (end === -1) throw new Error(`${CLI_DOC}: missing ${markers.end}`);
  return `${text.slice(0, start + markers.start.length)}\n${content}\n${text.slice(end)}`;
}

/** Rewrites the generated sections of `docs/CLI.md`. */
export function cliDoc(text: string): string {
  const withTargets = replaceSection(text, TARGETS_MARKERS, targetsTable());
  return replaceSection(withTargets, ENV_MARKERS, envTable());
}

/** Writes `docs/PACKS.md`, `docs/STACKS.md` and the generated sections of `docs/CLI.md`. */
export function writeDocs(root: string) {
  writeFileSync(join(root, "docs/PACKS.md"), packsDoc());
  writeFileSync(join(root, "docs/STACKS.md"), stacksDoc());
  const file = join(root, CLI_DOC);
  writeFileSync(file, cliDoc(readFileSync(file, "utf8").replace(/\r\n/g, "\n")));
}
