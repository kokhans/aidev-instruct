import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addEntries,
  CONFIG_FILE,
  defaultConfig,
  LOCK_FILE,
  type Lock,
  readConfig,
  readLock,
  writeConfig,
  writeLock,
} from "../src/config.ts";
import { unique } from "../src/util.ts";
import { createFixture, type Fixture } from "./fixtures.ts";

let fx: Fixture;
beforeEach(() => {
  fx = createFixture();
});
afterEach(() => fx.cleanup());

const writeJson = (value: unknown) => fx.write(`project/${CONFIG_FILE}`, JSON.stringify(value));
const configText = () => readFileSync(join(fx.root, CONFIG_FILE), "utf8");

describe("readConfig", () => {
  it("returns undefined without a config", () => {
    expect(readConfig(fx.root)).toBeUndefined();
  });

  it("fills defaults for missing keys", () => {
    writeJson({});
    expect(readConfig(fx.root)).toEqual(defaultConfig());
  });

  it("uses the default targets for an empty list", () => {
    writeJson({ targets: [], packs: [] });
    expect(readConfig(fx.root)?.targets).toEqual(["copilot", "claude", "cursor"]);
  });

  it("reads plain and folder entries and cleans folders", () => {
    writeJson({
      targets: ["Claude"],
      stacks: [{ name: "site", path: "./apps/web/" }],
      packs: ["db", { name: "auth" }, { name: "db", path: "api" }, { name: "x", path: "./" }],
      exclude: ["a", "a"],
      modified: "orig",
    });
    expect(readConfig(fx.root)).toEqual({
      targets: ["claude"],
      feeds: [],
      stacks: [{ name: "site", path: ["apps/web"] }],
      packs: [{ name: "db" }, { name: "auth" }, { name: "x" }],
      exclude: ["a"],
      modified: "orig",
    });
  });

  it("reads a list of folders and keeps two versions as separate entries", () => {
    writeJson({
      packs: [
        { name: "react", path: ["./apps/web/", "apps/admin", "apps/web"] },
        { name: "csharp", version: "14", path: "legacy" },
        { name: "csharp", version: "15", path: "apps" },
      ],
    });
    expect(readConfig(fx.root)?.packs).toEqual([
      { name: "react", path: ["apps/web", "apps/admin"] },
      { name: "csharp", version: "14", path: ["legacy"] },
      { name: "csharp", version: "15", path: ["apps"] },
    ]);
  });

  it("merges two entries with the same name and version", () => {
    writeJson({
      packs: [
        { name: "react", path: "apps/web" },
        { name: "react", path: ["apps/admin"] },
        { name: "db", feed: "acme" },
        { name: "db", path: "api", feed: "acme" },
        { name: "csharp", version: "14", path: "legacy" },
        { name: "csharp", version: "14", path: "tools" },
      ],
    });
    expect(readConfig(fx.root)?.packs).toEqual([
      { name: "react", path: ["apps/web", "apps/admin"] },
      { name: "db", feed: "acme" },
      { name: "csharp", version: "14", path: ["legacy", "tools"] },
    ]);
  });

  it("rejects two feeds for one entry", () => {
    writeJson({
      packs: [
        { name: "db", feed: "acme" },
        { name: "db", feed: "other" },
      ],
    });
    expect(() => readConfig(fx.root)).toThrow(/"db" comes from feed "acme" and feed "other"/);
  });

  it("keeps the feed a merged entry gains and drops folders when one entry has none", () => {
    writeJson({
      packs: [
        { name: "api", path: ["apps/api"] },
        { name: "api" },
        { name: "db" },
        { name: "db", path: ["data"], feed: "acme" },
      ],
    });
    expect(readConfig(fx.root)?.packs).toEqual([{ name: "api" }, { name: "db", feed: "acme" }]);
  });

  it("rejects invalid values", () => {
    const cases: [unknown, RegExp][] = [
      [{ targets: "claude" }, /"targets" and "exclude" must be lists/],
      [{ exclude: [1] }, /"targets" and "exclude" must be lists/],
      [{ modified: "merge" }, /"modified" must be one of keep, orig/],
      [{ packs: "web" }, /"packs" must be a list/],
      [{ stacks: [3] }, /every "stacks" entry needs a name/],
      [{ packs: [null] }, /every "packs" entry needs a name/],
      [{ packs: [{ path: "x" }] }, /every "packs" entry needs a name/],
      [{ packs: [{ name: "web", path: 1 }] }, /"path" of web must be a string or a list/],
      [{ packs: [{ name: "web", path: ["a", 1] }] }, /"path" of web must be a string/],
      [{ packs: [{ name: "web", path: "../x" }] }, /inside the project/],
      [{ packs: [{ name: "web", path: "/x" }] }, /inside the project/],
      [{ packs: [{ name: "web", feed: 1 }] }, /"feed" of web must be a string/],
      [{ feeds: "acme" }, /"feeds" must be a list/],
      [{ feeds: [null] }, /every "feeds" entry needs a name and a source/],
      [{ feeds: [{ name: "acme" }] }, /needs a name and a source/],
      [{ feeds: [{ name: "Acme", source: "x" }] }, /must be kebab-case/],
      [{ feeds: [{ name: "official", source: "x" }] }, /"official" is reserved/],
      [{ feeds: [{ name: "acme", source: "x", tokenEnv: "acme" }] }, /must be a variable name/],
      [
        {
          feeds: [
            { name: "acme", source: "x" },
            { name: "acme", source: "y" },
          ],
        },
        /feed "acme" is listed twice/,
      ],
      [{ targets: ["nope"] }, /Unknown target/],
      [
        { exclude: ["packs/react"] },
        /Unknown exclude kind "packs"\. Use rules\/, skills\/ or agents\./,
      ],
      [{ exclude: ["rules/skills/x"] }, /Unknown exclude kind "rules\/skills"/],
      [{ exclude: ["Rules/react"] }, /Unknown exclude kind "Rules"/],
    ];
    for (const [value, error] of cases) {
      writeJson(value);
      expect(() => readConfig(fx.root), JSON.stringify(value)).toThrow(error);
    }
  });

  it("accepts a name, a kind/name entry and a pattern for either", () => {
    writeJson({ exclude: ["react", "rules/tanstack-*", "tanstack-*", "*", "skills/react"] });
    expect(readConfig(fx.root)?.exclude).toEqual([
      "react",
      "rules/tanstack-*",
      "tanstack-*",
      "*",
      "skills/react",
    ]);
  });

  it("names the file when JSON is invalid", () => {
    fx.write(`project/${CONFIG_FILE}`, "{ nope");
    expect(() => readConfig(fx.root)).toThrow(/\.aidev-instruct\.json is not valid JSON/);
  });
});

