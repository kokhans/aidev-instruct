/**
 * Builds and packs the CLI the way npm publishes it, then runs the packed CLI against `sandbox`.
 * Usage: `bun run sandbox:package <command> [args]`, such as `bun run sandbox:package add nextjs`.
 */
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

const shell = process.platform === "win32";

/** Runs a command with inherited output and stops on failure. */
function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit", shell });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("bun", ["run", "build"]);

const pack = spawnSync("npm", ["pack", "--json"], { encoding: "utf8", shell });
if (pack.status !== 0) process.exit(pack.status ?? 1);
const [{ filename }] = JSON.parse(pack.stdout) as [{ filename: string }];
const tarball = join(process.cwd(), filename);

const result = spawnSync(
  "npx",
  ["--yes", `--package=${tarball}`, "aidev-instruct", ...process.argv.slice(2), "--dir", "sandbox"],
  {
    stdio: "inherit",
    shell,
  },
);

if (result.status === 0) {
  rmSync(tarball);
  process.exit(0);
}

console.error(`\nThe tarball is at ${tarball}.`);
process.exit(result.status ?? 1);
