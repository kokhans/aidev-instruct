/**
 * Checks pack and stack format and writing style. `bun run validate` and `feed validate` both
 * use it, and it ships in `dist/`. Returns one line per problem.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FeedManifest } from "./feeds.ts";
import { frontmatterError, parse } from "./frontmatter.ts";
import { walk } from "./fs.ts";
import { loadPacks, parseRef } from "./packs.ts";
import { isPin, isRange, isSemver, satisfies } from "./versions.ts";

const PACKS = fileURLToPath(new URL("../packs", import.meta.url));
const SMALL_WORDS = new Set(
  "a an and as at but by for from in into nor of on or over per so than the to up via vs with yet".split(
    " ",
  ),
);
const LOWERCASE_NAMES = new Set(["npm", "pnpm", "bun", "bunx", "dotnet", "tRPC", "iOS", "macOS"]);
const AGENT_TOOLS = new Set([
  "Read",
  "Grep",
  "Glob",
  "Bash",
  "Edit",
  "Write",
  "WebFetch",
  "WebSearch",
]);

/** A tag: lowercase, a letter first, then letters, digits and dashes. */
const TAG_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Checks `packVersions`: known packs that `requires` names, with valid semver ranges. */
function checkPackVersions(
  manifest: { packVersions?: unknown; requires?: unknown },
  file: string,
  known: string[],
  report: (file: string, message: string) => void,
): void {
  const value = manifest.packVersions;
  if (value === undefined) return;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    report(file, '"packVersions" must be an object of semver ranges');
    return;
  }
  const required = (Array.isArray(manifest.requires) ? manifest.requires : []).map(
    (ref) => parseRef(String(ref)).name,
  );
  for (const [name, range] of Object.entries(value)) {
    if (!known.includes(name)) report(file, `packVersions names unknown pack "${name}"`);
    else if (!required.includes(name)) {
      report(file, `packVersions names "${name}", which "requires" does not list`);
    }
    if (typeof range !== "string" || !isRange(range)) {
      report(file, `packVersions "${name}" must be a semver range`);
    }
  }
}

/** Checks `tags`: at least one unique lowercase tag, each starting with a letter. */
function checkTags(
  tags: unknown,
  file: string,
  report: (file: string, message: string) => void,
): void {
  if (!Array.isArray(tags) || tags.length === 0) {
    report(file, '"tags" must be a list with at least one tag');
    return;
  }
  const seen = new Set<string>();
  for (const tag of tags) {
    if (typeof tag !== "string") report(file, `tag ${JSON.stringify(tag)} must be a string`);
    else if (!TAG_PATTERN.test(tag)) {
      report(
        file,
        `tag "${tag}" must start with a letter and use lowercase letters, digits and dashes`,
      );
    } else if (seen.has(tag)) report(file, `tag "${tag}" is listed twice`);
    else seen.add(tag);
  }
}

/**
 * Returns the first error a strict YAML parser reports for the frontmatter, or nothing when it
 * parses. Skills and agents are copied to tools unchanged, and the tools parse strict YAML.
 */
export function strictYamlError(text: string): string | undefined {
  return frontmatterError(text);
}

/** Returns heading lines outside fenced code blocks. */
function headings(text: string): string[] {
  let fenced = false;
  return text.split("\n").filter((line) => {
    if (line.startsWith("```")) fenced = !fenced;
    return !fenced && /^#{1,6} /.test(line);
  });
}