describe("writeConfig", () => {
  it("leaves out empty stacks and exclude and the default modified", () => {
    writeConfig(fx.root, { ...defaultConfig(["claude"]), packs: [{ name: "web" }] });
    expect(JSON.parse(configText())).toEqual({ targets: ["claude"], packs: ["web"] });
  });

  it("writes feeds and a feed assertion", () => {
    writeConfig(fx.root, {
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct", tokenEnv: "ACME_FEED_TOKEN" }],
      stacks: [],
      packs: [{ name: "acme-api", feed: "acme" }],
      exclude: [],
      modified: "keep",
    });
    expect(JSON.parse(configText())).toEqual({
      targets: ["claude"],
      feeds: [{ name: "acme", source: "github:acme/aidev-instruct", tokenEnv: "ACME_FEED_TOKEN" }],
      packs: [{ name: "acme-api", feed: "acme" }],
    });
    expect(readConfig(fx.root)?.packs).toEqual([{ name: "acme-api", feed: "acme" }]);
  });

  it("writes folders as objects and every set option", () => {
    writeConfig(fx.root, {
      targets: ["claude"],
      feeds: [],
      stacks: [{ name: "site", path: ["apps/web"] }],
      packs: [{ name: "db" }],
      exclude: ["react"],
      modified: "orig",
    });
    expect(JSON.parse(configText())).toEqual({
      targets: ["claude"],
      stacks: [{ name: "site", path: "apps/web" }],
      packs: ["db"],
      exclude: ["react"],
      modified: "orig",
    });
    expect(readConfig(fx.root)?.stacks).toEqual([{ name: "site", path: ["apps/web"] }]);
  });

  it("writes several folders as a list and one folder as a string", () => {
    writeConfig(fx.root, {
      ...defaultConfig(["claude"]),
      packs: [
        { name: "react", path: ["apps/web", "apps/admin"] },
        { name: "csharp", version: "14", path: ["legacy"] },
      ],
    });
    expect(JSON.parse(configText()).packs).toEqual([
      { name: "react", path: ["apps/web", "apps/admin"] },
      { name: "csharp", version: "14", path: "legacy" },
    ]);
  });
});

