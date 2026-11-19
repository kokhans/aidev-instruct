import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** A temporary folder with fixture packs, stacks and an empty project. */
export interface Fixture {
  temp: string;
  packsDir: string;
  stacksDir: string;
  root: string;
  /** Writes a file under the temporary folder. */
  write: (path: string, content: string) => void;
  /** Reads a project file. */
  read: (path: string) => string;
  /** True when a project file exists. */
  exists: (path: string) => boolean;
  cleanup: () => void;
}

const pack = (name: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    name,
    description: `${name} pack.`,
    version: "1.0.0",
    tags: ["test"],
    ...extra,
  });

/**
 * Creates the fixture:
 * - `base`: an agent `reviewer` and a note.
 * - `web`: requires `base`; rules `react` (globs) and `always` (no globs); skill `web-spec`.
 * - `db`: rule `db`.
 * - `auth`: rule `auth`, and `auth-db` rule, `auth-db-guide` skill and `auth-auditor` agent
 *   that apply only with `db`.
 * - `spa` and `ssr`: both require `web`, and conflict with each other.
 * - stack `site`: `web`.
 */
export function createFixture(): Fixture {
  const temp = mkdtempSync(join(tmpdir(), "aidev-instruct-"));
  const packsDir = join(temp, "packs");
  const stacksDir = join(temp, "stacks");
  const root = join(temp, "project");
  mkdirSync(root);

  const write = (path: string, content: string) => {
    const full = join(temp, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  };

  write("packs/base/pack.json", pack("base", { notes: ["Run `setup --now` first."] }));
  write(
    "packs/base/agents/reviewer.md",
    "---\nname: reviewer\ndescription: Reviews.\ntools: Read, Grep\nreadonly: true\n---\n\n# Reviewer\n",
  );
  write("packs/web/pack.json", pack("web", { requires: ["base"] }));
  write(
    "packs/web/rules/react.md",
    '---\ndescription: React rules.\nglobs: ["**/*.tsx", "**/*.jsx"]\n---\n\n# React\n\n- Pure components.\n',
  );
  write(
    "packs/web/rules/always.md",
    "---\ndescription: Always on.\n---\n\n# Always\n\n- Everywhere.\n",
  );
  write(
    "packs/web/skills/web-spec/SKILL.md",
    "---\nname: web-spec\ndescription: Spec.\n---\n\n# Spec\n\n[SEO](references/seo.md)\n",
  );
  write("packs/web/skills/web-spec/references/seo.md", "# SEO\n");
  write("packs/db/pack.json", pack("db"));
  write("packs/db/rules/db.md", '---\ndescription: SQL rules.\nglobs: ["**/*.sql"]\n---\n\n# DB\n');
  write("packs/auth/pack.json", pack("auth"));
  write("packs/auth/rules/auth.md", "---\ndescription: Auth rules.\n---\n\n# Auth\n");
  write(
    "packs/auth/rules/auth-db.md",
    '---\ndescription: Auth with DB.\nglobs: ["**/*.ts"]\nwith: ["db"]\n---\n\n# Auth DB\n',
  );
  write(
    "packs/auth/skills/auth-db-guide/SKILL.md",
    '---\nname: auth-db-guide\ndescription: Guide.\nwith: ["db"]\n---\n\n# Guide\n',
  );
  write(
    "packs/auth/agents/auth-auditor.md",
    "---\nname: auth-auditor\ndescription: Audits auth.\ntools: Read\nwith:\n  - db\n---\n\n# Auditor\n",
  );
  write("packs/spa/pack.json", pack("spa", { requires: ["web"], conflicts: ["ssr"] }));
  write("packs/ssr/pack.json", pack("ssr", { requires: ["web"] }));
  write(
    "stacks/site.json",
    JSON.stringify({ name: "site", description: "Site.", version: "1.0.0", packs: ["web"] }),
  );

  return {
    temp,
    packsDir,
    stacksDir,
    root,
    write,
    read: (path) => readFileSync(join(root, path), "utf8"),
    exists: (path) => existsSync(join(root, path)),
    cleanup: () => rmSync(temp, { recursive: true, force: true }),
  };
}
