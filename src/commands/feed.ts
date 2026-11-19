import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFeedManifest } from "../feeds.ts";
import type { IO } from "../output.ts";
import { fail } from "../output.ts";
import { loadPacks } from "../packs.ts";
import { applyFeedRelease, formatFeedPlan, parseBumps, planFeedRelease } from "../release.ts";
import type { Options } from "../session.ts";
import { renderTemplate } from "../templates.ts";
import { validateFeed } from "../validate.ts";

/** Handles `feed init`, `feed validate` and `feed release`. */
export function feed(io: IO, options: Options, [action, ...names]: string[], version: string) {
  if (action === "init") return initFeed(io, options, names, version);
  if (action === "validate") return validateFeedCommand(io, options, names);
  if (action === "release") return releaseFeed(io, options, names);
  return fail(io, 'Use "feed init <name>", "feed validate" or "feed release".');
}

/** Creates a feed layout in the current folder and never overwrites a file. */
function initFeed(io: IO, options: Options, [name]: string[], version: string): number {
  if (!name) return fail(io, 'Use "feed init <name>".');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    return fail(io, `Feed name "${name}" must be kebab-case.`);
  }
  if (name === "official") {
    return fail(io, '"official" is reserved for the packs inside the CLI.');
  }
  if (existsSync(join(options.root, "feed.json"))) {
    return fail(io, `feed.json already exists in ${options.root}.`);
  }
  const files = feedFiles(name, version);
  const existing = Object.keys(files).find((path) => existsSync(join(options.root, path)));
  if (existing) return fail(io, `${existing} already exists. Nothing is overwritten.`);
  for (const [path, content] of Object.entries(files)) {
    const file = join(options.root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  io.out(`Created feed "${name}" in ${options.root}.`);
  return 0;
}

/** Checks `feed.json`, the `<feed>-` prefix and every pack and stack. */
function validateFeedCommand(io: IO, options: Options, names: string[]): number {
  if (names.length) return fail(io, 'Use "feed validate".');
  const manifest = readFeedManifest(options.root);
  const problems = validateFeed(options.root, {
    manifest,
    officialPacks: [...loadPacks(options.packsDir).keys()],
  });
  for (const problem of problems) io.out(problem);
  io.out(problems.length ? `${problems.length} problem(s).` : "No problems.");
  return problems.length ? 1 : 0;
}

/** Bumps the changed packs and stacks, sets the feed version, commits and tags. */
function releaseFeed(io: IO, options: Options, names: string[]): number {
  if (names.length) return fail(io, 'Use "feed release".');
  const plan = planFeedRelease({ root: options.root, bumps: parseBumps(options.bump) });
  if (plan.tag !== undefined && !plan.changes.length) {
    io.err(`Nothing changed since ${plan.tag}.`);
    return 1;
  }
  for (const line of formatFeedPlan(plan)) io.out(line);
  if (options.dryRun) return 0;
  applyFeedRelease(plan, { root: options.root });
  io.out(`\nCommitted Release ${plan.feed.to} and tagged v${plan.feed.to}.`);
  return 0;
}

/** The files `feed init` writes. Workflows use action version tags and the exact CLI version. */
function feedFiles(name: string, version: string): Record<string, string> {
  const view = { name, version, token: `${name.toUpperCase().replaceAll("-", "_")}_FEED_TOKEN` };
  return {
    "feed.json": `${JSON.stringify({ name, version: "1.0.0", cli: `>=${version}` }, null, 2)}\n`,
    [`packs/${name}-example/pack.json`]: `${JSON.stringify(
      {
        name: `${name}-example`,
        description: `Guidance for ${name} projects.`,
        version: "1.0.0",
        tags: ["example"],
      },
      null,
      2,
    )}\n`,
    [`packs/${name}-example/rules/${name}-example.md`]: renderTemplate(
      "feed/rule.md.mustache",
      view,
    ),
    "stacks/.gitkeep": "",
    "AGENTS.md": renderTemplate("feed/AGENTS.md.mustache", view),
    "README.md": renderTemplate("feed/README.md.mustache", view),
    ".github/workflows/ci.yml": renderTemplate("feed/ci.yml.mustache", view),
    ".github/workflows/release.yml": renderTemplate("feed/release.yml.mustache", view),
  };
}
