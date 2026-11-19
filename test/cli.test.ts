import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

/** Runs the real bin entry with Node, without a terminal. */
const cli = (cwd: string, ...args: string[]) => {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
  return { code: result.status, out: result.stdout, err: result.stderr };
};

describe("bin entry", () => {
  it("prints, sets the exit code and uses default targets without -t", () => {
    const root = mkdtempSync(join(tmpdir(), "aidev-instruct-bin-"));
    try {
      expect(cli(root, "--version").out).toMatch(/^\d+\.\d+\.\d+/);
      expect(cli(root, "init", "-p", "code-reviewer").code).toBe(0);
      expect(cli(root, "targets").out).toContain("* claude");
      const failed = cli(root, "init");
      expect(failed.code).toBe(1);
      expect(failed.err).toContain("already exists");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
