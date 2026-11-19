import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readConfig } from "../src/config.ts";
import { parse } from "../src/frontmatter.ts";
import { listItems } from "../src/items.ts";
import { loadPacks, type PackRequest, parseRef, requestsFor, resolve } from "../src/packs.ts";
import { render } from "../src/render.ts";

let temp: string;
const write = (path: string, content: string) => {
  mkdirSync(dirname(join(temp, path)), { recursive: true });
  writeFileSync(join(temp, path), content);
};
const rule = (version?: string) =>
  `---\ndescription: Lang.\nglobs: ["**/*.cs"]\n${version ? `version: "${version}"\n` : ""}---\n\n# Lang\n`;

beforeAll(() => {
  temp = mkdtempSync(join(tmpdir(), "aidev-versions-"));
  write("packs/lang/pack.json", JSON.stringify({ name: "lang", latest: "2" }));
  write("packs/lang/rules/lang.md", rule());
  write("packs/lang/rules/lang-2.md", rule("2"));
  write("packs/lang/rules/lang-1-5.md", rule("1.5"));
  write(
    "packs/lang/skills/lang-2/SKILL.md",
    '---\nname: lang-2\ndescription: Lang 2.\nversion: "2"\n---\n\n# Lang 2\n',
  );
  write("packs/plugin/pack.json", JSON.stringify({ name: "plugin", requires: ["lang@1.5"] }));
  write("packs/api/pack.json", JSON.stringify({ name: "api", requires: ["lang"] }));
  write("packs/min2/pack.json", JSON.stringify({ name: "min2", requires: ["lang@>=2"] }));
  write("packs/min3/pack.json", JSON.stringify({ name: "min3", requires: ["lang@>=3"] }));
  write("packs/minplain/pack.json", JSON.stringify({ name: "minplain", requires: ["plain@>=1"] }));
  write("packs/plain/pack.json", JSON.stringify({ name: "plain" }));
  write("packs/bad/pack.json", JSON.stringify({ name: "bad" }));
  write("packs/bad/rules/bad.md", "---\ndescription: Bad.\nversion: true\n---\n# Bad\n");
});
afterAll(() => rmSync(temp, { recursive: true, force: true }));

const packs = () => loadPacks(join(temp, "packs"));
/** The Claude Code rule and skill files, with the globs of each rule. */
const installed = (requests: PackRequest[]) => {
  const { files } = render(resolve(requests, packs()), { targets: ["claude"], exclude: [] });
  return Object.fromEntries(
    [...files].map(([path, file]) => {
      const globs = parse(file.content).data.paths;
      return [path, Array.isArray(globs) ? globs : []];
    }),
  );
};

describe("parseRef", () => {
  it("splits a pin from the name", () => {
    expect(parseRef("csharp@7.3")).toEqual({ name: "csharp", version: "7.3" });
    expect(parseRef("react@>=18")).toEqual({ name: "react", version: ">=18" });
    expect(parseRef("csharp")).toEqual({ name: "csharp" });
  });
});