describe("lock", () => {
  it("returns undefined without a lock", () => {
    expect(readLock(fx.root)).toBeUndefined();
  });

  it("round-trips every field", () => {
    const lock: Lock = {
      lockfileVersion: 1,
      version: "1.0.0",
      targets: ["claude"],
      packs: {
        web: { requires: [], version: "1.0.0", paths: ["apps/web"], from: { config: true } },
      },
      feeds: { acme: { tag: "v1.0.0", commit: "abc" } },
      overrides: { "rules/react": { pack: "web", hash: "h" } },
      files: { "a.md": { pack: "web", hash: "h" } },
    };
    writeLock(fx.root, lock);
    expect(readLock(fx.root)).toEqual(lock);
  });

  it("rejects an old lockfileVersion and a missing field", () => {
    fx.write(`project/${LOCK_FILE}`, JSON.stringify({ lockfileVersion: 2 }));
    expect(() => readLock(fx.root)).toThrow(/lockfileVersion" must be 1/);
    fx.write(`project/${LOCK_FILE}`, JSON.stringify({ lockfileVersion: 1, version: "1" }));
    expect(() => readLock(fx.root)).toThrow(/"targets" is required/);
  });

  it("rejects a pack without a version or a source", () => {
    const lock = {
      lockfileVersion: 1,
      version: "1.0.0",
      targets: ["claude"],
      packs: { web: { requires: [] } },
      feeds: {},
      overrides: {},
      files: {},
    };
    fx.write(`project/${LOCK_FILE}`, JSON.stringify(lock));
    expect(() => readLock(fx.root)).toThrow(/"packs.web.version" is required/);

    lock.packs = { web: { requires: [], version: "1.0.0" } } as typeof lock.packs;
    fx.write(`project/${LOCK_FILE}`, JSON.stringify(lock));
    expect(() => readLock(fx.root)).toThrow(/"packs.web.from" is required/);
  });
});

describe("helpers", () => {
  it("addEntries merges the folders of an entry with the same identity", () => {
    expect(
      addEntries([{ name: "a", path: ["x"] }, { name: "b" }], [{ name: "a", path: ["y", "x"] }]),
    ).toEqual([{ name: "a", path: ["x", "y"] }, { name: "b" }]);
  });

  it("addEntries keeps two versions of one pack as separate entries", () => {
    expect(
      addEntries(
        [{ name: "csharp", version: "14", path: ["legacy"] }],
        [{ name: "csharp", version: "15", path: ["apps"] }],
      ),
    ).toEqual([
      { name: "csharp", version: "14", path: ["legacy"] },
      { name: "csharp", version: "15", path: ["apps"] },
    ]);
  });

  it("unique keeps the first occurrence", () => {
    expect(unique(["b", "a", "b"])).toEqual(["b", "a"]);
  });
});
