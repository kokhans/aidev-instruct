/**
 * Builds the CLI into `dist/cli.js` and copies the templates next to it.
 * Usage: `bun run build`.
 */
import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
rmSync(join(root, "dist"), { recursive: true, force: true });

const build = spawnSync(
  "bun",
  ["build", "src/cli.ts", "--target", "node", "--outfile", "dist/cli.js"],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);
if (build.status !== 0) process.exit(build.status ?? 1);

cpSync(join(root, "src/templates"), join(root, "dist/templates"), { recursive: true });
