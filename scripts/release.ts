/**
 * `bun run release`: bumps the packs and stacks that changed since the last `v*` tag, writes
 * their changelogs, sets the CLI version, commits `Release <version>` and tags it.
 * Usage: `bun run release [--dry-run] [--bump <name>=<major|minor|patch>] [--cli <kind>]`.
 */

import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseBumps, release } from "../src/release.ts";
import type { Kind } from "../src/versions.ts";

const KINDS = ["major", "minor", "patch"];

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "dry-run": { type: "boolean", default: false },
    bump: { type: "string", multiple: true, default: [] },
    cli: { type: "string" },
  },
});

if (values.cli !== undefined && !KINDS.includes(values.cli)) {
  console.error(`Use --cli <${KINDS.join("|")}>: ${values.cli}`);
  process.exit(1);
}

const code = release(
  {
    dryRun: values["dry-run"],
    bumps: parseBumps(values.bump),
    cliBump: (values.cli ?? "none") as Kind,
  },
  { out: (line) => console.log(line), err: (line) => console.error(line) },
  { root: fileURLToPath(new URL("..", import.meta.url)) },
);
process.exit(code);