/** Returns words of a heading that break Title Case. */
function titleCaseErrors(heading: string): string[] {
  return heading
    .replace(/^#+ /, "")
    .replace(/`[^`]*`/g, "")
    .split(/\s+/)
    .flatMap((word, index) => word.split("-").map((part) => ({ part, first: index === 0 })))
    .filter(
      ({ part, first }) =>
        /^[a-z][A-Za-z]*$/.test(part) &&
        !LOWERCASE_NAMES.has(part) &&
        (first || !SMALL_WORDS.has(part)),
    )
    .map(({ part }) => part);
}

/**
 * Returns one line per problem in the selected packs, or every pack when none are selected.
 * `known` adds pack names that `requires`, `conflicts` and `with` may name before they exist.
 * `knownManifests` adds their manifests, so feeds can check official pack versions.
 */
export function validatePacks(
  packsDir = PACKS,
  only: string[] = [],
  known: string[] = [],
  prefix?: string,
  knownManifests: Map<string, Record<string, unknown>> = new Map(),
): string[] {
  const existing = existsSync(packsDir)
    ? readdirSync(packsDir).filter((name) => existsSync(join(packsDir, name, "pack.json")))
    : [];
  const all = [...new Set([...existing, ...known])];
  const selected = only.length ? only : existing;
  const problems: string[] = [];
  const report = (file: string, message: string) => problems.push(`${file}: ${message}`);
  const manifests = new Map<string, Record<string, unknown>>();
  for (const name of existing) {
    try {
      manifests.set(name, JSON.parse(readFileSync(join(packsDir, name, "pack.json"), "utf8")));
    } catch {
      // The pack loop reports invalid JSON for the selected pack.
    }
  }

  for (const pack of selected) {
    const dir = join(packsDir, pack);
    const manifestPath = join(dir, "pack.json");
    if (prefix && !pack.startsWith(`${prefix}-`)) {
      report(`${pack}/pack.json`, `every pack name starts with "${prefix}-"`);
    }
    if (!existsSync(manifestPath)) {
      report(pack, "missing pack.json");
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.name !== pack) report(`${pack}/pack.json`, `"name" must be "${pack}"`);
    if (typeof manifest.description !== "string" || manifest.description.length < 10) {
      report(`${pack}/pack.json`, "needs a description");
    }
    if (!isSemver(String(manifest.version))) {
      report(`${pack}/pack.json`, '"version" must be a semantic version such as "1.0.0"');
    }
    checkTags(manifest.tags, `${pack}/pack.json`, report);
    if (
      manifest.authors !== undefined &&
      (!Array.isArray(manifest.authors) ||
        !manifest.authors.every((e: unknown) => typeof e === "string"))
    ) {
      report(`${pack}/pack.json`, '"authors" must be a list of strings');
    }
    checkPackVersions(manifest, `${pack}/pack.json`, all, report);
    for (const note of manifest.notes ?? []) {
      if ((note.match(/`/g) ?? []).length % 2) {
        report(`${pack}/pack.json`, `note has an unclosed backtick: ${note}`);
      }
    }
    for (const key of ["requires", "conflicts"]) {
      for (const other of manifest[key] ?? []) {
        const ref = parseRef(other);
        if (!all.includes(ref.name))
          report(`${pack}/pack.json`, `${key} names unknown pack "${other}"`);
        if (ref.version !== undefined) {
          const valid = isPin(ref.version) || (key === "requires" && isRange(ref.version));
          if (!valid) report(`${pack}/pack.json`, `${key} pins "${other}" to an invalid version`);
        }
        if (key === "requires") {
          const dep = manifests.get(ref.name) ?? knownManifests.get(ref.name);
          if (dep) {
            const latest = typeof dep.latest === "string" ? dep.latest : undefined;
            if (latest === undefined && ref.version !== undefined) {
              report(`${pack}/pack.json`, `requires "${other}", but ${ref.name} ships no versions`);
            } else if (latest !== undefined && ref.version === undefined) {
              report(
                `${pack}/pack.json`,
                `requires "${other}", but ${ref.name} ships versions; name one, such as "${ref.name}@>=${latest}"`,
              );
            } else if (
              latest !== undefined &&
              isPin(latest) &&
              ref.version !== undefined &&
              isRange(ref.version) &&
              !satisfies(latest, ref.version)
            ) {
              report(
                `${pack}/pack.json`,
                `requires "${other}", but ${ref.name} latest is ${latest}`,
              );
            }
          }
        }
        if (key === "conflicts" && existing.includes(ref.name)) {
          const otherManifest = JSON.parse(
            readFileSync(join(packsDir, ref.name, "pack.json"), "utf8"),
          );
          const back = (otherManifest.conflicts ?? []).map((name: string) => parseRef(name).name);
          if (!back.includes(pack)) {
            report(
              `${pack}/pack.json`,
              `conflict with "${ref.name}" is not listed in its pack.json too`,
            );
          }
        }
      }
    }
    if (manifest.latest !== undefined && !isPin(String(manifest.latest))) {
      report(`${pack}/pack.json`, `"latest" must be a version such as "15" or "7.3"`);
    }

    for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
      const path = `${pack}/${file}`;
      const text = readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n");
      let parsed: ReturnType<typeof parse>;
      try {
        parsed = parse(text);
      } catch (error) {
        report(path, `frontmatter is not valid YAML: ${(error as Error).message}`);
        continue;
      }
      const { data, body } = parsed;
      const kind = file.split("/")[0];

      /** An exact item is named `<pack>-<version>`, with hyphens for dots. A range item is free. */
      const isItem = /^skills\/[^/]+\/SKILL\.md$|^(rules|agents)\/[^/]+\.md$/.test(file);
      if (isItem && data.version !== undefined) {
        const version = String(data.version);
        const name = file.endsWith("/SKILL.md") ? basename(dirname(file)) : basename(file, ".md");
        if (isPin(version)) {
          const expected = `${pack}-${version.replaceAll(".", "-")}`;
          if (name !== expected)
            report(path, `an item for version ${version} must be named "${expected}"`);
        } else if (!isRange(version)) {
          report(
            path,
            `version "${version}" must be a version such as "15" or a range such as ">=16 <20"`,
          );
        }
        if (manifest.latest === undefined)
          report(path, `pack.json needs "latest" for versioned items`);
      }

      if (text.includes("—")) report(path, "contains an em dash");
      for (const h of headings(text)) {
        const words = titleCaseErrors(h);
        if (words.length) report(path, `heading not in Title Case: "${h}" (${words.join(", ")})`);
      }
      for (const other of Array.isArray(data.with) ? data.with : []) {
        if (!all.includes(other)) report(path, `with names unknown pack "${other}"`);
      }

      if (kind === "rules") {
        if (typeof data.description !== "string") report(path, "rule needs a description");
        const globs = data.globs ?? [];
        if (!Array.isArray(globs)) report(path, "globs must be a list");
        else if (globs.some((g) => /[{}]/.test(g)))
          report(path, "use one glob per entry, no braces");
        if (text.split("\n").length > 62) report(path, "rule is longer than 60 lines");
        if (headings(body).filter((h) => h.startsWith("# ")).length !== 1) {
          report(path, "rule needs exactly one H1");
        }
      }
      if (file.endsWith("/SKILL.md")) {
        const name = basename(dirname(file));
        if (data.name !== name) report(path, `skill name must be "${name}"`);
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) report(path, "skill name must be kebab-case");
        if (typeof data.description !== "string" || data.description.length > 1024) {
          report(path, "skill description is missing or over 1024 characters");
        }
        if (text.split("\n").length > 200) report(path, "SKILL.md is longer than 200 lines");
        for (const [, link] of body.matchAll(/\]\(((?!https?:)[^)#]+)\)/g)) {
          if (!existsSync(join(dir, dirname(file), link as string)))
            report(path, `broken link ${link}`);
        }
      }
      if (kind === "agents") {
        if (data.name !== basename(file, ".md")) report(path, "agent name must match the file");
        if (typeof data.description !== "string") report(path, "agent needs a description");
        for (const tool of typeof data.tools === "string" ? data.tools.split(",") : []) {
          if (!AGENT_TOOLS.has(tool.trim())) report(path, `unsupported tool "${tool.trim()}"`);
          if (data.readonly === true && ["Edit", "Write"].includes(tool.trim())) {
            report(path, `a read-only agent cannot list "${tool.trim()}" in tools`);
          }
        }
      }
    }
  }

  const names = new Map<string, string>();
  for (const pack of existing) {
    for (const file of walk(join(packsDir, pack))) {
      const match =
        /^(rules|agents)\/([^/]+)\.md$/.exec(file) ?? /^(skills)\/([^/]+)\/SKILL\.md$/.exec(file);
      if (!match) continue;
      const key = `${match[1]}/${match[2]}`;
      const other = names.get(key);
      if (other && selected.some((p) => p === pack || p === other)) {
        report(pack, `${key} also exists in pack ${other}`);
      }
      names.set(key, pack);
    }
  }

  /** Packs a pack always comes with: itself and its `requires`, recursively. */
  const closure = (start: string[]): Set<string> => {
    const seen = new Set<string>();
    const visit = (name: string) => {
      if (seen.has(name) || !existing.includes(name)) return;
      seen.add(name);
      const manifest = JSON.parse(readFileSync(join(packsDir, name, "pack.json"), "utf8"));
      for (const dep of manifest.requires ?? []) visit(parseRef(dep).name);
    };
    for (const name of start) visit(name);
    return seen;
  };

  /** A name that starts with `<other>-` or ends with `-<other>` must come with that pack. */
  for (const pack of selected.filter((name) => existing.includes(name))) {
    const required = closure([pack]);
    for (const other of existing.filter((name) => name !== pack)) {
      const named = pack.startsWith(`${other}-`) || pack.endsWith(`-${other}`);
      if (named && !required.has(other)) {
        report(`${pack}/pack.json`, `the name contains "${other}", so it must require "${other}"`);
      }
    }
  }

  for (const pack of selected.filter((name) => existing.includes(name))) {
    for (const file of walk(join(packsDir, pack)).filter((f) => f.endsWith(".md"))) {
      const text = readFileSync(join(packsDir, pack, file), "utf8");
      const skill = /^skills\/[^/]+/.exec(file)?.[0];
      const skillFile = skill ? join(packsDir, pack, skill, "SKILL.md") : "";
      const withSource =
        skillFile && existsSync(skillFile) ? readFileSync(skillFile, "utf8") : text;
      let withList: unknown = [];
      try {
        withList = parse(withSource).data.with;
      } catch {
        withList = [];
      }
      const reachable = closure([pack, ...(Array.isArray(withList) ? withList : [])]);
      /** A vendor's own skill, installed separately, is marked "official" and not checked. */
      const references = text.matchAll(/(?<!official )`([a-z0-9][a-z0-9-]*)` (skill|agent)\b/g);
      for (const [, name, kind] of references) {
        const provider = names.get(`${kind}s/${name}`);
        if (!provider) report(`${pack}/${file}`, `names a ${kind} "${name}" that no pack provides`);
        else if (!reachable.has(provider)) {
          report(
            `${pack}/${file}`,
            `names the ${kind} "${name}" from pack ${provider}, which is neither required nor in "with"`,
          );
        }
      }
    }
  }

  const stacksDir = join(dirname(packsDir), "stacks");
  if (existsSync(stacksDir)) {
    for (const file of readdirSync(stacksDir).filter((entry) => entry.endsWith(".json"))) {
      const path = `stacks/${file}`;
      const name = file.slice(0, -".json".length);
      const stack = JSON.parse(readFileSync(join(stacksDir, file), "utf8"));
      if (stack.name !== name) report(path, `"name" must be "${name}"`);
      if (!isSemver(String(stack.version))) {
        report(path, '"version" must be a semantic version such as "1.0.0"');
      }
      if (prefix && !name.startsWith(`${prefix}-`)) {
        report(path, `every stack name starts with "${prefix}-"`);
      }
      for (const ref of stack.packs ?? []) {
        if (!all.includes(parseRef(ref).name)) report(path, `names unknown pack "${ref}"`);
      }
    }
  }

  return problems;
}