describe("versions", () => {
  it("installs the unversioned items and the latest version's items by default", () => {
    expect(resolve([{ name: "lang", scope: null }], packs())[0]?.versions).toEqual([
      { version: "2", scope: null },
    ]);
    expect(Object.keys(installed([{ name: "lang", scope: null }])).sort()).toEqual([
      ".claude/rules/lang-2.md",
      ".claude/rules/lang.md",
      ".claude/skills/lang-2/SKILL.md",
    ]);
  });

  it("follows a requires pin and strips version from written files", () => {
    expect(Object.keys(installed([{ name: "plugin", scope: null }])).sort()).toEqual([
      ".claude/rules/lang-1-5.md",
      ".claude/rules/lang.md",
    ]);
    const { files } = render(resolve([{ name: "lang", scope: null }], packs()), {
      targets: ["claude"],
      exclude: [],
    });
    expect(files.get(".claude/skills/lang-2/SKILL.md")?.content).not.toContain("version");
  });

  it("lets a config version win over a pin, and installs only unversioned items for a version without items", () => {
    expect(
      Object.keys(
        installed([
          { name: "plugin", scope: null },
          { name: "lang", scope: null, version: "2" },
        ]),
      ).sort(),
    ).toEqual([
      ".claude/rules/lang-2.md",
      ".claude/rules/lang.md",
      ".claude/skills/lang-2/SKILL.md",
    ]);
    expect(Object.keys(installed([{ name: "lang", scope: null, version: "3" }]))).toEqual([
      ".claude/rules/lang.md",
    ]);
  });

  it("accepts a requires minimum that the resolved version satisfies", () => {
    expect(Object.keys(installed([{ name: "min2", scope: null }])).sort()).toEqual([
      ".claude/rules/lang-2.md",
      ".claude/rules/lang.md",
      ".claude/skills/lang-2/SKILL.md",
    ]);
  });

  it("fails a requires minimum that a pin or a config version is below", () => {
    expect(() =>
      resolve(
        [
          { name: "plugin", scope: null },
          { name: "min2", scope: null },
        ],
        packs(),
      ),
    ).toThrow(
      "Pack min2 requires lang >=2 in the whole project, but lang is on version 1.5 there. Give each one its own folder with --path.",
    );
    expect(() =>
      resolve(
        [
          { name: "min2", scope: null },
          { name: "lang", scope: null, version: "1.5" },
        ],
        packs(),
      ),
    ).toThrow(/requires lang >=2 in the whole project/);
  });

  it("fails a requires minimum that the latest version is below", () => {
    expect(() => resolve([{ name: "min3", scope: null }], packs())).toThrow(
      "Pack min3 requires lang >=3 in the whole project, but lang is on version 2 there. Give each one its own folder with --path.",
    );
  });

  it("fails a requires minimum on a pack with no version", () => {
    expect(() => resolve([{ name: "minplain", scope: null }], packs())).toThrow(
      "Pack minplain requires plain >=1 in the whole project, but plain is on version (none) there. Give each one its own folder with --path.",
    );
  });

  it("checks a requires minimum in its own folders only", () => {
    expect(
      installed([
        { name: "plugin", scope: ["src/Plugins"] },
        { name: "min2", scope: ["src/Api"] },
      ]),
    ).toEqual({
      ".claude/rules/lang.md": ["src/Api/**/*.cs", "src/Plugins/**/*.cs"],
      ".claude/rules/lang-1-5.md": ["src/Plugins/**/*.cs"],
      ".claude/rules/lang-2.md": ["src/Api/**/*.cs"],
      ".claude/skills/lang-2/SKILL.md": [],
    });
  });

  it("gives each folder its own version", () => {
    expect(
      installed([
        { name: "plugin", scope: ["src/Plugins"] },
        { name: "api", scope: ["src/Api"] },
      ]),
    ).toEqual({
      ".claude/rules/lang.md": ["src/Api/**/*.cs", "src/Plugins/**/*.cs"],
      ".claude/rules/lang-1-5.md": ["src/Plugins/**/*.cs"],
      ".claude/rules/lang-2.md": ["src/Api/**/*.cs"],
      ".claude/skills/lang-2/SKILL.md": [],
    });
  });

  it("fails on two versions in overlapping folders", () => {
    expect(() =>
      resolve(
        [
          { name: "plugin", scope: ["src/Plugins"] },
          { name: "api", scope: null },
        ],
        packs(),
      ),
    ).toThrow(
      "Pack lang is on version 1.5 in src/Plugins and on 2 in the whole project. Give each version its own folder with --path.",
    );
    expect(() =>
      resolve(
        [
          { name: "lang", scope: null, version: "1" },
          { name: "plain", scope: null },
          { name: "lang", scope: ["a"], version: "2" },
        ],
        packs(),
      ),
    ).toThrow(/version 1 in the whole project and on 2 in a\./);
  });

  it("gives a pack without versions no version", () => {
    expect(() =>
      resolve(
        [
          { name: "plain", scope: null },
          { name: "plain", scope: ["a"], version: "1" },
        ],
        packs(),
      ),
    ).toThrow("Pack plain is on version (none) in the whole project and on 1 in a.");
    expect(resolve([{ name: "plain", scope: null }], packs())[0]?.versions).toEqual([
      { scope: null },
    ]);
    expect(() =>
      resolve(
        [
          { name: "plain", scope: null, version: "1" },
          { name: "plain", scope: null },
        ],
        packs(),
      ),
    ).not.toThrow();
  });

  it("reads versions from stacks and config entries", () => {
    const stacks = new Map([
      ["s", { name: "s", description: "", version: "1.0.0", packs: ["lang@1.5"] }],
    ]);
    expect(
      requestsFor([{ name: "s", path: ["a"] }], [{ name: "api", version: "2" }], stacks),
    ).toEqual([
      { name: "lang", scope: ["a"], version: "1.5", from: { stacks: ["s"] } },
      { name: "api", scope: null, version: "2", from: { config: true } },
    ]);
  });

  it("rejects a version that is not a string", () => {
    expect(() => listItems(join(temp, "packs/bad"), "bad")).toThrow(/"version" must be a string/);
  });
});

describe("config versions", () => {
  it("reads and writes a version on an entry", () => {
    const root = join(temp, "project");
    write(
      "project/.aidev-instruct.json",
      JSON.stringify({
        packs: [
          { name: "csharp", version: "7.3" },
          { name: "x", version: "" },
        ],
      }),
    );
    expect(readConfig(root)?.packs).toEqual([{ name: "csharp", version: "7.3" }, { name: "x" }]);
    write("project/.aidev-instruct.json", JSON.stringify({ packs: [{ name: "x", version: 7 }] }));
    expect(() => readConfig(root)).toThrow('"version" of x must be a string.');
  });
});
