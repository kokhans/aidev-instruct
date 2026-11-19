import { readAgent, readRule, readSkill, selectItems } from "./items.ts";
import type { ResolvedPack } from "./packs.ts";
import { scopeGlobs } from "./scope.ts";
import { type OutputFile, type TargetId, targetsById } from "./targets.ts";

export interface RenderOptions {
  targets: readonly TargetId[];
  /** Item names, or `kind/name`, never installed from packs. */
  exclude: string[];
  /** The project's own items in pack layout. */
  localDir?: string;
}

/** A file the CLI owns, with the pack it came from. */
export interface RenderedFile {
  content: string;
  pack: string;
}

export interface RenderResult {
  files: Map<string, RenderedFile>;
  overrides: ReturnType<typeof selectItems>["overrides"];
  unusedExcludes: string[];
}

/**
 * Builds every file for the given packs and targets. Each target writes only to its own folders.
 * Targets that share a folder, such as `.agents/skills`, share one copy of a file. Two different
 * contents for one path is an error. Rule globs are prefixed with the folders the rule's pack
 * applies to.
 */
export function render(packs: ResolvedPack[], options: RenderOptions): RenderResult {
  const targets = targetsById(options.targets);
  const skillDirs = [...new Set(targets.map((t) => t.folders.skills))];
  const selection = selectItems(packs, options.exclude, options.localDir);
  const files = new Map<string, RenderedFile>();
  const add = (file: OutputFile, pack: string) => addFile(files, file, pack);

  for (const item of selection.items) {
    if (item.kind === "rules") {
      const source = readRule(item.path);
      const rule = { ...source, globs: scopeGlobs(source.globs, item.scope) };
      for (const target of targets) add(target.rule(rule), item.pack);
    } else if (item.kind === "skills") {
      const skill = readSkill(item.path);
      for (const dir of skillDirs) {
        for (const { file, content } of skill) {
          add({ path: `${dir}/${item.name}/${file}`, content }, item.pack);
        }
      }
    } else {
      const agent = readAgent(item.path);
      for (const target of targets) add(target.agent(agent), item.pack);
    }
  }

  return { files, overrides: selection.overrides, unusedExcludes: selection.unusedExcludes };
}

/**
 * Adds a file to the output. Targets that share a folder may add the same file twice with the
 * same content. Different content for one path is an error.
 */
export function addFile(files: Map<string, RenderedFile>, file: OutputFile, pack: string) {
  const content = file.content.replace(/\r\n/g, "\n");
  const existing = files.get(file.path);
  if (existing && existing.content !== content) {
    throw new Error(`Two targets write different content to ${file.path}`);
  }
  files.set(file.path, { content, pack });
}
