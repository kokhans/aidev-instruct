import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { all, createProgram } from "../src/app.ts";
import {
  CLI_DOC,
  cliDoc,
  ENV_MARKERS,
  envTable,
  packsDoc,
  stacksDoc,
  TARGETS_MARKERS,
  targetsTable,
  writeDocs,
} from "../src/docs.ts";
import { ENV_VARS } from "../src/env.ts";
import { parse, stringify } from "../src/frontmatter.ts";
import { listItems } from "../src/items.ts";
import { loadPacks, loadStacks, requestsFor, resolve } from "../src/packs.ts";
import { registry, writeRegistry } from "../src/registry.ts";
import { render } from "../src/render.ts";
import { TARGETS } from "../src/targets.ts";
import { renderTemplate } from "../src/templates.ts";
import {
  strictYamlError,
  validateFeed,
  validatePacks,
  validateRepository,
} from "../src/validate.ts";

const packs = loadPacks();
const stacks = loadStacks();
const targets = TARGETS.map((t) => t.id);

/** The anchors a page offers, as GitHub makes them from its headings, outside code fences. */
function anchors(text: string): string[] {
  const prose = text.replace(/\r\n/g, "\n").replace(/^```[\s\S]*?^```/gm, "");
  return [...prose.matchAll(/^#{1,6} (.+)$/gm)].map(([, heading]) =>
    (heading as string)
      .toLowerCase()
      .replace(/[^\w\- ]/g, "")
      .trim()
      .replace(/ /g, "-"),
  );
}

describe("shipped packs", () => {
  it("follow the pack format and writing style", () => {
    expect(validatePacks()).toEqual([]);
  });

  it.each([...packs.keys()])("%s renders for every target", (name) => {
    const installed = resolve([{ name, scope: null }], packs);
    expect(installed.at(-1)?.name).toBe(name);
    expect(() => render(installed, { targets, exclude: [] })).not.toThrow();
  });

  it("render strict YAML frontmatter, except the unquoted globs Cursor reads", () => {
    /** As many packs as can be installed together, so most `with` items render too. */
    const chosen: string[] = [];
    for (const name of packs.keys()) {
      try {
        resolve(
          [...chosen, name].map((n) => ({ name: n, scope: null })),
          packs,
        );
        chosen.push(name);
      } catch {}
    }
    const all = resolve(
      chosen.map((name) => ({ name, scope: null })),
      packs,
    );
    const { files } = render(all, { targets, exclude: [] });
    const errors = [...files]
      .filter(([path]) => path.endsWith(".md") && !/^\.cursor\/rules\//.test(path))
      .map(([path, file]) => [path, strictYamlError(file.content)])
      .filter(([, error]) => error);
    expect(files.size).toBeGreaterThan(500);
    expect(errors).toEqual([]);
  });

  it("re-emit every item's frontmatter with the same fields", () => {
    for (const pack of packs.values()) {
      for (const item of listItems(pack.dir, pack.name)) {
        const file = item.kind === "skills" ? join(item.path, "SKILL.md") : item.path;
        const { data, body } = parse(readFileSync(file, "utf8"));
        expect(parse(stringify(data, body)).data, file).toEqual(data);
      }
    }
  });

  it("declare conflicts in both directions", () => {
    for (const pack of packs.values()) {
      for (const other of pack.conflicts) {
        expect(packs.get(other)?.conflicts, `${other} conflicts with ${pack.name}`).toContain(
          pack.name,
        );
      }
    }
  });

  it("make the routing frameworks conflict with each other", () => {
    const routers = ["react-router", "tanstack-router", "nextjs"];
    for (const name of routers) {
      const conflicts = packs.get(name)?.conflicts ?? [];
      expect(conflicts).toEqual(expect.arrayContaining(routers.filter((other) => other !== name)));
    }
  });
});

describe("metadata", () => {
  it("gives every pack a version and at least one lowercase tag", () => {
    for (const pack of packs.values()) {
      expect(pack.version, pack.name).toMatch(/^\d+\.\d+\.\d+$/);
      expect(pack.tags.length, pack.name).toBeGreaterThan(0);
      for (const tag of pack.tags) expect(tag, pack.name).toMatch(/^[a-z][a-z0-9-]*$/);
    }
    for (const stack of stacks.values()) {
      expect(stack.version, stack.name).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("gives a pack that covers several areas several tags", () => {
    expect(packs.get("react-email")?.tags).toEqual(["react", "email"]);
    expect(packs.get("nextjs-spa")?.tags).toEqual(["nextjs", "react", "spa"]);
  });

  it("writes the registry for every pack and stack", () => {
    const data = JSON.parse(registry()) as {
      packs: Record<string, unknown>[];
      stacks: Record<string, unknown>[];
    };
    expect(data.packs.map((pack) => pack.name)).toEqual([...packs.keys()]);
    expect(data.stacks.map((stack) => stack.name)).toEqual([...stacks.keys()]);
    expect(data.packs.find((pack) => pack.name === "react")).toMatchObject({
      version: "1.0.0",
      tags: ["react", "ui"],
      authors: [],
      latest: "19",
    });
    expect(data.packs.find((pack) => pack.name === "react")?.items).toEqual(
      expect.arrayContaining([
        { kind: "rules", name: "react", with: [] },
        { kind: "rules", name: "react-19", with: [], version: "19", versionKind: "exact" },
      ]),
    );
    expect(data.stacks.find((stack) => stack.name === "public-site")).toMatchObject({
      version: "1.0.0",
      packs: ["seo", "web-performance", "cookie-consent", "web-auditor"],
    });
    expect(data.stacks.find((stack) => stack.name === "public-site")).not.toHaveProperty(
      "category",
    );
    const dir = mkdtempSync(join(tmpdir(), "aidev-registry-"));
    try {
      mkdirSync(join(dir, "rules"), { recursive: true });
      writeFileSync(
        join(dir, "rules", "wide.md"),
        '---\ndescription: Wide.\nversion: ">=16 <20"\n---\n\n# Wide\n',
      );
      const ranged = {
        name: "ranged",
        description: "Ranged guidance.",
        version: "1.0.0",
        tags: ["ranged"],
        authors: [],
        requires: [],
        conflicts: [],
        packVersions: {},
        notes: [],
        latest: "19",
        dir,
      };
      const rangedData = JSON.parse(registry(new Map([["ranged", ranged]]), new Map())) as {
        packs: { items: Record<string, unknown>[] }[];
      };
      expect(rangedData.packs[0]?.items[0]).toMatchObject({
        version: ">=16 <20",
        versionKind: "range",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validator", () => {
  it("fails a pack named after another pack it does not require", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    const pack = (name: string, requires: string[] = []) => {
      mkdirSync(join(dir, name));
      writeFileSync(
        join(dir, name, "pack.json"),
        JSON.stringify({
          name,
          description: `${name} guidance.`,
          version: "1.0.0",
          tags: ["test"],
          requires,
        }),
      );
    };
    try {
      pack("go");
      pack("postgresql");
      pack("go-echo", ["go"]);
      pack("go-chi");
      pack("sqlc-postgresql", ["go"]);
      expect(validatePacks(dir)).toEqual([
        'go-chi/pack.json: the name contains "go", so it must require "go"',
        'sqlc-postgresql/pack.json: the name contains "postgresql", so it must require "postgresql"',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validator conflicts", () => {
  it("fails a version on a conflict but accepts a minimum in requires", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    const pack = (name: string, fields: Record<string, unknown>) => {
      mkdirSync(join(dir, name), { recursive: true });
      writeFileSync(
        join(dir, name, "pack.json"),
        JSON.stringify({
          name,
          description: `${name} guidance.`,
          version: "1.0.0",
          tags: ["test"],
          ...fields,
        }),
      );
    };
    try {
      pack("a", { requires: ["b"], conflicts: ["b@>=1"] });
      pack("b", { conflicts: ["a"] });
      expect(validatePacks(dir)).toEqual([
        'a/pack.json: conflicts pins "b@>=1" to an invalid version',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails a conflict that the other pack does not list", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    const pack = (name: string, conflicts: string[]) => {
      mkdirSync(join(dir, name));
      writeFileSync(
        join(dir, name, "pack.json"),
        JSON.stringify({
          name,
          description: `${name} guidance.`,
          version: "1.0.0",
          tags: ["test"],
          conflicts,
        }),
      );
    };
    try {
      pack("spa", ["ssr"]);
      pack("ssr", []);
      expect(validatePacks(dir)).toEqual([
        'spa/pack.json: conflict with "ssr" is not listed in its pack.json too',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validator stacks", () => {
  it("fails a stack without a semantic version", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      mkdirSync(join(dir, "packs", "a"), { recursive: true });
      mkdirSync(join(dir, "stacks"));
      writeFileSync(
        join(dir, "packs", "a", "pack.json"),
        JSON.stringify({ name: "a", description: "A guidance.", version: "1.0.0", tags: ["test"] }),
      );
      writeFileSync(
        join(dir, "stacks", "x.json"),
        JSON.stringify({ name: "x", description: "X.", packs: ["a"] }),
      );
      expect(validatePacks(join(dir, "packs"))).toEqual([
        'stacks/x.json: "version" must be a semantic version such as "1.0.0"',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validator notes", () => {
  it("fails a note with an unclosed backtick", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      mkdirSync(join(dir, "tool"));
      writeFileSync(
        join(dir, "tool", "pack.json"),
        JSON.stringify({
          name: "tool",
          description: "Tool guidance.",
          version: "1.0.0",
          tags: ["test"],
          notes: ["Run `tool init`.", "Run `tool init."],
        }),
      );
      expect(validatePacks(dir)).toEqual([
        "tool/pack.json: note has an unclosed backtick: Run `tool init.",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validator agents", () => {
  it("fails a read-only agent that can edit or write", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      mkdirSync(join(dir, "review", "agents"), { recursive: true });
      writeFileSync(
        join(dir, "review", "pack.json"),
        JSON.stringify({
          name: "review",
          description: "Review guidance.",
          version: "1.0.0",
          tags: ["test"],
        }),
      );
      writeFileSync(
        join(dir, "review", "agents", "reviewer.md"),
        "---\nname: reviewer\ndescription: Reviews.\ntools: Read, Edit, Write\nreadonly: true\n---\n\n# Reviewer\n",
      );
      expect(validatePacks(dir)).toEqual([
        'review/agents/reviewer.md: a read-only agent cannot list "Edit" in tools',
        'review/agents/reviewer.md: a read-only agent cannot list "Write" in tools',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("validator versions", () => {
  it("checks latest, pins and the names of versioned items", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    const file = (path: string, content: string) => {
      mkdirSync(join(dir, path, ".."), { recursive: true });
      writeFileSync(join(dir, path), content);
    };
    const item = (version: string) =>
      `---\ndescription: Lang.\nversion: "${version}"\n---\n\n# Lang\n`;
    try {
      file(
        "lang/pack.json",
        JSON.stringify({
          name: "lang",
          description: "Lang guidance.",
          version: "1.0.0",
          tags: ["test"],
          latest: "x",
        }),
      );
      file("lang/rules/lang-7-3.md", item("7.3"));
      file("lang/rules/lang-old.md", item("6"));
      file("lang/rules/lang-9.md", item("v9"));
      file(
        "app/pack.json",
        JSON.stringify({
          name: "app",
          description: "App guidance.",
          version: "1.0.0",
          tags: ["test"],
          requires: ["lang@7.3", "lang@>=7.3", "lang@new"],
        }),
      );
      file("app/rules/app-1.md", item("1"));
      expect(validatePacks(dir)).toEqual([
        'app/pack.json: requires pins "lang@new" to an invalid version',
        'app/rules/app-1.md: pack.json needs "latest" for versioned items',
        'lang/pack.json: "latest" must be a version such as "15" or "7.3"',
        'lang/rules/lang-9.md: version "v9" must be a version such as "15" or a range such as ">=16 <20"',
        'lang/rules/lang-old.md: an item for version 6 must be named "lang-6"',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("shipped stacks", () => {
  it.each([...stacks.keys()])("%s resolves and renders for every target", (name) => {
    const requests = requestsFor([{ name }], [], stacks);
    const installed = resolve(requests, packs);
    expect(installed.length).toBeGreaterThan(0);
    expect(() => render(installed, { targets, exclude: [] })).not.toThrow();
  });

  it("name only shipped packs and have a description", () => {
    for (const stack of stacks.values()) {
      expect(stack.description, stack.name).toMatch(/\S/);
      for (const pack of stack.packs) expect(packs.has(pack), `${stack.name}: ${pack}`).toBe(true);
    }
  });
});

describe("docs", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const read = (file: string) =>
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const pages = ["README.md", ...readdirSync(join(root, "docs")).map((file) => `docs/${file}`)];

  it("are generated from the current packs and stacks", () => {
    expect(read("docs/PACKS.md"), 'run "bun run docs"').toBe(packsDoc());
    expect(read("docs/STACKS.md"), 'run "bun run docs"').toBe(stacksDoc());
  });

  it("keep the generated sections of the CLI page in step with the code", () => {
    const cli = read(CLI_DOC);
    expect(cli, 'run "bun run docs"').toBe(cliDoc(cli));
    for (const variable of ENV_VARS) expect(cli, variable.name).toContain(variable.name);
  });

  it("fails with the page and the marker when a generated section is missing", () => {
    expect(() => cliDoc("# CLI Reference\n")).toThrow(
      `docs/CLI.md: missing ${TARGETS_MARKERS.start}`,
    );
    expect(() => cliDoc(`${TARGETS_MARKERS.start}\n`)).toThrow(
      `docs/CLI.md: missing ${TARGETS_MARKERS.end}`,
    );
    expect(() => cliDoc(`${TARGETS_MARKERS.start}\n${TARGETS_MARKERS.end}\n`)).toThrow(
      `docs/CLI.md: missing ${ENV_MARKERS.start}`,
    );
    expect(() => cliDoc(`${ENV_MARKERS.start}\n`)).toThrow(
      `docs/CLI.md: missing ${TARGETS_MARKERS.start}`,
    );
  });

  it("write every table the CLI page generates", () => {
    expect(targetsTable()).toContain("| `copilot` | `.github/instructions` |");
    expect(envTable()).toContain("| `NO_COLOR` | Every command |");
    expect(envTable().split("\n")).toHaveLength(ENV_VARS.length + 2);
  });

  it("are written to disk by the builders the scripts call", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-docs-"));
    try {
      mkdirSync(join(dir, "docs"));
      const cli = read(CLI_DOC);
      writeFileSync(join(dir, CLI_DOC), cli);
      writeDocs(dir);
      writeRegistry(dir);
      expect(readFileSync(join(dir, "docs/PACKS.md"), "utf8")).toBe(packsDoc());
      expect(readFileSync(join(dir, "docs/STACKS.md"), "utf8")).toBe(stacksDoc());
      expect(readFileSync(join(dir, CLI_DOC), "utf8")).toBe(cliDoc(cli));
      expect(readFileSync(join(dir, "registry.json"), "utf8")).toBe(registry());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keep every reference table on the page that owns it", () => {
    const owned = [
      ["| Target | Rules | Skills | Agents |", CLI_DOC],
      ["| Option | Does |", CLI_DOC],
      ["| Option | Takes | Default | Does |", CLI_DOC],
      ["| Variable | Read by | Does |", CLI_DOC],
    ];
    for (const [header, owner] of owned) {
      for (const page of pages.filter((file) => file !== owner)) {
        expect(read(page), `${page} duplicates ${owner}`).not.toContain(header as string);
      }
    }
  });

  it("name a version in every npx and bunx command", () => {
    const templates = readdirSync(join(root, "src/templates"), { recursive: true })
      .map((file) => `src/templates/${file}`)
      .filter((file) => file.endsWith(".mustache"));
    for (const page of [...pages, ...templates]) {
      expect(read(page), `${page}: name @latest or a version`).not.toMatch(
        /\b(?:npx|bunx) aidev-instruct(?!@)/,
      );
    }
  });

  it("link only to pages and headings that exist", () => {
    for (const page of pages) {
      const text = read(page).replace(/^```[\s\S]*?^```/gm, "");
      for (const [, link] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^[a-z][a-z0-9+.-]*:/i.test(link as string)) continue;
        const [path, heading] = (link as string).split("#");
        const file = path ? resolvePath(dirname(join(root, page)), path) : join(root, page);
        expect(existsSync(file), `${page}: ${link}`).toBe(true);
        if (heading)
          expect(anchors(readFileSync(file, "utf8")), `${page}: ${link}`).toContain(heading);
      }
    }
  });

  it("lists the packs in one table by name and keeps category out of the registry", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-docs-"));
    const pack = (name: string) => ({
      name,
      description: "Pipes | bars.",
      version: "1.0.0",
      tags: ["web"],
      authors: [],
      requires: [],
      conflicts: [],
      packVersions: {},
      notes: [],
      dir: join(dir, name),
    });
    try {
      const docs = packsDoc(
        new Map([
          ["beta", pack("beta")],
          ["alpha", pack("alpha")],
        ]),
      );
      expect(docs).toContain("| Pack | Covers | Requires | Contents |");
      expect(docs).not.toContain("## ");
      expect(docs.indexOf("`alpha`")).toBeLessThan(docs.indexOf("`beta`"));
      expect(docs).toContain("| `alpha` | Pipes \\| bars. |  |  |");
      expect(
        registry(
          new Map([["alpha", pack("alpha")]]),
          new Map([["bare", { name: "bare", description: "", version: "1.0.0", packs: [] }]]),
        ),
      ).not.toContain("category");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("describe a pack with no items as an empty cell, and a stack list without rows", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-docs-"));
    const empty = {
      name: "empty",
      description: "Empty.",
      version: "1.0.0",
      tags: ["other"],
      authors: [],
      requires: [],
      conflicts: [],
      packVersions: {},
      notes: [],
      dir,
    };
    try {
      expect(packsDoc(new Map([["empty", empty]]))).toContain("| `empty` | Empty. |  |  |");
      expect(stacksDoc(new Map(), new Map())).toMatch(/\| --- \| --- \| --- \| --- \|\n$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("templates", () => {
  it("fails with the path of a template that is missing", () => {
    expect(() => renderTemplate("feed/missing.mustache", {})).toThrow(
      /templates[\\/]feed[\\/]missing\.mustache is missing/,
    );
  });

  it("keeps GitHub Actions expressions and never HTML-escapes", () => {
    const release = renderTemplate("feed/release.yml.mustache", {
      name: "acme",
      version: "1.0.0",
      token: "ACME_FEED_TOKEN",
    });
    expect(release).toMatch(/GH_TOKEN: \$\{\{ github\.token \}\}/);
    expect(release).toContain("npx aidev-instruct@1.0.0 feed release");
    expect(
      renderTemplate("feed/README.md.mustache", { name: "a&b", version: "1", token: "T" }),
    ).toContain("a&b");
  });
});

describe("repository validation", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));

  it("checks the shipped packs and stacks", () => {
    expect(validateRepository(root)).toEqual([]);
  });

  it("checks only the selected packs when names are given", () => {
    expect(validateRepository(root, ["react"])).toEqual([]);
    expect(validateRepository(root, ["ghost"])).toEqual(["ghost: missing pack.json"]);
  });
});

describe("validator field and style checks", () => {
  const file = (root: string, path: string, content: string) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const rule = (extra = "") =>
    `---\ndescription: A rule.\nglobs: ["**/*.ts"]\n${extra}---\n\n# Rule\n\n- Do it.\n`;

  it("fails manifest fields, unknown references and a one-sided conflict", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      file(
        dir,
        "packs/bad/pack.json",
        JSON.stringify({
          name: "other",
          description: "short",
          version: "1",
          tags: ["react", "react", "1pass", 7],
          authors: "x",
          notes: ["Plain.", "Run `x."],
          requires: ["ghost"],
          conflicts: ["spa"],
          packVersions: { ghost: ">=1", spa: "nope" },
        }),
      );
      file(
        dir,
        "packs/spa/pack.json",
        JSON.stringify({
          name: "spa",
          description: "Spa guidance.",
          version: "1.0.0",
          authors: [1],
          packVersions: [],
        }),
      );
      const problems = validatePacks(join(dir, "packs"));
      expect(problems).toEqual(
        expect.arrayContaining([
          'bad/pack.json: "name" must be "bad"',
          "bad/pack.json: needs a description",
          'bad/pack.json: "version" must be a semantic version such as "1.0.0"',
          'bad/pack.json: tag "react" is listed twice',
          'bad/pack.json: tag "1pass" must start with a letter and use lowercase letters, digits and dashes',
          "bad/pack.json: tag 7 must be a string",
          'spa/pack.json: "tags" must be a list with at least one tag',
          'spa/pack.json: "authors" must be a list of strings',
          'spa/pack.json: "packVersions" must be an object of semver ranges',
          'bad/pack.json: "authors" must be a list of strings',
          'bad/pack.json: packVersions names unknown pack "ghost"',
          'bad/pack.json: packVersions names "spa", which "requires" does not list',
          'bad/pack.json: packVersions "spa" must be a semver range',
          'bad/pack.json: requires names unknown pack "ghost"',
          'bad/pack.json: conflict with "spa" is not listed in its pack.json too',
          "bad/pack.json: note has an unclosed backtick: Run `x.",
        ]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails a pack whose tags are an empty list", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      file(
        dir,
        "packs/empty/pack.json",
        JSON.stringify({ name: "empty", description: "Empty tags.", version: "1.0.0", tags: [] }),
      );
      file(
        dir,
        "packs/null/pack.json",
        JSON.stringify({
          name: "null",
          description: "Null ranges.",
          version: "1.0.0",
          tags: ["null"],
          packVersions: null,
        }),
      );
      file(
        dir,
        "packs/text/pack.json",
        JSON.stringify({
          name: "text",
          description: "Text ranges.",
          version: "1.0.0",
          tags: ["text"],
          packVersions: ">=1.0.0",
        }),
      );
      file(
        dir,
        "packs/nor/pack.json",
        JSON.stringify({
          name: "nor",
          description: "No requires.",
          version: "1.0.0",
          tags: ["nor"],
          packVersions: { react: ">=1.0.0" },
        }),
      );
      const problems = validatePacks(join(dir, "packs"));
      expect(problems).toContain('empty/pack.json: "tags" must be a list with at least one tag');
      expect(problems).toContain('nor/pack.json: packVersions names unknown pack "react"');
      expect(problems).toContain(
        'null/pack.json: "packVersions" must be an object of semver ranges',
      );
      expect(problems).toContain(
        'text/pack.json: "packVersions" must be an object of semver ranges',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("requires a version for a versioned pack and accepts pins and ranges", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      const manifest = (name: string, extra: Record<string, unknown> = {}) =>
        file(
          dir,
          `packs/${name}/pack.json`,
          JSON.stringify({
            name,
            description: `${name} guidance.`,
            version: "1.0.0",
            tags: [name],
            ...extra,
          }),
        );
      manifest("lib", { latest: "19" });
      file(
        dir,
        "packs/lib/rules/lib-wide.md",
        '---\ndescription: Wide.\nversion: ">=16 <20"\n---\n\n# Wide\n',
      );
      manifest("plain");
      manifest("bare", { requires: ["lib"] });
      manifest("range", { requires: ["lib@>=20"] });
      manifest("pin", { requires: ["lib@16"] });
      manifest("over", { requires: ["plain@1"] });
      manifest("okplain", { requires: ["plain"] });
      const problems = validatePacks(join(dir, "packs"));
      expect(problems).toEqual(
        expect.arrayContaining([
          'bare/pack.json: requires "lib", but lib ships versions; name one, such as "lib@>=19"',
          'range/pack.json: requires "lib@>=20", but lib latest is 19',
          'over/pack.json: requires "plain@1", but plain ships no versions',
        ]),
      );
      expect(
        problems.filter(
          (problem) =>
            problem.includes("pin/") ||
            problem.includes("okplain/") ||
            problem.includes("lib-wide"),
        ),
      ).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails a missing pack.json and a pack outside the feed prefix", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      file(
        dir,
        "packs/bad/pack.json",
        JSON.stringify({
          name: "bad",
          description: "Bad guidance.",
          version: "1.0.0",
          tags: ["test"],
        }),
      );
      expect(validatePacks(join(dir, "packs"), ["ghost"])).toEqual(["ghost: missing pack.json"]);
      expect(validatePacks(join(dir, "packs"), [], [], "acme")).toEqual([
        'bad/pack.json: every pack name starts with "acme-"',
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails rule, skill and agent style problems", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      file(
        dir,
        "packs/style/pack.json",
        JSON.stringify({
          name: "style",
          description: "Style guidance.",
          version: "1.0.0",
          tags: ["test"],
        }),
      );
      file(dir, "packs/style/rules/bad.md", '---\nglobs: "x"\n---\n\nNo heading — here.\n');
      file(dir, "packs/style/rules/yaml.md", "---\ndescription: [unclosed\n---\n\n# Fine\n");
      file(
        dir,
        "packs/style/rules/braces.md",
        '---\ndescription: Rule.\nglobs: ["src/{a,b}/*.ts"]\n---\n\n# Fine\n',
      );
      file(
        dir,
        "packs/style/rules/long.md",
        `---\ndescription: Rule.\n---\n\n# Fine\n\n${Array.from({ length: 70 }, () => "- Line.").join("\n")}\n`,
      );
      file(dir, "packs/style/rules/titles.md", "---\ndescription: Rule.\n---\n\n# bad heading\n");
      file(
        dir,
        "packs/style/rules/duplicate.md",
        "---\ndescription: One.\ndescription: Two.\n---\n\n# Fine\n",
      );
      file(
        dir,
        "packs/style/rules/with.md",
        `---\ndescription: Rule.\nwith: ["ghost"]\n---\n\n# Fine\n`,
      );
      file(
        dir,
        "packs/style/skills/Bad_Name/SKILL.md",
        "---\nname: other\n---\n\n# Fine\n\n[Broken](references/none.md)\n",
      );
      file(
        dir,
        "packs/style/skills/long/SKILL.md",
        `---\nname: long\ndescription: Long.\n---\n\n# Long\n\n${Array.from({ length: 200 }, () => "- Line.").join("\n")}\n`,
      );
      file(
        dir,
        "packs/style/agents/agent.md",
        "---\nname: other\ntools: Read, Nope\n---\n\n# Agent\n",
      );
      file(
        dir,
        "packs/style/agents/list.md",
        "---\nname: list\ndescription: List.\ntools:\n  - Read\n---\n\n# List\n",
      );
      const problems = validatePacks(join(dir, "packs"));
      const has = (text: string) => problems.some((problem) => problem.includes(text));
      for (const text of [
        "rule needs a description",
        "contains an em dash",
        "frontmatter is not valid YAML",
        "use one glob per entry, no braces",
        "rule is longer than 60 lines",
        "rule needs exactly one H1",
        "heading not in Title Case",
        'with names unknown pack "ghost"',
        'skill name must be "Bad_Name"',
        "skill name must be kebab-case",
        "skill description is missing or over 1024 characters",
        "broken link references/none.md",
        "agent name must match the file",
        "agent needs a description",
        'unsupported tool "Nope"',
      ]) {
        expect(has(text), text).toBe(true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails duplicate items and references to another pack's skill", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      file(
        dir,
        "packs/first/pack.json",
        JSON.stringify({
          name: "first",
          description: "First guidance.",
          version: "1.0.0",
          tags: ["test"],
        }),
      );
      file(dir, "packs/first/rules/shared.md", rule());
      file(
        dir,
        "packs/second/pack.json",
        JSON.stringify({
          name: "second",
          description: "Second guidance.",
          version: "1.0.0",
          tags: ["test"],
        }),
      );
      file(dir, "packs/second/rules/shared.md", rule());
      file(
        dir,
        "packs/second/rules/refs.md",
        "---\ndescription: Rule.\n---\n\n# Refs\n\n- Run the `ghost` skill.\n- Run the `helper` skill.\n",
      );
      file(
        dir,
        "packs/third/pack.json",
        JSON.stringify({
          name: "third",
          description: "Third guidance.",
          version: "1.0.0",
          tags: ["test"],
        }),
      );
      file(
        dir,
        "packs/third/skills/helper/SKILL.md",
        "---\nname: helper\ndescription: Helper.\n---\n\n# Helper\n",
      );
      const problems = validatePacks(join(dir, "packs"));
      expect(problems).toEqual(
        expect.arrayContaining([
          "second: rules/shared also exists in pack first",
          'second/rules/refs.md: names a skill "ghost" that no pack provides',
          'second/rules/refs.md: names the skill "helper" from pack third, which is neither required nor in "with"',
        ]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails stack fields, unknown packs and a stack outside the feed prefix", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      file(
        dir,
        "packs/a/pack.json",
        JSON.stringify({ name: "a", description: "A guidance.", version: "1.0.0", tags: ["test"] }),
      );
      file(
        dir,
        "stacks/wrong.json",
        JSON.stringify({ name: "other", version: "1", packs: ["ghost"] }),
      );
      file(dir, "stacks/empty.json", JSON.stringify({ name: "empty", version: "1.0.0" }));
      const problems = validatePacks(join(dir, "packs"), [], [], "acme");
      expect(problems).toEqual(
        expect.arrayContaining([
          'stacks/wrong.json: "name" must be "wrong"',
          'stacks/wrong.json: "version" must be a semantic version such as "1.0.0"',
          'stacks/wrong.json: every stack name starts with "acme-"',
          'stacks/wrong.json: names unknown pack "ghost"',
        ]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("validates a whole feed, including a feed without packs", () => {
    const dir = mkdtempSync(join(tmpdir(), "aidev-validate-"));
    try {
      writeFileSync(
        join(dir, "feed.json"),
        JSON.stringify({ name: "acme", version: "1.0.0", cli: ">=0.1.0" }),
      );
      expect(
        validateFeed(dir, { manifest: { name: "acme", version: "1.0.0", cli: ">=0.1.0" } }),
      ).toEqual([]);
      file(
        dir,
        "packs/acme-api/pack.json",
        JSON.stringify({
          name: "acme-api",
          description: "API guidance.",
          version: "1.0.0",
          tags: ["api"],
          requires: ["react@>=19"],
          packVersions: { react: ">=1.4.2" },
        }),
      );
      expect(
        validateFeed(dir, {
          manifest: { name: "acme", version: "1.0.0", cli: ">=0.1.0" },
          officialPacks: ["react"],
        }),
      ).toEqual([]);
      file(
        dir,
        "packs/acme-ui/pack.json",
        JSON.stringify({
          name: "acme-ui",
          description: "UI guidance.",
          version: "1.0.0",
          tags: ["ui"],
          requires: ["react"],
        }),
      );
      expect(
        validateFeed(dir, {
          manifest: { name: "acme", version: "1.0.0", cli: ">=0.1.0" },
          officialPacks: ["react"],
        }),
      ).toContain(
        'acme-ui/pack.json: requires "react", but react ships versions; name one, such as "react@>=19"',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("CLI reference", () => {
  const doc = readFileSync(new URL("../docs/CLI.md", import.meta.url), "utf8");
  const program = createProgram({ out: () => undefined, err: () => undefined });
  const commands = all(program).filter((command) => command !== program);
  const path = (command: (typeof commands)[number]) =>
    command.parent === program ? command.name() : `${command.parent?.name()} ${command.name()}`;

  it("documents every command", () => {
    expect(commands.length).toBeGreaterThan(10);
    for (const command of commands) expect(doc, path(command)).toContain(path(command));
  });

  it("documents every option", () => {
    const names = new Set(
      all(program)
        .flatMap((command) => command.options.flatMap((option) => [option.short, option.long]))
        .filter((name): name is string => name !== undefined),
    );
    expect(names.size).toBeGreaterThan(5);
    for (const name of names) expect(doc, name).toContain(name);
  });
});