/** Checks `feed.json`: a name, a semantic version and a valid CLI range. */
export function validateFeedManifest(manifest: FeedManifest): string[] {
  const problems: string[] = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.name)) {
    problems.push(`feed.json: name "${manifest.name}" must be kebab-case`);
  }
  if (!isSemver(manifest.version)) {
    problems.push(`feed.json: "version" must be a semantic version such as "1.0.0"`);
  }
  if (!isRange(manifest.cli)) {
    problems.push(`feed.json: "cli" must be a range such as ">=0.8.0"`);
  }
  return problems;
}

/** Checks a whole feed: `feed.json`, the `<feed>-` prefix, every pack and every stack. */
export function validateFeed(
  root: string,
  options: { manifest: FeedManifest; officialPacks?: string[] },
): string[] {
  const { manifest } = options;
  const official = loadPacks();
  const officialPacks = options.officialPacks ?? [...official.keys()];
  const knownManifests = new Map<string, Record<string, unknown>>(
    [...official].map(([name, pack]) => [name, { latest: pack.latest }]),
  );
  return [
    ...validateFeedManifest(manifest),
    ...validatePacks(join(root, "packs"), [], officialPacks, manifest.name, knownManifests),
  ];
}

/** Checks the repository: the selected packs and, for a full run, the stacks. */
export function validateRepository(root: string, only: string[] = []): string[] {
  const packsDir = join(root, "packs");
  return validatePacks(packsDir, only);
}
